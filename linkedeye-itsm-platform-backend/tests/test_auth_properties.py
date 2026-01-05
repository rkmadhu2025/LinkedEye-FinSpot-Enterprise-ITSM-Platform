"""
Property-based tests for authentication system.
Feature: itsm-platform-enhancement, Property 36: Authentication Security
**Validates: Requirements 7.1, 7.4, 7.5**
"""
import pytest
from hypothesis import given, strategies as st, settings
from fastapi.testclient import TestClient
from app.core.security import create_access_token, verify_token, get_password_hash, verify_password
from app.models.user import User, UserRole, UserStatus
import uuid
from datetime import datetime, timedelta


class TestAuthenticationSecurity:
    """Property-based tests for authentication security."""
    
    @given(
        user_id=st.uuids(),
        email=st.emails(),
        password=st.text(min_size=8, max_size=50)
    )
    @settings(max_examples=100)
    def test_password_hashing_security(self, user_id, email, password):
        """
        Property 36: Authentication Security - Password hashing
        For any valid password, hashing should be secure and verifiable.
        """
        # Hash the password
        hashed = get_password_hash(password)
        
        # Properties that must hold
        assert hashed != password  # Password should never be stored in plain text
        assert len(hashed) > len(password)  # Hash should be longer than original
        assert verify_password(password, hashed)  # Hash should verify correctly
        assert not verify_password(password + "x", hashed)  # Wrong password should not verify
        
        # Hash should be different each time (salt)
        hashed2 = get_password_hash(password)
        assert hashed != hashed2  # Different salt should produce different hash
        assert verify_password(password, hashed2)  # But both should verify correctly
    
    @given(
        user_id=st.uuids(),
        additional_data=st.dictionaries(
            st.text(min_size=1, max_size=20), 
            st.one_of(st.text(max_size=50), st.integers(), st.booleans()),
            min_size=0,
            max_size=5
        )
    )
    @settings(max_examples=100)
    def test_jwt_token_security(self, user_id, additional_data):
        """
        Property 36: Authentication Security - JWT token generation and verification
        For any user ID and additional data, JWT tokens should be secure and verifiable.
        """
        # Create token data
        token_data = {"sub": str(user_id), **additional_data}
        
        # Create access token
        access_token = create_access_token(token_data)
        
        # Properties that must hold
        assert isinstance(access_token, str)
        assert len(access_token) > 50  # JWT tokens should be substantial length
        assert "." in access_token  # JWT format has dots
        
        # Token should be verifiable
        payload = verify_token(access_token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "access"
        assert "exp" in payload  # Should have expiration
        
        # Expiration should be in the future
        exp_timestamp = payload["exp"]
        assert exp_timestamp > datetime.utcnow().timestamp()
        
        # Additional data should be preserved
        for key, value in additional_data.items():
            if key not in ["exp", "type"]:  # Skip reserved fields
                assert payload.get(key) == value
    
    @given(
        email=st.emails(),
        password=st.text(min_size=8, max_size=50),
        first_name=st.text(min_size=1, max_size=50),
        last_name=st.text(min_size=1, max_size=50)
    )
    @settings(max_examples=100)
    def test_user_authentication_flow(self, client, db_session, email, password, first_name, last_name):
        """
        Property 36: Authentication Security - Complete authentication flow
        For any valid user credentials, the authentication flow should be secure.
        """
        # Create user in database
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=get_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            failed_login_attempts=0
        )
        db_session.add(user)
        db_session.commit()
        
        # Test login
        response = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": password
        })
        
        # Properties that must hold for successful authentication
        assert response.status_code == 200
        token_data = response.json()
        
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["token_type"] == "bearer"
        
        # Tokens should be different
        assert token_data["access_token"] != token_data["refresh_token"]
        
        # Both tokens should be verifiable
        access_payload = verify_token(token_data["access_token"])
        refresh_payload = verify_token(token_data["refresh_token"], token_type="refresh")
        
        assert access_payload["sub"] == str(user.id)
        assert refresh_payload["sub"] == str(user.id)
        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"
        
        # Test authenticated request
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        me_response = client.get("/api/v1/auth/me", headers=headers)
        
        assert me_response.status_code == 200
        user_data = me_response.json()
        assert user_data["email"] == email
        assert user_data["first_name"] == first_name
        assert user_data["last_name"] == last_name
    
    @given(
        email=st.emails(),
        correct_password=st.text(min_size=8, max_size=50),
        wrong_password=st.text(min_size=8, max_size=50)
    )
    @settings(max_examples=100)
    def test_authentication_failure_security(self, client, db_session, email, correct_password, wrong_password):
        """
        Property 36: Authentication Security - Failed authentication handling
        For any user with wrong credentials, authentication should fail securely.
        """
        # Ensure passwords are different
        if correct_password == wrong_password:
            wrong_password = wrong_password + "x"
        
        # Create user in database
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=get_password_hash(correct_password),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            failed_login_attempts=0
        )
        db_session.add(user)
        db_session.commit()
        
        # Test login with wrong password
        response = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": wrong_password
        })
        
        # Properties that must hold for failed authentication
        assert response.status_code == 401
        assert "access_token" not in response.json()
        assert "refresh_token" not in response.json()
        
        # Error message should not reveal whether user exists
        error_detail = response.json().get("detail", "")
        assert "password" in error_detail.lower() or "credentials" in error_detail.lower()
        
        # User should still exist and be active (no account lockout on first failure)
        db_session.refresh(user)
        assert user.status == UserStatus.ACTIVE
        assert int(user.failed_login_attempts) >= 1  # Should increment failed attempts
    
    @given(
        token_data=st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.one_of(st.text(max_size=50), st.integers()),
            min_size=1,
            max_size=5
        )
    )
    @settings(max_examples=100)
    def test_token_expiration_security(self, token_data):
        """
        Property 36: Authentication Security - Token expiration
        For any token data, expired tokens should be rejected.
        """
        # Create token with past expiration
        past_time = datetime.utcnow() - timedelta(hours=1)
        token = create_access_token(token_data, expires_delta=timedelta(seconds=-3600))
        
        # Properties that must hold for expired tokens
        with pytest.raises(Exception):  # Should raise HTTPException or similar
            verify_token(token)
    
    @given(
        malformed_token=st.text(min_size=1, max_size=100)
    )
    @settings(max_examples=100)
    def test_malformed_token_security(self, malformed_token):
        """
        Property 36: Authentication Security - Malformed token handling
        For any malformed token, verification should fail securely.
        """
        # Skip tokens that might accidentally be valid JWT format
        if malformed_token.count('.') == 2:
            malformed_token = malformed_token.replace('.', 'x')
        
        # Properties that must hold for malformed tokens
        with pytest.raises(Exception):  # Should raise HTTPException or similar
            verify_token(malformed_token)