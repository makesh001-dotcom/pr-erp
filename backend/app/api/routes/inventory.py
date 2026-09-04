# routes/inventory.py

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db

# Models
from app.models.models import (
    Model,
    StockLedger,
    SerialNumber,
    MovementType,
    ReferenceType,
    OrderStatus,
)
from app.models.product_group import ProductGroup
from app.models.users import User

# Schemas
from app.schemas.model import (
    StockMovementCreate,
    StockLedgerResponse,
    ModelResponse,
    ModelUpdate,
)
from app.schemas.inventory import (
    BulkSerialNumberCreate,
    BulkSerialNumberResponse,
    SerialNumberResponse,
)

# CRUD
from app.crud.inventory import (
    process_stock_movement,
    get_current_stock,
    get_inventory_summary_paginated,
)

# Authentication / permissions
from app.auth.dependencies import require_permission
from app.core.permisiion import (
    INVENTORY_ADJUST,
    INVENTORY_CREATE,
    INVENTORY_DELETE,
    INVENTORY_UPDATE,
    INVENTORY_VIEW,
)


router = APIRouter(
    prefix="/api/v1/inventory",
    tags=["inventory"],
)


# ============================================================
# STOCK MOVEMENT
# ============================================================
@router.get("/test")
async def inventory_test():
    return {
        "status": "OK",
        "message": "Inventory router is working"
    }

@router.post("/movement")
def create_movement(
    payload: StockMovementCreate,
    current_user: User = Depends(
        require_permission(INVENTORY_CREATE)
    ),
    db: Session = Depends(get_db),
):
    """
    Create a single stock movement.
    """

    # Find model using model number
    product_model = (
        db.query(Model)
        .filter(Model.model_no == payload.model_no)
        .first()
    )

    if not product_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product model '{payload.model_no}' not found in the system.",
        )

    new_movement = StockLedger(
        model_id=product_model.id,
        quantity=payload.quantity,
        movement_type=payload.movement_type,
        status=OrderStatus.STANDARD,
        reference_id=payload.reference_id,
        delivery_by=payload.delivery_by,
        courier_name=payload.courier_name,
    )

    try:
        db.add(new_movement)
        db.commit()
        db.refresh(new_movement)

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create stock movement: {str(e)}",
        )

    return {
        "status": "success",
        "message": (
            f"Successfully recorded "
            f"{payload.movement_type} movement of "
            f"{payload.quantity} units for "
            f"{payload.model_no}."
        ),
        "data": {
            "id": new_movement.id,
            "model_no": payload.model_no,
            "quantity": payload.quantity,
        },
    }


# ============================================================
# CURRENT STOCK
# ============================================================

@router.get(
    "/model/{model_id}/stock",
    response_model=dict,
)
def fetch_model_stock(
    model_id: int,
    current_user: User = Depends(
        require_permission(INVENTORY_VIEW)
    ),
    db: Session = Depends(get_db),
):
    """
    Returns the current available stock for a model.
    """

    model = (
        db.query(Model)
        .filter(Model.id == model_id)
        .first()
    )

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model item not found.",
        )

    current_balance = get_current_stock(
        db,
        model_id=model_id,
    )

    return {
        "model_id": model_id,
        "current_stock": current_balance,
    }


