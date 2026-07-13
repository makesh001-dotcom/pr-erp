from app.crud.audit_log import create_audit_log


def log_action(
    db,
    user,
    action: str,
    module: str,
    record_id: int = None,
    record_no: str = None,
    description: str = None,
):
    """Quick helper to log an action"""
    try:
        create_audit_log(
            db=db,
            user_id=getattr(user, "id", None),
            username=getattr(user, "username", "System"),
            action=action,
            module=module,
            record_id=record_id,
            record_no=record_no,
            description=description,
        )
    except Exception:
        pass  # Never let audit logging break the main operation