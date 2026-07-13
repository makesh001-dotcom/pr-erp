from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from app.models.sales import SalesType, SalesStatus


# ============================================================
# SERIALS
# ============================================================

class SalesItemSerialBase(BaseModel):
    serial_number: str = Field(..., max_length=100)


class SalesItemSerialCreate(SalesItemSerialBase):
    pass


class SalesItemSerialResponse(SalesItemSerialBase):
    id: int
    sales_item_id: int  # ⭐ Added
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SALES ITEMS
# ============================================================

class SalesItemBase(BaseModel):
    model_id: int
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    remarks: Optional[str] = Field(None, max_length=500)


class SalesItemCreate(SalesItemBase):
    serial_numbers: List[SalesItemSerialCreate] = []


class SalesItemResponse(BaseModel):
    id: int
    sales_id: int  # ⭐ Added
    model_id: int
    model_no: str
    description: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    remarks: Optional[str] = None
    serial_numbers: List[SalesItemSerialResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SALES HEADER
# ============================================================

class SalesBase(BaseModel):
    client_id: int
    invoice_no: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[datetime] = None
    sales_type: SalesType
    courier_name: Optional[str] = Field(None, max_length=100)
    delivered_by: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = Field(None, max_length=500)


class SalesCreate(SalesBase):
    items: List[SalesItemCreate] = []


class SalesUpdate(BaseModel):
    """All fields optional for partial updates"""
    client_id: Optional[int] = None
    invoice_no: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[datetime] = None
    sales_type: Optional[SalesType] = None  # ⭐ Fixed type
    courier_name: Optional[str] = Field(None, max_length=100)
    delivered_by: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = Field(None, max_length=500)

    model_config = ConfigDict(from_attributes=True)


class SalesResponse(BaseModel):
    id: int
    sales_no: str
    client_id: int
    client_name: str
    client_gstin: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[datetime] = None
    sales_type: SalesType  # ⭐ Fixed type
    status: SalesStatus    # ⭐ Fixed type
    total_amount: float
    tax_amount: Optional[float] = None
    grand_total: float
    courier_name: Optional[str] = None
    delivered_by: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[SalesItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SalesListResponse(BaseModel):
    """Paginated list response"""
    total: int
    skip: int
    limit: int
    data: List[SalesResponse]

    model_config = ConfigDict(from_attributes=True)