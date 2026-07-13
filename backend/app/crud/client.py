from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException

from app.models.client import Client


# -------------------------------------------------------
# CREATE
# -------------------------------------------------------
def create_client(db: Session, data) -> Client:
    """Create a new client"""
    client = Client(**data.dict())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


# -------------------------------------------------------
# READ
# -------------------------------------------------------
def get_client(db: Session, client_id: int) -> Client:
    """Get a single client by ID"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def list_clients(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    sort_by: str = "company_name",
    order: str = "asc",
) -> dict:
    """
    List clients with pagination, search, and filters.
    Returns {"total": int, "skip": int, "limit": int, "data": [...]}
    """
    query = db.query(Client)

    # Active/Inactive filter
    if is_active is not None:
        query = query.filter(Client.is_active == is_active)

    # Search across multiple fields
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Client.company_name.ilike(search_term),
                Client.person1_name.ilike(search_term),
                Client.person2_name.ilike(search_term),
                Client.person1_email.ilike(search_term),
                Client.person1_phone.ilike(search_term),
                Client.gstin.ilike(search_term),
                Client.state.ilike(search_term),
                Client.address.ilike(search_term),
            )
        )

    # Sorting
    column = getattr(Client, sort_by, Client.company_name)
    if order.lower() == "desc":
        column = column.desc()

    total = query.count()
    clients = query.order_by(column).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": clients,
    }


# -------------------------------------------------------
# UPDATE
# -------------------------------------------------------
def update_client(db: Session, client_id: int, data) -> Client:
    """Update client details (partial upyesdate supported)"""
    client = get_client(db, client_id)

    for key, value in data.dict(exclude_unset=True).items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client


# -------------------------------------------------------
# SOFT DELETE / REACTIVATE
# -------------------------------------------------------
def deactivate_client(db: Session, client_id: int) -> Client:
    """Soft delete - mark client as inactive"""
    client = get_client(db, client_id)

    if not client.is_active:
        raise HTTPException(
            status_code=400,
            detail="Client is already deactivated"
        )

    client.is_active = False
    db.commit()
    db.refresh(client)
    return client


def reactivate_client(db: Session, client_id: int) -> Client:
    """Reactivate a deactivated client"""
    client = get_client(db, client_id)

    if client.is_active:
        raise HTTPException(
            status_code=400,
            detail="Client is already active"
        )

    client.is_active = True
    db.commit()
    db.refresh(client)
    return client