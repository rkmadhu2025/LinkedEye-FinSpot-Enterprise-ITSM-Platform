"""
Property-based tests for client switching and access control system.
Feature: integration-auth-enhancement, Property 3: Client Visibility and Access Control
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**
Feature: integration-auth-enhancement, Property 5: Client Context Switching
**Validates: Requirements 3.2, 3.3, 3.4, 4.5**
"""
import pytest
from hypothesis import given, strategies as st, settings, assume
from sqlalchemy import create_engine, Text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB
import json
import uuid
from datetime import datetime, timezone

# Custom JSONB type for SQLite testing
class JSONBSQLite(TypeDecorator):
    """JSONB type that works with SQLite for testing."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return value

# Monkey patch JSONB for SQLite
original_jsonb = JSONB
def patched_jsonb(*args, **kwargs):
    return JSONBSQLite()

# Apply patches before importing models
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Patch JSONB before importing models
import app.models.user
import app.models.client
app.models.user.JSONB = patched_jsonb

from app.models.client import Client, ClientStatus, ClientEnvironment
from app.models.user import User, UserRole, UserStatus
from app.services.client_switching_service import ClientSwitchingService
from app.models.base import BaseModel


class TestClientAccessControlProperties:
    """Property-based tests for client visibility and access control."""
    
    @given(
        # Generate user data
        user_is_admin=st.booleans(),
        user_status=st.sampled_from([UserStatus.ACTIVE.value, UserStatus.INACTIVE.value]),
        # Generate client data
        client_status=st.sampled_from([ClientStatus.ACTIVE.value, ClientStatus.INACTIVE.value, ClientStatus.SUSPENDED.value]),
        client_is_active=st.booleans(),
        # Generate assignment relationship
        user_assigned_to_client=st.booleans()
    )
    @settings(max_examples=100, deadline=None)
    def test_client_visibility_and_access_control(self, standalone_db_session, user_is_admin, user_status, 
                                                 client_status, client_is_active, user_assigned_to_client):
        """
        Property 3: Client Visibility and Access Control
        For any user and client combination, client visibility and access should be granted 
        if and only if the user is assigned to that client or is an admin user.
        **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
        """
        # Create test client
        client = Client(
            id=uuid.uuid4(),
            client_code=f"TEST_{uuid.uuid4().hex[:8].upper()}",
            name=f"Test Client {uuid.uuid4().hex[:8]}",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus(client_status),
            is_active=client_is_active
        )
        standalone_db_session.add(client)
        standalone_db_session.flush()
        
        # Create test user
        user = User(
            id=uuid.uuid4(),
            email=f"test_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN.value if user_is_admin else UserRole.USER.value,
            status=user_status,
            is_active=user_status == UserStatus.ACTIVE.value,
            client_id=client.id if user_assigned_to_client else None
        )
        standalone_db_session.add(user)
        standalone_db_session.flush()
        
        # Create client switching service
        client_service = ClientSwitchingService(standalone_db_session)
        
        # Properties that must hold for client visibility and access control
        
        # 1. Get accessible clients for user
        accessible_clients = client_service.get_user_clients(user.id)
        
        # 2. Admin users should see all active clients
        if user_is_admin and user.is_active:
            if client_is_active and client_status == ClientStatus.ACTIVE.value:
                client_ids = [c.id for c in accessible_clients]
                assert client.id in client_ids, "Admin should see active clients"
            else:
                # Inactive or non-active clients should not be in regular accessible list
                client_ids = [c.id for c in accessible_clients]
                # Admin might not see inactive clients in get_user_clients (business rule)
        
        # 3. Regular users should only see their assigned client if it's active
        elif not user_is_admin and user.is_active:
            if user_assigned_to_client and client_is_active and client_status == ClientStatus.ACTIVE.value:
                assert len(accessible_clients) == 1, "Regular user should see only their assigned active client"
                assert accessible_clients[0].id == client.id, "Should be the assigned client"
            else:
                # User not assigned or client inactive - should see no clients
                assert len(accessible_clients) == 0, "Regular user should not see unassigned or inactive clients"
        
        # 4. Inactive users should not see any clients
        elif not user.is_active:
            assert len(accessible_clients) == 0, "Inactive users should not see any clients"
        
        # 5. Validate client access directly
        has_access = client_service.validate_client_access(user.id, client.id)
        
        # Admin users should have access to all clients (even inactive ones for management)
        if user_is_admin and user.is_active:
            assert has_access, "Admin users should have access to all clients"
        
        # Regular users should only have access to their assigned active client
        elif not user_is_admin and user.is_active:
            if (user_assigned_to_client and client_is_active and 
                client_status == ClientStatus.ACTIVE.value):
                assert has_access, "Regular user should have access to assigned active client"
            else:
                assert not has_access, "Regular user should not have access to unassigned or inactive client"
        
        # Inactive users should not have access to any client
        else:
            assert not has_access, "Inactive users should not have access to any client"
        
        # 6. Client switcher visibility
        should_show_switcher = client_service.should_show_client_switcher(user.id)
        
        # Admin users should always see the switcher (they can potentially access multiple clients)
        if user_is_admin and user.is_active:
            assert should_show_switcher, "Admin users should see client switcher"
        
        # Regular users should only see switcher if they have multiple clients (rare case)
        elif not user_is_admin and user.is_active:
            # In current implementation, regular users can only have one client
            # So switcher should not be shown unless they have multiple clients
            if len(accessible_clients) > 1:
                assert should_show_switcher, "Users with multiple clients should see switcher"
            else:
                assert not should_show_switcher, "Users with single/no client should not see switcher"
        
        # Inactive users should not see switcher
        else:
            assert not should_show_switcher, "Inactive users should not see client switcher"
        
        # 7. Get current client
        current_client = client_service.get_current_client(user.id)
        
        if user_assigned_to_client and user.is_active:
            assert current_client is not None, "User with assigned client should have current client"
            assert current_client.id == client.id, "Current client should match assigned client"
        else:
            assert current_client is None, "User without assigned client should have no current client"
    
    @given(
        # Generate multiple users with different roles and assignments
        num_users=st.integers(min_value=2, max_value=5),
        num_clients=st.integers(min_value=2, max_value=4),
        admin_ratio=st.floats(min_value=0.0, max_value=0.5)  # 0-50% admin users
    )
    @settings(max_examples=50, deadline=None)
    def test_multi_user_client_access_isolation(self, db_session, num_users, num_clients, admin_ratio):
        """
        Property 3: Client Visibility and Access Control - Multi-user isolation
        For any set of users and clients, each user should only access clients they're 
        authorized for, and access should be properly isolated between users.
        **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
        """
        # Create test clients
        clients = []
        for i in range(num_clients):
            client = Client(
                id=uuid.uuid4(),
                client_code=f"CLIENT_{i}_{uuid.uuid4().hex[:6].upper()}",
                name=f"Test Client {i}",
                environment=ClientEnvironment.PRODUCTION,
                status=ClientStatus.ACTIVE,
                is_active=True
            )
            clients.append(client)
            db_session.add(client)
        
        db_session.flush()
        
        # Create test users with different assignments
        users = []
        num_admins = int(num_users * admin_ratio)
        
        for i in range(num_users):
            is_admin = i < num_admins
            # Assign regular users to different clients
            assigned_client = clients[i % num_clients] if not is_admin and i < num_clients else None
            
            user = User(
                id=uuid.uuid4(),
                email=f"user_{i}_{uuid.uuid4().hex[:6]}@example.com",
                first_name=f"User{i}",
                last_name="Test",
                password_hash="hashed_password",
                role=UserRole.ADMIN.value if is_admin else UserRole.USER.value,
                status=UserStatus.ACTIVE.value,
                is_active=True,
                client_id=assigned_client.id if assigned_client else None
            )
            users.append(user)
            db_session.add(user)
        
        db_session.flush()
        
        # Create client switching service
        client_service = ClientSwitchingService(db_session)
        
        # Properties that must hold for multi-user access isolation
        
        for user in users:
            accessible_clients = client_service.get_user_clients(user.id)
            
            # 1. Admin users should see all clients
            if user.is_admin:
                accessible_client_ids = {c.id for c in accessible_clients}
                all_client_ids = {c.id for c in clients}
                assert accessible_client_ids == all_client_ids, "Admin should see all clients"
            
            # 2. Regular users should only see their assigned client
            else:
                if user.client_id:
                    assert len(accessible_clients) == 1, "Regular user should see only one client"
                    assert accessible_clients[0].id == user.client_id, "Should see assigned client"
                else:
                    assert len(accessible_clients) == 0, "Unassigned user should see no clients"
            
            # 3. Access validation should be consistent with visibility
            for client in clients:
                has_access = client_service.validate_client_access(user.id, client.id)
                
                if user.is_admin:
                    assert has_access, f"Admin should have access to client {client.client_code}"
                else:
                    if user.client_id == client.id:
                        assert has_access, f"User should have access to assigned client {client.client_code}"
                    else:
                        assert not has_access, f"User should not have access to unassigned client {client.client_code}"
        
        # 4. Cross-user access isolation
        for i, user1 in enumerate(users):
            for j, user2 in enumerate(users):
                if i != j and not user1.is_admin and not user2.is_admin:
                    # Regular users should not have access to each other's clients
                    if user1.client_id and user2.client_id and user1.client_id != user2.client_id:
                        assert not client_service.validate_client_access(user1.id, user2.client_id)
                        assert not client_service.validate_client_access(user2.id, user1.client_id)
    
    @given(
        # Generate client status changes
        initial_status=st.sampled_from([ClientStatus.ACTIVE.value, ClientStatus.INACTIVE.value]),
        final_status=st.sampled_from([ClientStatus.ACTIVE.value, ClientStatus.INACTIVE.value, ClientStatus.SUSPENDED.value]),
        initial_active=st.booleans(),
        final_active=st.booleans(),
        user_is_admin=st.booleans()
    )
    @settings(max_examples=50, deadline=None)
    def test_client_status_change_access_control(self, db_session, initial_status, final_status, 
                                               initial_active, final_active, user_is_admin):
        """
        Property 3: Client Visibility and Access Control - Status change handling
        For any client status change, user access should be updated appropriately 
        based on the new client status.
        **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
        """
        # Create test client with initial status
        client = Client(
            id=uuid.uuid4(),
            client_code=f"STATUS_TEST_{uuid.uuid4().hex[:8].upper()}",
            name="Status Test Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus(initial_status),
            is_active=initial_active
        )
        db_session.add(client)
        db_session.flush()
        
        # Create test user assigned to the client
        user = User(
            id=uuid.uuid4(),
            email=f"status_test_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Status",
            last_name="Test",
            password_hash="hashed_password",
            role=UserRole.ADMIN.value if user_is_admin else UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=client.id
        )
        db_session.add(user)
        db_session.flush()
        
        client_service = ClientSwitchingService(db_session)
        
        # Check initial access
        initial_access = client_service.validate_client_access(user.id, client.id)
        initial_clients = client_service.get_user_clients(user.id)
        
        # Change client status
        client.status = ClientStatus(final_status)
        client.is_active = final_active
        db_session.flush()
        
        # Check access after status change
        final_access = client_service.validate_client_access(user.id, client.id)
        final_clients = client_service.get_user_clients(user.id)
        
        # Properties that must hold for status changes
        
        # 1. Admin users should always have access (for management purposes)
        if user_is_admin:
            assert final_access, "Admin should maintain access regardless of client status"
        
        # 2. Regular users should only have access to active clients
        else:
            if final_active and final_status == ClientStatus.ACTIVE.value:
                assert final_access, "Regular user should have access to active client"
            else:
                assert not final_access, "Regular user should not have access to inactive client"
        
        # 3. Client visibility should reflect status changes for regular users
        if not user_is_admin:
            if final_active and final_status == ClientStatus.ACTIVE.value:
                client_ids = [c.id for c in final_clients]
                assert client.id in client_ids, "Active client should be visible to assigned user"
            else:
                client_ids = [c.id for c in final_clients]
                assert client.id not in client_ids, "Inactive client should not be visible to regular user"


class TestClientContextSwitchingProperties:
    """Property-based tests for client context switching functionality."""
    
    @given(
        # Generate user data
        user_is_admin=st.booleans(),
        user_status=st.sampled_from([UserStatus.ACTIVE.value]),  # Only active users can switch
        # Generate multiple clients for switching
        num_clients=st.integers(min_value=2, max_value=4),
        # Generate switching scenario
        switch_to_assigned=st.booleans(),  # Whether to switch to assigned client or different one
    )
    @settings(max_examples=100, deadline=None)
    def test_client_context_switching(self, db_session, user_is_admin, user_status, 
                                    num_clients, switch_to_assigned):
        """
        Property 5: Client Context Switching
        For any valid client switch operation, the Multi_Tenant_System should update 
        the user's context and filter all subsequent data operations to the selected client.
        **Validates: Requirements 3.2, 3.3, 3.4, 4.5**
        """
        # Create test clients
        clients = []
        for i in range(num_clients):
            client = Client(
                id=uuid.uuid4(),
                client_code=f"SWITCH_{i}_{uuid.uuid4().hex[:6].upper()}",
                name=f"Switch Test Client {i}",
                environment=ClientEnvironment.PRODUCTION,
                status=ClientStatus.ACTIVE,
                is_active=True
            )
            clients.append(client)
            db_session.add(client)
        
        db_session.flush()
        
        # Create test user
        assigned_client = clients[0]  # Assign to first client
        user = User(
            id=uuid.uuid4(),
            email=f"switch_test_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Switch",
            last_name="Test",
            password_hash="hashed_password",
            role=UserRole.ADMIN.value if user_is_admin else UserRole.USER.value,
            status=user_status,
            is_active=True,
            client_id=assigned_client.id if not user_is_admin else None
        )
        db_session.add(user)
        db_session.flush()
        
        client_service = ClientSwitchingService(db_session)
        
        # Determine target client for switching
        if switch_to_assigned or not user_is_admin:
            target_client = assigned_client
        else:
            # Admin switching to different client
            target_client = clients[1] if len(clients) > 1 else clients[0]
        
        # Properties that must hold for client context switching
        
        # 1. Get initial context
        initial_context = client_service.get_client_context_info(user.id)
        
        # 2. Attempt client switch
        switch_success = client_service.switch_client_context(user.id, target_client.id)
        
        # 3. Validate switch success based on user permissions
        if user_is_admin:
            assert switch_success, "Admin should be able to switch to any active client"
        else:
            if target_client.id == user.client_id:
                assert switch_success, "Regular user should be able to switch to assigned client"
            else:
                assert not switch_success, "Regular user should not be able to switch to unassigned client"
        
        # 4. If switch was successful, validate context update
        if switch_success:
            # Get updated context
            updated_context = client_service.get_client_context_info(user.id, target_client.id)
            
            # Context should reflect the target client
            assert updated_context['current_client'] is not None
            assert updated_context['current_client']['id'] == str(target_client.id)
            assert updated_context['current_client']['client_code'] == target_client.client_code
            assert updated_context['has_client_access'] == True
            
            # User should have access to the target client
            assert client_service.validate_client_access(user.id, target_client.id)
        
        # 5. If switch failed, context should remain unchanged
        else:
            # Context should not change
            post_fail_context = client_service.get_client_context_info(user.id)
            
            # For regular users, context should remain with their assigned client
            if not user_is_admin and user.client_id:
                assert post_fail_context['current_client']['id'] == str(user.client_id)
        
        # 6. Validate access control consistency
        accessible_clients = client_service.get_user_clients(user.id)
        
        for client in clients:
            has_access = client_service.validate_client_access(user.id, client.id)
            is_accessible = any(c.id == client.id for c in accessible_clients)
            
            if user_is_admin:
                assert has_access, f"Admin should have access to client {client.client_code}"
                assert is_accessible, f"Admin should see client {client.client_code} in accessible list"
            else:
                if client.id == user.client_id:
                    assert has_access, f"User should have access to assigned client {client.client_code}"
                    assert is_accessible, f"User should see assigned client {client.client_code}"
                else:
                    assert not has_access, f"User should not have access to unassigned client {client.client_code}"
                    assert not is_accessible, f"User should not see unassigned client {client.client_code}"
    
    @given(
        # Generate switching sequence
        num_switches=st.integers(min_value=2, max_value=5),
        user_is_admin=st.booleans()
    )
    @settings(max_examples=50, deadline=None)
    def test_multiple_client_context_switches(self, db_session, num_switches, user_is_admin):
        """
        Property 5: Client Context Switching - Multiple switches
        For any sequence of valid client switches, each switch should update the context 
        correctly and maintain proper access control throughout.
        **Validates: Requirements 3.2, 3.3, 3.4, 4.5**
        """
        # Create enough clients for switching
        clients = []
        for i in range(max(3, num_switches)):
            client = Client(
                id=uuid.uuid4(),
                client_code=f"MULTI_{i}_{uuid.uuid4().hex[:6].upper()}",
                name=f"Multi Switch Client {i}",
                environment=ClientEnvironment.PRODUCTION,
                status=ClientStatus.ACTIVE,
                is_active=True
            )
            clients.append(client)
            db_session.add(client)
        
        db_session.flush()
        
        # Create test user
        user = User(
            id=uuid.uuid4(),
            email=f"multi_switch_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Multi",
            last_name="Switch",
            password_hash="hashed_password",
            role=UserRole.ADMIN.value if user_is_admin else UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=clients[0].id if not user_is_admin else None
        )
        db_session.add(user)
        db_session.flush()
        
        client_service = ClientSwitchingService(db_session)
        
        # Properties that must hold for multiple switches
        
        switch_history = []
        
        for i in range(num_switches):
            # Select target client for switch
            if user_is_admin:
                target_client = clients[i % len(clients)]
            else:
                # Regular users can only switch to their assigned client
                target_client = clients[0]  # Their assigned client
            
            # Record pre-switch state
            pre_switch_context = client_service.get_client_context_info(user.id)
            
            # Attempt switch
            switch_success = client_service.switch_client_context(user.id, target_client.id)
            
            # Record post-switch state
            post_switch_context = client_service.get_client_context_info(user.id, target_client.id)
            
            switch_record = {
                'target_client_id': target_client.id,
                'success': switch_success,
                'pre_context': pre_switch_context,
                'post_context': post_switch_context
            }
            switch_history.append(switch_record)
            
            # 1. Switch success should be consistent with user permissions
            if user_is_admin:
                assert switch_success, f"Admin switch {i} should succeed"
            else:
                if target_client.id == user.client_id:
                    assert switch_success, f"Regular user switch {i} to assigned client should succeed"
                else:
                    assert not switch_success, f"Regular user switch {i} to unassigned client should fail"
            
            # 2. If switch succeeded, context should be updated
            if switch_success:
                assert post_switch_context['current_client']['id'] == str(target_client.id)
                assert post_switch_context['has_client_access'] == True
            
            # 3. Access control should remain consistent
            for client in clients:
                has_access = client_service.validate_client_access(user.id, client.id)
                
                if user_is_admin:
                    assert has_access, f"Admin should maintain access to all clients after switch {i}"
                else:
                    if client.id == user.client_id:
                        assert has_access, f"Regular user should maintain access to assigned client after switch {i}"
                    else:
                        assert not has_access, f"Regular user should not have access to unassigned client after switch {i}"
        
        # 4. Final state should be consistent
        final_context = client_service.get_client_context_info(user.id)
        
        # Should reflect the last successful switch
        successful_switches = [s for s in switch_history if s['success']]
        if successful_switches:
            last_successful = successful_switches[-1]
            expected_client_id = str(last_successful['target_client_id'])
            
            if user_is_admin or last_successful['target_client_id'] == user.client_id:
                assert final_context['current_client']['id'] == expected_client_id
        
        # 5. Access patterns should be stable
        final_accessible = client_service.get_user_clients(user.id)
        
        if user_is_admin:
            # Admin should see all clients
            assert len(final_accessible) == len(clients)
        else:
            # Regular user should see only assigned client
            if user.client_id:
                assert len(final_accessible) == 1
                assert final_accessible[0].id == user.client_id
            else:
                assert len(final_accessible) == 0
    
    @given(
        # Generate invalid switching scenarios
        target_client_exists=st.booleans(),
        target_client_active=st.booleans(),
        user_active=st.booleans(),
        user_is_admin=st.booleans()
    )
    @settings(max_examples=50, deadline=None)
    def test_invalid_client_context_switches(self, db_session, target_client_exists, 
                                           target_client_active, user_active, user_is_admin):
        """
        Property 5: Client Context Switching - Invalid switch handling
        For any invalid client switch attempt, the system should fail gracefully 
        and maintain the previous context state.
        **Validates: Requirements 3.2, 3.3, 3.4, 4.5**
        """
        # Create valid client for user assignment
        valid_client = Client(
            id=uuid.uuid4(),
            client_code=f"VALID_{uuid.uuid4().hex[:8].upper()}",
            name="Valid Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add(valid_client)
        
        # Create target client (may be invalid)
        if target_client_exists:
            target_client = Client(
                id=uuid.uuid4(),
                client_code=f"TARGET_{uuid.uuid4().hex[:8].upper()}",
                name="Target Client",
                environment=ClientEnvironment.PRODUCTION,
                status=ClientStatus.ACTIVE if target_client_active else ClientStatus.INACTIVE,
                is_active=target_client_active
            )
            db_session.add(target_client)
            target_client_id = target_client.id
        else:
            # Non-existent client
            target_client_id = uuid.uuid4()
        
        db_session.flush()
        
        # Create test user
        user = User(
            id=uuid.uuid4(),
            email=f"invalid_switch_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Invalid",
            last_name="Switch",
            password_hash="hashed_password",
            role=UserRole.ADMIN.value if user_is_admin else UserRole.USER.value,
            status=UserStatus.ACTIVE.value if user_active else UserStatus.INACTIVE.value,
            is_active=user_active,
            client_id=valid_client.id if not user_is_admin else None
        )
        db_session.add(user)
        db_session.flush()
        
        client_service = ClientSwitchingService(db_session)
        
        # Properties that must hold for invalid switches
        
        # 1. Get initial context
        initial_context = client_service.get_client_context_info(user.id)
        
        # 2. Attempt invalid switch
        switch_success = client_service.switch_client_context(user.id, target_client_id)
        
        # 3. Determine if switch should succeed
        should_succeed = (
            user_active and  # User must be active
            target_client_exists and  # Target client must exist
            target_client_active and  # Target client must be active
            (user_is_admin or  # Admin can switch to any client
             (not user_is_admin and target_client_id == user.client_id))  # Regular user can only switch to assigned
        )
        
        # 4. Validate switch result
        assert switch_success == should_succeed, f"Switch success should match expected result"
        
        # 5. If switch failed, context should remain unchanged
        if not switch_success:
            post_fail_context = client_service.get_client_context_info(user.id)
            
            # Context should be identical to initial state
            if initial_context['current_client'] and post_fail_context['current_client']:
                assert initial_context['current_client']['id'] == post_fail_context['current_client']['id']
            elif initial_context['current_client'] is None:
                assert post_fail_context['current_client'] is None
        
        # 6. Access control should remain consistent regardless of switch attempt
        if user_active:
            accessible_clients = client_service.get_user_clients(user.id)
            
            if user_is_admin:
                # Admin should see all active clients
                all_active_clients = db_session.query(Client).filter(
                    Client.is_active == True,
                    Client.status == ClientStatus.ACTIVE
                ).all()
                accessible_ids = {c.id for c in accessible_clients}
                expected_ids = {c.id for c in all_active_clients}
                assert accessible_ids == expected_ids
            else:
                # Regular user should see only assigned client if it's active
                if user.client_id and valid_client.is_active:
                    assert len(accessible_clients) == 1
                    assert accessible_clients[0].id == user.client_id
                else:
                    assert len(accessible_clients) == 0
        
        # 7. Invalid switches should not affect user's ability to access valid clients
        if user_active and user.client_id:
            valid_access = client_service.validate_client_access(user.id, valid_client.id)
            if user_is_admin or user.client_id == valid_client.id:
                assert valid_access, "Invalid switch should not affect access to valid clients"


# Note: db_session fixture is provided by conftest.py

# Test database setup for standalone testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def standalone_db_session():
    """Create a standalone database session for testing without app dependencies."""
    BaseModel.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        BaseModel.metadata.drop_all(bind=engine)