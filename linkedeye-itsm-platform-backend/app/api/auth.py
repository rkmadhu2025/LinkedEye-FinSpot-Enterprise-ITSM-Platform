"""
Authentication API endpoints.
"""
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, AliasChoices
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


# Pydantic models
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str = Field(..., validation_alias=AliasChoices("first_name", "firstName"))
    last_name: str = Field(..., validation_alias=AliasChoices("last_name", "lastName"))
    department: Optional[str] = None


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str = Field(..., serialization_alias="firstName")
    last_name: str = Field(..., serialization_alias="lastName")
    display_name: Optional[str] = Field(None, serialization_alias="displayName")
    role: UserRole
    department: Optional[str] = None
    is_active: bool
    
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
        # Find user by email
        user = db.query(User).filter(User.email == user_credentials.email).first()
        
        if not user:
            log_security_event("login_failed", context={"email": user_credentials.email, "reason": "user_not_found"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
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
                user.locked_until = datetime.utcnow() + timedelta(minutes=30)
                log_security_event("account_locked", user_id=str(user.id), context={"failed_attempts": user.failed_login_attempts})
            
            db.commit()
            log_security_event("login_failed", user_id=str(user.id), context={"reason": "invalid_password"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
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
        user.last_login_at = datetime.utcnow()
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
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
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
    db: Session = Depends(get_db)
):
    """Register a new user."""
    try:
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
    return current_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout user (client should discard tokens)."""
    log_security_event("logout", user_id=str(current_user.id))
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
            user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
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
        if user.password_reset_expires and datetime.utcnow() > user.password_reset_expires:
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
    new_password: str


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