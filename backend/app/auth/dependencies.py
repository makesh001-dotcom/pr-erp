from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload

from app.core.config import SECRET_KEY, ALGORITHM
from app.db.session import get_db

from app.models.users import User
from app.models.role import Role
from app.models.role_permission import RolePermission

security = HTTPBearer()


def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Decode JWT and return the authenticated user.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    try:
        payload = jwt.decode(
            token.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("user_id")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = (
        db.query(User)
        .options(
            joinedload(User.role)
            .joinedload(Role.role_permissions)
            .joinedload(RolePermission.permission)
        )
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
):
    """
    Ensure the logged-in user is active.
    """

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return current_user


def require_permission(permission_name: str):
    """
    Factory that returns a dependency checking whether
    the current user owns the required permission.
    """

    def permission_checker(
        current_user: User = Depends(get_current_active_user),
    ):

        # Admin bypass
        if current_user.role.name.lower() == "admin":
            return current_user

        user_permissions = {
            rp.permission.name
            for rp in current_user.role.role_permissions
        }

        if permission_name not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action.",
            )

        return current_user

    return permission_checker