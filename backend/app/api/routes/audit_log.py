from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.audit_log import get_audit_logs, get_audit_stats

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
)


@router.get("/")
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    module: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """Get audit logs with filters"""
    return get_audit_logs(
        db=db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        action=action,
        module=module,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/stats")
def audit_statistics(db: Session = Depends(get_db)):
    """Get audit log statistics"""
    return get_audit_stats(db)