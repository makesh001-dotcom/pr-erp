from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


# ----------------------------------------------------------------------
# Permission Schemas (Defined first to avoid forward reference rebuilds)
# ----------------------------------------------------------------------
class PermissionResponse(BaseModel):
    id: int
    name: str
    module: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PermissionGroupedResponse(BaseModel):
    module: str
    permissions: List[PermissionResponse]


# ----------------------------------------------------------------------
# Role Management Schemas
# ----------------------------------------------------------------------
class RoleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    is_system_admin: bool = False
    permission_ids: List[int] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    is_system_admin: Optional[bool] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_system_admin: bool
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionResponse] = Field(default_factory=list)
    user_count: int = 0

    class Config:
        from_attributes = True


# ----------------------------------------------------------------------
# User Management Schemas
# ----------------------------------------------------------------------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role_id: Optional[int] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    limit: int


# ----------------------------------------------------------------------
# User Permission Override Schemas
# ----------------------------------------------------------------------
class UserPermissionOverrideCreate(BaseModel):
    permission_id: int
    granted: bool


class UserPermissionOverrideUpdate(BaseModel):
    granted: bool


class UserPermissionOverrideResponse(BaseModel):
    id: int
    user_id: int
    permission_id: int
    permission_name: str
    granted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----------------------------------------------------------------------
# Role Permission Assignment & Admin Stats
# ----------------------------------------------------------------------
class RolePermissionAssignment(BaseModel):
    permission_ids: List[int]


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_roles: int
    total_permissions: int
    total_modules: int