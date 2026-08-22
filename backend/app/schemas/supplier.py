import re
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

# Define text placeholders to clean automatically
NULL_STRINGS = {"nil", "null", "none", "n/a", "na", "-", ""}

class SupplierBase(BaseModel):
    company_name: str = Field(..., max_length=200)
    gstin: Optional[str] = Field(None, max_length=20)

    address: Optional[str] = Field(None, max_length=500)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=20)

    person1_name: Optional[str] = Field(None, max_length=100)
    person1_phone: Optional[str] = Field(None, max_length=30)
    person1_email: Optional[EmailStr] = Field(None, max_length=150)

    person2_name: Optional[str] = Field(None, max_length=100)
    person2_phone: Optional[str] = Field(None, max_length=30)
    person2_email: Optional[EmailStr] = Field(None, max_length=150)

    alternate_phone: Optional[str] = Field(None, max_length=30)
    alternate_email: Optional[EmailStr] = Field(None, max_length=150)

    website: Optional[str] = Field(None, max_length=200)
    remarks: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def sanitize_empty_strings(cls, values: Any) -> Any:
        """Converts empty strings and placeholders (like NIL or "") to None before Pydantic validates field types like EmailStr."""
        if isinstance(values, dict):
            for field, val in values.items():
                # Leave mandatory company_name alone or let standard validation handle it
                if field == "company_name":
                    continue
                if isinstance(val, str) and val.strip().lower() in NULL_STRINGS:
                    values[field] = None
        return values

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.upper().strip()
        gstin_pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
        if not re.match(gstin_pattern, v):
            raise ValueError("Invalid GSTIN format. Should be 15 characters (e.g. 22AAAAA0000A1Z5)")
        return v

    @field_validator("person1_phone", "person2_phone", "alternate_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        cleaned = re.sub(r"[\s\-\(\)\+]", "", v)
        if len(cleaned) < 10:
            raise ValueError("Phone number must be at least 10 digits")
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

    model_config = ConfigDict(from_attributes=True)


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    company_name: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: int
    supplier_code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SupplierListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    data: List[SupplierResponse]

    model_config = ConfigDict(from_attributes=True)