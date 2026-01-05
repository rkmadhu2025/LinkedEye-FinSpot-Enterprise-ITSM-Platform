"""
API dependencies for authentication and authorization.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User, UserRole
from app.core.logging import get_logger

logger = get_logger(__name__)
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    try:
        # Verify JWT token
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user"
            )
        
        # Check if account is locked
        if user.is_account_locked():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is locked"
            )
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def require_role(required_role: UserRole):
    """Dependency factory for role-based access control."""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not has_required_role(current_user.role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def require_permission(permission: str):
    """Dependency factory for permission-based access control."""
    async def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission}"
            )
        return current_user
    return permission_checker


def has_required_role(user_role, required_role: UserRole) -> bool:
    """Check if user role meets the required role level."""
    # Role hierarchy using enum values for comparison with string stored roles
    role_hierarchy = {
        UserRole.READONLY.value: 0,
        UserRole.USER.value: 1,
        UserRole.AGENT.value: 2,
        UserRole.MANAGER.value: 3,
        UserRole.ADMIN.value: 4
    }

    # Handle both enum and string values for user_role
    user_role_value = user_role.value if isinstance(user_role, UserRole) else user_role
    required_role_value = required_role.value if isinstance(required_role, UserRole) else required_role

    user_level = role_hierarchy.get(user_role_value, 0)
    required_level = role_hierarchy.get(required_role_value, 0)

    return user_level >= required_level


# Common role dependencies
require_admin = require_role(UserRole.ADMIN)
require_manager = require_role(UserRole.MANAGER)
require_agent = require_role(UserRole.AGENT)
require_user = require_role(UserRole.USER)

# Common permission dependencies
require_incident_read = require_permission("incident:read")
require_incident_write = require_permission("incident:write")
require_asset_read = require_permission("asset:read")
require_asset_write = require_permission("asset:write")
require_change_read = require_permission("change:read")
require_change_write = require_permission("change:write")
require_user_management = require_permission("user:manage")