import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import ForeignKey, String, Numeric, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base 

if TYPE_CHECKING:
    from app.models.product_group import ProductGroup
    from app.models.purchase import PurchaseItem
    from app.models.sales import SalesItem


# --- ENUMS ---s
class MovementType(str, enum.Enum):
    INWARD = "INWARD"
    OUTWARD = "OUTWARD"
    ADJUSTMENT = "ADJUSTMENT"

class OrderStatus(str, enum.Enum):
    STANDARD = "STANDARD"
    PRE_ORDER = "PRE_ORDER"

class ReferenceType(str, enum.Enum):
    """Universal transaction origin tracker"""
    PURCHASE = "PURCHASE"
    SALES = "SALES"
    RETURN = "RETURN"
    ADJUSTMENT = "ADJUSTMENT"
    WARRANTY = "WARRANTY"
    FOC = "FOC"
    DEMO = "DEMO"
    DELIVERY_CHALLAN = "DELIVERY_CHALLAN"


# --- CORE TABLES ---

class Model(Base):
    __tablename__ = "model"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    model_no: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sku: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.00)
    hsn_code: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    type: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    
    product_group_id: Mapped[int] = mapped_column(ForeignKey("product_group.id"))
    product_group: Mapped["ProductGroup"] = relationship(back_populates="models")
    
    serial_numbers: Mapped[List["SerialNumber"]] = relationship(
        "SerialNumber", back_populates="model", cascade="all, delete-orphan"
    )

    ledger_entries: Mapped[List["StockLedger"]] = relationship(
        "StockLedger", back_populates="model", cascade="all, delete-orphan"
    )
    
    purchase_items: Mapped[List["PurchaseItem"]] = relationship(
       "PurchaseItem", back_populates="model"
    )

    sales_items: Mapped[List["SalesItem"]] = relationship(
    "SalesItem", back_populates="model"
    )


class StockLedger(Base):
    __tablename__ = "stock_ledger"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    model_id: Mapped[int] = mapped_column(
        ForeignKey("model.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    quantity: Mapped[int] = mapped_column(nullable=False)
    
    movement_type: Mapped[MovementType] = mapped_column(
        Enum(MovementType, values_callable=lambda obj: [e.value for e in obj]), 
        nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, values_callable=lambda obj: [e.value for e in obj]), 
        default=OrderStatus.STANDARD, nullable=False
    )
    
    reference_type: Mapped[ReferenceType] = mapped_column(
        Enum(ReferenceType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=ReferenceType.ADJUSTMENT,
    )
    
    reference_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_record_id: Mapped[int | None] = mapped_column(nullable=True)
    
    # ⭐ Purchase link (1:1 through purchase_item)
    purchase_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchase_item.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # ⭐ Sales link (1:1 through sales_item)
    sales_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales_item.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    reference_doc_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    courier_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    
    # Relationships
    serial_numbers: Mapped[List["SerialNumber"]] = relationship(
        "SerialNumber", back_populates="ledger_entry", cascade="all, delete-orphan"
    )
    model: Mapped["Model"] = relationship("Model", back_populates="ledger_entries")
    
    purchase_item: Mapped[Optional["PurchaseItem"]] = relationship(
       "PurchaseItem", back_populates="ledger_entry"
    )
    
    sales_item: Mapped[Optional["SalesItem"]] = relationship(
      "SalesItem", back_populates="ledger_entry"
    )

class SerialNumber(Base):
    __tablename__ = "serial_numbers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    ledger_entry_id: Mapped[int] = mapped_column(
        ForeignKey("stock_ledger.id", ondelete="CASCADE"), nullable=False
    )
    
    model_id: Mapped[int] = mapped_column(
        ForeignKey("model.id", ondelete="CASCADE"), nullable=False
    )
    
    serial_number: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    
    status: Mapped[str] = mapped_column(
        String(20), default="IN_STOCK", nullable=False
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    ledger_entry: Mapped["StockLedger"] = relationship("StockLedger", back_populates="serial_numbers")
    model: Mapped["Model"] = relationship("Model", back_populates="serial_numbers")





