# crud/delivery.py - Complete Updated CRUD

from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc, func
from fastapi import HTTPException, status
import logging

from app.models.delivery_challan import (
    DeliveryChallan,
    DeliveryChallanItem,
    DeliveryChallanCounter,
    DeliveryStatus,
    DCType
)
from app.models.models import StockLedger, MovementType, ReferenceType

logger = logging.getLogger(__name__)


# ============================================
# STOCK VALIDATION HELPER
# ============================================

def _get_current_stock(db: Session, model_id: int) -> int:
    """Calculate current available stock for a model."""
    inward = db.query(func.coalesce(func.sum(StockLedger.quantity), 0)).filter(
        StockLedger.model_id == model_id,
        StockLedger.movement_type == MovementType.INWARD
    ).scalar()

    outward = db.query(func.coalesce(func.sum(StockLedger.quantity), 0)).filter(
        StockLedger.model_id == model_id,
        StockLedger.movement_type == MovementType.OUTWARD
    ).scalar()

    return inward - outward


def _validate_stock_availability(db: Session, items: List) -> None:
    """Validate sufficient stock for all items before confirmation."""
    insufficient_items = []

    for item in items:
        if item.quantity_sent > 0:
            current_stock = _get_current_stock(db, item.model_id)

            if current_stock < item.quantity_sent:
                insufficient_items.append({
                    "model_id": item.model_id,
                    "description": item.description,
                    "required": item.quantity_sent,
                    "available": current_stock,
                    "shortage": item.quantity_sent - current_stock
                })

    if insufficient_items:
        error_details = "\n".join([
            f"• {item['description']} (ID: {item['model_id']}): "
            f"Need {item['required']}, Available {item['available']}, "
            f"Shortage {item['shortage']}"
            for item in insufficient_items
        ])

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock:\n{error_details}"
        )


# ============================================
# PRIVATE HELPERS
# ============================================

def _generate_next_challan_number(db: Session) -> str:
    """Generate sequential challan number."""
    current_year = datetime.now().year
    next_year = current_year + 1
    financial_year = f"{str(current_year)[-2:]}-{str(next_year)[-2:]}"

    counter = db.query(DeliveryChallanCounter).filter(
        DeliveryChallanCounter.financial_year == financial_year
    ).with_for_update().first()

    if not counter:
        counter = DeliveryChallanCounter(
            financial_year=financial_year,
            prefix="PR/DC",
            current_number=1
        )
        db.add(counter)
        db.flush()
    else:
        counter.current_number += 1

    challan_no = f"{counter.prefix}-{counter.current_number:03d}/{financial_year}"
    return challan_no


def _should_increment_revision(old_challan, new_data) -> bool:
    """Determine if revision should be incremented."""
    if new_data.items is not None:
        return True
    if new_data.client_id is not None and new_data.client_id != old_challan.client_id:
        return True
    if new_data.delivery_date is not None and new_data.delivery_date != old_challan.delivery_date:
        return True
    if new_data.reference_no is not None and new_data.reference_no != old_challan.reference_no:
        return True
    if new_data.dc_type is not None and new_data.dc_type != old_challan.dc_type:
        return True
    return False


def _get_challan_with_relations(db: Session, challan_id: int) -> DeliveryChallan:
    """Get challan with items and client eagerly loaded."""
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items),
        joinedload(DeliveryChallan.client)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.is_active == True
    ).first()

    if not challan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery challan with id {challan_id} not found"
        )

    return challan


# ============================================
# CREATE
# ============================================

def create_delivery_challan(
    db: Session,
    challan_data,
    created_by: Optional[int] = None
) -> DeliveryChallan:
    """Create a new Delivery Challan in DRAFT status."""
    try:
        challan_no = _generate_next_challan_number(db)

        challan = DeliveryChallan(
            challan_no=challan_no,
            revision_no=0,
            client_id=challan_data.client_id,
            reference_no=challan_data.reference_no,
            dc_type=challan_data.dc_type,
            status=DeliveryStatus.DRAFT,
            delivery_date=challan_data.delivery_date,
            expected_return_date=challan_data.expected_return_date,
            remarks=challan_data.remarks,
            is_active=True,
            display_type=challan_data.display_type,
        )

        db.add(challan)
        db.flush()

        for item_data in challan_data.items:
            item = DeliveryChallanItem(
                challan_id=challan.id,
                model_id=item_data.model_id,
                description=item_data.description,
                hsn_code=item_data.hsn_code,
                quantity_sent=item_data.quantity_sent,
                quantity_returned=getattr(item_data, 'quantity_returned', 0) or 0,
                unit_price=item_data.unit_price,
                remarks=item_data.remarks
            )
            db.add(item)

        db.commit()
        db.refresh(challan)

        logger.info(f"Created delivery challan: {challan.challan_no} ({challan.dc_type})")
        return _get_challan_with_relations(db, challan.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create delivery challan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create delivery challan."
        )


