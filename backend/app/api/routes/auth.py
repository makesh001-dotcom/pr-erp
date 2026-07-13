from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.user import LoginRequest, TokenResponse
from app.db.session import get_db
from app.crud.user import get_user_by_username
from app.core.security import verify_password, create_access_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(data:     LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_username(db, data.username)

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "user_id": user.id,
        "role": user.role
    })

    # Update this to return the user object with the role
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role
        }
    }

#----------for medical oruose only*/

@router.get("/login")
def login_help():
    return {
        "message": "Login page accessed via GET. Please use the frontend or /docs to POST credentials."
    }