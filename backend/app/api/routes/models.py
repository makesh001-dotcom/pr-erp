from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import Model, StockLedger
from app.models.product_group import ProductGroup
from app.schemas.model import (
    ModelCreate, 
    ModelUpdate, 
    ModelResponse, 
    ModelListResponse
)
from app.crud import models as crud_models 
from app.api.deps import get_current_user

router = APIRouter(prefix="/models", tags=["Models"])

# 1. CREATE
@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
def create_model(payload: ModelCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    
    group = db.query(ProductGroup).filter(ProductGroup.id == payload.product_group_id).first()
    if not group:
        raise HTTPException(
            status_code=404, 
            detail=f"Product Group {payload.product_group_id} not found."
        )
    return crud_models.create_model(db=db, data=payload)


# 2. READ ALL (Merged with optional Product Group Filtering to prevent route hijacking)
@router.get("/", response_model=ModelListResponse)
def read_models(
    group_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Model).options(
        joinedload(Model.product_group)
    )

    if group_id is not None:
        query = query.filter(Model.product_group_id == group_id)

    total_count = query.count()
    items = query.offset(skip).limit(limit).all()

    # Calculate real-time stock balances dynamically before returning
    for item in items:
        inward = db.query(func.sum(StockLedger.quantity)).filter(
            StockLedger.model_id == item.id, StockLedger.movement_type == "INWARD"
        ).scalar() or 0
        
        outward = db.query(func.sum(StockLedger.quantity)).filter(
            StockLedger.model_id == item.id, StockLedger.movement_type == "OUTWARD"
        ).scalar() or 0
        
        adj_in = db.query(func.sum(StockLedger.quantity)).filter(
            StockLedger.model_id == item.id, StockLedger.movement_type == "ADJUSTMENT", StockLedger.quantity > 0
        ).scalar() or 0
        
        adj_out = db.query(func.sum(StockLedger.quantity)).filter(
            StockLedger.model_id == item.id, StockLedger.movement_type == "ADJUSTMENT", StockLedger.quantity < 0
        ).scalar() or 0

        item.current_stock = (inward + adj_in) - (outward + abs(adj_out))
    
    return {
        "total": total_count,
        "page": (skip // limit) + 1,
        "limit": limit,
        "data": items
    }


# 3. UPDATE (Consolidated & safely linked to CRUD)
@router.put("/{model_id}", response_model=ModelResponse)
def update_model(model_id: int, payload: ModelUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
        
    db_model = db.query(Model).filter(Model.id == model_id).first()
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Call structural crud layer safely
    updated_obj = crud_models.update_model(db=db, model_id=model_id, data=payload)
    
    # Inject live stock values before tracking responses
    inward = db.query(func.sum(StockLedger.quantity)).filter(StockLedger.model_id == model_id, StockLedger.movement_type == "INWARD").scalar() or 0
    outward = db.query(func.sum(StockLedger.quantity)).filter(StockLedger.model_id == model_id, StockLedger.movement_type == "OUTWARD").scalar() or 0
    adj_in = db.query(func.sum(StockLedger.quantity)).filter(StockLedger.model_id == model_id, StockLedger.movement_type == "ADJUSTMENT", StockLedger.quantity > 0).scalar() or 0
    adj_out = db.query(func.sum(StockLedger.quantity)).filter(StockLedger.model_id == model_id, StockLedger.movement_type == "ADJUSTMENT", StockLedger.quantity < 0).scalar() or 0
    
    updated_obj.current_stock = (inward + adj_in) - (outward + abs(adj_out))
    return updated_obj


# 4. SEARCH
@router.get("/search/", response_model=List[ModelResponse])
def search_models(q: str, db: Session = Depends(get_db)):
    return crud_models.search_models(db, query=q)


# 5. DELETE
@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(model_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
        
    success = crud_models.delete_model(db, product_id=model_id)
    if not success:
        raise HTTPException(status_code=404, detail="Model not found")
    return None