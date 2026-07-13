from typing import List, TYPE_CHECKING
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.manufacturer import Manufacturer
    from app.models.models import Model 

class ProductGroup(Base):
    __tablename__ = "product_group"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    
    # FK to Manufacturer
    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturer.id"))

    # FIX: Change 'product_groups' to 'groups' to match your 
    # Manufacturer model and your API Route logic
    manufacturer: Mapped["Manufacturer"] = relationship(back_populates="groups")
    
    # Relationship down to children (Models)
    models: Mapped[List["Model"]] = relationship(
        back_populates="product_group", 
        cascade="all, delete-orphan"
    )