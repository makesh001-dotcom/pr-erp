from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload
from typing import Optional
# 1. Update the import at the top of the file
from app.core.config import ALGORITHM, SECRET_KEY

from app.db.session import get_db
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user_permission import UserPermission
from app.models.users import User
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Fetch and validate the authenticated user with preloaded permissions."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        raw_user_id = payload.get("sub") or payload.get("user_id")
        if raw_user_id is None:
            raise credentials_exception
        user_id = int(raw_user_id)
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    user = (
        db.query(User)
        .options(
            joinedload(User.role)
            .joinedload(Role.role_permissions)
            .joinedload(RolePermission.permission),
            joinedload(User.user_permissions).joinedload(
                UserPermission.permission
            ),
        )
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return current_user


def require_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Restrict access strictly to system administrators."""
    if not current_user.role or not current_user.role.is_system_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_permission(permission_name: str):
    """Dependency factory checking user and role-level permissions."""

    def dependency(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        # 1. System Admin Override
        if current_user.role and current_user.role.is_system_admin:
            return current_user

        # 2. Individual User Overrides (O(1) dictionary lookup with null guard)
        user_perms = {
            up.permission.name: up.granted
            for up in current_user.user_permissions
            if up.permission
        }
        if permission_name in user_perms:
            if user_perms[permission_name]:
                return current_user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission explicitly denied: {permission_name}",
            )

        # 3. Role-level Permissions
        if current_user.role:
            role_perms = {
                rp.permission.name
                for rp in current_user.role.role_permissions
                if rp.permission
            }
            if permission_name in role_perms:
                return current_user

        # 4. Fallback Deny
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission required: {permission_name}",
        )

    return dependency