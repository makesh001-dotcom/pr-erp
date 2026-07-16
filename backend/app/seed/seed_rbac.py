from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
import app.db.base

from app.core.permission_registry import (
    PERMISSION_REGISTRY,
    STAFF_PERMISSIONS,
)


def seed_permissions(db: Session):
    """
    Create all permissions defined in PERMISSION_REGISTRY.
    Safe to run multiple times.
    """

    permission_lookup = {}

    for module, permissions in PERMISSION_REGISTRY.items():

        for permission_name in permissions:

            permission = (
                db.query(Permission)
                .filter(Permission.name == permission_name)
                .first()
            )

            if not permission:
                permission = Permission(
                    name=permission_name,
                    module=module,
                    description=permission_name,
                )

                db.add(permission)
                db.flush()

            permission_lookup[permission_name] = permission

    db.commit()

    return permission_lookup


def assign_permissions_to_role(
    db: Session,
    role: Role,
    permission_names: set[str],
    permission_lookup: dict,
):
    """
    Assign permissions to a role.
    Duplicate assignments are ignored.
    """

    existing_permission_ids = {
        rp.permission_id
        for rp in db.query(RolePermission)
        .filter(RolePermission.role_id == role.id)
        .all()
    }

    for permission_name in permission_names:

        permission = permission_lookup[permission_name]

        if permission.id in existing_permission_ids:
            continue

        db.add(
            RolePermission(
                role_id=role.id,
                permission_id=permission.id,
            )
        )

    db.commit()


def seed_rbac():

    db = SessionLocal()

    try:

        permission_lookup = seed_permissions(db)

        admin = (
            db.query(Role)
            .filter(Role.name == "Admin")
            .first()
        )

        staff = (
            db.query(Role)
            .filter(Role.name == "Staff")
            .first()
        )

        if admin is None:
            raise Exception("Admin role not found.")

        if staff is None:
            raise Exception("Staff role not found.")

        all_permissions = set(permission_lookup.keys())

        assign_permissions_to_role(
            db,
            admin,
            all_permissions,
            permission_lookup,
        )

        assign_permissions_to_role(
            db,
            staff,
            STAFF_PERMISSIONS,
            permission_lookup,
        )

        print("=" * 60)
        print("RBAC seeded successfully.")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed_rbac()