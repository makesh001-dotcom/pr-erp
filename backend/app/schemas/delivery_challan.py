# schemas/delivery_challan.py

from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.delivery_challan import DeliveryStatus, DCType


# ============================================
# ITEM SCHEMAS
# ============================================

class DeliveryChallanItemBase(BaseModel):
    model_id: int
    description: Optional[str] = None
    hsn_code: Optional[str] = None
    quantity_sent: float = Field(ge=0)
    quantity_returned: float = Field(default=0, ge=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    remarks: Optional[str] = None


class DeliveryChallanItemCreate(DeliveryChallanItemBase):
    pass


class DeliveryChallanItemUpdate(BaseModel):
    id: Optional[int] = None
    model_id: Optional[int] = None
    description: Optional[str] = None
    hsn_code: Optional[str] = None
    quantity_sent: Optional[float] = Field(default=None, gt=0)
    quantity_returned: Optional[float] = Field(default=None, ge=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    remarks: Optional[str] = None


class DeliveryChallanItemResponse(DeliveryChallanItemBase):
    id: int
    quantity_pending: float
    
    model_config = ConfigDict(from_attributes=True)


# ============================================
# HEADER SCHEMAS
# ============================================

class DeliveryChallanBase(BaseModel):
    client_id: int
    reference_no: Optional[str] = None
    dc_type: DCType = DCType.WITHOUT_BILL_OUTWARD
    delivery_date: datetime
    expected_return_date: Optional[date] = None
    remarks: Optional[str] = None
    display_type: Optional[str] = None


class DeliveryChallanCreate(DeliveryChallanBase):
    items: List[DeliveryChallanItemCreate] = Field(min_length=1)


class DeliveryChallanUpdate(BaseModel):
    client_id: Optional[int] = None
    reference_no: Optional[str] = None
    dc_type: Optional[DCType] = None
    delivery_date: Optional[datetime] = None
    expected_return_date: Optional[date] = None
    remarks: Optional[str] = None
    status: Optional[DeliveryStatus] = None
    items: Optional[List[DeliveryChallanItemUpdate]] = None
    display_type: Optional[str] = None

# ============================================
# RESPONSE SCHEMAS
# ============================================

class DeliveryChallanResponse(DeliveryChallanBase):
    id: int
    challan_no: str
    revision_no: int
    status: DeliveryStatus
    
    # Return tracking
    is_returned: bool
    returned_at: Optional[datetime] = None
    is_overdue: bool = False
    days_overdue: int = 0
    is_long_pending: bool = False
    
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    items: List[DeliveryChallanItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


class DeliveryChallanListResponse(BaseModel):
    items: List[DeliveryChallanResponse]
    total: int
    page: int
    limit: int


# ============================================
# STATUS ACTION SCHEMAS
# ============================================

class DeliveryConfirmRequest(BaseModel):
    remarks: Optional[str] = None


class DeliveryCancelRequest(BaseModel):
    reason: Optional[str] = None


class ReturnItemRequest(BaseModel):
    """For tracking partial returns"""
    items: List[DeliveryChallanItemUpdate]


class CompleteReturnRequest(BaseModel):
    """Mark all items as returned"""
    remarks: Optional[str] = None