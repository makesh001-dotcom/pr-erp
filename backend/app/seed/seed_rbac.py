from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission

# Add this near the top of seed_rbac.py
from app.db.base import Base  

from app.models.delivery_challan import DeliveryChallan

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
    Only adds permissions that do not already exist in the database.
    """
    # 1. Map target names to their structural DB IDs
    target_permission_ids = {
        permission_lookup[name].id
        for name in permission_names
        if name in permission_lookup
    }

    # 2. Get what this specific role currently has in the DB
    existing_permission_ids = {
        rp.permission_id
        for rp in db.query(RolePermission)
        .filter(RolePermission.role_id == role.id)
        .all()
    }

    # 3. Calculate missing IDs using set differences
    ids_to_add = target_permission_ids - existing_permission_ids

    # 4. Insert only the fresh delta records
    for perm_id in ids_to_add:
        db.add(
            RolePermission(
                role_id=role.id,
                permission_id=perm_id,
            )
        )

    db.commit()



def seed_rbac():

    db = SessionLocal()

    try:

        permission_lookup = seed_permissions(db)

        admin = (
            db.query(Role)
            .filter(Role.name == "admin")
            .first()
        )

        staff = (
            db.query(Role)
            .filter(Role.name == "staff")
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