# ============================================================
# INVENTORY SUMMARY
# ============================================================
@router.get("/inventory-summary")
def get_inventory_summary(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    print("🔥 INVENTORY SUMMARY ROUTE CALLED")
    print(f"skip={skip}, limit={limit}, search={search}")

    return get_inventory_summary_paginated(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
    )


# ============================================================
# UPDATE MODEL
# ============================================================

@router.put(
    "/model/{model_id}",
    response_model=ModelResponse,
)
def update_model_details(
    model_id: int,
    update_data: ModelUpdate,
    current_user: User = Depends(
        require_permission(INVENTORY_UPDATE)
    ),
    db: Session = Depends(get_db),
):
    """
    Update model/catalog details.
    """

    model_record = (
        db.query(Model)
        .filter(Model.id == model_id)
        .first()
    )

    if not model_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Catalog model with id {model_id} not found.",
        )

    update_dict = update_data.model_dump(
        exclude_unset=True
    )

    for key, value in update_dict.items():
        setattr(model_record, key, value)

    try:
        db.commit()
        db.refresh(model_record)

        full_model = (
            db.query(Model)
            .options(
                joinedload(Model.product_group)
                .joinedload(ProductGroup.manufacturer)
            )
            .filter(Model.id == model_id)
            .first()
        )

        # Calculate stock consistently
        inward_sum = (
            db.query(
                func.coalesce(
                    func.sum(StockLedger.quantity),
                    0,
                )
            )
            .filter(
                StockLedger.model_id == model_id,
                StockLedger.movement_type == MovementType.INWARD,
            )
            .scalar()
            or 0
        )

        outward_sum = (
            db.query(
                func.coalesce(
                    func.sum(StockLedger.quantity),
                    0,
                )
            )
            .filter(
                StockLedger.model_id == model_id,
                StockLedger.movement_type == MovementType.OUTWARD,
            )
            .scalar()
            or 0
        )

        adjustment_sum = (
            db.query(
                func.coalesce(
                    func.sum(StockLedger.quantity),
                    0,
                )
            )
            .filter(
                StockLedger.model_id == model_id,
                StockLedger.movement_type == MovementType.ADJUSTMENT,
            )
            .scalar()
            or 0
        )

        full_model.current_stock = (
            inward_sum
            - outward_sum
            + adjustment_sum
        )

        return full_model

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Ledger Transaction Error: {str(e)}",
        )


# ============================================================
# BULK STOCK MOVEMENT
# ============================================================

@router.post("/bulk-movement")
def create_bulk_movements(
    payload: List[StockMovementCreate],
    current_user: User = Depends(
        require_permission(INVENTORY_ADJUST)
    ),
    db: Session = Depends(get_db),
):
    """
    Process multiple stock movement rows.
    """

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transactional rows were provided.",
        )

    processed_count = 0
    errors = []

    for index, row in enumerate(payload):

        # Skip empty rows
        if not row.sku and not row.model_no:
            continue

        try:
            process_stock_movement(
                db,
                movement_data=row,
            )

            processed_count += 1

        except HTTPException as ex:
            errors.append(
                f"Row {index + 1}: {ex.detail}"
            )

        except Exception as err:
            errors.append(
                f"Row {index + 1}: Unexpected system error: {str(err)}"
            )

    if errors:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": (
                    "Bulk execution halted. "
                    "Fix row criteria issues below."
                ),
                "errors": errors,
            },
        )

    return {
        "status": "success",
        "message": (
            f"Successfully committed all "
            f"{processed_count} ledger rows "
            f"to your inventory tables."
        ),
    }


# ============================================================
# MODEL SEARCH
# ============================================================

@router.get("/model-search")
def model_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(25, ge=1, le=100),
    product_group_id: Optional[int] = Query(None),
    current_user: User = Depends(
        require_permission(INVENTORY_VIEW)
    ),
    db: Session = Depends(get_db),
):
    """
    Search models with manufacturer and product group information.
    """

    query = (
        db.query(Model)
        .options(
            joinedload(Model.product_group)
            .joinedload(ProductGroup.manufacturer)
        )
    )

    query = query.filter(
        Model.model_no.ilike(f"%{q}%")
    )

    if product_group_id is not None:
        query = query.filter(
            Model.product_group_id == product_group_id
        )

    models = (
        query
        .limit(limit)
        .all()
    )

    return [
        {
            "id": model.id,
            "model_no": model.model_no,
            "description": model.description,
            "sku": model.sku,
            "price": float(model.price or 0),
            "hsn_code": model.hsn_code,

            "make": (
                model.product_group.manufacturer.name
                if (
                    model.product_group
                    and model.product_group.manufacturer
                )
                else None
            ),

            "manufacturer": (
                {
                    "id": model.product_group.manufacturer.id,
                    "name": model.product_group.manufacturer.name,
                }
                if (
                    model.product_group
                    and model.product_group.manufacturer
                )
                else None
            ),

            "product_group": (
                {
                    "id": model.product_group.id,
                    "name": model.product_group.name,
                }
                if model.product_group
                else None
            ),
        }
        for model in models
    ]


# ============================================================
# BULK CREATE SERIAL NUMBERS
# ============================================================

