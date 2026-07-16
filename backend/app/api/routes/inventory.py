from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List,Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.db.session import get_db
from app.schemas.model import StockMovementCreate, StockLedgerResponse, ModelResponse
from app.crud.inventory import process_stock_movement, get_current_stock,get_inventory_summary_paginated
from app.models.models import Model
from sqlalchemy import func
from fastapi import Query
from app.models.models import Model
from app.models.models import StockLedger # Adjust this import to match your StockLedger model path
from app.schemas.model import ModelUpdate
from app.crud.models import get_model_with_full_details
from app.models.product_group import ProductGroup
from app.models.models import MovementType, OrderStatus
from app.auth.dependencies import require_permission
from app.core.permisiion import(
    INVENTORY_ADJUST ,
    INVENTORY_CREATE,
    INVENTORY_DELETE ,
    INVENTORY_UPDATE,
    INVENTORY_VIEW,
)
from app.models.users import User

router = APIRouter()

@router.post("/movement")
def create_movement(payload: StockMovementCreate,  current_user: User = Depends(
    require_permission(INVENTORY_CREATE)
    ),
db: Session = Depends(get_db)):
    
    # 1. Look up the product model by the number sent from the React UI
    product_model = db.query(Model).filter(  Model.model_no == payload.model_no).first()
    
    # If the user typed an invalid model number, throw a clear 404 error
    if not product_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product model '{payload.model_no}' not found in the system."
        )
    
    # 2. Build the new ledger record row using data from the payload
    new_movement = StockLedger(
        model_id=product_model.id,          # Links it automatically via Foreign Key ID
        quantity=payload.quantity,
        movement_type=payload.movement_type, # INWARD, OUTWARD, or ADJUSTMENT
        status=OrderStatus.STANDARD,         # Sets your default status string safely
        reference_id=payload.reference_id,    # Voucher info (e.g., "SAMP_1")
        delivery_by=payload.delivery_by,
    courier_name=payload.courier_name,
    )
    
    # 3. Add to session transaction and push directly to PostgreSQL
    db.add(new_movement)
    db.commit()
    db.refresh(new_movement) # Refreshes IDs internally, but we don't return the raw object to cause a 500!
    
    # 4. Return a clean JSON confirmation map that React expects to see
    return {
        "status": "success",
        "message": f"Successfully recorded {payload.movement_type} movement of {payload.quantity} units for {payload.model_no}.",
        "data": {
            "id": new_movement.id,
            "model_no": payload.model_no,
            "quantity": payload.quantity
        }
    }


@router.get("/model/{model_id}/stock", response_model=dict)
def fetch_model_stock(model_id: int, current_user: User = Depends(
    require_permission(INVENTORY_VIEW)
    ),
db: Session = Depends(get_db)):
    """
    Returns the calculated current available stock units for a specific model ID.
    """
    # Verify model exists first
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model item not found."
        )
    
    current_balance = get_current_stock(db, model_id=model_id)
    return {"model_id": model_id, "current_stock": current_balance}


@router.get("/inventory-summary")
def get_inventory_summary(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    product_group_id: Optional[int] = Query(None),
   current_user: User = Depends(
    require_permission(INVENTORY_VIEW)
    ),
db: Session = Depends(get_db)):

    """Get paginated inventory summary"""
    return get_inventory_summary_paginated(
        db=db, 
        skip=skip, 
        limit=limit, 
        search=search,
        product_group_id=product_group_id
    )

@router.put("/model/{model_id}", response_model=ModelResponse)
def update_model_details(model_id: int, update_data: ModelUpdate, current_user: User = Depends(
    require_permission(INVENTORY_VIEW)
    ),
db: Session = Depends(get_db)):
    """
    Updates catalog model parameters while maintaining nested relationship
    integrity and recalculating real-time stock balances safely.
    """
    # 1. Verify target item existence
    model_record = db.query(Model).filter(Model.id == model_id).first()
    if not model_record:
        raise HTTPException(
            status_code=404,
            detail=f"Catalog model with id {model_id} not found."
        )

    # 2. Update allowed data attributes
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(model_record, key, value)

    try:
        db.commit()
        
        # 3. Re-query using your explicit joinedload configuration pattern
        full_model = db.query(Model).options(
            joinedload(Model.product_group).joinedload(ProductGroup.manufacturer)
        ).filter(Model.id == model_id).first()

        # 4. Bulletproof inline stock calculations matching your inventory summary engine
        inward_sum = db.query(func.coalesce(func.sum(StockLedger.quantity), 0)).filter(
            StockLedger.model_id == model_id, 
            StockLedger.movement_type == "INWARD"
        ).scalar()

        outward_sum = db.query(func.coalesce(func.sum(StockLedger.quantity), 0)).filter(
            StockLedger.model_id == model_id, 
            StockLedger.movement_type == "OUTWARD"
        ).scalar()

        adjustment_sum = db.query(func.coalesce(func.sum(StockLedger.quantity), 0)).filter(
            StockLedger.model_id == model_id, 
            StockLedger.movement_type == "ADJUSTMENT"
        ).scalar()

        # Dynamic formula balance mapping
        full_model.current_stock = inward_sum - outward_sum + adjustment_sum
        
        return full_model
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal Ledger Transaction Error: {str(e)}"
        )

@router.post("/bulk-movement")
def create_bulk_movements(payload: List[StockMovementCreate], current_user: User = Depends(
    require_permission(INVENTORY_ADJUST)
    ),
db: Session = Depends(get_db)):
    """
    Accepts an array of ledger entry rows straight from our Excel front-end grid workspace,
    processes them individually, handles SKU or Model matching, and commits them all securely.
    """
    if not payload:
        raise HTTPException(status_code=400, detail="No transactional rows were provided.")

    processed_count = 0
    errors = []

    # Process sequentially inside a unified transaction state
    for index, row in enumerate(payload):
        # Skip empty rows if employees left blank slots at the bottom of the grid sheet
        if not row.sku and not row.model_no:
            continue
            
        try:
            # Reuses your exact validation, matching logic, and pre-order tracking rules!
            process_stock_movement(db, movement_data=row)
            processed_count += 1
        except HTTPException as ex:
            errors.append(f"Row {index + 1}: {ex.detail}")
        except Exception as err:
            errors.append(f"Row {index + 1}: Unexpected system error: {str(err)}")

    if errors:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail={"message": "Bulk execution halted. Fix row criteria issues below.", "errors": errors}
        )

    return {
        "status": "success",
        "message": f"Successfully committed all {processed_count} ledger rows seamlessly to your inventory tables."
    }


@router.get("/model-search")
def search_models(
     q: Optional[str] = Query(None, min_length=1),
    limit: int = Query(20, ge=1, le=50),
    product_group_id: Optional[int] = None,
    current_user: User = Depends(
    require_permission(INVENTORY_VIEW)
    ),
db: Session = Depends(get_db)
):
    """Search models by name, SKU, or description"""
    query = db.query(Model)
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Model.model_no.ilike(search_term),
                Model.sku.ilike(search_term),
                Model.description.ilike(search_term),
            )
        )
    
    if product_group_id:
        query = query.filter(Model.product_group_id == product_group_id)
    
    models = query.order_by(Model.model_no).limit(limit).all()
    
    return [
        {
            "id": m.id,
            "model_no": m.model_no,
            "sku": m.sku,
            "description": m.description,
            "price": float(m.price or 0),
        }
        for m in models
    ]