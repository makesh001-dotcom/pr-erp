from sqlalchemy.orm import Session, joinedload
from app.models.models import Model
from app.models.product_group import ProductGroup
from app.models.manufacturer import Manufacturer
from fastapi import HTTPException
from app.schemas.model import ModelCreate, ModelUpdate

def get_model_with_full_details(db: Session, model_id: int):
    return db.query(Model).options(
        joinedload(Model.product_group).joinedload(ProductGroup.manufacturer)
    ).filter(Model.id == model_id).first()


def get_models_by_group(db: Session, group_id: int):
    return db.query(Model).filter(
        Model.product_group_id == group_id
    ).all()


def search_models_by_manufacturer(db: Session, mfr_name: str):
    return db.query(Model)\
        .join(ProductGroup)\
        .join(Manufacturer)\
        .filter(Manufacturer.name.ilike(f"%{mfr_name}%"))\
        .all()


def create_model(db: Session, data: ModelCreate):
    # Validate parent ProductGroup exists
    parent_group = (
        db.query(ProductGroup)
        .filter(ProductGroup.id == data.product_group_id)
        .first()
    )

    if not parent_group:
        raise HTTPException(
            status_code=404,
            detail=f"Product Group with id {data.product_group_id} not found"
        )

    # 1. Convert Pydantic object to database-friendly dictionary data payload
    model_data = data.dict()
    
    # 2. Instantiate and persist into core table smoothly
    db_obj = Model(**model_data)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    # Return with eagerly loaded relationships so FastAPI can serialize it without missing elements
    return get_model_with_full_details(db, db_obj.id)


def update_model(db: Session, model_id: int, data: ModelUpdate):
    """
    🛠️ FIX: Added the missing update_model function.
    Safely iterates through set payload variables and updates the SQLAlchemy model 
    without causing column mismatches.
    """
    db_obj = db.query(Model).filter(Model.id == model_id).first()
    if not db_obj:
        return None
        
    # Get only fields that were explicitly sent in the request (ignores unset/null values)
    update_data = data.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
    db.commit()
    db.refresh(db_obj)
    
    return get_model_with_full_details(db, model_id)


def delete_model(db: Session, product_id: int):
    product = db.query(Model).filter(Model.id == product_id).first()
    
    if product:
        db.delete(product)
        db.commit()
        return True 
    return False


def get_models(db: Session, skip: int = 0, limit: int = 10, sort_by: str = "id", order: str = "asc"):
    query = db.query(Model).options(joinedload(Model.product_group))

    column = getattr(Model, sort_by, Model.id)
     
    if order == "desc":
        column = column.desc()

    query = query.order_by(column)

    return query.offset(skip).limit(limit).all()


def search_models(db: Session, query: str):
    return db.query(Model).filter(Model.model_no.ilike(f"%{query}%")).all()







# Add these at the bottom of your existing models CRUD file:

def get_or_create_manufacturer(db, name):
    """Get or create a manufacturer - used by import script"""
    from app.models.manufacturer import Manufacturer
    
    manufacturer = db.query(Manufacturer).filter(Manufacturer.name == name).first()
    if not manufacturer:
        manufacturer = Manufacturer(name=name)
        db.add(manufacturer)
        db.flush()
    return manufacturer.id


def get_or_create_product_group(db, name, manufacturer_id):
    """Get or create a product group - used by import script"""
    from app.models.product_group import ProductGroup
    
    group = db.query(ProductGroup).filter(
        ProductGroup.name == name,
        ProductGroup.manufacturer_id == manufacturer_id
    ).first()
    if not group:
        group = ProductGroup(name=name, manufacturer_id=manufacturer_id)
        db.add(group)
        db.flush()
    return group.id