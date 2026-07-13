from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.quotation import (
    QuotationCreate,
    QuotationUpdate,
    QuotationResponse,
    QuotationListResponse
)
from app.crud import quotation as crud_quotation
from app.models.quotation import Quotation

router = APIRouter(prefix="/quotations", tags=["Quotations"])

# 1. CREATE A FRESH QUOTATION
@router.post("/", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(
    payload: QuotationCreate, 
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    """
    Generates a brand new base quotation line item with an automated sequential reference number.
    """
    # Restrict creation permissions if necessary based on your corporate policy
    return crud_quotation.create_new_quotation(db=db, data=payload)


# 2. GET ACTIVE REVISION BY NUMBER
@router.get("/active/{quotation_no:path}", response_model=QuotationResponse)
def read_active_quotation(quotation_no: str, db: Session = Depends(get_db)):
    """
    Fetches strictly the currently active production revision matching a specific quotation number string.
    """
    quote = crud_quotation.get_active_quotation(db, quotation_no=quotation_no)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active quotation variation '{quotation_no}' not found."
        )
    return quote


# 3. GET COMPLETE HISTORY TIMELINE
@router.get("/history/{quotation_no:path}", response_model=List[QuotationResponse])
def read_quotation_history(quotation_no: str, db: Session = Depends(get_db)):
    """
    Returns every revision snapshot associated with a quotation number for full audit compliance.
    """
    history_records = crud_quotation.get_quotation_by_number(db, quotation_no=quotation_no)
    if not history_records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No registration metrics found for reference track: '{quotation_no}'"
        )
    return history_records


# 4. EDIT / CREATE NEW REVISION (Hard History Trigger)
@router.put("/revision/{quotation_no:path}", response_model=QuotationResponse)
def revision_quotation(
    quotation_no: str, 
    payload: QuotationUpdate, 
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    """
    Intercepts modifications, updates historical flags on old records, 
    and returns a brand-new child revision row.
    """
    return crud_quotation.handle_quotation_revision(db=db, quotation_no=quotation_no, data=payload)


# 5. LIST AND SEARCH ALL ACTIVE QUOTATIONS
@router.get("/", response_model=QuotationListResponse)
def list_active_quotations(
    q: Optional[str] = Query(None, description="Search client name or company name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retrieves a paginated collection of active baseline quotes for dashboard display.
    """
    query = db.query(Quotation).filter(Quotation.is_active == True)
    
    if q:
        query = query.filter(
            (Quotation.client_name.ilike(f"%{q}%")) | 
            (Quotation.company_name.ilike(f"%{q}%")) |
            (Quotation.quotation_no.ilike(f"%{q}%"))
        )
        
    total_count = query.count()
    records = query.order_by(Quotation.updated_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total_count,
        "page": (skip // limit) + 1,
        "limit": limit,
        "data": records
    }