@router.post(
    "/serial-numbers/bulk",
    response_model=BulkSerialNumberResponse,
)
@router.post(
    "/serial-numbers/bulk",
    response_model=BulkSerialNumberResponse,
)
async def bulk_create_serial_numbers(
    data: BulkSerialNumberCreate,
    current_user: User = Depends(
        require_permission(INVENTORY_CREATE)
    ),
    db: Session = Depends(get_db),
):
    """
    Attach serial numbers to EXISTING inventory.

    IMPORTANT:
    This endpoint does NOT create a new stock movement.

    Example:

        Existing stock = 5
        Add serial numbers = 2

        Result:
            Stock = 5
            Serialized = 2

    The serial numbers are linked to an existing INWARD
    stock ledger entry.
    """

    # ========================================================
    # 1. FIND MODEL
    # ========================================================

    model = (
        db.query(Model)
        .filter(Model.id == data.model_id)
        .first()
    )

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    # ========================================================
    # 2. CLEAN SERIAL NUMBERS
    # ========================================================

    serial_numbers_to_save = [
        serial.strip().upper()
        for serial in data.serial_numbers
        if serial and serial.strip()
    ]

    skipped_empty = (
        len(data.serial_numbers)
        - len(serial_numbers_to_save)
    )

    # Nothing to save
    if not serial_numbers_to_save:
        return BulkSerialNumberResponse(
            saved_count=0,
            duplicates=[],
            skipped_empty=skipped_empty,
            total_requested=len(data.serial_numbers),
            message="No serial numbers provided to save.",
        )

    # ========================================================
    # 3. CHECK DUPLICATES INSIDE REQUEST
    # ========================================================

    seen = set()
    request_duplicates = []

    for serial in serial_numbers_to_save:

        if serial in seen:
            request_duplicates.append(serial)
        else:
            seen.add(serial)

    if request_duplicates:

        return BulkSerialNumberResponse(
            saved_count=0,
            duplicates=list(set(request_duplicates)),
            skipped_empty=skipped_empty,
            total_requested=len(data.serial_numbers),
            message=(
                "Duplicate serial numbers found "
                "in submitted data."
            ),
        )

    # ========================================================
    # 4. CHECK DATABASE DUPLICATES
    # ========================================================

    existing = (
        db.query(SerialNumber.serial_number)
        .filter(
            SerialNumber.serial_number.in_(
                serial_numbers_to_save
            )
        )
        .all()
    )

    existing_serials = [
        row[0]
        for row in existing
    ]

    if existing_serials:

        return BulkSerialNumberResponse(
            saved_count=0,
            duplicates=existing_serials,
            skipped_empty=skipped_empty,
            total_requested=len(data.serial_numbers),
            message=(
                "Duplicate serial numbers found: "
                + ", ".join(existing_serials)
            ),
        )

    # ========================================================
    # 5. FIND EXISTING STOCK
    # ========================================================

    # Calculate current stock from ledger.

    inward_sum = (
        db.query(
            func.coalesce(
                func.sum(StockLedger.quantity),
                0,
            )
        )
        .filter(
            StockLedger.model_id == data.model_id,
            StockLedger.movement_type == MovementType.INWARD,
        )
        .scalar()
        or 0
    )

    outward_sum = (
        db.query(
            func.coalesce(
                func.sum(StockLedger.quantity),
                0,
            )
        )
        .filter(
            StockLedger.model_id == data.model_id,
            StockLedger.movement_type == MovementType.OUTWARD,
        )
        .scalar()
        or 0
    )

    adjustment_sum = (
        db.query(
            func.coalesce(
                func.sum(StockLedger.quantity),
                0,
            )
        )
        .filter(
            StockLedger.model_id == data.model_id,
            StockLedger.movement_type == MovementType.ADJUSTMENT,
        )
        .scalar()
        or 0
    )

    current_stock = (
        inward_sum
        - outward_sum
        + adjustment_sum
    )

    # ========================================================
    # 6. COUNT EXISTING SERIAL NUMBERS
    # ========================================================

    existing_serial_count = (
        db.query(
            func.count(SerialNumber.id)
        )
        .filter(
            SerialNumber.model_id == data.model_id,
            SerialNumber.status != "DELETED",
        )
        .scalar()
        or 0
    )

    # ========================================================
    # 7. PREVENT TOO MANY SERIAL NUMBERS
    # ========================================================

    remaining_stock = (
        current_stock
        - existing_serial_count
    )

    if len(serial_numbers_to_save) > remaining_stock:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot add {len(serial_numbers_to_save)} "
                f"serial numbers. "
                f"Model has {current_stock} units in stock, "
                f"{existing_serial_count} already serialized, "
                f"and only {remaining_stock} "
                f"units remaining to serialize."
            ),
        )

    # ========================================================
    # 8. FIND EXISTING INWARD LEDGER ENTRY
    # ========================================================

    ledger_entry = (
        db.query(StockLedger)
        .filter(
            StockLedger.model_id == data.model_id,
            StockLedger.movement_type == MovementType.INWARD,
        )
        .order_by(
            StockLedger.created_at.asc()
        )
        .first()
    )

    if not ledger_entry:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No existing INWARD stock ledger entry "
                "was found for this model. "
                "Create stock first, then assign serial numbers."
            ),
        )

    # ========================================================
    # 9. CREATE SERIAL NUMBERS
    # ========================================================

    try:

        now = datetime.utcnow()

        serial_objects = []

        for serial in serial_numbers_to_save:

            serial_obj = SerialNumber(
                ledger_entry_id=ledger_entry.id,
                model_id=data.model_id,
                serial_number=serial,
                status="IN_STOCK",
                created_at=now,
                updated_at=now,
            )

            serial_objects.append(serial_obj)

        db.add_all(serial_objects)

        # ====================================================
        # 10. UPDATE SKU IF NECESSARY
        # ====================================================

        if not model.sku and data.sku:

            model.sku = data.sku

        # ====================================================
        # 11. COMMIT
        # ====================================================

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Failed to save serial numbers: {str(e)}"
            ),
        )

    # ========================================================
    # 12. RESPONSE
    # ========================================================

    return BulkSerialNumberResponse(
        saved_count=len(serial_objects),
        duplicates=[],
        skipped_empty=skipped_empty,
        total_requested=len(data.serial_numbers),
        ledger_entry_id=ledger_entry.id,
        message=(
            f"Successfully added "
            f"{len(serial_objects)} serial numbers "
            f"to existing stock."
        ),
    )


