from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Model, StockLedger, MovementType, OrderStatus
from app.schemas.model import StockMovementCreate
from fastapi import HTTPException, status
from app.models.models import SerialNumber
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List,Optional

def get_current_stock(db: Session, model_id: int) -> int:
    """
    Calculates the exact current stock level for a specific model 
    by aggregating its entire historical ledger entries.
    """
    # Sum up all INWARD entries
    inward_sum = db.query(func.coalesce(func.sum(StockLedger.quantity), 0))\
        .filter(StockLedger.model_id == model_id, StockLedger.movement_type == MovementType.INWARD)\
        .scalar()

    # Sum up all OUTWARD entries
    outward_sum = db.query(func.coalesce(func.sum(StockLedger.quantity), 0))\
        .filter(StockLedger.model_id == model_id, StockLedger.movement_type == MovementType.OUTWARD)\
        .scalar()

    # Sum up or subtract ADJUSTMENTS (audits)
    # Note: For simplicity in manual inputs, adjustments are stored directly. 
    # To expand adjustments later, you can add positive or negative records.
    adjustment_sum = db.query(func.coalesce(func.sum(StockLedger.quantity), 0))\
        .filter(StockLedger.model_id == model_id, StockLedger.movement_type == MovementType.ADJUSTMENT)\
        .scalar()

    # Standard Inventory Formula: Inward - Outward + Adjustments
    return int(inward_sum - outward_sum + adjustment_sum)


def process_stock_movement(db: Session, movement_data: StockMovementCreate) -> StockLedger:
    """
    Processes stock movement via scanned barcode OR typed model number.
    """
    model = None

    # Scenario A: Employee scanned a barcode
    if movement_data.sku:
        model = db.query(Model).filter(Model.sku == movement_data.sku).first()
    
    # Scenario B: Employee manually typed the model number instead
    elif movement_data.model_no:
        model = db.query(Model).filter(Model.model_no == movement_data.model_no).first()

    # If neither matched or nothing was provided, raise a clean message
    if not model:
        identifier = movement_data.sku or movement_data.model_no or "Unknown"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not find an item matching identifier: '{identifier}'"
        )

    order_status = OrderStatus.STANDARD
    if movement_data.movement_type == MovementType.OUTWARD:
        current_stock = get_current_stock(db, model.id)
        if movement_data.quantity > current_stock:
            order_status = OrderStatus.PRE_ORDER

    # 1. Create the parent Ledger row
    new_ledger_entry = StockLedger(
        model_id=model.id,
        quantity=movement_data.quantity,
        movement_type=movement_data.movement_type,
        status=order_status,
        reference_id=movement_data.reference_id,
        courier_name=movement_data.courier_name,
        delivery_by=movement_data.delivery_by
    )
    db.add(new_ledger_entry)
    db.flush() # 🆕 Safely flushes to database to instantly generate new_ledger_entry.id without fully committing yet!

    # 2. 🆕 THE UPDATE: Handle individual Serial Number creations
    if movement_data.serial_numbers:
        for sn_string in movement_data.serial_numbers:
            if not sn_string.strip():
                continue
                
            # If item is moving OUTWARD, find the existing serial number and mark it SOLD
            if movement_data.movement_type == MovementType.OUTWARD:
                existing_sn = db.query(SerialNumber).filter(
                    SerialNumber.serial_number == sn_string.strip(),
                    SerialNumber.model_id == model.id
                ).first()
                if existing_sn:
                    existing_sn.status = "SOLD"
            
            # If item is moving INWARD, create a fresh stock tracking number entry
            else:
                new_sn = SerialNumber(
                    ledger_entry_id=new_ledger_entry.id,
                    model_id=model.id,
                    serial_number=sn_string.strip(),
                    status="IN_STOCK"
                )
                db.add(new_sn)

    try:
        db.commit()
        db.refresh(new_ledger_entry)
        return new_ledger_entry
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database ledger serialization crash: {str(e)}")


def get_inventory_summary_paginated(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    product_group_id: Optional[int] = None,
):
    """Get paginated inventory with current stock"""
    
    # Base query
    query = db.query(Model)
    
    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Model.model_no.ilike(search_term),
                Model.sku.ilike(search_term),
                Model.description.ilike(search_term),
            )
        )
    
    # Product group filter
    if product_group_id:
        query = query.filter(Model.product_group_id == product_group_id)
    
    # Total count
    total = query.count()
    
    # Paginated results
    models = query.order_by(Model.model_no).offset(skip).limit(limit).all()
    
    # Calculate current stock for each model
    data = []
    for model in models:
        # Calculate stock from ledger
        inward = (
            db.query(func.coalesce(func.sum(StockLedger.quantity), 0))
            .filter(
                StockLedger.model_id == model.id,
                StockLedger.movement_type == MovementType.INWARD,
            )
            .scalar()
        )
        
        outward = (
            db.query(func.coalesce(func.sum(StockLedger.quantity), 0))
            .filter(
                StockLedger.model_id == model.id,
                StockLedger.movement_type == MovementType.OUTWARD,
            )
            .scalar()
        )
        
        current_stock = inward - outward
        
        data.append({
            "id": model.id,
            "model_no": model.model_no,
            "sku": model.sku,
            "description": model.description,
            "price": float(model.price or 0),
            "current_stock": current_stock,
            "product_group": {
                "id": model.product_group.id if model.product_group else None,
                "name": model.product_group.name if model.product_group else None,
            } if model.product_group else None,
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": data,
    }