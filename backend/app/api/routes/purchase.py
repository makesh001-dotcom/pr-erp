from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseUpdate,
    PurchaseResponse,
    PurchaseListResponse,
)
from app.crud.purchase import (
    create_purchase,
    get_purchase,
    list_purchases,
    update_purchase,
    post_purchase,
    cancel_purchase,
)
from app.auth.dependencies import require_permission
from app.core.permisiion import(
    PURCHASE_VIEW ,
    PURCHASE_CREATE ,
    PURCHASE_UPDATE ,
    PURCHASE_DELETE ,
)
from app.models.users import User

router = APIRouter(
    prefix="/purchases",  # ⭐ Plural is REST standard 
    tags=["Purchases"],
    responses={
        404: {"description": "Purchase/Supplier/Model not found"},
        400: {"description": "Bad request / duplicate serial"},
    }
)


# -------------------------------------------------------
# Create Purchase
# -------------------------------------------------------
@router.post("/", response_model=PurchaseResponse, status_code=201)
def create_purchase_endpoint(
    data: PurchaseCreate,
     current_user: User = Depends(
    require_permission(PURCHASE_CREATE)
    ),
db: Session = Depends(get_db),
):
    """Create a new purchase inward with items, serials, and stock updates"""
    return create_purchase(db, data)


# -------------------------------------------------------
# List Purchases
# -------------------------------------------------------
@router.get("/", response_model=PurchaseListResponse)
def list_purchases_endpoint(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records"),
    supplier_id: Optional[int] = Query(None, description="Filter by supplier"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT/POSTED/CANCELLED)"),
    purchase_type: Optional[str] = Query(None, description="Filter by type"),
   current_user: User = Depends(
    require_permission(PURCHASE_VIEW)
    ),
db: Session = Depends(get_db),
):
    """
    List purchases with pagination and optional filters.
    
    - **skip**: Number of records to skip
    - **limit**: Maximum records to return (1-500)
    - **supplier_id**: Filter by supplier
    - **status**: Filter by purchase status
    - **purchase_type**: Filter by purchase type
    """
    return list_purchases(
        db=db,
        skip=skip,
        limit=limit,
        supplier_id=supplier_id,
        status=status,
        purchase_type=purchase_type,
    )


# -------------------------------------------------------
# Get Single Purchase
# -------------------------------------------------------
@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase_endpoint(
    purchase_id: int,
     current_user: User = Depends(
    require_permission(PURCHASE_VIEW)
    ),
db: Session = Depends(get_db),
):
    """Get a purchase by ID with all items and serial numbers"""
    return get_purchase(db, purchase_id)


# -------------------------------------------------------
# Update Purchase
# -------------------------------------------------------
@router.put("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase_endpoint(
    purchase_id: int,
    data: PurchaseUpdate,
     current_user: User = Depends(
    require_permission(PURCHASE_UPDATE)
    ),
db: Session = Depends(get_db),
):
    """Update purchase details (partial update supported)"""
    return update_purchase(db, purchase_id, data)


# -------------------------------------------------------
# Post Purchase (DRAFT → POSTED)
# -------------------------------------------------------
@router.post("/{purchase_id}/post", response_model=PurchaseResponse)
def post_purchase_endpoint(
    purchase_id: int,
     current_user: User = Depends(
    require_permission(PURCHASE_CREATE)
    ),
db: Session = Depends(get_db),
):
    """
    Post a draft purchase.
    Changes status from DRAFT to POSTED and creates stock ledger entries.
    """
    return post_purchase(db, purchase_id)


# -------------------------------------------------------
# Cancel Purchase
# -------------------------------------------------------
@router.post("/{purchase_id}/cancel", response_model=PurchaseResponse)
def cancel_purchase_endpoint(
    purchase_id: int,
     current_user: User = Depends(
    require_permission(PURCHASE_CREATE)
    ),
db: Session = Depends(get_db),
):
    """Cancel a purchase (POSTED → CANCELLED). Reverses stock if needed."""
    return cancel_purchase(db, purchase_id)