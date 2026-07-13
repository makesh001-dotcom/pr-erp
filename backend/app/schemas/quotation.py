from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
from app.models.quotation import QuotationStatus

# =====================================================================
# 1. LINE ITEM SCHEMAS
# =====================================================================

class LineItemBase(BaseModel):
    model_id: Optional[int] = None
    model_no: str = Field(..., description="Model number snapshot taken from catalog")
    description: Optional[str] = None
    quantity: int = Field(1, ge=1, description="Quantity must be at least 1")
    unit_price: float = Field(..., ge=0.0, description="Unit price for this row item")
    hsn_code: str | None = None
    delivery_type: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LineItemCreate(LineItemBase):
    """Used when incoming payload builds line items nested inside a quotation create."""
    pass


class LineItemResponse(LineItemBase):
    """Data response schema for individual nested rows."""
    id: int
    quotation_id: int
    total_price: float
    hsn_code: str | None = None
    delivery_type: str | None = None


# =====================================================================
# 2. QUOTATION CORE SCHEMAS
# =====================================================================

class QuotationBase(BaseModel):
    client_name: str = Field(..., max_length=150)
    client_email: Optional[str] = None
    company_name: Optional[str] = None
    tax_rate: float = Field(18.00, ge=0.0, le=100.0, description="Tax rate percentage (e.g. 18.00)")
    status: QuotationStatus = QuotationStatus.DRAFT
    # Inside QuotationBase class:
    discount_rate: float = Field(0.00, ge=0.0, le=100.0)
    hsn_code: str | None = None
    delivery_type: str | None = None



    model_config = ConfigDict(from_attributes=True)


class QuotationCreate(QuotationBase):
    """
    Schema parsed when generating a brand-new quotation sequence.
    Expects a list of nested lines to calculate totals on.
    """
    quotation_no: str
    items: List[LineItemCreate] = Field(..., min_items=1, description="Quotation must contain at least one line item")


class QuotationUpdate(QuotationBase):
    """
    Schema used when an 'Edit' action occurs. 
    Because we use a Hard History pattern, this payload triggers the creation 
    of a new row containing an incremented revision count instead of a raw override.
    """
    items: List[LineItemCreate] = Field(..., min_items=1)


class QuotationResponse(QuotationBase):
    """
    The main serialization schema sent back to your React workspace layout.
    """
    id: int
    quotation_no: str
    revision_no: int
    is_active: bool
    sub_total: float
    tax_amount: float
    grand_total: float
    created_at: datetime
    updated_at: datetime
    items: List[LineItemResponse]
    # Inside QuotationResponse class:
    discount_amount: float
    hsn_code: str | None = None
    delivery_type: str | None = None

    model_config = ConfigDict(from_attributes=True)


class QuotationListResponse(BaseModel):
    """Handles paginated search table structures on the frontend workspace view."""
    total: int
    page: int
    limit: int
    data: List[QuotationResponse]