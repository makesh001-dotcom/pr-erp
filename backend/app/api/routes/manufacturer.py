from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload # ADDED joinedload
from typing import List
from app.api.deps import get_current_user

from app.db.session import get_db
from app.models.manufacturer import Manufacturer # Imported as Manufacturer
from app.schemas.manufacturer import (
    ManufacturerCreate, 
    ManufacturerUpdate, 
    ManufacturerResponse, 
    ManufacturerListResponse,
    ManufacturerTree # ADDED this to your imports
)
from app.crud import manufacturer as crud_mfr

from app.auth.dependencies import require_permission
from app.core.permisiion import(
    MANUFACTURER_VIEW,
MANUFACTURER_CREATE ,
MANUFACTURER_UPDATE ,
MANUFACTURER_DELETE ,
)
from app.models.users import User

router = APIRouter(prefix="/manufacturers", tags=["Manufacturers"])

# --- 1. CREATE ---
@router.post("/", response_model=ManufacturerResponse, status_code=status.HTTP_201_CREATED)
def create_manufacturer(
    payload: ManufacturerCreate, 
   current_user: User = Depends(
    require_permission(MANUFACTURER_CREATE)
    ),
db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return crud_mfr.create_manufacturer(db=db, data=payload)

# --- 2. TREE (Place before /{mfr_id} to avoid path conflict) ---
@router.get("/tree/", response_model=List[ManufacturerTree])
def get_manufacturer_tree(
    current_user: User = Depends(
    require_permission(MANUFACTURER_VIEW)
    ),
db: Session = Depends(get_db),
    user=Depends(get_current_user) # Keep consistent auth if needed
):
    """
    Returns Manufacturers with their Product Groups nested.
    Used for the cascading 'hover' menu in React.
    """
    # Use direct 'Manufacturer' since you imported it from models
    tree = db.query(Manufacturer).options(
        joinedload(Manufacturer.groups) 
    ).all()
    return tree

# --- 3. LIST (Paginated) ---
@router.get("/", response_model=ManufacturerListResponse)
def read_manufacturers(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=300),
    sort_by: str = "id",
    order: str = "asc",
    current_user: User = Depends(
    require_permission(MANUFACTURER_VIEW)
    ),
db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    items = crud_mfr.get_manufacturer(
        db, skip=skip, limit=limit, sort_by=sort_by, order=order
    )
    total_count = db.query(Manufacturer).count()
    
    return {
        "total": total_count,
        "page": (skip // limit) + 1,
        "limit": limit,
        "data": items
    }

# --- 4. SEARCH ---
@router.get("/search", response_model=List[ManufacturerResponse])
def search_manufacturers(
    q: str = Query(..., min_length=1), 
    current_user: User = Depends(
    require_permission(MANUFACTURER_VIEW)
    ),
db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return crud_mfr.search_manufacturer(db, query=q)

# --- 5. READ BY ID ---
@router.get("/{mfr_id}", response_model=ManufacturerResponse)
def read_manufacturer_by_id(
    mfr_id: int, 
    current_user: User = Depends(
    require_permission(MANUFACTURER_VIEW)
    ),
db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    db_mfr = db.query(Manufacturer).filter(Manufacturer.id == mfr_id).first()
    if not db_mfr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Manufacturer with id {mfr_id} not found"
        )
    return db_mfr

# --- 6. UPDATE ---
@router.put("/{mfr_id}", response_model=ManufacturerResponse)
def update_manufacturer(
    mfr_id: int, 
    payload: ManufacturerUpdate, 
    current_user: User = Depends(
    require_permission(MANUFACTURER_UPDATE)
    ),
db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    db_mfr = crud_mfr.update_manufacturer(db, manufacturer_id=mfr_id, data=payload)
    if not db_mfr:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    return db_mfr

# --- 7. DELETE ---
@router.delete("/{mfr_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manufacturer(
    mfr_id: int, 
    current_user: User = Depends(
    require_permission(MANUFACTURER_DELETE)
    ),
db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    success = crud_mfr.delete_manufacturer(db, manufacturer_id=mfr_id)
    if not success:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    return None
