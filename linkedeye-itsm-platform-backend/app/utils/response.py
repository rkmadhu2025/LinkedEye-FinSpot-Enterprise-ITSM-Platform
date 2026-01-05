"""
Standardized API response utilities.
"""
from typing import Any, Optional, Dict, List
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standard API response model."""
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    errors: Optional[List[str]] = None
    meta: Optional[Dict[str, Any]] = None


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    meta: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Create a success response."""
    response = APIResponse(
        success=True,
        data=data,
        message=message,
        meta=meta
    )
    return JSONResponse(
        status_code=status_code,
        content=response.dict(exclude_none=True)
    )


def error_response(
    message: str = "An error occurred",
    errors: Optional[List[str]] = None,
    status_code: int = 400,
    meta: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Create an error response."""
    response = APIResponse(
        success=False,
        message=message,
        errors=errors or [message],
        meta=meta
    )
    return JSONResponse(
        status_code=status_code,
        content=response.dict(exclude_none=True)
    )


def paginated_response(
    items: List[Any],
    total: int,
    skip: int = 0,
    limit: int = 100,
    message: str = "Success"
) -> JSONResponse:
    """Create a paginated response."""
    meta = {
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total
        }
    }
    return success_response(
        data=items,
        message=message,
        meta=meta
    )
