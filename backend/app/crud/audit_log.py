from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    user_id: Optional[int],
    username: str,
    action: str,
    module: str,
    record_id: Optional[int] = None,
    record_no: Optional[str] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    """Create an audit log entry"""
    log = AuditLog(
        user_id=user_id,
        username=username or "System",
        action=action,
        module=module,
        record_id=record_id,
        record_no=record_no,
        description=description,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()
    return log


def get_audit_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    module: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    """Get audit logs with filters"""
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if module:
        query = query.filter(AuditLog.module == module)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            AuditLog.description.ilike(search_term)
            | AuditLog.record_no.ilike(search_term)
            | AuditLog.username.ilike(search_term)
        )
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    total = query.count()
    logs = (
        query.order_by(desc(AuditLog.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {"total": total, "skip": skip, "limit": limit, "data": logs}


from sqlalchemy import func

def get_audit_stats(db: Session):
    """Get audit log statistics"""
    today = datetime.utcnow()

    total_today = (
        db.query(func.count(AuditLog.id))
        .filter(AuditLog.created_at >= today.replace(hour=0, minute=0, second=0))
        .scalar()
    )

    # Actions breakdown
    actions_query = (
        db.query(AuditLog.action, func.count(AuditLog.id).label("count"))
        .group_by(AuditLog.action)
        .all()
    )

    # Modules breakdown
    modules_query = (
        db.query(AuditLog.module, func.count(AuditLog.id).label("count"))
        .group_by(AuditLog.module)
        .all()
    )

    return {
        "total_today": total_today or 0,
        "by_action": [{"action": a, "count": c} for a, c in actions_query],
        "by_module": [{"module": m, "count": c} for m, c in modules_query],
    }