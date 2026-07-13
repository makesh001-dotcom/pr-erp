from pydantic import BaseModel, ConfigDict
from typing import Optional, List

# 1. Base Logic
class ProductGroupBase(BaseModel):
    name: Optional[str] = None
    manufacturer_id: Optional[int] = None

# 2. Create Schema (Usually requires name and man_id)
class ProductGroupCreate(ProductGroupBase):
    name: str  # Overriding to make it mandatory for creation
    manufacturer_id: int

# 3. Update Schema (Everything remains optional)
class ProductGroupUpdate(ProductGroupBase):
    pass

from app.schemas.manufacturer import ManufacturerResponse

class ProductGroupResponse(ProductGroupBase):
    id: int
    # This will nest the manufacturer object inside the group response
    manufacturer: Optional[ManufacturerResponse] = None 

    model_config = ConfigDict(from_attributes=True)

# 5. List/Pagination Response
# Note: We don't inherit from ProductGroupBase here to keep the root clean
class ProductGroupListResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[ProductGroupResponse]