import re
from typing import Any, List, Optional
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

# Text placeholders sent by forms/frontends to automatically strip to None
NULL_STRINGS = {"nil", "null", "none", "n/a", "na", "-", "", "string"}


# ==========================================
# 1. BASE SCHEMA (No strict format validators)
# ==========================================
class ClientBase(BaseModel):
    company_name: str = Field(..., max_length=200)

    person1_name: Optional[str] = Field(None, max_length=100)
    person1_phone: Optional[str] = Field(None, max_length=30)
    person1_email: Optional[str] = Field(None, max_length=150)

    person2_name: Optional[str] = Field(None, max_length=100)
    person2_phone: Optional[str] = Field(None, max_length=30)
    person2_email: Optional[str] = Field(None, max_length=150)

    address: Optional[str] = Field(None, max_length=500)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=20)

    gstin: Optional[str] = Field(None, max_length=20)

    alter_phone: Optional[str] = Field(None, max_length=30)
    alter_email: Optional[str] = Field(None, max_length=150)

    @model_validator(mode="before")
    @classmethod
    def sanitize_empty_strings(cls, values: Any) -> Any:
        """Converts empty strings, 'string' defaults, and placeholders to None."""
        if isinstance(values, dict):
            for field, val in values.items():
                if field == "company_name":
                    continue
                if isinstance(val, str) and val.strip().lower() in NULL_STRINGS:
                    values[field] = None
        return values

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. CREATE SCHEMA (Strict input validation)
# ==========================================
class ClientCreate(ClientBase):
    person1_email: Optional[EmailStr] = Field(None, max_length=150)
    person2_email: Optional[EmailStr] = Field(None, max_length=150)
    alter_email: Optional[EmailStr] = Field(None, max_length=150)

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.upper().strip()
        pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
        if not re.match(pattern, v):
            raise ValueError(
                "Invalid GSTIN format. Should be 15 characters (e.g., 22AAAAA0000A1Z5)"
            )
        return v

    @field_validator("person1_phone", "person2_phone", "alter_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        cleaned = re.sub(r"[\s\-\(\)\+]", "", v)
        if len(cleaned) < 10:
            raise ValueError("Phone number must contain at least 10 digits")
        return cleaned

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if not re.match(r"^\d{6}$", v):
            raise ValueError("Pincode must be exactly 6 digits")
        return v


# ==========================================
# 3. UPDATE SCHEMA (Strict input validation)
# ==========================================
class ClientUpdate(ClientCreate):
    company_name: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None


# ==========================================
# 4. RESPONSE SCHEMAS (Safe Serialization)
# ==========================================
class ClientResponse(ClientBase):
    id: int
    client_code: Optional[str] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class ClientListResponse(BaseModel):
    total: int
    skip: Optional[int] = 0
    limit: Optional[int] = 1000
    data: List[ClientResponse]

    model_config = ConfigDict(from_attributes=True)