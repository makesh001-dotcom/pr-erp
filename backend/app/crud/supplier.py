from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.supplier import Supplier
from app.models.supplier_counter import SupplierCounter
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from sqlalchemy import or_
from typing import Optional, Dict, Any

def generate_supplier_code(db: Session):
    counter = (
        db.query(SupplierCounter)
        .with_for_update()
        .first()
    )

    if not counter:
        counter = SupplierCounter(current_count=0)
        db.add(counter)
        db.flush()

    counter.current_count += 1

    return f"SUP{str(counter.current_count).zfill(5)}"

def create_supplier(db: Session, supplier: SupplierCreate):

    supplier_code = generate_supplier_code(db)

    db_supplier = Supplier(
        supplier_code=supplier_code,
        company_name=supplier.company_name,
        gstin=supplier.gstin,
        address=supplier.address,
        state=supplier.state,
        pincode=supplier.pincode,

        person1_name=supplier.person1_name,
        person1_phone=supplier.person1_phone,
        person1_email=supplier.person1_email,

        person2_name=supplier.person2_name,
        person2_phone=supplier.person2_phone,
        person2_email=supplier.person2_email,

        alternate_phone=supplier.alternate_phone,
        alternate_email=supplier.alternate_email,

        website=supplier.website,
        remarks=supplier.remarks,
    )

    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)

    return db_supplier


def get_supplier(db: Session, supplier_id: int):
    return (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id)
        .first()
    )

from typing import Optional, Dict, Any
from sqlalchemy import or_

def list_suppliers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = True
) -> Dict[str, Any]:
    """List suppliers with pagination and search"""
    
    query = db.query(Supplier)
    
    # Filter active/inactive
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    # Search across multiple fields
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Supplier.company_name.ilike(search_term),
                Supplier.supplier_code.ilike(search_term),
                Supplier.gstin.ilike(search_term),
                Supplier.person1_name.ilike(search_term),
                Supplier.person2_name.ilike(search_term),
                Supplier.state.ilike(search_term),
            )
        )
    
    total = query.count()
    suppliers = (
        query
        .order_by(Supplier.company_name)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": suppliers
    }

def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate):

    supplier = get_supplier(db, supplier_id)

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    updates = data.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(supplier, key, value)

    db.commit()
    db.refresh(supplier)

    return supplier

def deactivate_supplier(db: Session, supplier_id: int):

    supplier = get_supplier(db, supplier_id)

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.is_active = False

    db.commit()

    return supplier

def reactivate_supplier(db: Session, supplier_id: int):
    supplier = get_supplier(db, supplier_id)
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    if supplier.is_active:
        raise HTTPException(
            status_code=400, 
            detail="Supplier is already active"
        )
    
    supplier.is_active = True
    db.commit()
    db.refresh(supplier)
    return supplier