# ============================================
# READ
# ============================================

def get_delivery_challan(db: Session, challan_id: int) -> DeliveryChallan:
    """Get single delivery challan by ID."""
    return _get_challan_with_relations(db, challan_id)


def list_delivery_challans(
    db: Session,
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    reference_no: Optional[str] = None,
    dc_type: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> Tuple[List[DeliveryChallan], int]:
    """List delivery challans with filtering, search, and pagination."""
    query = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items),
        joinedload(DeliveryChallan.client)
    ).filter(
        DeliveryChallan.is_active == True
    )

    if status:
        query = query.filter(DeliveryChallan.status == status)
    if client_id:
        query = query.filter(DeliveryChallan.client_id == client_id)
    if reference_no:
        query = query.filter(DeliveryChallan.reference_no.ilike(f"%{reference_no}%"))
    if dc_type:
        query = query.filter(DeliveryChallan.dc_type == dc_type)
    if search:
        search_filter = or_(
            DeliveryChallan.challan_no.ilike(f"%{search}%"),
            DeliveryChallan.reference_no.ilike(f"%{search}%"),
            DeliveryChallan.remarks.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    if from_date:
        query = query.filter(DeliveryChallan.created_at >= from_date)
    if to_date:
        query = query.filter(DeliveryChallan.created_at <= to_date)

    total = query.count()

    sort_column = getattr(DeliveryChallan, sort_by, DeliveryChallan.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    offset = (page - 1) * limit
    challans = query.offset(offset).limit(limit).all()

    return challans, total


# ============================================
# UPDATE
# ============================================

def update_delivery_challan(
    db: Session,
    challan_id: int,
    challan_data,
    updated_by: Optional[int] = None
) -> DeliveryChallan:
    """Update delivery challan with transaction safety."""
    try:
        challan = _get_challan_with_relations(db, challan_id)

        if challan.status == DeliveryStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit a confirmed delivery challan."
            )
        if challan.status == DeliveryStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit a cancelled delivery challan."
            )

        if challan.status == DeliveryStatus.PRINTED:
            restricted = []
            if challan_data.client_id is not None: restricted.append("client")
            if challan_data.items is not None: restricted.append("items")
            if challan_data.delivery_date is not None: restricted.append("delivery_date")
            if restricted:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot modify {', '.join(restricted)} on a printed challan."
                )

        increment_revision = _should_increment_revision(challan, challan_data)

        if challan_data.client_id is not None:
            challan.client_id = challan_data.client_id
        if challan_data.reference_no is not None:
            challan.reference_no = challan_data.reference_no
        if challan_data.dc_type is not None:
            challan.dc_type = challan_data.dc_type
        if challan_data.delivery_date is not None:
            challan.delivery_date = challan_data.delivery_date
        if challan_data.expected_return_date is not None:
            challan.expected_return_date = challan_data.expected_return_date
        if challan_data.remarks is not None:
            challan.remarks = challan_data.remarks

        if challan_data.display_type is not None:
            challan.display_type = challan_data.display_type

        if challan_data.items is not None:
            db.query(DeliveryChallanItem).filter(
                DeliveryChallanItem.challan_id == challan_id
            ).delete()

            for item_data in challan_data.items:
                item = DeliveryChallanItem(
                    challan_id=challan_id,
                    model_id=item_data.model_id,
                    description=item_data.description,
                    hsn_code=item_data.hsn_code,
                    quantity_sent=item_data.quantity_sent,
                    quantity_returned=getattr(item_data, 'quantity_returned', 0) or 0,
                    unit_price=item_data.unit_price,
                    remarks=item_data.remarks
                )
                db.add(item)

        if increment_revision:
            challan.revision_no += 1

        db.commit()
        db.refresh(challan)

        logger.info(f"Updated delivery challan: {challan.challan_no} (Revision: {challan.revision_no})")
        return _get_challan_with_relations(db, challan.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update delivery challan {challan_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update delivery challan."
        )


# ============================================
# CONFIRM (Inventory Movement)
# ============================================

def confirm_delivery_challan(
    db: Session,
    challan_id: int,
    confirmed_by: Optional[int] = None,
    remarks: Optional[str] = None
) -> DeliveryChallan:
    """Confirm delivery challan with stock validation."""
    try:
        challan = _get_challan_with_relations(db, challan_id)

        if challan.status not in [DeliveryStatus.DRAFT, DeliveryStatus.PRINTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot confirm a {challan.status.value} challan."
            )

        if not challan.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot confirm a challan with no items."
            )

        is_outward = challan.dc_type in [DCType.WITH_BILL_OUTWARD, DCType.WITHOUT_BILL_OUTWARD]

        # Validate stock for OUTWARD types
        if is_outward:
            _validate_stock_availability(db, challan.items)

        movement_type = MovementType.OUTWARD if is_outward else MovementType.INWARD

        # Create inventory ledger entries
        for item in challan.items:
            if item.quantity_sent > 0:
                ledger_entry = StockLedger(
                    model_id=item.model_id,
                    quantity=item.quantity_sent,
                    movement_type=movement_type,
                    reference_type=ReferenceType.DELIVERY_CHALLAN,
                    reference_record_id=challan.id,
                    reference_doc_no=challan.challan_no,
                    created_at=datetime.now()
                )
                db.add(ledger_entry)

        challan.status = DeliveryStatus.CONFIRMED
        challan.confirmed_at = datetime.now()
        challan.confirmed_by = confirmed_by

        if remarks:
            existing = challan.remarks or ""
            challan.remarks = f"{existing}\nConfirmation: {remarks}".strip()

        db.commit()
        db.refresh(challan)

        logger.info(f"Confirmed delivery challan: {challan.challan_no}")
        return _get_challan_with_relations(db, challan.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to confirm delivery challan {challan_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm delivery challan."
        )


# ============================================
# CANCEL (Inventory Reversal)
# ============================================

def cancel_delivery_challan(
    db: Session,
    challan_id: int,
    cancelled_by: Optional[int] = None,
    reason: Optional[str] = None
) -> DeliveryChallan:
    """Cancel delivery challan with stock restoration."""
    try:
        challan = _get_challan_with_relations(db, challan_id)

        if challan.status != DeliveryStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel a {challan.status.value} challan."
            )

        is_outward = challan.dc_type in [DCType.WITH_BILL_OUTWARD, DCType.WITHOUT_BILL_OUTWARD]
        reversal_movement = MovementType.INWARD if is_outward else MovementType.OUTWARD

        for item in challan.items:
            if item.quantity_sent > 0:
                ledger_entry = StockLedger(
                    model_id=item.model_id,
                    quantity=item.quantity_sent,
                    movement_type=reversal_movement,
                    reference_type=ReferenceType.DELIVERY_CHALLAN,
                    reference_record_id=challan.id,
                    reference_doc_no=challan.challan_no,
                    created_at=datetime.now()
                )
                db.add(ledger_entry)

        challan.status = DeliveryStatus.CANCELLED
        challan.cancelled_at = datetime.now()
        challan.cancelled_by = cancelled_by

        if reason:
            existing = challan.remarks or ""
            challan.remarks = f"{existing}\nCancellation: {reason}".strip()

        db.commit()
        db.refresh(challan)

        logger.info(f"Cancelled delivery challan: {challan.challan_no}")
        return _get_challan_with_relations(db, challan.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to cancel delivery challan {challan_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel delivery challan."
        )


# ============================================
# SOFT DELETE
# ============================================

def delete_delivery_challan(
    db: Session,
    challan_id: int,
    deleted_by: Optional[int] = None
) -> None:
    """Soft delete delivery challan."""
    try:
        challan = db.query(DeliveryChallan).filter(
            DeliveryChallan.id == challan_id,
            DeliveryChallan.is_active == True
        ).first()

        if not challan:
            raise HTTPException(status_code=404, detail="Delivery challan not found")

        if challan.status == DeliveryStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a confirmed challan. Cancel it first."
            )

        challan.is_active = False
        db.commit()
        logger.info(f"Soft deleted delivery challan: {challan.challan_no}")

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete delivery challan.")


