from typing import List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.product_group import ProductGroup # Avoid circular imports

class Manufacturer(Base):
    __tablename__ = "manufacturer"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True, index=True)

    # This MUST match the 'manufacturer' relationship in ProductGroup
    # AND the attribute name must be 'product_groups' to match your ProductGroup's back_populates
    groups: Mapped[List["ProductGroup"]] = relationship(
        back_populates="manufacturer", 
        cascade="all, delete-orphan"
    )