import re
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.models.supplier_counter import SupplierCounter
from app.schemas.supplier import SupplierCreate, SupplierUpdate


def generate_supplier_code(db: Session) -> str:
    """Generates sequential supplier code (SUP00001) while self-healing sequence sync issues."""
    counter = db.query(SupplierCounter).with_for_update().first()

    if not counter:
        counter = SupplierCounter(current_count=0)
        db.add(counter)
        db.flush()

    while True:
        counter.current_count += 1
        candidate_code = f"SUP{str(counter.current_count).zfill(5)}"

        # Check if candidate code already exists in suppliers table
        exists = (
            db.query(Supplier.id)
            .filter(Supplier.supplier_code == candidate_code)
            .first()
        )
        if not exists:
            return candidate_code

        # Self-heal counter if DB contains higher codes (e.g., manually inserted records)
        max_code = db.query(func.max(Supplier.supplier_code)).scalar()
        if max_code:
            match = re.search(r"\d+", max_code)
            if match:
                counter.current_count = int(match.group())


def create_supplier(db: Session, supplier: SupplierCreate) -> Supplier:
    # 1. Duplicate Company Name Check
    existing_company = (
        db.query(Supplier)
        .filter(
            func.lower(Supplier.company_name) == supplier.company_name.lower()
        )
        .first()
    )
    if existing_company:
        raise HTTPException(
            status_code=400,
            detail=f"Supplier with company name '{supplier.company_name}' already exists.",
        )

    # 2. Duplicate GSTIN Check (if GSTIN provided)
    if supplier.gstin:
        existing_gstin = (
            db.query(Supplier)
            .filter(Supplier.gstin == supplier.gstin.upper())
            .first()
        )
        if existing_gstin:
            raise HTTPException(
                status_code=400,
                detail=f"Supplier with GSTIN '{supplier.gstin}' already exists.",
            )

    # 3. Safe Generation and Insertion
    supplier_code = generate_supplier_code(db)
    supplier_data = supplier.model_dump()

    db_supplier = Supplier(
        supplier_code=supplier_code,
        **supplier_data,
    )

    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)

    return db_supplier


def get_supplier(db: Session, supplier_id: int) -> Optional[Supplier]:
    return db.query(Supplier).filter(Supplier.id == supplier_id).first()


def list_suppliers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
) -> Dict[str, Any]:
    """List suppliers with optimized pagination and search."""

    query = db.query(Supplier)

    # Filter active status
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)

    # Search across relevant text columns
    if search and search.strip():
        search_term = f"%{search.strip()}%"
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

    # Optimized total count call
    total = query.with_entities(func.count(Supplier.id)).scalar() or 0

    suppliers = (
        query.order_by(Supplier.company_name)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": suppliers,
    }


def update_supplier(
    db: Session, supplier_id: int, data: SupplierUpdate
) -> Supplier:
    supplier = get_supplier(db, supplier_id)

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    updates = data.model_dump(exclude_unset=True)

    # Validate duplicate GSTIN on update
    if "gstin" in updates and updates["gstin"]:
        existing_gstin = (
            db.query(Supplier)
            .filter(
                Supplier.gstin == updates["gstin"].upper(),
                Supplier.id != supplier_id,
            )
            .first()
        )
        if existing_gstin:
            raise HTTPException(
                status_code=400,
                detail=f"Supplier with GSTIN '{updates['gstin']}' already exists.",
            )

    # Validate duplicate Company Name on update
    if "company_name" in updates and updates["company_name"]:
        existing_company = (
            db.query(Supplier)
            .filter(
                func.lower(Supplier.company_name)
                == updates["company_name"].lower(),
                Supplier.id != supplier_id,
            )
            .first()
        )
        if existing_company:
            raise HTTPException(
                status_code=400,
                detail=f"Supplier with company name '{updates['company_name']}' already exists.",
            )

    for key, value in updates.items():
        setattr(supplier, key, value)

    db.commit()
    db.refresh(supplier)

    return supplier


def deactivate_supplier(db: Session, supplier_id: int) -> Supplier:
    supplier = get_supplier(db, supplier_id)

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if not supplier.is_active:
        raise HTTPException(
            status_code=400, detail="Supplier is already inactive"
        )

    supplier.is_active = False
    db.commit()
    db.refresh(supplier)

    return supplier


def reactivate_supplier(db: Session, supplier_id: int) -> Supplier:
    supplier = get_supplier(db, supplier_id)

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if supplier.is_active:
        raise HTTPException(
            status_code=400, detail="Supplier is already active"
        )

    supplier.is_active = True
    db.commit()
    db.refresh(supplier)

    return supplier