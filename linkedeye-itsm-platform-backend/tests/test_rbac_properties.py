"""
Property-based tests for role-based access control.
Feature: itsm-platform-enhancement, Property 37: Role-based Access Control
**Validates: Requirements 7.2**
"""
import pytest
from hypothesis import given, strategies as st, settings
from app.models.user import User, UserRole, UserStatus
from app.api.dependencies import has_required_role, require_role, require_permission
from app.core.security import get_password_hash
import uuid


class TestRoleBasedAccessControl:
    """Property-based tests for role-based access control."""
    
    @given(
        user_role=st.sampled_from(list(UserRole)),
        required_role=st.sampled_from(list(UserRole))
    )
    @settings(max_examples=100)
    def test_role_hierarchy_access(self, user_role, required_role):
        """
        Property 37: Role-based Access Control - Role hierarchy
        For any user role and required role, access should follow the hierarchy.
        """
        # Define role hierarchy levels
        role_levels = {
            UserRole.READONLY: 0,
            UserRole.USER: 1,
            UserRole.AGENT: 2,
            UserRole.MANAGER: 3,
            UserRole.ADMIN: 4
        }
        
        user_level = role_levels[user_role]
        required_level = role_levels[required_role]
        
        # Property: User should have access if their role level >= required level
        expected_access = user_level >= required_level
        actual_access = has_required_role(user_role, required_role)
        
        assert actual_access == expected_access, (
            f"Role {user_role} (level {user_level}) should "
            f"{'have' if expected_access else 'not have'} access to "
            f"{required_role} (level {required_level})"
        )
    
    @given(
        email=st.emails(),
        first_name=st.text(min_size=1, max_size=50),
        last_name=st.text(min_size=1, max_size=50),
        user_role=st.sampled_from(list(UserRole)),
        permissions=st.lists(
            st.text(min_size=1, max_size=30),
            min_size=0,
            max_size=10,
            unique=True
        )
    )
    @settings(max_examples=100)
    def test_user_permission_system(self, db_session, email, first_name, last_name, user_role, permissions):
        """
        Property 37: Role-based Access Control - Permission system
        For any user with specific permissions, permission checks should work correctly.
        """
        # Create user with specific role and permissions
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=get_password_hash("testpassword123"),
            first_name=first_name,
            last_name=last_name,
            role=user_role,
            status=UserStatus.ACTIVE,
            permissions=permissions,
            failed_login_attempts="0"
        )
        db_session.add(user)
        db_session.commit()
        
        # Test permission checks
        for permission in permissions:
            # User should have permissions they were explicitly granted
            assert user.has_permission(permission), (
                f"User should have permission '{permission}' that was explicitly granted"
            )
        
        # Test random permission that wasn't granted
        test_permission = "test:random:permission"
        if test_permission not in permissions:
            if user_role == UserRole.ADMIN:
                # Admin should have all permissions
                assert user.has_permission(test_permission), (
                    "Admin users should have all permissions"
                )
            else:
                # Non-admin users should not have permissions they weren't granted
                assert not user.has_permission(test_permission), (
                    f"Non-admin user should not have permission '{test_permission}' that wasn't granted"
                )
    
    @given(
        admin_permissions=st.lists(
            st.text(min_size=1, max_size=30),
            min_size=0,
            max_size=10,
            unique=True
        ),
        test_permission=st.text(min_size=1, max_size=30)
    )
    @settings(max_examples=100)
    def test_admin_universal_access(self, db_session, admin_permissions, test_permission):
        """
        Property 37: Role-based Access Control - Admin universal access
        For any admin user, they should have access to all permissions regardless of explicit grants.
        """
        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@test.com",
            hashed_password=get_password_hash("adminpass123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            permissions=admin_permissions,  # Explicit permissions shouldn't matter for admin
            failed_login_attempts="0"
        )
        db_session.add(admin_user)
        db_session.commit()
        
        # Property: Admin should have any permission, regardless of explicit grants
        assert admin_user.has_permission(test_permission), (
            f"Admin user should have permission '{test_permission}' even if not explicitly granted"
        )
        
        # Property: Admin should also have explicitly granted permissions
        for permission in admin_permissions:
            assert admin_user.has_permission(permission), (
                f"Admin user should have explicitly granted permission '{permission}'"
            )
    
    @given(
        user_role=st.sampled_from([UserRole.READONLY, UserRole.USER, UserRole.AGENT, UserRole.MANAGER]),
        permissions=st.lists(
            st.text(min_size=1, max_size=30),
            min_size=0,
            max_size=10,
            unique=True
        ),
        test_permission=st.text(min_size=1, max_size=30)
    )
    @settings(max_examples=100)
    def test_non_admin_permission_restrictions(self, db_session, user_role, permissions, test_permission):
        """
        Property 37: Role-based Access Control - Non-admin permission restrictions
        For any non-admin user, they should only have explicitly granted permissions.
        """
        # Ensure test permission is not in the granted permissions
        if test_permission in permissions:
            test_permission = test_permission + "_modified"
        
        # Create non-admin user
        user = User(
            id=uuid.uuid4(),
            email="user@test.com",
            hashed_password=get_password_hash("userpass123"),
            first_name="Regular",
            last_name="User",
            role=user_role,
            status=UserStatus.ACTIVE,
            permissions=permissions,
            failed_login_attempts="0"
        )
        db_session.add(user)
        db_session.commit()
        
        # Property: Non-admin users should not have permissions they weren't granted
        assert not user.has_permission(test_permission), (
            f"Non-admin user with role {user_role} should not have "
            f"permission '{test_permission}' that wasn't explicitly granted"
        )
        
        # Property: Non-admin users should have permissions they were granted
        for permission in permissions:
            assert user.has_permission(permission), (
                f"User should have explicitly granted permission '{permission}'"
            )
    
    @given(
        user_status=st.sampled_from(list(UserStatus)),
        user_role=st.sampled_from(list(UserRole)),
        permissions=st.lists(
            st.text(min_size=1, max_size=30),
            min_size=0,
            max_size=5,
            unique=True
        )
    )
    @settings(max_examples=100)
    def test_user_status_affects_access(self, db_session, user_status, user_role, permissions):
        """
        Property 37: Role-based Access Control - User status affects access
        For any user, their status should affect their access capabilities.
        """
        user = User(
            id=uuid.uuid4(),
            email="status_test@test.com",
            hashed_password=get_password_hash("statuspass123"),
            first_name="Status",
            last_name="Test",
            role=user_role,
            status=user_status,
            permissions=permissions,
            failed_login_attempts="0"
        )
        db_session.add(user)
        db_session.commit()
        
        # Property: User activity status should be correctly reflected
        expected_active = (user_status == UserStatus.ACTIVE)
        assert user.is_active == expected_active, (
            f"User with status {user_status} should have is_active={expected_active}"
        )
        
        # Property: Role-based properties should work regardless of status
        assert user.is_admin == (user_role == UserRole.ADMIN)
        assert user.is_manager == (user_role in [UserRole.ADMIN, UserRole.MANAGER])
        assert user.is_agent == (user_role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT])
    
    @given(
        role_pairs=st.lists(
            st.tuples(
                st.sampled_from(list(UserRole)),
                st.sampled_from(list(UserRole))
            ),
            min_size=1,
            max_size=10
        )
    )
    @settings(max_examples=100)
    def test_role_hierarchy_transitivity(self, role_pairs):
        """
        Property 37: Role-based Access Control - Role hierarchy transitivity
        For any chain of role requirements, the hierarchy should be transitive.
        """
        for user_role, required_role in role_pairs:
            # If user has access to required_role, they should have access to all lower roles
            if has_required_role(user_role, required_role):
                # Test against all roles lower than required_role
                role_levels = {
                    UserRole.READONLY: 0,
                    UserRole.USER: 1,
                    UserRole.AGENT: 2,
                    UserRole.MANAGER: 3,
                    UserRole.ADMIN: 4
                }
                
                required_level = role_levels[required_role]
                
                for lower_role, lower_level in role_levels.items():
                    if lower_level <= required_level:
                        assert has_required_role(user_role, lower_role), (
                            f"If {user_role} has access to {required_role}, "
                            f"it should also have access to {lower_role}"
                        )
    
    @given(
        locked_duration_minutes=st.integers(min_value=1, max_value=60),
        failed_attempts=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=100)
    def test_account_lockout_security(self, db_session, locked_duration_minutes, failed_attempts):
        """
        Property 37: Role-based Access Control - Account lockout affects access
        For any user with account lockout, access should be properly restricted.
        """
        from datetime import datetime, timedelta
        
        # Create user with potential lockout
        user = User(
            id=uuid.uuid4(),
            email="lockout_test@test.com",
            hashed_password=get_password_hash("lockoutpass123"),
            first_name="Lockout",
            last_name="Test",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            failed_login_attempts=str(failed_attempts),
            locked_until=datetime.utcnow() + timedelta(minutes=locked_duration_minutes),
            failed_login_attempts="0"
        )
        db_session.add(user)
        db_session.commit()
        
        # Property: Locked account should be detected
        assert user.is_account_locked(), (
            "User with locked_until in the future should be detected as locked"
        )
        
        # Test with expired lockout
        user.locked_until = datetime.utcnow() - timedelta(minutes=1)
        db_session.commit()
        
        # Property: Expired lockout should not affect access
        assert not user.is_account_locked(), (
            "User with expired lockout should not be considered locked"
        )