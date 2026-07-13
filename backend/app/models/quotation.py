import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Numeric, DateTime, Boolean, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class QuotationStatus(enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"  # Mark for older revisions


class Quotation(Base):
    """
    Main Quotation Table designed for Hard History tracking.
    Each edit creates a new row with an incremented revision_no.
    """
    __tablename__ = "quotation"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Standard format sequence tracking (e.g., SR1/034/25-26)
    quotation_no: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    revision_no: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Control flags for revision history filtering
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Client & Metadata Parameters
    client_name: Mapped[str] = mapped_column(String(150), nullable=False)
    client_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    
    # Pricing summaries
    sub_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=18.00)  # Defaulting to 18% standard tax
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    grand_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    
    status: Mapped[QuotationStatus] = mapped_column(Enum(QuotationStatus), default=QuotationStatus.DRAFT, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    # Add these two definitions inside the "Quotation" class in backend/app/models/quotation.py
    discount_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    # 1-to-Many Link to Line Items (With safe cascading for revisions)
    items: Mapped[List["QuotationLineItem"]] = relationship(
        "QuotationLineItem", back_populates="quotation", cascade="all, delete-orphan"
    )


class QuotationLineItem(Base):
    """
    Quotation Line Items containing historical snapshots of models, descriptions,
    and negotiated pricing parameters to ensure integrity against catalog changes.
    """
    __tablename__ = "quotation_line_item"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quotation_id: Mapped[int] = mapped_column(ForeignKey("quotation.id", ondelete="CASCADE"), nullable=False)
    
    # 🛠️ Hybrid reference layout linked to your master catalog
    model_id: Mapped[int | None] = mapped_column(ForeignKey("model.id", ondelete="SET NULL"), nullable=True)
    
    # Preserved static data snapshots
    model_no: Mapped[str] = mapped_column(String(100), nullable=False)  # Copied at generation time
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Quantity & Pricing Matrix
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    hsn_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    delivery_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="items")