from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(100), unique=True, nullable=False)

    password = Column(String, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False,
    )

    role = relationship("Role", back_populates="users")