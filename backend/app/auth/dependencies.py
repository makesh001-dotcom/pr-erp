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
        
        # Ensure correct type conversion (e.g., matching database key types)
        raw_user_id = payload.get("user_id") or payload.get("sub")
        if raw_user_id is None:
            raise credentials_exception
        user_id = int(raw_user_id)
        
    except (JWTError, ValueError):
        raise credentials_exception

    # Eager load relationships to prevent N+1 queries during downstream authorization
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
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user


def require_permission(permission_name: str):
    """
    Factory validation checking if the user owns the explicit permission string.
    """
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
    ):
        # Defend against missing roles safely
        if not current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User profile has no assigned functional role.",
            )

        # Superuser escape hatch
        if current_user.role.name.lower() == "admin":
            return current_user

        # Extract permission set names safely
        user_permissions = {
            rp.permission.name
            for rp in current_user.role.role_permissions
            if rp.permission
        }

        if permission_name not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission_name}",
            )

        return current_user

    return permission_checker