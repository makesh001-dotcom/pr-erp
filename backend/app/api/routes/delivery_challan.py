from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.delivery import (
    create_delivery_challan,
    get_delivery_challan,
    list_delivery_challans,
    update_delivery_challan,
    confirm_delivery_challan,
    cancel_delivery_challan,
    delete_delivery_challan,
    get_challans_by_reference,
    get_pending_deliveries,
    
    get_pending_returns_summary,
    get_overdue_deliveries,
    record_return,
)
from app.schemas.delivery_challan import (
    DeliveryChallanCreate,
    DeliveryChallanUpdate,
    DeliveryChallanResponse,
    DeliveryChallanListResponse,
    DeliveryConfirmRequest,
    DeliveryCancelRequest,
    ReturnItemRequest,
)
from app.models.delivery_challan import DeliveryStatus
from app.auth.dependencies import require_permission
from app.core.permisiion import (
    DELIVERY_VIEW,
    DELIVERY_CREATE,
    DELIVERY_UPDATE,
    DELIVERY_DELETE,
    DELIVERY_PRINT,
)
from app.models.users import User

router = APIRouter(prefix="/delivery", tags=["Delivery Challans"])


# ============================================
# LIST & DASHBOARD / UTILITY (STATIC ROUTES FIRST)
# ============================================

@router.get("/", response_model=DeliveryChallanListResponse)
def list_challans(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in challan_no, reference_no, remarks"),
    status: Optional[DeliveryStatus] = Query(None, description="Filter by status"),
    client_id: Optional[int] = Query(None, description="Filter by client"),
    reference_no: Optional[str] = Query(None, description="Filter by reference number"),
    from_date: Optional[datetime] = Query(None, description="From date"),
    to_date: Optional[datetime] = Query(None, description="To date"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    current_user: User = Depends(require_permission(DELIVERY_VIEW)),
    db: Session = Depends(get_db),
):
    challans, total = list_delivery_challans(
        db=db,
        page=page,
        limit=limit,
        status=status,
        client_id=client_id,
        reference_no=reference_no,
        search=search,
        from_date=from_date,
        to_date=to_date,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    
    return DeliveryChallanListResponse(
        items=challans,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/dashboard/pending", response_model=List[DeliveryChallanResponse])
def get_pending(
    client_id: Optional[int] = Query(None, description="Filter by client"),
    current_user: User = Depends(require_permission(DELIVERY_VIEW)),
    db: Session = Depends(get_db),
):
    return get_pending_deliveries(db, client_id=client_id)


@router.get("/dashboard/overdue", response_model=List[DeliveryChallanResponse])
def get_overdue_challans(
    days: int = Query(180, description="Days threshold for long pending"),
    current_user: User = Depends(require_permission(DELIVERY_VIEW)),
    db: Session = Depends(get_db),
):
    """
    Get overdue and long-pending delivery challans past expected return date or threshold.
    """
    return get_overdue_deliveries(db, days_threshold=days)


@router.get("/dashboard/returns-summary")
def get_returns_dashboard(
    current_user: User = Depends(require_permission(DELIVERY_VIEW)),
    db: Session = Depends(get_db),
):
    """
    Get summary of pending returns for dashboard metrics.
    """
    return get_pending_returns_summary(db)


@router.get("/by-reference/{reference_no}", response_model=List[DeliveryChallanResponse])
def get_by_reference(
    reference_no: str,
    current_user: User = Depends(require_permission(DELIVERY_VIEW)),
    db: Session = Depends(get_db),
):
    challans = get_challans_by_reference(db, reference_no)
    
    if not challans:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No delivery challans found with reference: {reference_no}"
        )
    
    return challans


# ============================================
# CREATE DRAFT
# ============================================

@router.post("/", response_model=DeliveryChallanResponse, status_code=status.HTTP_201_CREATED)
def create_challan(
    challan_data: DeliveryChallanCreate,
    current_user: User = Depends(require_permission(DELIVERY_CREATE)),
    db: Session = Depends(get_db),
):
    return create_delivery_challan(
        db=db,
        challan_data=challan_data,
        created_by=current_user.id if current_user else None,
    )


# ============================================
# DYNAMIC PATH PARAMETER ROUTES (/{challan_id})
# ============================================

@router.get("/{challan_id}", response_model=DeliveryChallanResponse)
def get_challan(
    challan_id: int,
    current_user: User = Depends(require_permission(DELIVERY_VIEW)),
    db: Session = Depends(get_db),
):
    return get_delivery_challan(db, challan_id)


@router.put("/{challan_id}", response_model=DeliveryChallanResponse)
def update_challan(
    challan_id: int,
    challan_data: DeliveryChallanUpdate,
    current_user: User = Depends(require_permission(DELIVERY_UPDATE)),
    db: Session = Depends(get_db),
):
    return update_delivery_challan(
        db=db,
        challan_id=challan_id,
        challan_data=challan_data,
        updated_by=current_user.id if current_user else None,
    )


@router.post("/{challan_id}/confirm", response_model=DeliveryChallanResponse)
def confirm_challan(
    challan_id: int,
    confirm_data: Optional[DeliveryConfirmRequest] = None,
    current_user: User = Depends(require_permission(DELIVERY_UPDATE)),
    db: Session = Depends(get_db),
):
    remarks = confirm_data.remarks if confirm_data else None
    
    return confirm_delivery_challan(
        db=db,
        challan_id=challan_id,
        confirmed_by=current_user.id if current_user else None,
        remarks=remarks,
    )


@router.post("/{challan_id}/cancel", response_model=DeliveryChallanResponse)
def cancel_challan(
    challan_id: int,
    cancel_data: Optional[DeliveryCancelRequest] = None,
    current_user: User = Depends(require_permission(DELIVERY_UPDATE)),
    db: Session = Depends(get_db),
):
    reason = cancel_data.reason if cancel_data else None
    
    return cancel_delivery_challan(
        db=db,
        challan_id=challan_id,
        cancelled_by=current_user.id if current_user else None,
        reason=reason,
    )


@router.post("/{challan_id}/return", response_model=DeliveryChallanResponse)
def record_item_return(
    challan_id: int,
    return_data: ReturnItemRequest,
    current_user: User = Depends(require_permission(DELIVERY_UPDATE)),
    db: Session = Depends(get_db),
):
    """
    Record partial or full return of items. Auto-completes challan when fully returned.
    """
    return record_return(
        db=db,
        challan_id=challan_id,
        return_data=[
            item.model_dump() if hasattr(item, "model_dump") else item.dict() 
            for item in return_data.items
        ],
        returned_by=current_user.id if current_user else None,
    )


@router.delete("/{challan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_challan(
    challan_id: int,
    current_user: User = Depends(require_permission(DELIVERY_DELETE)),
    db: Session = Depends(get_db),
):
    delete_delivery_challan(
        db=db,
        challan_id=challan_id,
        deleted_by=current_user.id if current_user else None,
    )
    return None