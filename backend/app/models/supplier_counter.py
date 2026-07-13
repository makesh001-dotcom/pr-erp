from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class SupplierCounter(Base):
    __tablename__ = "supplier_counter"

    id: Mapped[int] = mapped_column(primary_key=True)

    current_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )