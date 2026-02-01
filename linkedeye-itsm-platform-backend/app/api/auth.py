"""
Authentication API endpoints.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, AliasChoices, validator
from app.core.database import get_db
from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    verify_token,
    generate_password_reset_token,
    verify_password_reset_token
)
from app.models.user import User, UserRole, UserStatus
from app.api.dependencies import get_current_user
from app.core.logging import get_logger, log_security_event

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


def _validate_password_strength(v: str) -> str:
    """Shared password strength validator."""
    import re
    if not re.search(r'[A-Z]', v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r'[0-9]', v):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
        raise ValueError("Password must contain at least one special character")
    return v


# Pydantic models
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: str

    class Config:
        # Allow either email or username to be provided
        extra = "ignore"


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12)
    first_name: str = Field(..., validation_alias=AliasChoices("first_name", "firstName"))
    last_name: str = Field(..., validation_alias=AliasChoices("last_name", "lastName"))
    department: Optional[str] = None

    @validator("password")
    def validate_password_strength(cls, v):
        return _validate_password_strength(v)


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=12)

    @validator("new_password")
    def validate_password_strength(cls, v):
        return _validate_password_strength(v)


class RoleResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    permissions: list[str] = []
    isSystem: bool = False
    isActive: bool = True


class GroupResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    groupType: str = "team"
    isActive: bool = True


class UserResponse(BaseModel):
    id: UUID
    organizationId: str = "default"  # Default organization for now
    email: str
    firstName: str = Field(..., validation_alias=AliasChoices("first_name", "firstName"))
    lastName: str = Field(..., validation_alias=AliasChoices("last_name", "lastName"))
    displayName: Optional[str] = Field(None, validation_alias=AliasChoices("display_name", "displayName"))
    phone: Optional[str] = None
    avatarUrl: Optional[str] = None
    jobTitle: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    timezone: str = "UTC"
    authProvider: str = "local"
    status: str = "active"
    emailVerified: bool = Field(False, validation_alias=AliasChoices("is_email_verified", "emailVerified"))
    lastLoginAt: Optional[str] = Field(None, validation_alias=AliasChoices("last_login_at", "lastLoginAt"))
    createdAt: Optional[str] = Field(None, validation_alias=AliasChoices("created_at", "createdAt"))
    updatedAt: Optional[str] = Field(None, validation_alias=AliasChoices("updated_at", "updatedAt"))
    roles: list[RoleResponse] = []
    groups: list[GroupResponse] = []

    class Config:
        from_attributes = True
        populate_by_name = True


@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT tokens."""
    try:
        # Find user by email or username
        user = None
        login_identifier = user_credentials.email or user_credentials.username

        if not login_identifier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username is required"
            )

        # If email is provided or the identifier contains @, search by email
        if user_credentials.email or (login_identifier and '@' in login_identifier):
            email_to_search = user_credentials.email or login_identifier
            user = db.query(User).filter(User.email == email_to_search).first()
        # Otherwise search by username (email field for now, or add username column)
        elif user_credentials.username:
            # First try to find by email (since username might be the email)
            user = db.query(User).filter(User.email == user_credentials.username).first()
            # If not found by email, try display_name as username fallback
            if not user:
                user = db.query(User).filter(User.display_name == user_credentials.username).first()

        if not user:
            log_security_event("login_failed", context={"identifier": login_identifier, "reason": "user_not_found"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password"
            )
        
        # Check if account is locked
        if user.is_account_locked():
            log_security_event("login_failed", user_id=str(user.id), context={"reason": "account_locked"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is locked due to too many failed attempts"
            )
        
        # Verify password
        if not verify_password(user_credentials.password, user.password_hash):
            # Increment failed login attempts
            user.failed_login_attempts += 1

            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
                log_security_event("account_locked", user_id=str(user.id), context={"failed_attempts": user.failed_login_attempts})
            
            db.commit()
            log_security_event("login_failed", user_id=str(user.id), context={"reason": "invalid_password"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password"
            )
        
        # Check if user is active
        if user.status != UserStatus.ACTIVE:
            log_security_event("login_failed", user_id=str(user.id), context={"reason": "inactive_user"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is not active"
            )
        
        # Reset failed login attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()
        
        # Create tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        log_security_event("login_success", user_id=str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Login error: {e}", error=str(e), traceback=error_details)
        
        # If debug mode is on, return the error details
        from app.core.config import settings
        detail_msg = "Internal server error"
        if settings.debug:
            detail_msg = f"Internal server error: {str(e)}"
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail_msg
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    try:
        # Verify refresh token
        payload = verify_token(token_data.refresh_token, token_type="refresh")
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        log_security_event("token_refresh", user_id=str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new user. Requires admin authentication."""
    try:
        # Only admins can create new users
        user_role = getattr(current_user, 'role', '')
        if hasattr(user_role, 'value'):
            user_role = user_role.value
        if user_role not in ('admin', 'super_admin'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can create new users"
            )
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        password_hash = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=password_hash,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            display_name=f"{user_data.first_name} {user_data.last_name}",
            department=user_data.department,
            role=UserRole.USER.value,  # Use .value since database column is VARCHAR
            status=UserStatus.ACTIVE.value  # Use .value since database column is VARCHAR/enum
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        log_security_event("user_registered", user_id=str(new_user.id))
        
        return new_user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    # Convert user's role to roles array format expected by frontend
    user_role = getattr(current_user, 'role', 'user')
    if hasattr(user_role, 'value'):
        user_role = user_role.value

    role_obj = RoleResponse(
        id=str(current_user.id),
        name=str(user_role).replace('_', ' ').title(),
        code=str(user_role),
        description=f"{str(user_role).replace('_', ' ').title()} role",
        permissions=[],
        isSystem=True,
        isActive=True
    )

    # Build response with all required fields
    return UserResponse(
        id=current_user.id,
        organizationId="default",
        email=current_user.email,
        firstName=current_user.first_name,
        lastName=current_user.last_name,
        displayName=current_user.display_name or f"{current_user.first_name} {current_user.last_name}",
        phone=getattr(current_user, 'phone', None),
        avatarUrl=getattr(current_user, 'avatar_url', None),
        jobTitle=getattr(current_user, 'job_title', None),
        department=current_user.department,
        location=getattr(current_user, 'location', None),
        timezone=getattr(current_user, 'timezone', 'UTC') or 'UTC',
        authProvider="local",
        status=str(getattr(current_user, 'status', 'active').value if hasattr(getattr(current_user, 'status', 'active'), 'value') else 'active'),
        emailVerified=getattr(current_user, 'is_email_verified', False) or False,
        lastLoginAt=str(current_user.last_login_at) if current_user.last_login_at else None,
        createdAt=str(current_user.created_at) if current_user.created_at else None,
        updatedAt=str(current_user.updated_at) if current_user.updated_at else None,
        roles=[role_obj],
        groups=[]
    )


@router.post("/logout")
async def logout(
    request: Request
):
    """Logout user (client should discard tokens). Accepts expired tokens gracefully."""
    try:
        # Try to extract user ID from token for logging, but don't fail if expired
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            import jwt as pyjwt
            from app.core.config import settings
            payload = pyjwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
                options={"verify_exp": False}
            )
            if payload and "sub" in payload:
                log_security_event("logout", user_id=payload["sub"])
    except Exception:
        pass  # Token parsing failed - still allow logout
    return {"message": "Successfully logged out"}


@router.post("/password-reset")
async def request_password_reset(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """Request password reset."""
    try:
        user = db.query(User).filter(User.email == reset_data.email).first()
        
        if user:
            # Generate reset token
            reset_token = generate_password_reset_token(user.email)
            user.password_reset_token = reset_token
            user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
            db.commit()
            
            log_security_event("password_reset_requested", user_id=str(user.id))
            
            # In a real application, you would send an email here
            logger.info(f"Password reset token generated for user {user.email}")
        
        # Always return success to prevent email enumeration
        return {"message": "If the email exists, a password reset link has been sent"}
    
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Confirm password reset with token."""
    try:
        # Verify reset token
        email = verify_password_reset_token(reset_data.token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        # Find user and verify token matches
        user = db.query(User).filter(User.email == email).first()
        if not user or user.password_reset_token != reset_data.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )

        # Check token expiration
        if user.password_reset_expires and datetime.now(timezone.utc) > user.password_reset_expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired"
            )

        # Update password
        user.password_hash = get_password_hash(reset_data.new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

        log_security_event("password_reset_completed", user_id=str(user.id))

        return {"message": "Password has been reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset confirmation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=12)

    @validator("new_password")
    def validate_password_strength(cls, v):
        return _validate_password_strength(v)


class EmailVerification(BaseModel):
    token: str


@router.post("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for authenticated user."""
    try:
        # Verify current password
        if not verify_password(password_data.current_password, current_user.password_hash):
            log_security_event("password_change_failed", user_id=str(current_user.id), context={"reason": "invalid_current_password"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        # Update password
        current_user.password_hash = get_password_hash(password_data.new_password)
        db.commit()

        log_security_event("password_changed", user_id=str(current_user.id))

        return {"message": "Password has been changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/verify-email")
async def verify_email(
    verification_data: EmailVerification,
    db: Session = Depends(get_db)
):
    """Verify email address with token."""
    try:
        # Find user by verification token
        user = db.query(User).filter(User.email_verification_token == verification_data.token).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )

        # Mark email as verified
        user.is_email_verified = True
        user.email_verification_token = None
        db.commit()

        log_security_event("email_verified", user_id=str(user.id))

        return {"message": "Email has been verified successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/resend-verification")
async def resend_verification_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resend email verification token."""
    try:
        if current_user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )

        # Generate new verification token
        import uuid
        verification_token = str(uuid.uuid4())
        current_user.email_verification_token = verification_token
        db.commit()

        log_security_event("verification_email_resent", user_id=str(current_user.id))

        # In production, send email here
        logger.info(f"Verification token generated for user {current_user.email}")

        return {"message": "Verification email has been sent"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(None, validation_alias=AliasChoices("first_name", "firstName"))
    last_name: Optional[str] = Field(None, validation_alias=AliasChoices("last_name", "lastName"))
    display_name: Optional[str] = Field(None, validation_alias=AliasChoices("display_name", "displayName"))
    phone: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = Field(None, validation_alias=AliasChoices("job_title", "jobTitle"))
    location: Optional[str] = None
    timezone: Optional[str] = None


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""
    try:
        # Update only provided fields
        if profile_data.first_name is not None:
            current_user.first_name = profile_data.first_name
        if profile_data.last_name is not None:
            current_user.last_name = profile_data.last_name
        if profile_data.display_name is not None:
            current_user.display_name = profile_data.display_name
        if profile_data.phone is not None:
            current_user.phone = profile_data.phone
        if profile_data.department is not None:
            current_user.department = profile_data.department
        if profile_data.job_title is not None:
            current_user.job_title = profile_data.job_title
        if profile_data.location is not None:
            current_user.location = profile_data.location
        if profile_data.timezone is not None:
            current_user.timezone = profile_data.timezone

        # Update display_name if not explicitly set
        if profile_data.display_name is None and (profile_data.first_name or profile_data.last_name):
            first = profile_data.first_name or current_user.first_name
            last = profile_data.last_name or current_user.last_name
            current_user.display_name = f"{first} {last}"

        db.commit()
        db.refresh(current_user)

        log_security_event("profile_updated", user_id=str(current_user.id))

        # Convert user's role to roles array format expected by frontend
        user_role = getattr(current_user, 'role', 'user')
        if hasattr(user_role, 'value'):
            user_role = user_role.value

        role_obj = RoleResponse(
            id=str(current_user.id),
            name=str(user_role).replace('_', ' ').title(),
            code=str(user_role),
            description=f"{str(user_role).replace('_', ' ').title()} role",
            permissions=[],
            isSystem=True,
            isActive=True
        )

        return UserResponse(
            id=current_user.id,
            organizationId="default",
            email=current_user.email,
            firstName=current_user.first_name,
            lastName=current_user.last_name,
            displayName=current_user.display_name or f"{current_user.first_name} {current_user.last_name}",
            phone=getattr(current_user, 'phone', None),
            avatarUrl=getattr(current_user, 'avatar_url', None),
            jobTitle=getattr(current_user, 'job_title', None),
            department=current_user.department,
            location=getattr(current_user, 'location', None),
            timezone=getattr(current_user, 'timezone', 'UTC') or 'UTC',
            authProvider="local",
            status=str(getattr(current_user, 'status', 'active').value if hasattr(getattr(current_user, 'status', 'active'), 'value') else 'active'),
            emailVerified=getattr(current_user, 'is_email_verified', False) or False,
            lastLoginAt=str(current_user.last_login_at) if current_user.last_login_at else None,
            createdAt=str(current_user.created_at) if current_user.created_at else None,
            updatedAt=str(current_user.updated_at) if current_user.updated_at else None,
            roles=[role_obj],
            groups=[]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )