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
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.supplier import Supplier
    from app.models.models import Model, StockLedger
    from app.models.client import Client

# -------------------------------------------------------
# ENUMS
# -------------------------------------------------------

class PurchaseType(str, enum.Enum):
    NORMAL_PURCHASE = "NORMAL_PURCHASE"
    DEMO_FROM_SUPPLIER = "DEMO_FROM_SUPPLIER"
    DEMO_RETURN_FROM_CUSTOMER = "DEMO_RETURN_FROM_CUSTOMER"


class PurchaseStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"


# -------------------------------------------------------
# PURCHASE COUNTER (for auto-generating purchase_no)
# -------------------------------------------------------

class PurchaseCounter(Base):
    __tablename__ = "purchase_counter"

    id: Mapped[int] = mapped_column(primary_key=True)
    current_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


# -------------------------------------------------------
# PURCHASE HEADER
# -------------------------------------------------------

class PurchaseInward(Base):
    __tablename__ = "purchase_inward"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Auto-generated purchase number (e.g., PUR00001)
    purchase_no: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )

    # Supplier Link
    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.id"), nullable=False, index=True
    )

    # --- Historical Snapshots (NEVER update these after posting) ---
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    supplier_gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)

        # Add after supplier_gstin field:
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id"), nullable=True, index=True
    )
    client_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

# Add relationship:
    client: Mapped[Optional["Client"]] = relationship()

    # Supplier Invoice Reference
    supplier_invoice_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    supplier_invoice_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Purchase Classification
    purchase_type: Mapped[PurchaseType] = mapped_column(
        Enum(PurchaseType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )

    # Purchase Lifecycle
    status: Mapped[PurchaseStatus] = mapped_column(
        Enum(PurchaseStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=PurchaseStatus.DRAFT,
        nullable=False,
    )

    # Payment Tracking
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=PaymentStatus.UNPAID,
        nullable=False,
    )

    # --- Financial Summary (computed from items, stored for performance) ---
    total_amount: Mapped[float] = mapped_column(
        Numeric(14, 2), default=0.00, nullable=False
    )
    tax_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    grand_total: Mapped[float] = mapped_column(
        Numeric(14, 2), default=0.00, nullable=False
    )
    paid_amount: Mapped[float] = mapped_column(
        Numeric(14, 2), default=0.00, nullable=False
    )
    payment_due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Demo-Specific: When all demo items must return
    expected_return_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Applicable only for DEMO_FROM_SUPPLIER. Overarching return deadline."
    )

    # Logistics
    courier_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivered_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Additional Notes
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- Audit Fields ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # --- Relationships ---
    supplier: Mapped["Supplier"] = relationship(back_populates="purchases")

    items: Mapped[List["PurchaseItem"]] = relationship(
        "PurchaseItem", back_populates="purchase", cascade="all, delete-orphan"
    )


# -------------------------------------------------------
# PURCHASE LINE ITEM
# -------------------------------------------------------

class PurchaseItem(Base):
    __tablename__ = "purchase_item"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Parent Purchase
    purchase_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_inward.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Model Reference
    model_id: Mapped[int] = mapped_column(
        ForeignKey("model.id"), nullable=False, index=True
    )

    # --- Historical Snapshots ---
    model_no: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Quantity & Pricing
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    # --- Demo Tracking (only for DEMO type purchases) ---
    return_due_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Per-item return deadline for demo units"
    )
    is_returned: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        comment="True when all serial numbers of this line are returned"
    )

    # Additional Notes
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- Relationships ---
    purchase: Mapped["PurchaseInward"] = relationship(back_populates="items")

    model: Mapped["Model"] = relationship(back_populates="purchase_items")

    # Each PurchaseItem creates exactly ONE StockLedger entry
    ledger_entry: Mapped[Optional["StockLedger"]] = relationship(
        "StockLedger",
        back_populates="purchase_item",
        uselist=False,
    )

    # Serial numbers received against this line item
    serial_numbers: Mapped[List["PurchaseItemSerial"]] = relationship(
        "PurchaseItemSerial",
        back_populates="purchase_item",
        cascade="all, delete-orphan",
    )


# -------------------------------------------------------
# PURCHASE SERIAL NUMBERS
# -------------------------------------------------------

class PurchaseItemSerial(Base):
    """Individual serial numbers received against purchase line items"""
    __tablename__ = "purchase_item_serials"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    purchase_item_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_item.id", ondelete="CASCADE"), nullable=False, index=True
    )

    serial_number: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True, unique=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationship
    purchase_item: Mapped["PurchaseItem"] = relationship(back_populates="serial_numbers")