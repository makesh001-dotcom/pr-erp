# schemas/inventory.py
from pydantic import BaseModel, field_validator, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class BulkSerialNumberCreate(BaseModel):
    model_id: int
    serial_numbers: List[str]
    total_quantity: int
    sku: Optional[str] = None
    model_no: Optional[str] = None
    
    @field_validator('serial_numbers')
    def validate_serial_numbers(cls, v):
        # Remove empty strings and strip whitespace
        return [s.strip() for s in v if s and s.strip()]
    
    @field_validator('serial_numbers')
    def check_duplicates(cls, v):
        if len(v) != len(set(v)):
            duplicates = [s for s in v if v.count(s) > 1]
            raise ValueError(f"Duplicate serial numbers found: {list(set(duplicates))}")
        return v

class BulkSerialNumberResponse(BaseModel):
    saved_count: int
    duplicates: List[str] = []
    skipped_empty: int
    total_requested: int
    ledger_entry_id: Optional[int] = None
    message: str = ""

class SerialNumberResponse(BaseModel):
    id: int
    serial_number: str
    status: str
    model_id: int
    ledger_entry_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True