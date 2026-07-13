from datetime import datetime
from typing import Optional, List
import re

from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator


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

    @field_validator('gstin')
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            # Clean and validate GSTIN format
            v = v.upper().strip()
            gstin_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            if not re.match(gstin_pattern, v):
                raise ValueError(
                    'Invalid GSTIN format. Should be: 22AAAAA0000A1Z5'
                )
            return v
        return v

    @field_validator('person1_phone', 'person2_phone', 'alternate_phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = re.sub(r'[\s\-\(\)\+]', '', v)
            if len(cleaned) < 10:
                raise ValueError('Phone number must be at least 10 digits')
            return cleaned
        return v

    @field_validator('pincode')
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r'^\d{6}$', v):
                raise ValueError('Pincode must be exactly 6 digits')
            return v
        return v

    model_config = ConfigDict(from_attributes=True)


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    company_name: Optional[str] = Field(None, max_length=200)
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

    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class SupplierResponse(SupplierBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


from typing import List

class SupplierListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    data: List[SupplierResponse]
    
    model_config = ConfigDict(from_attributes=True)