"""
Simple property-based tests for client switching and access control system.
Feature: integration-auth-enhancement, Property 3: Client Visibility and Access Control
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**
Feature: integration-auth-enhancement, Property 5: Client Context Switching
**Validates: Requirements 3.2, 3.3, 3.4, 4.5**
"""
import pytest
from hypothesis import given, strategies as st, settings
from sqlalchemy import create_engine, Text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator
import json
import uuid
import sys
import os

# Add the parent directory to the path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

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

# Monkey patch JSONB for SQLite before importing models
from sqlalchemy.dialects.postgresql import JSONB
original_jsonb = JSONB

def patched_jsonb(*args, **kwargs):
    return JSONBSQLite()

# Apply patches
import app.models.user
import app.models.client
app.models.user.JSONB = patched_jsonb

from app.models.client import Client, ClientStatus, ClientEnvironment
from app.models.user import User, UserRole, UserStatus
from app.services.client_switching_service import ClientSwitchingService
from app.models.base import BaseModel

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Create a standalone database session for testing."""
    BaseModel.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        BaseModel.metadata.drop_all(bind=engine)


class TestClientAccessControlProperties:
    """Property-based tests for client visibility and access control."""
    
    @given(
        user_is_admin=st.booleans(),
        client_is_active=st.booleans(),
        user_assigned_to_client=st.booleans()
    )
    @settings(max_examples=20, deadline=None)
    def test_client_visibility_and_access_control(self, db_session, user_is_admin, 
                                                 client_is_active, user_assigned_to_client):
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
            status=ClientStatus.ACTIVE if client_is_active else ClientStatus.INACTIVE,
            is_active=client_is_active
        )
        db_session.add(client)
        db_session.flush()
        
        # Create test user
        user = User(
            id=uuid.uuid4(),
            email=f"test_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN.value if user_is_admin else UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=client.id if user_assigned_to_client else None
        )
        db_session.add(user)
        db_session.flush()
        
        # Create client switching service
        client_service = ClientSwitchingService(db_session)
        
        # Test client access validation
        has_access = client_service.validate_client_access(user.id, client.id)
        
        # Properties that must hold
        if user_is_admin:
            # Admin users should have access to all clients
            assert has_access, "Admin users should have access to all clients"
        else:
            # Regular users should only have access to their assigned active client
            if user_assigned_to_client and client_is_active:
                assert has_access, "Regular user should have access to assigned active client"
            else:
                assert not has_access, "Regular user should not have access to unassigned or inactive client"
        
        # Test accessible clients
        accessible_clients = client_service.get_user_clients(user.id)
        
        if user_is_admin and client_is_active:
            # Admin should see active clients
            client_ids = [c.id for c in accessible_clients]
            assert client.id in client_ids, "Admin should see active clients"
        elif not user_is_admin and user_assigned_to_client and client_is_active:
            # Regular user should see their assigned active client
            assert len(accessible_clients) == 1, "Regular user should see only their assigned active client"
            assert accessible_clients[0].id == client.id, "Should be the assigned client"
        else:
            # Should not see inactive or unassigned clients
            client_ids = [c.id for c in accessible_clients]
            if not user_is_admin:
                assert client.id not in client_ids, "Should not see unassigned or inactive clients"


class TestClientContextSwitchingProperties:
    """Property-based tests for client context switching functionality."""
    
    @given(
        user_is_admin=st.booleans(),
        switch_to_assigned=st.booleans()
    )
    @settings(max_examples=20, deadline=None)
    def test_client_context_switching(self, db_session, user_is_admin, switch_to_assigned):
        """
        Property 5: Client Context Switching
        For any valid client switch operation, the Multi_Tenant_System should update 
        the user's context and filter all subsequent data operations to the selected client.
        **Validates: Requirements 3.2, 3.3, 3.4, 4.5**
        """
        # Create test clients
        client1 = Client(
            id=uuid.uuid4(),
            client_code=f"CLIENT1_{uuid.uuid4().hex[:6].upper()}",
            name="Test Client 1",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        client2 = Client(
            id=uuid.uuid4(),
            client_code=f"CLIENT2_{uuid.uuid4().hex[:6].upper()}",
            name="Test Client 2",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add(client1)
        db_session.add(client2)
        db_session.flush()
        
        # Create test user assigned to client1
        user = User(
            id=uuid.uuid4(),
            email=f"switch_test_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Switch",
            last_name="Test",
            password_hash="hashed_password",
            role=UserRole.ADMIN.value if user_is_admin else UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=client1.id if not user_is_admin else None
        )
        db_session.add(user)
        db_session.flush()
        
        client_service = ClientSwitchingService(db_session)
        
        # Determine target client for switching
        target_client = client1 if switch_to_assigned else client2
        
        # Attempt client switch
        switch_success = client_service.switch_client_context(user.id, target_client.id)
        
        # Properties that must hold
        if user_is_admin:
            # Admin should be able to switch to any active client
            assert switch_success, "Admin should be able to switch to any active client"
        else:
            # Regular user should only be able to switch to assigned client
            if target_client.id == user.client_id:
                assert switch_success, "Regular user should be able to switch to assigned client"
            else:
                assert not switch_success, "Regular user should not be able to switch to unassigned client"
        
        # If switch was successful, validate access
        if switch_success:
            assert client_service.validate_client_access(user.id, target_client.id)
            
            # Get context info
            context = client_service.get_client_context_info(user.id, target_client.id)
            assert context['current_client']['id'] == str(target_client.id)
            assert context['has_client_access'] == True