
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, 
    ForeignKey, Enum as SQLEnum, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.db.base import Base  # Adjust import based on your structure
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
# models/delivery_challan.py - Complete Updated Model

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Boolean,
    ForeignKey, Enum as SQLEnum, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.models import SerialNumber




class DCType(str, enum.Enum):
    WITH_BILL_INWARD = "WITH_BILL_INWARD"
    WITH_BILL_OUTWARD = "WITH_BILL_OUTWARD"
    WITHOUT_BILL_INWARD = "WITHOUT_BILL_INWARD"
    WITHOUT_BILL_OUTWARD = "WITHOUT_BILL_OUTWARD"

class DCDisplayType(str, enum.Enum):
    RETURN = "RETURN"
    NON_RETURN = "NON_RETURN"
    DEMO = "DEMO"
    FREE_OF_COST = "FREE_OF_COST"


class DeliveryStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PRINTED = "PRINTED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"  # ⭐ NEW: For returnable items fully returned


class DeliveryChallan(Base):
    __tablename__ = "delivery_challans"

    id = Column(Integer, primary_key=True, index=True)
    challan_no = Column(String(50), unique=True, nullable=False, index=True)
    revision_no = Column(Integer, default=0, nullable=False)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    reference_no = Column(String(100), nullable=True, index=True)

    # ⭐ TYPE DISCRIMINATOR
    dc_type = Column(
        SQLEnum(DCType),
        nullable=False,
        default=DCType.WITHOUT_BILL_OUTWARD,
        index=True
    )

        # Display type for print — separate from internal dc_type
    display_type = Column(
        SQLEnum(DCDisplayType, name="dcdisplaytype"),
        nullable=True,
        default=None
    )

    status = Column(
        SQLEnum(DeliveryStatus),
        default=DeliveryStatus.DRAFT,
        nullable=False,
        index=True
    )

    delivery_date = Column(Date, nullable=True)

    # ⭐ RETURN TRACKING
    expected_return_date = Column(Date, nullable=True)
    is_returned = Column(Boolean, default=False, nullable=False)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    # models/delivery_challan.py — DeliveryChallan class
    via = Column(String(100), nullable=True)
    destination = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Status tracking
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    confirmed_by = Column(Integer, nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_by = Column(Integer, nullable=True)
    printed_at = Column(DateTime(timezone=True), nullable=True)
    printed_by = Column(Integer, nullable=True)

    # Soft delete
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="delivery_challans", lazy="joined")
    items = relationship(
        "DeliveryChallanItem",
        back_populates="challan",
        cascade="all, delete-orphan",
        lazy="selectin"

    )

    # Inside DeliveryChallan class, add:
    serial_links: Mapped[List["SerialDeliveryChallan"]] = relationship(
    "SerialDeliveryChallan", back_populates="delivery_challan", cascade="all, delete-orphan"
)

    @property
    def is_overdue(self):
        """Check if return is overdue"""
        if self.expected_return_date and not self.is_returned:
            return date.today() > self.expected_return_date
        return False

    @property
    def days_overdue(self):
        """Days past expected return date"""
        if self.is_overdue:
            return (date.today() - self.expected_return_date).days
        return 0

    @property
    def is_long_pending(self):
        """Flag if pending for more than 6 months"""
        if self.status in [DeliveryStatus.CONFIRMED] and not self.is_returned:
            if self.delivery_date:
                days_since = (date.today() - self.delivery_date).days
                return days_since > 180  # 6 months
        return False

    def __repr__(self):
        return f"<DeliveryChallan {self.challan_no} ({self.dc_type})>"


class DeliveryChallanItem(Base):
    __tablename__ = "delivery_challan_items"

    id = Column(Integer, primary_key=True, index=True)
    challan_id = Column(
        Integer,
        ForeignKey("delivery_challans.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    model_id = Column(Integer, ForeignKey("model.id"), nullable=False, index=True)

    # Snapshot fields
    description = Column(String(500), nullable=False)
    hsn_code = Column(String(20), nullable=True)

    # Quantities
    quantity_sent = Column(Float, nullable=False, default=0)  # ⭐ RENAMED from quantity_delivered
    quantity_returned = Column(Float, nullable=False, default=0)  # ⭐ NEW

    # Pricing (optional, not printed)
    unit_price = Column(Float, nullable=True, default=0.0)
    remarks = Column(Text, nullable=True)

    # Relationships
    challan = relationship("DeliveryChallan", back_populates="items")
    model = relationship("Model", lazy="joined")

    @property
    def quantity_pending(self):
        """Calculate pending return quantity"""
        return self.quantity_sent - self.quantity_returned

    @property
    def is_fully_returned(self):
        """Check if all items returned"""
        return self.quantity_returned >= self.quantity_sent

    def __repr__(self):
        return f"<DeliveryChallanItem {self.description}>"


class DeliveryChallanCounter(Base):
    __tablename__ = "delivery_challan_counter"

    id = Column(Integer, primary_key=True, index=True)
    financial_year = Column(String(10), unique=True, nullable=False, index=True)
    prefix = Column(String(20), nullable=False)
    current_number = Column(Integer, nullable=False, default=0)
    
    def get_next_number(self):
        """Generate next challan number"""
        return f"{self.prefix}-{self.current_number:03d}/{self.financial_year}"
    
    def get_revision_number(self, revision_no):
        """Generate challan number with revision"""
        base = self.get_next_number()
        if revision_no > 0:
            return f"{base} Rev{revision_no}"
        return base
    
    def __repr__(self):
        return f"<DeliveryChallanCounter {self.financial_year}>"



# app/models/delivery_challan.py — Add this class at the bottom

class SerialDeliveryChallan(Base):
    """
    Bridge table connecting SerialNumbers to DeliveryChallans.
    Tracks which serials were sent/received via which DC.
    """
    __tablename__ = "serial_delivery_challans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    serial_number_id: Mapped[int] = mapped_column(
        ForeignKey("serial_numbers.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    delivery_challan_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_challans.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    delivery_challan_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("delivery_challan_items.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # "IN" = received via this DC, "OUT" = sent via this DC
    direction: Mapped[str] = mapped_column(String(3), nullable=False, default="OUT")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    
    # Relationships
    serial_number: Mapped["SerialNumber"] = relationship("SerialNumber")
    delivery_challan: Mapped["DeliveryChallan"] = relationship("DeliveryChallan")