# ============================================================
# GET SERIAL NUMBERS BY MODEL
# ============================================================

@router.get(
    "/serial-numbers/model/{model_id}",
    response_model=dict,
)
async def get_serial_numbers_by_model(
    model_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    current_user: User = Depends(
        require_permission(INVENTORY_VIEW)
    ),
    db: Session = Depends(get_db),
):
    """
    Get serial numbers for a model with pagination.
    """

    # --------------------------------------------------------
    # 1. Verify model exists
    # --------------------------------------------------------

    model = (
        db.query(Model)
        .filter(Model.id == model_id)
        .first()
    )

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    # --------------------------------------------------------
    # 2. Build query
    # --------------------------------------------------------

    query = (
        db.query(SerialNumber)
        .filter(
            SerialNumber.model_id == model_id
        )
    )

    # Optional status filter
    if status:
        query = query.filter(
            SerialNumber.status == status
        )

    # --------------------------------------------------------
    # 3. Total count
    # --------------------------------------------------------

    total = query.count()

    # --------------------------------------------------------
    # 4. Get serial numbers
    # --------------------------------------------------------

    serials = (
        query
        .order_by(
            SerialNumber.created_at.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    # --------------------------------------------------------
    # 5. Convert SQLAlchemy objects to plain dictionaries
    # --------------------------------------------------------

    serial_data = [
        {
            "id": serial.id,
            "model_id": serial.model_id,
            "ledger_entry_id": serial.ledger_entry_id,
            "serial_number": serial.serial_number,
            "status": serial.status,
            "created_at": (
                serial.created_at.isoformat()
                if serial.created_at
                else None
            ),
            "updated_at": (
                serial.updated_at.isoformat()
                if serial.updated_at
                else None
            ),
        }
        for serial in serials
    ]

    # --------------------------------------------------------
    # 6. Return JSON-safe response
    # --------------------------------------------------------

    return {
        "data": serial_data,
        "total": total,
        "skip": skip,
        "limit": limit,
        "model_no": model.model_no,
        "model_id": model_id,
    }



# ============================================================
# CHECK SERIAL NUMBER
# ============================================================

@router.get(
    "/serial-numbers/check/{serial_number}"
)
async def check_serial_number_exists(
    serial_number: str,
    current_user: User = Depends(
        require_permission(INVENTORY_VIEW)
    ),
    db: Session = Depends(get_db),
):
    """
    Check whether a serial number already exists.
    """

    cleaned_serial = serial_number.strip()

    exists = (
        db.query(SerialNumber)
        .filter(
            SerialNumber.serial_number == cleaned_serial
        )
        .first()
        is not None
    )

    return {
        "serial_number": cleaned_serial,
        "exists": exists,
        "message": (
            "Serial number already exists"
            if exists
            else "Serial number is available"
        ),
    }


# ============================================================
# DELETE SERIAL NUMBERS FOR MODEL
# ============================================================

@router.delete(
    "/serial-numbers/model/{model_id}"
)
async def delete_all_serial_numbers_for_model(
    model_id: int,
    soft_delete: bool = Query(
        True,
        description=(
            "If true, soft delete by setting status "
            "to DELETED. If false, hard delete."
        ),
    ),
    current_user: User = Depends(
        require_permission(INVENTORY_DELETE)
    ),
    db: Session = Depends(get_db),
):
    """
    Delete all serial numbers for a model.

    Default behavior is soft delete.
    """

    model = (
        db.query(Model)
        .filter(Model.id == model_id)
        .first()
    )

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    try:

        if soft_delete:

            deleted_count = (
                db.query(SerialNumber)
                .filter(
                    SerialNumber.model_id == model_id
                )
                .update(
                    {
                        "status": "DELETED",
                        "updated_at": datetime.utcnow(),
                    },
                    synchronize_session=False,
                )
            )

            db.commit()

            return {
                "message": (
                    "All serial numbers soft-deleted "
                    f"for model {model.model_no}"
                ),
                "model_id": model_id,
                "model_no": model.model_no,
                "deleted_count": deleted_count,
            }

        else:

            deleted_count = (
                db.query(SerialNumber)
                .filter(
                    SerialNumber.model_id == model_id
                )
                .delete(
                    synchronize_session=False
                )
            )

            db.commit()

            return {
                "message": (
                    f"Deleted {deleted_count} "
                    "serial numbers"
                ),
                "model_id": model_id,
                "model_no": model.model_no,
                "deleted_count": deleted_count,
            }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Failed to delete serial numbers: {str(e)}"
            ),
        )


