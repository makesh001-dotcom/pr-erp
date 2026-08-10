from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.demo_tracking import get_demo_tracking, get_demo_stats
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import require_permission
from app.core.permisiion import (
    DEMO_CREATE,
    DEMO_DELETE,
    DEMO_UPDATE,
    DEMO_VIEW,
)
from app.models.users import User
from app.crud.demo_tracking import(
    get_demo_stats,
    get_demo_tracking,
    get_serial_by_number,
    link_serial_to_dc,
)
from app.models.delivery_challan import DeliveryChallan
from pydantic import BaseModel
from typing import Literal

class LinkDCRequest(BaseModel):
    serial_number: str
    dc_id: int
    direction: Literal["OUT", "IN"] = "OUT"


router = APIRouter(
    prefix="/demo-tracking",
    tags=["Demo Tracking"],
)


@router.get("/")
def list_demo_tracking(
    demo_type: str = Query("all", description="all | with_customer | from_supplier | overdue"),
    current_user: User = Depends(
    require_permission(DEMO_VIEW)
),
db: Session = Depends(get_db),
):
    """
    Get demo tracking data.
    
    - **demo_type=all**: Show all demo units
    - **demo_type=with_customer**: Only demos currently with customers
    - **demo_type=from_supplier**: Only demos from suppliers
    - **demo_type=overdue**: Only overdue demos
    """
    return get_demo_tracking(db, demo_type)


@router.get("/stats")
def demo_statistics(current_user: User = Depends(
    require_permission(DEMO_VIEW)
),
db: Session = Depends(get_db),):
    """Get demo summary statistics for dashboard"""
    return get_demo_stats(db)

@router.post("/link-dc")
def link_serial_to_delivery_challan(
    request: LinkDCRequest,
    current_user: User = Depends(require_permission(DEMO_UPDATE)),
    db: Session = Depends(get_db),
):
    serial = get_serial_by_number(db, request.serial_number)
    if not serial:
        raise HTTPException(status_code=404, detail="Serial number not found")

    dc = (
        db.query(DeliveryChallan)
        .filter(DeliveryChallan.id == request.dc_id)
        .first()
    )
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")

    link = link_serial_to_dc(
        db=db,
        serial_id=serial.id,
        dc_id=request.dc_id,
        direction=request.direction,
    )

    return {
        "message": "Linked successfully",
        "link_id": link.id,
    }