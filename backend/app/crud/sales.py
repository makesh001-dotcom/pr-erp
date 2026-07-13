from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.sales import (
    SalesCounter,
    SalesOutward,
    SalesItem,
    SalesItemSerial,
    SalesType,
    SalesStatus,
)
from app.models.client import Client
from app.models.models import Model
from app.models.models import (
    StockLedger,
    MovementType,
    OrderStatus,
    ReferenceType,
)
from app.models.models import SerialNumber
from app.schemas.sales import (
    SalesCreate,
    SalesUpdate,
)


# -------------------------------------------------------
# HELPER FUNCTIONS
# -------------------------------------------------------

def generate_sales_number(db: Session) -> str:
    """Generates: SIN000001, SIN000002, ..."""
    counter = (
        db.query(SalesCounter)
        .with_for_update()
        .first()
    )
    if not counter:
        counter = SalesCounter(current_count=0)
        db.add(counter)
        db.flush()
    counter.current_count += 1
    return f"SIN{str(counter.current_count).zfill(6)}"


def calculate_sales_totals(items) -> dict:
    """Calculate subtotal and grand total from items"""
    subtotal = 0
    processed_items = []

    for item in items:
        total = item.quantity * item.unit_price
        subtotal += total
        processed_items.append({
            "model_id": item.model_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": total,
            "remarks": item.remarks,
            "serial_numbers": [
                {"serial_number": s.serial_number}
                for s in item.serial_numbers
            ],
        })

    return {
        "subtotal": subtotal,
        "grand_total": subtotal,
        "processed_items": processed_items,
    }


# -------------------------------------------------------
# VALIDATION HELPERS
# -------------------------------------------------------

def _validate_sales_input(data: SalesCreate) -> None:
    """Validate business rules before creating sales"""
    
    if not data.items or len(data.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sales must have at least one item."
        )
    
    for item in data.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity must be greater than 0 for model_id {item.model_id}."
            )
        
        if item.unit_price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unit price cannot be negative for model_id {item.model_id}."
            )
        
        if item.serial_numbers:
            if len(item.serial_numbers) != item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Serial count ({len(item.serial_numbers)}) must match quantity ({item.quantity}) for model_id {item.model_id}."
                )
            
            serial_list = [s.serial_number for s in item.serial_numbers]
            if len(serial_list) != len(set(serial_list)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate serial numbers found within the same item (model_id {item.model_id})."
                )


def _validate_serials_available(db: Session, serial_numbers: list, sales_type: str = None) -> None:
    """Check if all serial numbers exist and are in an appropriate status"""
    if not serial_numbers:
        return
    
    serials_in_db = (
        db.query(SerialNumber)
        .filter(SerialNumber.serial_number.in_(serial_numbers))
        .all()
    )
    
    serial_map = {s.serial_number: s for s in serials_in_db}
    
    # Allowed statuses based on sales type
    if sales_type == "DEMO_RETURN_TO_SUPPLIER":
        allowed_statuses = ["DEMO_FROM_SUPPLIER", "IN_STOCK"]
    elif sales_type == "DEMO_TO_CUSTOMER":
        allowed_statuses = ["IN_STOCK", "DEMO_RETURNED_BY_CUSTOMER"]
    else:
        allowed_statuses = ["IN_STOCK"]
    
    for sn in serial_numbers:
        if sn not in serial_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Serial number '{sn}' not found in inventory."
            )
        if serial_map[sn].status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Serial number '{sn}' is not available. Current status: {serial_map[sn].status}."
            )

# -------------------------------------------------------
# CREATE (DRAFT)
# -------------------------------------------------------

def create_sales(db: Session, data: SalesCreate) -> SalesOutward:
    """
    Create a sales order as DRAFT.
    - Saves header, items, and serials
    - NO stock movement yet
    - NO serial status changes yet
    """
    
    _validate_sales_input(data)
    
    try:
        # 1. Generate sales number
        sales_number = generate_sales_number(db)

        # 2. Verify client exists
        client = (
            db.query(Client)
            .filter(Client.id == data.client_id)
            .first()
        )
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found."
            )

        # 3. Verify all models exist
        model_ids = [item.model_id for item in data.items]
        existing_models = (
            db.query(Model)
            .filter(Model.id.in_(model_ids))
            .all()
        )
        existing_model_ids = {m.id for m in existing_models}
        
        for model_id in model_ids:
            if model_id not in existing_model_ids:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Model ID {model_id} not found."
                )
        
        model_map = {m.id: m for m in existing_models}

        # 4. Calculate totals
        calculations = calculate_sales_totals(data.items)

        # 5. Create sales header (DRAFT)
        sales = SalesOutward(
            sales_no=sales_number,
            client_id=client.id,
            client_name=client.company_name if hasattr(client, 'company_name') else client.name,
            client_gstin=getattr(client, 'gstin', None),
            invoice_no=data.invoice_no,
            invoice_date=data.invoice_date,
            sales_type=data.sales_type,
            status=SalesStatus.DRAFT,
            total_amount=calculations["subtotal"],
            tax_amount=0,
            grand_total=calculations["grand_total"],
            courier_name=data.courier_name,
            delivered_by=data.delivered_by,
            remarks=data.remarks,
        )
        db.add(sales)
        db.flush()

        # 6. Create sales items and serials (DRAFT only)
        for item_data in calculations["processed_items"]:
            model = model_map[item_data["model_id"]]

            sales_item = SalesItem(
                sales_id=sales.id,
                model_id=model.id,
                model_no=model.model_no,
                description=model.description,
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                total_price=item_data["total_price"],
                remarks=item_data["remarks"],
            )
            db.add(sales_item)
            db.flush()

            for serial_data in item_data["serial_numbers"]:
                sales_serial = SalesItemSerial(
                    sales_item_id=sales_item.id,
                    serial_number=serial_data["serial_number"],
                )
                db.add(sales_serial)

        # 7. Commit DRAFT
        db.commit()
        db.refresh(sales)
        return sales

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the sales: {str(e)}"
        )


# -------------------------------------------------------
# READ
# -------------------------------------------------------

def get_sales(db: Session, sales_id: int) -> SalesOutward:
    """Get a single sales by ID with all relationships eager-loaded"""
    sales = (
        db.query(SalesOutward)
        .options(
            joinedload(SalesOutward.items)
            .joinedload(SalesItem.serial_numbers)
        )
        .filter(SalesOutward.id == sales_id)
        .first()
    )
    if not sales:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sales not found."
        )
    return sales


def list_sales(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    sales_type: Optional[str] = None,
) -> dict:
    """List sales with pagination and filters"""
    
    query = db.query(SalesOutward)
    
    if client_id:
        query = query.filter(SalesOutward.client_id == client_id)
    if status:
        query = query.filter(SalesOutward.status == status)
    if sales_type:
        query = query.filter(SalesOutward.sales_type == sales_type)
    
    total = query.count()
    sales_list = (
        query
        .options(
            joinedload(SalesOutward.items)
            .joinedload(SalesItem.serial_numbers)
        )
        .order_by(SalesOutward.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": sales_list,
    }


# -------------------------------------------------------
# UPDATE (DRAFT ONLY)
# -------------------------------------------------------

def update_sales(db: Session, sales_id: int, data: SalesUpdate) -> SalesOutward:
    """Update sales header fields. Only allowed when status is DRAFT."""
    
    sales = get_sales(db, sales_id)
    
    if sales.status != SalesStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update sales. Status is {sales.status.value}. Only DRAFT can be modified."
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    # If client changed, update snapshots
    if 'client_id' in update_data:
        client = db.query(Client).filter(Client.id == update_data['client_id']).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found.")
        sales.client_name = client.company_name if hasattr(client, 'company_name') else client.name
        sales.client_gstin = getattr(client, 'gstin', None)
    
    for field, value in update_data.items():
        setattr(sales, field, value)
    
    db.commit()
    db.refresh(sales)
    return sales


# -------------------------------------------------------
# POST (DRAFT → POSTED)
# -------------------------------------------------------

def post_sales(db: Session, sales_id: int) -> SalesOutward:
    """
    Post a DRAFT sales.
    - Validates stock availability
    - Validates serial numbers exist and are IN_STOCK
    - Creates StockLedger OUTWARD entries
    - Updates SerialNumber status
    - Sales becomes IMMUTABLE
    """
    
    sales = (
        db.query(SalesOutward)
        .options(
            joinedload(SalesOutward.items)
            .joinedload(SalesItem.serial_numbers)
        )
        .filter(SalesOutward.id == sales_id)
        .first()
    )
    
    if not sales:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales not found.")
    
    if sales.status != SalesStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot post sales. Current status: {sales.status.value}. Only DRAFT can be posted."
        )
    
    if not sales.items or len(sales.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot post sales with no items."
        )
    
    try:
        # Determine target serial status based on sales type
        if sales.sales_type == SalesType.DEMO_RETURN_TO_SUPPLIER:
            target_serial_status = "RETURNED_TO_SUPPLIER"
        elif sales.sales_type == SalesType.DEMO_TO_CUSTOMER:
            target_serial_status = "DEMO_WITH_CUSTOMER"
        elif sales.sales_type == SalesType.FREE_OF_COST:
            target_serial_status = "FOC_DISPATCHED"
        else:
            target_serial_status = "SOLD"
        
        for item in sales.items:
            # Validate model exists
            model = db.query(Model).filter(Model.id == item.model_id).first()
            if not model:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Model ID {item.model_id} no longer exists."
                )
            
            # Validate serial count matches quantity (if serials tracked)
            serial_count = len(item.serial_numbers) if item.serial_numbers else 0
            if serial_count > 0 and serial_count != item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Serial count ({serial_count}) does not match quantity ({item.quantity}) for model {item.model_no}."
                )
            
            # Validate all serials exist and are IN_STOCK
            if item.serial_numbers:
                serial_list = [s.serial_number for s in item.serial_numbers]
                _validate_serials_available(db, serial_list, sales.sales_type.value)
            
            # 1. Create StockLedger OUTWARD entry
            ledger = StockLedger(
                model_id=item.model_id,
                quantity=item.quantity,
                movement_type=MovementType.OUTWARD,       # ⭐ OUTWARD
                status=OrderStatus.STANDARD,
                reference_type=ReferenceType.SALES,        # ⭐ SALES
                reference_id=sales.sales_no,
                reference_record_id=item.id,
                sales_item_id=item.id,                     # ⭐ sales_item_id
                reference_doc_no=sales.sales_no,
                delivery_by=sales.delivered_by,
                courier_name=sales.courier_name,
            )
            db.add(ledger)
            db.flush()
            
            # 2. Update serial number status
            for serial in item.serial_numbers:
                inventory_serial = (
                    db.query(SerialNumber)
                    .filter(SerialNumber.serial_number == serial.serial_number)
                    .first()
                )
                if inventory_serial:
                    inventory_serial.status = target_serial_status
                    inventory_serial.ledger_entry_id = ledger.id
        
        # 3. Mark as POSTED (immutable)
        sales.status = SalesStatus.POSTED
        
        db.commit()
        db.refresh(sales)
        return sales
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error posting sales: {str(e)}"
        )


# -------------------------------------------------------
# CANCEL
# -------------------------------------------------------

def cancel_sales(db: Session, sales_id: int) -> SalesOutward:
    """Cancel a sales. Does NOT reverse stock automatically."""
    
    sales = get_sales(db, sales_id)
    
    if sales.status == SalesStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sales is already cancelled."
        )
    
    sales.status = SalesStatus.CANCELLED
    db.commit()
    db.refresh(sales)
    return sales