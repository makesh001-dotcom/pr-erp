from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.session import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)

    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
    )

    permission_id = Column(
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "role_id",
            "permission_id",
            name="uq_role_permission",
        ),
    )

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship(
        "Permission",
        back_populates="role_permissions",
    )