from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy.orm import Session, joinedload 

from app.db.session import get_db
from app.models.product_group import ProductGroup
from app.models.manufacturer import Manufacturer
from app.schemas.product_group import (
    ProductGroupCreate, 
    ProductGroupUpdate, 
    ProductGroupResponse, 
    ProductGroupListResponse
)
from app.crud import product_group as crud_pg
from app.api.deps import get_current_user

router = APIRouter(prefix="/product-groups", tags=["Product Groups"])

# 1. CREATE: Create a new Product Group
@router.post("/", response_model=ProductGroupResponse, status_code=status.HTTP_201_CREATED)
def create_pg(payload: ProductGroupCreate, db: Session = Depends(get_db),user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    # RELATIONAL CHECK: Ensure the Manufacturer exists
    mfr_exists = db.query(Manufacturer).filter(Manufacturer.id == payload.manufacturer_id).first()
    if not mfr_exists:
        raise HTTPException(
            status_code=404, 
            detail=f"Manufacturer with id {payload.manufacturer_id} not found"
        )
    
    return crud_pg.create_product_group(db=db, data=payload)


# 2. READ: Get a paginated list of Groups
@router.get("/", response_model=ProductGroupListResponse)
def read_pgs(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    items = crud_pg.get_product_groups(db, skip=skip, limit=limit)
    total_count = db.query(ProductGroup).count()
    
    return {
        "total": total_count,
        "page": (skip // limit) + 1,
        "limit": limit,
        "data": items
    }


# 3. READ: Get all groups for a specific Manufacturer
@router.get("/by-manufacturer/{mfr_id}", response_model=List[ProductGroupResponse])
def read_pgs_by_mfr(mfr_id: int, db: Session = Depends(get_db),user=Depends(get_current_user)):
    # Check if manufacturer exists first
    mfr = db.query(Manufacturer).filter(Manufacturer.id == mfr_id).first()
    if not mfr:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
        
    return crud_pg.get_groups_by_manufacturer(db, manufacturer_id=mfr_id)


# 4. DELETE: Remove a group
@router.delete("/{pg_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pg(pg_id: int, db: Session = Depends(get_db),user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    success = crud_pg.delete_product_group(db, productgroup_id=pg_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product Group not found")
    return None

# 5. UPDATE: Update group details or move it to a different Manufacturer
@router.put("/{pg_id}", response_model=ProductGroupResponse)
def update_pg(
    pg_id: int, 
    payload: ProductGroupUpdate, 
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    # 1. Fetch the existing record
    db_pg = db.query(ProductGroup).filter(ProductGroup.id == pg_id).first()
    if not db_pg:
        raise HTTPException(status_code=404, detail="Product Group not found")

    # 2. RELATIONAL CHECK: If the user is trying to change the Manufacturer
    if payload.manufacturer_id is not None:
        mfr_exists = db.query(Manufacturer).filter(Manufacturer.id == payload.manufacturer_id).first()
        if not mfr_exists:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot move group: Manufacturer {payload.manufacturer_id} does not exist"
            )

    # 3. Call the CRUD update logic
    updated_pg = crud_pg.update_product_group(db=db, group_id=pg_id, data=payload)
    return updated_pg

# 6. READ: Get a single Product Group by ID
@router.get("/{pg_id}", response_model=ProductGroupResponse)
def read_product_group(pg_id: int, db: Session = Depends(get_db),user=Depends(get_current_user)):
    # Use joinedload to bring the Manufacturer details in one SQL query
    db_pg = db.query(ProductGroup)\
        .options(joinedload(ProductGroup.manufacturer))\
        .filter(ProductGroup.id == pg_id)\
        .first()
    
    if not db_pg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Product Group with id {pg_id} not found"
        )
    return db_pg