from sqlalchemy.orm import Session
from app.models.manufacturer import Manufacturer


def get_manufacturer(db: Session, skip: int = 0, limit: int = 10, sort_by: str = "id", order: str = "asc"):
    query = db.query(Manufacturer)

    # Sorting
    column = getattr(Manufacturer, sort_by, Manufacturer.id)
    if order == "desc":
        column = column.desc()

    query = query.order_by(column)

    return query.offset(skip).limit(limit).all()

def create_manufacturer(db: Session, data):
    manufacturer = Manufacturer(**data.dict())
    db.add(manufacturer)
    db.commit()
    db.refresh(manufacturer)
    return manufacturer


def delete_manufacturer(db: Session, manufacturer_id: int):
    manufacturer = db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()
    if manufacturer:
        db.delete(manufacturer)
        db.commit()
    return manufacturer


def search_manufacturer(db: Session, query: str):
    return db.query(Manufacturer).filter(
        Manufacturer.name.ilike(f"%{query}%")
    ).all()


def update_manufacturer(db: Session, manufacturer_id: int, data):
    manufacturer = db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()

    if not manufacturer:
        return None

    for key, value in data.dict(exclude_unset=True).items():
        setattr(manufacturer, key, value)

    db.commit()
    db.refresh(manufacturer)
    return manufacturer

from sqlalchemy import or_

from sqlalchemy.dialects.postgresql import insert

def bulk_upsert_manufacturer(db: Session, manufacturer_list: list):
    for item in manufacturer_list:
        stmt = insert(Manufacturer).values(**item)
        
        stmt = stmt.on_conflict_do_update(
            index_elements=['name'],
            set_={
                "name": stmt.excluded.name,
            }
        )
        db.execute(stmt)
    db.commit()  


from sqlalchemy import func

def get_manufacturer_paginated(db: Session, skip: int = 0, limit: int = 10, sort_by: str = "id", order: str = "asc"):
    # Create the base query
    query = db.query(Manufacturer)

    # 1. Get total count before applying offset/limit
    total_count = query.count()

    # 2. Apply Sorting
    column = getattr(Manufacturer, sort_by, Manufacturer.id)
    if order == "desc":
        column = column.desc()
    query = query.order_by(column)

    # 3. Apply Pagination and fetch data
    items = query.offset(skip).limit(limit).all()

    # Return a dictionary that matches your ManufacturerListResponse schema
    return {
        "total": total_count,
        "page": (skip // limit) + 1,
        "limit": limit,
        "data": items
    }