from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierListResponse,  # New schema
)
from app.models.supplier import Supplier
from app.crud.supplier import (
    create_supplier,
    get_supplier,
    list_suppliers,
    update_supplier,
    deactivate_supplier,
    reactivate_supplier
)
from app.auth.dependencies import require_permission
from app.core.permisiion import(
    SUPPLIER_VIEW ,
    SUPPLIER_CREATE ,
    SUPPLIER_UPDATE ,
    SUPPLIER_DELETE ,
)
from app.models.users import User

router = APIRouter(
    prefix="/suppliers", 
    tags=["Suppliers"],
    responses={
        404: {"description": "Supplier not found"},
        400: {"description": "Bad request"},
    }
)


# -------------------------------------------------------
# Create Supplier
# -------------------------------------------------------
@router.post("/", response_model=SupplierResponse, status_code=201)
def create_supplier_endpoint(
    supplier: SupplierCreate,
    current_user: User = Depends(
    require_permission(SUPPLIER_CREATE)
    ),
db: Session = Depends(get_db),
):
    """Create a new supplier with auto-generated supplier code"""
    return create_supplier(db, supplier)


# -------------------------------------------------------
# Bulk Create Suppliers
# -------------------------------------------------------
#later development

# -------------------------------------------------------
# List Suppliers (with pagination & search)
# -------------------------------------------------------
@router.get("/", response_model=SupplierListResponse)
def list_suppliers_endpoint(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    search: Optional[str] = Query(None, description="Search by name, code, GSTIN, or contact"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    current_user: User = Depends(
    require_permission(SUPPLIER_VIEW)
    ),
db: Session = Depends(get_db),
):
    """
    List suppliers with optional search and pagination.
    
    - **skip**: Records to skip (for pagination)
    - **limit**: Maximum records (1-500)
    - **search**: Search across company name, supplier code, GSTIN, contact names
    - **is_active**: Filter active/inactive suppliers
    """
    return list_suppliers(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
    )


# -------------------------------------------------------
# Get Supplier by Code
# -------------------------------------------------------
@router.get("/code/{supplier_code}", response_model=SupplierResponse)
def get_supplier_by_code_endpoint(
    supplier_code: str,
    current_user: User = Depends(
    require_permission(SUPPLIER_VIEW)
    ),
db: Session = Depends(get_db),
):
    """Get supplier by their unique supplier code (e.g., SUP00001)"""
    supplier = db.query(Supplier).filter(
        Supplier.supplier_code == supplier_code.upper()
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=404,
            detail=f"Supplier with code '{supplier_code}' not found"
        )
    
    return supplier


# -------------------------------------------------------
# Get One Supplier
# -------------------------------------------------------
@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier_endpoint(
    supplier_id: int,
    current_user: User = Depends(
    require_permission(SUPPLIER_VIEW)
    ),
db: Session = Depends(get_db),
):
    """Get supplier details by ID"""
    return get_supplier(db, supplier_id)


# -------------------------------------------------------
# Update Supplier
# -------------------------------------------------------
@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier_endpoint(
    supplier_id: int,
    supplier: SupplierUpdate,
    current_user: User = Depends(
    require_permission(SUPPLIER_UPDATE)
    ),
db: Session = Depends(get_db),
):
    """Update supplier details (partial update supported)"""
    return update_supplier(db, supplier_id, supplier)


# -------------------------------------------------------
# Deactivate Supplier (Soft Delete)
# -------------------------------------------------------
@router.delete("/{supplier_id}", response_model=SupplierResponse)
def deactivate_supplier_endpoint(
    supplier_id: int,
   current_user: User = Depends(
    require_permission(SUPPLIER_DELETE)
    ),
db: Session = Depends(get_db),
):
    """
    Deactivate a supplier (soft delete).
    The supplier record is preserved but marked as inactive.
    """
    return deactivate_supplier(db, supplier_id)


# -------------------------------------------------------
# Reactivate Supplier
# -------------------------------------------------------
@router.put("/{supplier_id}/reactivate", response_model=SupplierResponse)
def reactivate_supplier_endpoint(
    supplier_id: int,
    current_user: User = Depends(
    require_permission(SUPPLIER_CREATE)
    ),
db: Session = Depends(get_db),
):
    """Reactivate a previously deactivated supplier"""
    return reactivate_supplier(db, supplier_id)