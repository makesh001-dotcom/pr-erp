from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import bcrypt
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, NotFoundError, BadRequestError
from app.core.permission_registry import PERMISSION_REGISTRY
from app.models.audit_log import AuditLog
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user_permission import UserPermission
from app.models.users import User
from app.schemas.admin import (
    AdminStatsResponse,
    PermissionGroupedResponse,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
    UserCreate,
    UserPermissionOverrideCreate,
    UserPermissionOverrideUpdate,
    UserResponse,
    UserUpdate,
)
from app.core.security import hash_password

class AdminService:
    """Service for admin operations."""

    def __init__(self, db: Session):
        self.db = db

    # ==================== USER MANAGEMENT ====================

    def get_users(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        role_id: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of users with filters."""

        if page < 1:
            page = 1

        if limit < 1:
            limit = 20

        query = self.db.query(User)

        if search:
            search_term = f"%{search}%"

            query = query.filter(
                or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )

        if role_id is not None:
            query = query.filter(User.role_id == role_id)

        if is_active is not None:
            query = query.filter(User.is_active.is_(is_active))

        total = query.count()

        users = (
            query.options(joinedload(User.role))
            .order_by(User.id)
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        return {
            "users": users,
            "total": total,
            "page": page,
            "limit": limit,
        }

    def get_user(self, user_id: int) -> User:
        """Get a single user by ID."""

        user = (
            self.db.query(User)
            .options(
                joinedload(User.role),
                joinedload(User.user_permissions).joinedload(
                    UserPermission.permission
                ),
            )
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise NotFoundError(f"User with ID {user_id} not found")

        return user

    # app/crud/admin.py

    # app/crud/admin.py

    def create_user(
        self,
        user_data: UserCreate,
        admin_user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        # Fetch admin username for audit logging context
        admin = self.db.query(User).filter(User.id == admin_user_id).first()
        admin_username = admin.username if admin else "system"

        # 1. Validate role exists
        role = self.db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role:
            raise NotFoundError(f"Role with ID {user_data.role_id} not found")

        # 2. Check for duplicate username/email
        if self.db.query(User).filter(User.username == user_data.username).first():
            raise ConflictError(f"Username '{user_data.username}' is already taken")

        # 3. Create user instance
        hashed_password = hash_password(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
            role_id=user_data.role_id,
            is_active=user_data.is_active,
        )
        self.db.add(new_user)
        self.db.flush()

        # 4. Write audit log entry
        self._log_action(
    user_id=admin_user_id,
    username=admin_username,
    action="CREATE_USER",
    module="USERS",
    target_user_id=new_user.id,
    description=f"Created user '{new_user.username}' with role '{role.name}'",
    changes={
        "after": {
            "username": new_user.username,
            "email": new_user.email,
            "role_id": new_user.role_id,
            "is_active": new_user.is_active,
        }
    },
    ip_address=ip_address,
    user_agent=user_agent,
)

        self.db.commit()
        self.db.refresh(new_user)
        return new_user
    def update_user(
        self,
        user_id: int,
        user_data: UserUpdate,
        updated_by: int,
    ) -> User:
        """Update an existing user."""

        user = self.get_user(user_id)

        changes: Dict[str, Any] = {}

        if (
            user_data.username is not None
            and user_data.username != user.username
        ):
            existing_username = (
                self.db.query(User.id)
                .filter(
                    User.username == user_data.username,
                    User.id != user_id,
                )
                .first()
            )

            if existing_username:
                raise ConflictError(
                    f"Username '{user_data.username}' already exists"
                )

            changes["username"] = {
                "old": user.username,
                "new": user_data.username,
            }

            user.username = user_data.username

        if (
            user_data.email is not None
            and user_data.email != user.email
        ):
            if user_data.email:
                existing_email = (
                    self.db.query(User.id)
                    .filter(
                        User.email == user_data.email,
                        User.id != user_id,
                    )
                    .first()
                )

                if existing_email:
                    raise ConflictError(
                        f"Email '{user_data.email}' already exists"
                    )

            changes["email"] = {
                "old": user.email,
                "new": user_data.email,
            }

            user.email = user_data.email

        if user_data.role_id is not None:
            if user_data.role_id:
                role_exists = (
                    self.db.query(Role.id)
                    .filter(Role.id == user_data.role_id)
                    .first()
                )

                if not role_exists:
                    raise NotFoundError(
                        f"Role with ID {user_data.role_id} not found"
                    )

            changes["role_id"] = {
                "old": user.role_id,
                "new": user_data.role_id,
            }

            user.role_id = user_data.role_id

        if user_data.is_active is not None:
            changes["is_active"] = {
                "old": user.is_active,
                "new": user_data.is_active,
            }

            user.is_active = user_data.is_active

        if user_data.password:
            user.password = bcrypt.hashpw(
                user_data.password.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            changes["password"] = "updated"

        user.updated_at = datetime.now(timezone.utc)

        self._log_action(
            action="user_updated",
            user_id=updated_by,
            target_user_id=user.id,
            description=f"Updated user '{user.username}'",
            changes=changes or None,
        )

        self.db.commit()
        self.db.refresh(user)

        return user

    def delete_user(
        self,
        user_id: int,
        deleted_by: int,
    ) -> bool:
        """Soft delete a user by deactivating the account."""

        user = self.get_user(user_id)

        if user.id == deleted_by:
            raise BadRequestError(
                "Cannot deactivate your own account"
            )

        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)

        self._log_action(
            action="user_deactivated",
            user_id=deleted_by,
            target_user_id=user.id,
            description=f"Deactivated user '{user.username}'",
            changes={
                "is_active": {
                    "old": True,
                    "new": False,
                }
            },
        )

        self.db.commit()

        return True

    def activate_user(
        self,
        user_id: int,
        activated_by: int,
    ) -> bool:
        """Activate a user."""

        user = self.get_user(user_id)

        if user.is_active:
            return True

        user.is_active = True
        user.updated_at = datetime.now(timezone.utc)

        self._log_action(
            action="user_activated",
            user_id=activated_by,
            target_user_id=user.id,
            description=f"Activated user '{user.username}'",
            changes={
                "is_active": {
                    "old": False,
                    "new": True,
                }
            },
        )

        self.db.commit()

        return True

    # ==================== ROLE MANAGEMENT ====================

    def get_roles(self) -> List[Role]:
        """Get all roles with permission and user counts."""

        roles = (
            self.db.query(Role)
            .options(
                joinedload(Role.role_permissions).joinedload(
                    RolePermission.permission
                )
            )
            .order_by(Role.id)
            .all()
        )

        for role in roles:
            role.user_count = (
                self.db.query(User.id)
                .filter(User.role_id == role.id)
                .count()
            )

        return roles

    def get_role(self, role_id: int) -> Role:
        """Get a single role by ID."""

        role = (
            self.db.query(Role)
            .options(
                joinedload(Role.role_permissions).joinedload(
                    RolePermission.permission
                )
            )
            .filter(Role.id == role_id)
            .first()
        )

        if not role:
            raise NotFoundError(
                f"Role with ID {role_id} not found"
            )

        role.user_count = (
            self.db.query(User.id)
            .filter(User.role_id == role.id)
            .count()
        )

        return role

    def create_role(
        self,
        role_data: RoleCreate,
        created_by: int,
    ) -> Role:
        """Create a new role."""

        existing_role = (
            self.db.query(Role.id)
            .filter(Role.name == role_data.name)
            .first()
        )

        if existing_role:
            raise ConflictError(
                f"Role '{role_data.name}' already exists"
            )

        role = Role(
            name=role_data.name,
            description=role_data.description,
            is_system_admin=role_data.is_system_admin,
        )

        self.db.add(role)
        self.db.flush()

        permission_ids = list(
            dict.fromkeys(role_data.permission_ids or [])
        )

        if permission_ids:
            permissions = (
                self.db.query(Permission)
                .filter(Permission.id.in_(permission_ids))
                .all()
            )

            found_permission_ids = {
                permission.id for permission in permissions
            }

            missing_permission_ids = set(permission_ids) - found_permission_ids

            if missing_permission_ids:
                raise NotFoundError(
                    "Permission(s) not found: "
                    + ", ".join(
                        str(permission_id)
                        for permission_id in sorted(missing_permission_ids)
                    )
                )

            for permission in permissions:
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission.id,
                )
                self.db.add(role_permission)

        self._log_action(
            action="role_created",
            user_id=created_by,
            record_id=role.id,
            description=f"Created role '{role.name}'",
            changes={
                "name": role.name,
                "description": role.description,
                "is_system_admin": role.is_system_admin,
                "permission_ids": permission_ids,
            },
        )

        self.db.commit()

        return self.get_role(role.id)

    def update_role(
        self,
        role_id: int,
        role_data: RoleUpdate,
        updated_by: int,
    ) -> Role:
        """Update an existing role."""

        role = self.get_role(role_id)

        changes: Dict[str, Any] = {}

        if (
            role.is_system_admin
            and role_data.is_system_admin is False
        ):
            admin_count = (
                self.db.query(Role)
                .filter(Role.is_system_admin.is_(True))
                .count()
            )

            if admin_count <= 1:
                raise BadRequestError(
                    "Cannot remove system admin status "
                    "from the only admin role"
                )

        if (
            role_data.name is not None
            and role_data.name != role.name
        ):
            existing_role = (
                self.db.query(Role.id)
                .filter(
                    Role.name == role_data.name,
                    Role.id != role_id,
                )
                .first()
            )

            if existing_role:
                raise ConflictError(
                    f"Role '{role_data.name}' already exists"
                )

            changes["name"] = {
                "old": role.name,
                "new": role_data.name,
            }

            role.name = role_data.name

        if role_data.description is not None:
            changes["description"] = {
                "old": role.description,
                "new": role_data.description,
            }

            role.description = role_data.description

        if role_data.is_system_admin is not None:
            changes["is_system_admin"] = {
                "old": role.is_system_admin,
                "new": role_data.is_system_admin,
            }

            role.is_system_admin = role_data.is_system_admin

        if role_data.permission_ids is not None:
            permission_ids = list(
                dict.fromkeys(role_data.permission_ids)
            )

            if permission_ids:
                permissions = (
                    self.db.query(Permission)
                    .filter(Permission.id.in_(permission_ids))
                    .all()
                )

                found_permission_ids = {
                    permission.id for permission in permissions
                }

                missing_permission_ids = (
                    set(permission_ids) - found_permission_ids
                )

                if missing_permission_ids:
                    raise NotFoundError(
                        "Permission(s) not found: "
                        + ", ".join(
                            str(permission_id)
                            for permission_id in sorted(
                                missing_permission_ids
                            )
                        )
                    )

            self.db.query(RolePermission).filter(
                RolePermission.role_id == role_id
            ).delete(synchronize_session="fetch")

            for permission_id in permission_ids:
                self.db.add(
                    RolePermission(
                        role_id=role.id,
                        permission_id=permission_id,
                    )
                )

            changes["permission_ids"] = permission_ids

        role.updated_at = datetime.now(timezone.utc)

        self._log_action(
            action="role_updated",
            user_id=updated_by,
            record_id=role.id,
            description=f"Updated role '{role.name}'",
            changes=changes or None,
        )

        self.db.commit()

        return self.get_role(role.id)

    def delete_role(
        self,
        role_id: int,
        deleted_by: int,
    ) -> bool:
        """Delete a role."""

        role = self.get_role(role_id)

        user_count = (
            self.db.query(User.id)
            .filter(User.role_id == role_id)
            .count()
        )

        if user_count > 0:
            raise BadRequestError(
                f"Cannot delete role with {user_count} assigned users. "
                "Reassign users first."
            )

        if role.is_system_admin:
            admin_count = (
                self.db.query(Role)
                .filter(Role.is_system_admin.is_(True))
                .count()
            )

            if admin_count <= 1:
                raise BadRequestError(
                    "Cannot delete the only admin role"
                )

        role_name = role.name

        self._log_action(
            action="role_deleted",
            user_id=deleted_by,
            record_id=role.id,
            description=f"Deleted role '{role_name}'",
            changes={
                "name": role_name,
                "is_system_admin": role.is_system_admin,
            },
        )

        self.db.query(RolePermission).filter(
            RolePermission.role_id == role_id
        ).delete(synchronize_session="fetch")

        self.db.delete(role)
        self.db.commit()

        return True

    def assign_permissions_to_role(
        self,
        role_id: int,
        permission_ids: List[int],
        assigned_by: int,
    ) -> Role:
        """Assign permissions to a role."""

        role = self.get_role(role_id)

        permission_ids = list(dict.fromkeys(permission_ids or []))

        if permission_ids:
            permissions = (
                self.db.query(Permission)
                .filter(Permission.id.in_(permission_ids))
                .all()
            )

            found_permission_ids = {
                permission.id for permission in permissions
            }

            missing_permission_ids = (
                set(permission_ids) - found_permission_ids
            )

            if missing_permission_ids:
                raise NotFoundError(
                    "Permission(s) not found: "
                    + ", ".join(
                        str(permission_id)
                        for permission_id in sorted(
                            missing_permission_ids
                        )
                    )
                )

        self.db.query(RolePermission).filter(
            RolePermission.role_id == role_id
        ).delete(synchronize_session="fetch")

        for permission_id in permission_ids:
            self.db.add(
                RolePermission(
                    role_id=role.id,
                    permission_id=permission_id,
                )
            )

        self._log_action(
            action="role_permissions_updated",
            user_id=assigned_by,
            record_id=role.id,
            description=(
                f"Updated permissions for role '{role.name}'"
            ),
            changes={
                "permission_ids": permission_ids,
            },
        )

        self.db.commit()

        return self.get_role(role.id)

    # ==================== PERMISSION MANAGEMENT ====================

    def get_all_permissions(self) -> List[Permission]:
        """Get all permissions."""

        return (
            self.db.query(Permission)
            .order_by(
                Permission.module,
                Permission.name,
            )
            .all()
        )

    def get_permissions_grouped_by_module(
        self,
    ) -> List[PermissionGroupedResponse]:
        """Get permissions grouped by module."""

        permissions = self.get_all_permissions()

        grouped: Dict[str, List[Permission]] = {}

        for permission in permissions:
            grouped.setdefault(
                permission.module,
                [],
            ).append(permission)

        result = [
            PermissionGroupedResponse(
                module=module,
                permissions=permissions_list,
            )
            for module, permissions_list in grouped.items()
        ]

        return sorted(
            result,
            key=lambda item: item.module,
        )

    def get_permission_modules(self) -> List[str]:
        """Get list of all modules from the registry."""

        return sorted(PERMISSION_REGISTRY.keys())

    def sync_permissions_from_registry(
        self,
    ) -> Dict[str, Any]:
        """Sync permissions from registry to database."""

        created = 0
        updated = 0

        for module, permissions in PERMISSION_REGISTRY.items():
            for permission_name in permissions:
                existing = (
                    self.db.query(Permission)
                    .filter(
                        Permission.name == permission_name
                    )
                    .first()
                )

                if existing:
                    if existing.module != module:
                        existing.module = module
                        updated += 1

                else:
                    new_permission = Permission(
                        name=permission_name,
                        module=module,
                        description=(
                            f"{module} - "
                            f"{permission_name.split('.')[-1]}"
                            .replace("_", " ")
                            .title()
                        ),
                    )

                    self.db.add(new_permission)
                    created += 1

        self.db.commit()

        return {
            "created": created,
            "updated": updated,
            "total": self.db.query(Permission.id).count(),
        }

    # ==================== USER PERMISSION OVERRIDES ====================

    def get_user_permission_overrides(
        self,
        user_id: int,
    ) -> List[UserPermission]:
        """Get all permission overrides for a user."""

        user = self.get_user(user_id)

        return user.user_permissions

    def add_user_permission_override(
        self,
        user_id: int,
        override_data: UserPermissionOverrideCreate,
        updated_by: int,
    ) -> UserPermission:
        """Add or update a permission override for a user."""

        user = self.get_user(user_id)

        permission = (
            self.db.query(Permission)
            .filter(
                Permission.id == override_data.permission_id
            )
            .first()
        )

        if not permission:
            raise NotFoundError(
                f"Permission with ID "
                f"{override_data.permission_id} not found"
            )

        existing = (
            self.db.query(UserPermission)
            .filter(
                and_(
                    UserPermission.user_id == user_id,
                    UserPermission.permission_id
                    == override_data.permission_id,
                )
            )
            .first()
        )

        old_granted: Optional[bool] = None

        if existing:
            old_granted = existing.granted

            existing.granted = override_data.granted
            existing.updated_at = datetime.now(timezone.utc)

            result = existing

        else:
            user_permission = UserPermission(
                user_id=user_id,
                permission_id=override_data.permission_id,
                granted=override_data.granted,
            )

            self.db.add(user_permission)
            self.db.flush()

            result = user_permission

        self._log_action(
            action="user_permission_override",
            user_id=updated_by,
            target_user_id=user_id,
            record_id=permission.id,
            description=(
                f"{'Allowed' if override_data.granted else 'Denied'} "
                f"permission '{permission.name}' "
                f"for user '{user.username}'"
            ),
            changes={
                "permission": permission.name,
                "permission_id": permission.id,
                "granted": {
                    "old": old_granted,
                    "new": override_data.granted,
                },
            },
        )

        self.db.commit()
        self.db.refresh(result)

        return result

    def remove_user_permission_override(
        self,
        user_id: int,
        permission_id: int,
        updated_by: int,
    ) -> bool:
        """Remove a permission override from a user."""

        user = self.get_user(user_id)

        user_permission = (
            self.db.query(UserPermission)
            .filter(
                and_(
                    UserPermission.user_id == user_id,
                    UserPermission.permission_id == permission_id,
                )
            )
            .first()
        )

        if not user_permission:
            raise NotFoundError(
                f"Permission override not found for user "
                f"{user_id} and permission {permission_id}"
            )

        permission = (
            self.db.query(Permission)
            .filter(Permission.id == permission_id)
            .first()
        )

        permission_name = (
            permission.name
            if permission
            else str(permission_id)
        )

        old_granted = user_permission.granted

        self._log_action(
            action="user_permission_override_removed",
            user_id=updated_by,
            target_user_id=user_id,
            record_id=permission_id,
            description=(
                f"Removed permission override "
                f"'{permission_name}' from user "
                f"'{user.username}'"
            ),
            changes={
                "permission": permission_name,
                "permission_id": permission_id,
                "granted": old_granted,
                "removed": True,
            },
        )

        self.db.delete(user_permission)
        self.db.commit()

        return True

    # ==================== STATISTICS ====================

    def get_admin_stats(self) -> AdminStatsResponse:
        """Get admin dashboard statistics."""

        return AdminStatsResponse(
            total_users=self.db.query(User.id).count(),
            active_users=(
                self.db.query(User.id)
                .filter(User.is_active.is_(True))
                .count()
            ),
            total_roles=self.db.query(Role.id).count(),
            total_permissions=self.db.query(Permission.id).count(),
            total_modules=len(PERMISSION_REGISTRY),
        )

    # ==================== AUDIT LOGGING ====================

    # app/crud/admin.py

    def _log_action(
        self,
        user_id: int,
        username: str,  # <-- Ensure 'username' is explicitly listed here
        action: str,
        module: str = "ADMIN",
        record_id: Optional[int] = None,
        record_no: Optional[str] = None,
        target_user_id: Optional[int] = None,
        description: Optional[str] = None,
        changes: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        """Centralized helper to log administrative and business actions."""
        audit_log = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            module=module,
            record_id=record_id,
            record_no=record_no,
            target_user_id=target_user_id,
            description=description,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(audit_log)
        self.db.flush()
