from sqlalchemy.orm import Session, joinedload
from app.models.product_group import ProductGroup
from app.models.manufacturer import Manufacturer # Needed for cross-table queries

def get_product_groups(db: Session, skip: int = 0, limit: int = 10):
    return db.query(ProductGroup)\
        .options(joinedload(ProductGroup.manufacturer))\
        .offset(skip).limit(limit).all()

# 2. Relational "Filter": Find all groups belonging to a specific Manufacturer
def get_groups_by_manufacturer(db: Session, manufacturer_id: int):
    # This is a relational query because it filters based on the link (FK)
    return db.query(ProductGroup).filter(ProductGroup.manufacturer_id == manufacturer_id).all()

# 3. Cross-Table Search: Find groups where the Manufacturer name matches
def search_groups_by_manufacturer_name(db: Session, mfr_name: str):
    return db.query(ProductGroup).join(Manufacturer).filter(
        Manufacturer.name.ilike(f"%{mfr_name}%")
    ).all()

# 4. Standard Create (Ensure you use the Pydantic schema)
def create_product_group(db: Session, data):
    # 'data' should contain manufacturer_id
    product = ProductGroup(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

# 5. Fixed Update (Previously named update_manufacturer by mistake)
def update_product_group(db: Session, group_id: int, data):
    product = db.query(ProductGroup).filter(ProductGroup.id == group_id).first()
    if not product:
        return None

    for key, value in data.dict(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product_group(db: Session, product_id: int):
    product = db.query(ProductGroup).options(joinedload(ProductGroup.manufacturer).filter(ProductGroup.id == product_id).first())
    if product:
        db.delete(product)
        db.commit()
    return product