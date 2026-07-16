from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.demo_tracking import get_demo_tracking, get_demo_stats

from app.auth.dependencies import require_permission
from app.core.permisiion import (
    DEMO_CREATE,
    DEMO_DELETE,
    DEMO_UPDATE,
    DEMO_VIEW,
)
from app.models.users import User

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