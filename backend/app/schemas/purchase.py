from datetime import datetime
from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class PurchaseType(str, Enum):
    NORMAL_PURCHASE = "NORMAL_PURCHASE"
    DEMO_FROM_SUPPLIER = "DEMO_FROM_SUPPLIER"
    DEMO_RETURN_FROM_CUSTOMER = "DEMO_RETURN_FROM_CUSTOMER"


class PurchaseStatus(str, Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"


# -------------------------------------------------------
# Serial Number Schemas
# -------------------------------------------------------
class PurchaseItemSerialBase(BaseModel):
    serial_number: str = Field(..., max_length=100)
    model_config = ConfigDict(from_attributes=True)


class PurchaseItemSerialCreate(PurchaseItemSerialBase):
    pass


class PurchaseItemSerialResponse(PurchaseItemSerialBase):
    id: int
    purchase_item_id: int  # ⭐ Added
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------
# Purchase Item Schemas
# -------------------------------------------------------
class PurchaseItemBase(BaseModel):
    model_id: int
    model_no: str = Field(..., max_length=100)
    description: Optional[str] = None
    quantity: int = Field(..., ge=1)
    unit_cost: float = Field(..., ge=0)
    remarks: Optional[str] = None
    return_due_date: Optional[datetime] = None
    serial_numbers: List[PurchaseItemSerialCreate] = []
    model_config = ConfigDict(from_attributes=True)


class PurchaseItemCreate(PurchaseItemBase):
    pass


class PurchaseItemResponse(PurchaseItemBase):
    id: int
    purchase_id: int
    total_cost: float
    is_returned: bool  # ⭐ Fixed: was return_completed
    serial_numbers: List[PurchaseItemSerialResponse] = []
    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------
# Purchase Header Schemas
# -------------------------------------------------------
class PurchaseBase(BaseModel):
    supplier_id: int
    client_id: Optional[int] = None  # ⭐ NEW
    supplier_invoice_no: Optional[str] = None
    supplier_invoice_date: Optional[datetime] = None
    purchase_type: PurchaseType
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    courier_name: Optional[str] = None
    delivered_by: Optional[str] = None
    remarks: Optional[str] = None
    payment_due_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None  # ⭐ Added
    items: List[PurchaseItemCreate] = []
    model_config = ConfigDict(from_attributes=True)


class PurchaseCreate(PurchaseBase):
    pass


class PurchaseUpdate(BaseModel):
    """All fields optional for partial updates"""
    supplier_invoice_no: Optional[str] = None
    supplier_invoice_date: Optional[datetime] = None
    purchase_type: Optional[PurchaseType] = None
    payment_status: Optional[PaymentStatus] = None
    status: Optional[PurchaseStatus] = None
    courier_name: Optional[str] = None
    delivered_by: Optional[str] = None
    remarks: Optional[str] = None
    payment_due_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class PurchaseResponse(PurchaseBase):
    id: int
    purchase_no: str
    supplier_name: str
    supplier_gstin: Optional[str] = None
    client_name: Optional[str] = None  # ⭐ NEW
    status: PurchaseStatus
    total_amount: float
    tax_amount: Optional[float] = None
    grand_total: float
    paid_amount: float
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

class PurchaseListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    data: List[PurchaseResponse]
    
    model_config = ConfigDict(from_attributes=True)