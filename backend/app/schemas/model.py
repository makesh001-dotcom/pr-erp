from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Union
from datetime import datetime
from app.models.models import MovementType, OrderStatus
from app.schemas.product_group import ProductGroupResponse

# =====================================================================
# 1. CORE MODEL / PRODUCT SCHEMAS 
# =====================================================================

class ModelBase(BaseModel):
    """Core structural database properties shared safely across logic layers"""
    model_no: Optional[str] = Field(None, description="The unique model identifier number")
    sku: Optional[str] = Field(None, description="Unique product SKU or Barcode value")
    description: Optional[str] = None
    price: Optional[float] = Field(0.0, ge=0.0)
    product_group_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ModelCreate(ModelBase):
    """Enforces requirements when making a fresh entry via UI"""
    model_no: str  
    sku: Optional[str] = None
    description: str
    product_group_id: int 
    price: float = Field(0.0, ge=0.0)  


class ModelUpdate(BaseModel):
    """Matches the exact editable elements allowed from the frontend workspace"""
    description: Optional[str] = None
    price: Optional[float] = Field(None, ge=0.0)
    sku: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ModelResponse(ModelBase):
    """Single Object Response structured cleanly for React layout usage"""
    id: int
    product_group: Optional[ProductGroupResponse] = None
    current_stock: Optional[int] = 0 

    model_config = ConfigDict(from_attributes=True)


class ModelListResponse(BaseModel):
    """Standardized multi-record pagination response layout"""
    total: int
    page: int
    limit: int
    data: List[ModelResponse]


# =====================================================================
# 2. STOCK MOVEMENT / LEDGER SCHEMAS
# =====================================================================

class StockMovementCreate(BaseModel):
    sku: Optional[str] = None
    model_no: Optional[str] = None
    quantity: int = Field(..., gt=0)
    movement_type: MovementType
    reference_id: Optional[str] = None
    delivery_by: str | None = None
    courier_name: str | None = None
    serial_numbers: Optional[List[str]] = Field(default_factory=list)

class StockLedgerResponse(BaseModel):
    id: int
    model_id: int
    quantity: int
    movement_type: MovementType
    status: Union[OrderStatus, str]
    reference_id: Optional[str] = None
    created_at: datetime
    delivery_by: Optional[str] = None 
    courier_name: Optional[str] = None 
    model_config = ConfigDict(from_attributes=True)