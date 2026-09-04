from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Actor Context (Who did it?)
    # Using SET NULL ondelete keeps the log intact even if the actor user gets purged from the DB
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )
    username: Mapped[str] = mapped_column(String(100), nullable=False)

    # Event Categorization
    action: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # CREATE, UPDATE, DELETE, LOGIN, ASSIGN_PERMISSIONS, etc.

    module: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # USERS, ROLES, SALES, INVENTORY, AUTH, etc.

    # Target Entity Context (What was affected?)
    record_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    record_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    target_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    # Detailed Payload & Diff Tracking
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changes: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # Keeps "before" and "after" state

    # Request Forensics
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 support up to 45 chars
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # DB Server Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False, 
        index=True
    )