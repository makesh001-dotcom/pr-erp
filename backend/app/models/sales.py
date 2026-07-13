import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    ForeignKey,
    Numeric,
    Enum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.models import Model
    from app.models.models import StockLedger


# ============================================================
# ENUMS
# ============================================================

class SalesType(str, enum.Enum):
    NORMAL_SALE = "NORMAL_SALE"
    DEMO_TO_CUSTOMER = "DEMO_TO_CUSTOMER"           # ⭐ Added
    DEMO_RETURN_TO_SUPPLIER = "DEMO_RETURN_TO_SUPPLIER"
    FREE_OF_COST = "FREE_OF_COST"
    WARRANTY_REPLACEMENT = "WARRANTY_REPLACEMENT"   # ⭐ Future
    INTERNAL_USE = "INTERNAL_USE"                   # ⭐ Future


class SalesStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    CANCELLED = "CANCELLED"


# ============================================================
# COUNTER
# ============================================================

class SalesCounter(Base):
    __tablename__ = "sales_counter"

    id: Mapped[int] = mapped_column(primary_key=True)
    current_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


# ============================================================
# SALES HEADER
# ============================================================

class SalesOutward(Base):
    __tablename__ = "sales_outward"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    sales_no: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id"), nullable=False, index=True
    )

    # Historical snapshots
    client_name: Mapped[str] = mapped_column(String(200), nullable=False)
    client_gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)

    invoice_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    invoice_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    sales_type: Mapped[SalesType] = mapped_column(
        Enum(SalesType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )

    status: Mapped[SalesStatus] = mapped_column(
        Enum(SalesStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=SalesStatus.DRAFT,
        nullable=False,
    )

    # Financial Summary
    total_amount: Mapped[float] = mapped_column(
        Numeric(14, 2), default=0.00, nullable=False
    )
    tax_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    grand_total: Mapped[float] = mapped_column(
        Numeric(14, 2), default=0.00, nullable=False
    )

    courier_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivered_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="sales")  # ⭐ Fixed
    items: Mapped[List["SalesItem"]] = relationship(
        "SalesItem", back_populates="sales", cascade="all, delete-orphan"
    )


# ============================================================
# SALES ITEMS
# ============================================================

class SalesItem(Base):
    __tablename__ = "sales_item"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    sales_id: Mapped[int] = mapped_column(
        ForeignKey("sales_outward.id", ondelete="CASCADE"), nullable=False, index=True
    )

    model_id: Mapped[int] = mapped_column(
        ForeignKey("model.id"), nullable=False, index=True
    )

    # Historical snapshots
    model_no: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    sales: Mapped["SalesOutward"] = relationship("SalesOutward", back_populates="items")
    model: Mapped["Model"] = relationship(back_populates="sales_items")  # ⭐ Fixed

    # ⭐ Each SalesItem creates ONE StockLedger entry (1:1)
    ledger_entry: Mapped[Optional["StockLedger"]] = relationship(
        "StockLedger", back_populates="sales_item", uselist=False
    )

    serial_numbers: Mapped[List["SalesItemSerial"]] = relationship(
        "SalesItemSerial", back_populates="sales_item", cascade="all, delete-orphan"
    )


# ============================================================
# SERIAL NUMBERS
# ============================================================

class SalesItemSerial(Base):
    __tablename__ = "sales_item_serials"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    sales_item_id: Mapped[int] = mapped_column(
        ForeignKey("sales_item.id", ondelete="CASCADE"), nullable=False, index=True
    )

    serial_number: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    sales_item: Mapped["SalesItem"] = relationship(
        "SalesItem", back_populates="serial_numbers"
    )