from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from typing import List

class ClientBase(BaseModel):
    company_name: str
    person1_name: Optional[str] = None
    person2_name: Optional[str] = None

    person1_phone: Optional[str] = None
    person2_phone: Optional[str] = None

    person1_email: Optional[EmailStr] = None
    person2_email: Optional[EmailStr] = None

    address: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    gstin: Optional[str] = None

    alter_phone: Optional[str] = None
    alter_email: Optional[EmailStr] = None


class ClientCreate(ClientBase):
    pass


class ClientResponse(ClientBase):
    id: int

    class Config:
        from_attributes = True

class ClientUpdate(ClientBase):
    pass


class ClientListResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[ClientResponse]