# ============================================================
# MODEL STOCK SUMMARY
# ============================================================

@router.get(
    "/models/{model_id}/stock-summary"
)
async def get_model_stock_summary(
    model_id: int,
    current_user: User = Depends(
        require_permission(INVENTORY_VIEW)
    ),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive stock summary for a model,
    including serial-number information.
    """

    model = (
        db.query(Model)
        .filter(Model.id == model_id)
        .first()
    )

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    # --------------------------------------------------------
    # Calculate stock correctly:
    #
    # INWARD - OUTWARD + ADJUSTMENT
    # --------------------------------------------------------

    inward_sum = (
        db.query(
            func.coalesce(
                func.sum(StockLedger.quantity),
                0,
            )
        )
        .filter(
            StockLedger.model_id == model_id,
            StockLedger.movement_type == MovementType.INWARD,
        )
        .scalar()
        or 0
    )

    outward_sum = (
        db.query(
            func.coalesce(
                func.sum(StockLedger.quantity),
                0,
            )
        )
        .filter(
            StockLedger.model_id == model_id,
            StockLedger.movement_type == MovementType.OUTWARD,
        )
        .scalar()
        or 0
    )

    adjustment_sum = (
        db.query(
            func.coalesce(
                func.sum(StockLedger.quantity),
                0,
            )
        )
        .filter(
            StockLedger.model_id == model_id,
            StockLedger.movement_type == MovementType.ADJUSTMENT,
        )
        .scalar()
        or 0
    )

    total_stock = (
        inward_sum
        - outward_sum
        + adjustment_sum
    )

    # --------------------------------------------------------
    # IN-STOCK serial numbers
    # --------------------------------------------------------

    serial_count = (
        db.query(
            func.count(SerialNumber.id)
        )
        .filter(
            SerialNumber.model_id == model_id,
            SerialNumber.status == "IN_STOCK",
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------------
    # Serial-number status breakdown
    # --------------------------------------------------------

    status_counts = (
        db.query(
            SerialNumber.status,
            func.count(SerialNumber.id),
        )
        .filter(
            SerialNumber.model_id == model_id
        )
        .group_by(
            SerialNumber.status
        )
        .all()
    )

    return {
        "model_id": model_id,
        "model_no": model.model_no,
        "sku": model.sku,

        "total_stock": total_stock,

        "inward_stock": inward_sum,
        "outward_stock": outward_sum,
        "adjustment_stock": adjustment_sum,

        "serial_count": serial_count,

        "status_breakdown": [
            {
                "status": serial_status,
                "count": count,
            }
            for serial_status, count in status_counts
        ],

        "has_serial_numbers": serial_count > 0,
    }
