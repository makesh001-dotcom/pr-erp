from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status , Request
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.crud.admin import AdminService
from app.db.session import get_db
from app.models.role import Role
from app.models.users import User
from app.schemas.admin import (
    AdminStatsResponse,
    PermissionGroupedResponse,
    PermissionResponse,
    RoleCreate,
    RolePermissionAssignment,
    RoleResponse,
    RoleUpdate,
    UserCreate,
    UserListResponse,
    UserPermissionOverrideCreate,
    UserPermissionOverrideResponse,
    UserResponse,
    UserUpdate,
    
)
router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)]
)
# ==================== USERS ====================

@router.get("/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get paginated list of users (Admin only)"""
    return AdminService(db).get_users(
        page=page,
        limit=limit,
        search=search,
        role_id=role_id,
        is_active=is_active,
    )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a specific user by ID (Admin only)"""
    return AdminService(db).get_user(user_id)

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Safely extract IP across reverse proxies/load balancers
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else None

    user_agent = request.headers.get("user-agent")

    return AdminService(db).create_user(
        user_data=user_in,
        admin_user_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a user (Admin only)"""
    return AdminService(db).update_user(user_id, user_data, current_user.id)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Soft delete (deactivate) a user (Admin only)"""
    AdminService(db).delete_user(user_id, current_user.id)
    return None

@router.post("/users/{user_id}/activate", status_code=status.HTTP_200_OK)
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Activate a user (Admin only)"""
    AdminService(db).activate_user(user_id, current_user.id)
    return {"message": "User activated successfully"}

# ==================== USER PERMISSION OVERRIDES ====================

@router.get("/users/{user_id}/permissions/overrides", response_model=List[UserPermissionOverrideResponse])
async def get_user_permission_overrides(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all permission overrides for a user (Admin only)"""
    return AdminService(db).get_user_permission_overrides(user_id)

@router.post("/users/{user_id}/permissions/overrides", response_model=UserPermissionOverrideResponse)
async def add_user_permission_override(
    user_id: int,
    override_data: UserPermissionOverrideCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Add or update a permission override for a user (Admin only)"""
    return AdminService(db).add_user_permission_override(user_id, override_data, current_user.id)

@router.delete("/users/{user_id}/permissions/overrides/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_permission_override(
    user_id: int,
    permission_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove a permission override from a user (Admin only)"""
    AdminService(db).remove_user_permission_override(user_id, permission_id, current_user.id)
    return None

# ==================== ROLES ====================

@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all roles (Admin only)"""
    return AdminService(db).get_roles()

# FIX: Static routes like /roles/options MUST come before parameterized routes like /roles/{role_id}
@router.get("/roles/options", response_model=List[dict])
async def get_role_options(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get simplified list of roles for dropdowns (Admin only)"""
    roles = db.query(Role).all()
    return [{"id": role.id, "name": role.name, "is_system_admin": role.is_system_admin} for role in roles]

@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a specific role by ID (Admin only)"""
    return AdminService(db).get_role(role_id)

@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new role (Admin only)"""
    return AdminService(db).create_role(role_data, current_user.id)

@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a role (Admin only)"""
    return AdminService(db).update_role(role_id, role_data, current_user.id)

@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a role (Admin only)"""
    AdminService(db).delete_role(role_id, current_user.id)
    return None

@router.post("/roles/{role_id}/permissions", response_model=RoleResponse)
async def assign_role_permissions(
    role_id: int,
    assignment: RolePermissionAssignment,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Assign permissions to a role (Admin only)"""
    return AdminService(db).assign_permissions_to_role(role_id, assignment.permission_ids, current_user.id)

# ==================== PERMISSIONS ====================

# FIX: Static permission routes placed above dynamic paths if added later
@router.get("/permissions/grouped", response_model=List[PermissionGroupedResponse])
async def get_permissions_grouped(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all permissions grouped by module (Admin only)"""
    return AdminService(db).get_permissions_grouped_by_module()

@router.get("/permissions/modules", response_model=List[str])
async def get_permission_modules(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all module names from the permission registry (Admin only)"""
    return AdminService(db).get_permission_modules()

@router.post("/permissions/sync", response_model=dict)
async def sync_permissions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Sync permissions from registry to database (Admin only)"""
    return AdminService(db).sync_permissions_from_registry()

@router.get("/permissions", response_model=List[PermissionResponse])
async def get_all_permissions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all permissions (Admin only)"""
    return AdminService(db).get_all_permissions()

# ==================== STATISTICS ====================

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get admin dashboard statistics (Admin only)"""
    return AdminService(db).get_admin_stats()