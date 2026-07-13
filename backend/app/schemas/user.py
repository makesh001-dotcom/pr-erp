from pydantic import BaseModel

# 1. Used for the incoming Login request (Frontend -> Backend)
class LoginRequest(BaseModel):
    username: str
    password: str

# 2. Used for the user data we send back (Backend -> Frontend)
class UserInfo(BaseModel):
    username: str
    role: str
    

# 3. The final response structure
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo  