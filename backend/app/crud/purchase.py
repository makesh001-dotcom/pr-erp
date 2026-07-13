from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.purchase import (
    PurchaseCounter,
    PurchaseInward,
    PurchaseItem,
    PurchaseItemSerial,
    PurchaseType,
    PurchaseStatus,
    PaymentStatus,
)
from app.models.supplier import Supplier
from app.models.models import (
    Model,
    StockLedger,
    MovementType,
    OrderStatus,
    ReferenceType,
    SerialNumber,
)
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseUpdate,
)
from app.utils.audit import log_action
from app.models.client import Client


# -------------------------------------------------------
# HELPER FUNCTIONS
# -------------------------------------------------------

def generate_purchase_number(db: Session) -> str:
    """Generates: PIN000001, PIN000002, ..."""
    counter = (
        db.query(PurchaseCounter)
        .with_for_update()
        .first()
    )
    if not counter:
        counter = PurchaseCounter(current_count=0)
        db.add(counter)
        db.flush()
    counter.current_count += 1
    return f"PIN{str(counter.current_count).zfill(6)}"


def calculate_purchase_totals(items) -> dict:
    """
    Calculate subtotal and grand total from items.
    Future: Add discount, tax, shipping fields here.
    """
    subtotal = 0
    processed_items = []

    for item in items:
        total = item.quantity * item.unit_cost
        subtotal += total
        processed_items.append({
            "model_id": item.model_id,
            "quantity": item.quantity,
            "unit_cost": item.unit_cost,
            "total_cost": total,
            "remarks": item.remarks,
            "return_due_date": item.return_due_date,
            "serial_numbers": [
                {"serial_number": s.serial_number}
                for s in item.serial_numbers
            ],
        })

    return {
        "subtotal": subtotal,
        "grand_total": subtotal,  # Future: subtotal + tax + shipping - discount
        "processed_items": processed_items,
    }


# -------------------------------------------------------
# VALIDATION HELPERS
# -------------------------------------------------------

def _validate_purchase_input(data: PurchaseCreate) -> None:
    """Validate business rules before creating purchase"""
    
    # Must have at least one item
    if not data.items or len(data.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase must have at least one item."
        )
    
    for item in data.items:
        # Quantity must be positive
        if item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity must be greater than 0 for model_id {item.model_id}."
            )
        
        # Unit cost must be non-negative
        if item.unit_cost < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unit cost cannot be negative for model_id {item.model_id}."
            )
        
        # If serials provided, count must match quantity
        if item.serial_numbers:
            if len(item.serial_numbers) != item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Serial count ({len(item.serial_numbers)}) must match quantity ({item.quantity}) for model_id {item.model_id}."
                )
            
            # Check for duplicate serials within the same item
            serial_list = [s.serial_number for s in item.serial_numbers]
            if len(serial_list) != len(set(serial_list)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate serial numbers found within the same item (model_id {item.model_id})."
                )


def _validate_duplicate_serials_globally(db: Session, serial_numbers: list) -> None:
    """Check if any serial numbers already exist in global inventory"""
    if not serial_numbers:
        return
    
    existing = (
        db.query(SerialNumber)
        .filter(SerialNumber.serial_number.in_(serial_numbers))
        .all()
    )
    
    if existing:
        duplicates = [s.serial_number for s in existing]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serial numbers already exist in inventory: {', '.join(duplicates)}"
        )


# -------------------------------------------------------
# CREATE (DRAFT)
# -------------------------------------------------------

