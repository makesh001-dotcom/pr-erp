from sqlalchemy import Column, Integer, String
from app.db.session import Base
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Boolean
if TYPE_CHECKING:
    from app.models.sales import SalesOutward

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)

    company_name = Column(String)
    person1_name = Column(String)
    person2_name = Column(String)

    person1_phone = Column(String)
    person2_phone = Column(String)

    person1_email = Column(String)
    person2_email = Column(String)

    address = Column(String)
    state = Column(String)
    pincode = Column(String)

    gstin = Column(String)

    alter_phone = Column(String)
    alter_email = Column(String)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # In Client class, add:
    sales: Mapped[List["SalesOutward"]] = relationship(
        "app.models.sales.SalesOutward",  # ← Full path as string
       back_populates="client"
    )

    delivery_challans = relationship(
        "DeliveryChallan", 
        back_populates="client",
        lazy="dynamic"
    )