from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from typing import TYPE_CHECKING,List
from app.db.session import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
if TYPE_CHECKING:
    from app.models.supplier import Supplier
    from app.models.models import PurchaseItem,PurchaseInward

class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    supplier_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False
    )

    company_name: Mapped[str] = mapped_column(
        String(200),
        index=True,
        nullable=False
    )

    gstin: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    address: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    state: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    pincode: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    person1_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    person1_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    person1_email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    person2_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    person2_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    person2_email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    alternate_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    alternate_email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    website: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )

    remarks: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    purchases: Mapped[List["PurchaseInward"]] = relationship(
        "PurchaseInward", back_populates="supplier"
    )