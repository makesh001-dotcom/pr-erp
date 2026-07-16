from pydantic import BaseModel


# ==========================
# Login Request
# ==========================

class LoginRequest(BaseModel):
    username: str
    password: str


# ==========================
# User returned after login
# ==========================

class UserInfo(BaseModel):
    id: int
    username: str
    role: str


# ==========================
# Authenticated User (/auth/me)
# ==========================

class CurrentUserResponse(BaseModel):
    id: int
    username: str
    role: str
    permissions: list[str]


# ==========================
# JWT Response
# ==========================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo