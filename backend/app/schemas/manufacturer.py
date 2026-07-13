from pydantic import BaseModel, ConfigDict
from typing import Optional, List

# 1. Base Schema
class ManufacturerBase(BaseModel):
    name: Optional[str] = None # Use Optional if it can be None

# 2. Create Schema
class ManufacturerCreate(ManufacturerBase):
    name: str # Usually, name should be required for creation

# 3. Update Schema
class ManufacturerUpdate(ManufacturerBase):
    pass # Already inherits name as Optional[str]

# 4. Standard Response Schema
class ManufacturerResponse(ManufacturerBase):
    id: int
    
    # FIXED: Pydantic V2 uses model_config. 
    # If using V1, it must be 'class Config' (Capital C) and 'from_attributes' (plural)
    model_config = ConfigDict(from_attributes=True)

# 5. Paginated List Response
class ManufacturerListResponse(BaseModel): # Changed inheritance to BaseModel
    total: int
    page: int
    limit: int
    data: List[ManufacturerResponse] 

# --- TREE LOGIC FOR NESTED HOVER MENUS ---

# 6. Nested Product Groups
class ProductGroupTree(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 7. Manufacturer with Children
class ManufacturerTree(BaseModel):
    id: int
    name: str
    groups: List[ProductGroupTree] 

    model_config = ConfigDict(from_attributes=True)