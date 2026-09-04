from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)  # FIX: Added missing email column
    password = Column(String, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # FIX: Added index=True and explicit ondelete constraint
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), index=True, nullable=False)

    # FIX: Added missing timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user_permissions = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")
    role = relationship(
    "Role",
    back_populates="users",
    lazy="joined",
)