def create_purchase(db: Session, data: PurchaseCreate) -> PurchaseInward:
    """
    Create a purchase as DRAFT.
    - Saves purchase header, items, and serials
    - NO stock movement yet
    - NO global serial activation yet
    """
    
    # 1. Validate business rules
    _validate_purchase_input(data)
    
    try:
        # 2. Generate purchase number
        purchase_number = generate_purchase_number(db)

        # 3. Verify supplier exists
        supplier = (
            db.query(Supplier)
            .filter(Supplier.id == data.supplier_id)
            .first()
        )
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found."
            )
        # After supplier verification, add:
        client = None
        if data.client_id:
            client = db.query(Client).filter(Client.id == data.client_id).first()
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Client not found."
                )
        # 4. Verify all models exist
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
        
        # Build model lookup
        model_map = {m.id: m for m in existing_models}

        # 5. Check global serial duplicates early
        all_serials = []
        for item in data.items:
            for s in item.serial_numbers:
                all_serials.append(s.serial_number)
        _validate_duplicate_serials_globally(db, all_serials)

        # 6. Calculate totals
        calculations = calculate_purchase_totals(data.items)

        # 7. Create purchase header (DRAFT)
        purchase = PurchaseInward(
            purchase_no=purchase_number,
            supplier_id=supplier.id,
            supplier_name=supplier.company_name,
            supplier_gstin=supplier.gstin,
            client_id=data.client_id if data.client_id else None,
            client_name=client.company_name if data.client_id and client else None,
            supplier_invoice_no=data.supplier_invoice_no,
            supplier_invoice_date=data.supplier_invoice_date,
            purchase_type=data.purchase_type,
            status=PurchaseStatus.DRAFT,
            payment_status=data.payment_status,
            total_amount=calculations["subtotal"],
            tax_amount=0,
            grand_total=calculations["grand_total"],
            paid_amount=0,
            payment_due_date=data.payment_due_date,
            expected_return_date=data.expected_return_date,
            courier_name=data.courier_name,
            delivered_by=data.delivered_by,
            remarks=data.remarks,
        )
        db.add(purchase)
        db.flush()

        # 8. Create purchase items and serials (DRAFT only)
        for item_data in calculations["processed_items"]:
            model = model_map[item_data["model_id"]]

            purchase_item = PurchaseItem(
                purchase_id=purchase.id,
                model_id=model.id,
                model_no=model.model_no,         # Snapshot from DB, not frontend
                description=model.description,   # Snapshot from DB, not frontend
                quantity=item_data["quantity"],
                unit_cost=item_data["unit_cost"],
                total_cost=item_data["total_cost"],
                remarks=item_data["remarks"],
                return_due_date=item_data["return_due_date"],
            )
            db.add(purchase_item)
            db.flush()

            # Save serials in PurchaseItemSerial (NOT in global SerialNumber yet)
            for serial_data in item_data["serial_numbers"]:
                purchase_serial = PurchaseItemSerial(
                    purchase_item_id=purchase_item.id,
                    serial_number=serial_data["serial_number"],
                )
                db.add(purchase_serial)

        # 9. Commit DRAFT purchase
        db.commit()
        db.refresh(purchase)
        
# In create_purchase, after db.commit():
        log_action(db, None, "CREATE", "PURCHASE", purchase.id, purchase.purchase_no,
           f"Created purchase {purchase.purchase_no} for {purchase.supplier_name}")


        return purchase

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the purchase: {str(e)}"
        )


# -------------------------------------------------------
# READ
# -------------------------------------------------------

def get_purchase(db: Session, purchase_id: int) -> PurchaseInward:
    """Get a single purchase by ID with all relationships eager-loaded"""
    purchase = (
        db.query(PurchaseInward)
        .options(
            joinedload(PurchaseInward.items)
            .joinedload(PurchaseItem.serial_numbers)
        )
        .filter(PurchaseInward.id == purchase_id)
        .first()
    )
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found."
        )
    return purchase


def list_purchases(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    supplier_id: Optional[int] = None,
    status: Optional[str] = None,
    purchase_type: Optional[str] = None,
) -> dict:
    """List purchases with pagination and filters"""
    
    query = db.query(PurchaseInward)
    
    if supplier_id:
        query = query.filter(PurchaseInward.supplier_id == supplier_id)
    if status:
        query = query.filter(PurchaseInward.status == status)
    if purchase_type:
        query = query.filter(PurchaseInward.purchase_type == purchase_type)
    
    total = query.count()
    purchases = (
        query
        .options(
            joinedload(PurchaseInward.items)
            .joinedload(PurchaseItem.serial_numbers)
        )
        .order_by(PurchaseInward.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": purchases,
    }


# -------------------------------------------------------
# UPDATE (DRAFT ONLY)
# -------------------------------------------------------

def update_purchase(db: Session, purchase_id: int, data: PurchaseUpdate) -> PurchaseInward:
    """
    Update purchase header fields.
    Only allowed when status is DRAFT.
    For full item/serial replacement, use a dedicated endpoint.
    """
    
    purchase = get_purchase(db, purchase_id)
    
    if purchase.status != PurchaseStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update purchase. Status is {purchase.status.value}. Only DRAFT purchases can be modified."
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(purchase, field, value)
    
    db.commit()
    db.refresh(purchase)
    return purchase


# -------------------------------------------------------
# POST (DRAFT → POSTED)
# -------------------------------------------------------

def post_purchase(db: Session, purchase_id: int) -> PurchaseInward:
    """
    Post a DRAFT purchase.
    - Creates StockLedger entries
    - Activates serial numbers in global inventory
    - Increases stock
    - Purchase becomes IMMUTABLE
    """
    
    purchase = (
        db.query(PurchaseInward)
        .options(
            joinedload(PurchaseInward.items)
            .joinedload(PurchaseItem.serial_numbers)
        )
        .filter(PurchaseInward.id == purchase_id)
        .first()
    )
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found."
        )
    
    if purchase.status != PurchaseStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot post purchase. Current status: {purchase.status.value}. Only DRAFT can be posted."
        )
    
    # Validate purchase has items
    if not purchase.items or len(purchase.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot post a purchase with no items."
        )
    
    try:
        for item in purchase.items:
            # Validate model still exists
            model = db.query(Model).filter(Model.id == item.model_id).first()
            if not model:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Model ID {item.model_id} no longer exists. Cannot post."
                )
            
            # Validate serial count matches quantity (if serials are tracked)
            serial_count = len(item.serial_numbers) if item.serial_numbers else 0
            if serial_count > 0 and serial_count != item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Serial count ({serial_count}) does not match quantity ({item.quantity}) for model {item.model_no}."
                )
            
            # Check duplicate serials globally
            if item.serial_numbers:
                serial_list = [s.serial_number for s in item.serial_numbers]
                _validate_duplicate_serials_globally(db, serial_list)
            
            # 1. Create StockLedger entry
            ledger = StockLedger(
                model_id=item.model_id,
                quantity=item.quantity,
                movement_type=MovementType.INWARD,
                status=OrderStatus.STANDARD,
                reference_type=ReferenceType.PURCHASE,
                reference_id=purchase.purchase_no,
                reference_record_id=item.id,
                purchase_item_id=item.id,
                reference_doc_no=purchase.purchase_no,
                delivery_by=purchase.delivered_by,
                courier_name=purchase.courier_name,
            )
            db.add(ledger)
            db.flush()
            
            # 2. Activate serial numbers in global inventory
            for serial in item.serial_numbers:
                # Determine serial status based on purchase type
                if purchase.purchase_type == PurchaseType.DEMO_FROM_SUPPLIER:
                    serial_status = "DEMO_FROM_SUPPLIER"
                elif purchase.purchase_type == PurchaseType.DEMO_RETURN_FROM_CUSTOMER:
                    serial_status = "DEMO_RETURNED_BY_CUSTOMER"
                else:
                    serial_status = "IN_STOCK"
                
                inventory_serial = SerialNumber(
                    ledger_entry_id=ledger.id,
                    model_id=model.id,
                    serial_number=serial.serial_number,
                    status=serial_status,
                )
                db.add(inventory_serial)
        
        # 3. Mark as POSTED (immutable)
        purchase.status = PurchaseStatus.POSTED
        
        db.commit()
        # In post_purchase, after db.commit():
        log_action(db, None, "POST", "PURCHASE", purchase.id, purchase.purchase_no,
           f"Posted purchase {purchase.purchase_no}")
        db.refresh(purchase)
        return purchase
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error posting purchase: {str(e)}"
        )


# -------------------------------------------------------
# CANCEL
# -------------------------------------------------------

def cancel_purchase(db: Session, purchase_id: int) -> PurchaseInward:
    """Cancel a purchase. Does NOT reverse stock automatically."""
    
    purchase = get_purchase(db, purchase_id)
    
    if purchase.status == PurchaseStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase is already cancelled."
        )
    
    # TODO: If reversing stock is needed, add logic here
    # to create reverse StockLedger entries
    
    purchase.status = PurchaseStatus.CANCELLED
    db.commit()
    db.refresh(purchase)
    return purchase