# ============================================
# UTILITY FUNCTIONS
# ============================================

def get_challans_by_reference(db: Session, reference_no: str) -> List[DeliveryChallan]:
    """Get all delivery challans with the same reference number."""
    return db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items),
        joinedload(DeliveryChallan.client)
    ).filter(
        DeliveryChallan.reference_no == reference_no,
        DeliveryChallan.is_active == True
    ).order_by(desc(DeliveryChallan.created_at)).all()


def get_pending_deliveries(db: Session, client_id: Optional[int] = None) -> List[DeliveryChallan]:
    """Get all pending deliveries (DRAFT or PRINTED)."""
    query = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items),
        joinedload(DeliveryChallan.client)
    ).filter(
        DeliveryChallan.status.in_([DeliveryStatus.DRAFT, DeliveryStatus.PRINTED]),
        DeliveryChallan.is_active == True
    )

    if client_id:
        query = query.filter(DeliveryChallan.client_id == client_id)

    return query.order_by(DeliveryChallan.delivery_date.asc()).all()


# ============================================
# PENDING & OVERDUE TRACKING
# ============================================

def get_overdue_deliveries(db: Session, days_threshold: int = 180) -> List[DeliveryChallan]:
    """Get deliveries past expected return date or long pending."""
    today = date.today()
    threshold_date = today - timedelta(days=days_threshold)

    return db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items),
        joinedload(DeliveryChallan.client)
    ).filter(
        DeliveryChallan.is_active == True,
        DeliveryChallan.status == DeliveryStatus.CONFIRMED,
        DeliveryChallan.is_returned == False,
        or_(
            DeliveryChallan.expected_return_date < today,
            DeliveryChallan.delivery_date < threshold_date
        )
    ).order_by(DeliveryChallan.delivery_date.asc()).all()


