from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.sales import (
    SalesCreate,
    SalesUpdate,
    SalesResponse,
    SalesListResponse,
)
from app.crud.sales import (
    create_sales,
    get_sales,
    list_sales,
    update_sales,
    post_sales,
    cancel_sales,
)

from app.auth.dependencies import require_permission
from app.core.permisiion import(
    SALE_VIEW ,
    SALE_CREATE ,
    SALE_UPDATE ,
    SALE_DELETE ,
)
from app.models.users import User
router = APIRouter(
    prefix="/api/v1/sales",
    tags=["Sales"],
    responses={
        404: {"description": "Sales/Client/Model not found"},
        400: {"description": "Bad request / stock unavailable"},
    }
)


# -------------------------------------------------------
# Create Sales
# -------------------------------------------------------
@router.post("/", response_model=SalesResponse, status_code=201)
def create_sales_endpoint(
    data: SalesCreate,
     current_user: User = Depends(
    require_permission(SALE_CREATE)
    ),
db: Session = Depends(get_db),
):
    """Create a new sales order as DRAFT"""
    return create_sales(db, data)


# -------------------------------------------------------
# List Sales
# -------------------------------------------------------
@router.get("/", response_model=SalesListResponse)
def list_sales_endpoint(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records"),
    client_id: Optional[int] = Query(None, description="Filter by client"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT/POSTED/CANCELLED)"),
    sales_type: Optional[str] = Query(None, description="Filter by sales type"),
     current_user: User = Depends(
    require_permission(SALE_VIEW)
    ),
db: Session = Depends(get_db),
):
    """
    List sales with pagination and optional filters.
    """
    return list_sales(
        db=db,
        skip=skip,
        limit=limit,
        client_id=client_id,
        status=status,
        sales_type=sales_type,
    )


# -------------------------------------------------------
# Get Single Sales
# -------------------------------------------------------
@router.get("/{sales_id}", response_model=SalesResponse)
def get_sales_endpoint(
    sales_id: int,
     current_user: User = Depends(
    require_permission(SALE_VIEW)
    ),
db: Session = Depends(get_db),
):
    """Get a sales order by ID with all items and serial numbers"""
    return get_sales(db, sales_id)


# -------------------------------------------------------
# Update Sales (DRAFT only)
# -------------------------------------------------------
@router.put("/{sales_id}", response_model=SalesResponse)
def update_sales_endpoint(
    sales_id: int,
    data: SalesUpdate,
     current_user: User = Depends(
    require_permission(SALE_UPDATE)
    ),
db: Session = Depends(get_db),
):
    """Update sales details (partial update, DRAFT only)"""
    return update_sales(db, sales_id, data)


# -------------------------------------------------------
# Post Sales (DRAFT → POSTED)
# -------------------------------------------------------
@router.post("/{sales_id}/post", response_model=SalesResponse)
def post_sales_endpoint(
    sales_id: int,
     current_user: User = Depends(
    require_permission(SALE_CREATE)
    ),
db: Session = Depends(get_db),
):
    """
    Post a draft sales.
    Validates stock, updates inventory, changes serial status.
    Sales becomes IMMUTABLE.
    """
    return post_sales(db, sales_id)


# -------------------------------------------------------
# Cancel Sales
# -------------------------------------------------------
@router.post("/{sales_id}/cancel", response_model=SalesResponse)
def cancel_sales_endpoint(
    sales_id: int,
     current_user: User = Depends(
    require_permission(SALE_CREATE)
    ),
db: Session = Depends(get_db),
):
    """Cancel a sales order"""
    return cancel_sales(db, sales_id)