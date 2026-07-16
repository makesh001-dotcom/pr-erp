from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
)
from app.crud.client import (
    create_client,
    get_client,
    list_clients,
    update_client,
    deactivate_client,
    reactivate_client,
)
from app.models.client import Client
from app.auth.dependencies import require_permission
from app.core.permisiion import (
    CLIENT_VIEW,
    CLIENT_CREATE,
    CLIENT_UPDATE,
    CLIENT_DELETE,
)
from app.models.users import User

router = APIRouter(
    prefix="/clients",
    tags=["Clients"],
    responses={
        404: {"description": "Client not found"},
        400: {"description": "Bad request"},
    }
)


# -------------------------------------------------------
# List Clients
# -------------------------------------------------------
@router.get("/", response_model=ClientListResponse)
def list_clients_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    sort_by: str = Query("company_name"),
    order: str = Query("asc"),
    current_user: User = Depends(
    require_permission(CLIENT_VIEW)
),
db: Session = Depends(get_db),
):
    skip = (page - 1) * limit

    result = list_clients(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        sort_by=sort_by,
        order=order,
    )

    result["page"] = page
    result.pop("skip", None)

    return result

# -------------------------------------------------------
# Get Single Client
# -------------------------------------------------------
@router.get("/{client_id}", response_model=ClientResponse)
def get_client_endpoint(
    client_id: int,
    current_user: User = Depends(
    require_permission(CLIENT_VIEW)
),
db: Session = Depends(get_db),
):
    """Get client by ID"""
    return get_client(db, client_id)


# -------------------------------------------------------
# Create Client
# -------------------------------------------------------
@router.post("/", response_model=ClientResponse, status_code=201)
def create_client_endpoint(
    data: ClientCreate,
   current_user: User = Depends(
    require_permission(CLIENT_CREATE)
),
db: Session = Depends(get_db),
):
    """Create a new client"""
    return create_client(db, data)


# -------------------------------------------------------
# Update Client
# -------------------------------------------------------
@router.put("/{client_id}", response_model=ClientResponse)
def update_client_endpoint(
    client_id: int,
    data: ClientUpdate,
    current_user: User = Depends(
    require_permission(CLIENT_UPDATE)
),
db: Session = Depends(get_db),
):
    """Update client details (partial update)"""
    return update_client(db, client_id, data)


# -------------------------------------------------------
# Deactivate Client (Soft Delete)
# -------------------------------------------------------
@router.delete("/{client_id}", response_model=ClientResponse)
def deactivate_client_endpoint(
    client_id: int,
    current_user: User = Depends(
    require_permission(CLIENT_DELETE)
),
db: Session = Depends(get_db),
):
    """Deactivate a client (soft delete)"""
    return deactivate_client(db, client_id)


# -------------------------------------------------------
# Reactivate Client
# -------------------------------------------------------
@router.put("/{client_id}/reactivate", response_model=ClientResponse)
def reactivate_client_endpoint(
    client_id: int,
   current_user: User = Depends(
    require_permission(CLIENT_UPDATE)
),
db: Session = Depends(get_db),
):
    """Reactivate a deactivated client"""
    return reactivate_client(db, client_id)


# -------------------------------------------------------
# Bulk Import
# -------------------------------------------------------
@router.post("/bulk", status_code=201)
def bulk_import_clients(
    data: List[ClientCreate],
    current_user: User = Depends(
    require_permission(CLIENT_CREATE)
),
db: Session = Depends(get_db),
):
    """Bulk import clients"""
    created = []
    errors = []

    for idx, item in enumerate(data):
        try:
            client = create_client(db, item)
            created.append(client)
        except Exception as e:
            errors.append({"index": idx, "error": str(e)})

    return {
        "message": f"Imported {len(created)} clients",
        "created": len(created),
        "errors": errors if errors else None,
    }