def record_return(
    db: Session,
    challan_id: int,
    return_data: List[dict],
    returned_by: Optional[int] = None
) -> DeliveryChallan:
    """Record partial or full return of items."""
    try:
        challan = db.query(DeliveryChallan).options(
            joinedload(DeliveryChallan.items)
        ).filter(
            DeliveryChallan.id == challan_id,
            DeliveryChallan.is_active == True
        ).first()

        if not challan:
            raise HTTPException(status_code=404, detail="Challan not found")
        if challan.status != DeliveryStatus.CONFIRMED:
            raise HTTPException(status_code=400, detail="Can only return items on confirmed challans")

        for return_item in return_data:
            item = next((i for i in challan.items if i.id == return_item.get('id')), None)
            if not item:
                continue

            return_qty = return_item.get('quantity_returned', 0)
            if return_qty <= 0:
                continue

            # Check for over-return
            pending_qty = item.quantity_sent - item.quantity_returned
            if return_qty > pending_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot return {return_qty} for '{item.description}'. Maximum returnable is {pending_qty}."
                )

            item.quantity_returned += return_qty

            # Ledger movement: returning OUTWARD items brings stock INWARD, returning INWARD items sends stock OUTWARD
            if challan.dc_type in [DCType.WITHOUT_BILL_OUTWARD, DCType.WITH_BILL_OUTWARD]:
                movement = MovementType.INWARD
            else:
                movement = MovementType.OUTWARD

            ledger_entry = StockLedger(
                model_id=item.model_id,
                quantity=return_qty,
                movement_type=movement,
                reference_type=ReferenceType.DELIVERY_CHALLAN,
                reference_record_id=challan.id,
                reference_doc_no=challan.challan_no,
                created_at=datetime.now()
            )
            db.add(ledger_entry)

        # Check if ALL items on the challan are fully returned
        all_returned = all(item.is_fully_returned for item in challan.items)

        if all_returned:
            challan.is_returned = True
            challan.returned_at = datetime.now()
            challan.status = DeliveryStatus.COMPLETED

        db.commit()
        db.refresh(challan)
        return _get_challan_with_relations(db, challan.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record return: {str(e)}")


def get_pending_returns_summary(db: Session) -> dict:
    """Get summary of pending returns for dashboard."""
    all_pending = db.query(DeliveryChallan).filter(
        DeliveryChallan.is_active == True,
        DeliveryChallan.status == DeliveryStatus.CONFIRMED,
        DeliveryChallan.is_returned == False,
        DeliveryChallan.dc_type.in_([
            DCType.WITHOUT_BILL_OUTWARD,
            DCType.WITHOUT_BILL_INWARD
        ])
    ).all()

    today = date.today()
    six_months_ago = today - timedelta(days=180)

    overdue = [d for d in all_pending if d.expected_return_date and d.expected_return_date < today]
    long_pending = [d for d in all_pending if d.delivery_date and d.delivery_date < six_months_ago]

    return {
        "overdue": overdue,
        "long_pending": long_pending,
        "pending": all_pending,   
        "total_pending": len(all_pending),
        "total_overdue": len(overdue),
        "total_long_pending": len(long_pending)
    }