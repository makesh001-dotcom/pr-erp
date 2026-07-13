from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)

    action: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # CREATE, UPDATE, DELETE, POST, CANCEL, REACTIVATE, LOGIN, LOGOUT

    module: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # PURCHASE, SALES, CLIENT, SUPPLIER, MODEL, QUOTATION

    record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    record_no: Mapped[str | None] = mapped_column(String(100), nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )