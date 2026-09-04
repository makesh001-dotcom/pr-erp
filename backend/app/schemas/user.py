from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, model_validator


# ==========================
# Authentication Schemas
# ==========================

class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    username: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class CurrentUserResponse(BaseModel):
    id: int
    username: str
    role: str
    permissions: list[str]

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


# ==========================
# User CRUD & Admin Schemas
# ==========================

class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    password: str
    role_id: int
    is_active: bool = True


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role_id: int
    role_name: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_role_name(self) -> "UserResponse":
        """
        If role_name isn't directly set but the ORM model has a loaded 'role' relationship,
        automatically pull the role name from the relationship.
        """
        if self.role_name is None:
            # Safely check if the underlying ORM object had a role relation
            role_obj = getattr(self, "role", None)
            if role_obj and hasattr(role_obj, "name"):
                self.role_name = role_obj.name
        return self


class UserPaginatedResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    limit: int