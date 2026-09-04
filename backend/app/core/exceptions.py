from fastapi import HTTPException, status

class AppBaseException(HTTPException):
    """Base exception for application-specific HTTP errors."""
    pass

class NotFoundError(AppBaseException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class ConflictError(AppBaseException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)

class BadRequestError(AppBaseException):
    """Replaces ValidationError to avoid collisions with Pydantic/Python defaults."""
    def __init__(self, detail: str = "Invalid request or business rule violation"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)