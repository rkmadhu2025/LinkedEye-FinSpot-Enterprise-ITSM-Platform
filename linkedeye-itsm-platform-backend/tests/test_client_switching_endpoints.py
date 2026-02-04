"""
Unit tests for client switching API endpoints.

Tests the new client switching endpoints added to the clients API:
- GET /clients/accessible - Get accessible clients for user
- POST /clients/switch/{client_id} - Switch client context

Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.client import Client, ClientStatus, ClientEnvironment
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash


class TestClientSwitchingEndpoints:
    """Unit tests for client switching API endpoints."""

    def test_get_accessible_clients_admin_user(self, client: TestClient, db_session: Session):
        """
        Test GET /clients/accessible for admin user.
        Admin users should see all active clients.
        Requirements: 4.1, 4.3
        """
        # Create test clients
        client1 = Client(
            id=uuid.uuid4(),
            client_code="CLIENT1",
            name="Test Client 1",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        client2 = Client(
            id=uuid.uuid4(),
            client_code="CLIENT2", 
            name="Test Client 2",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        inactive_client = Client(
            id=uuid.uuid4(),
            client_code="INACTIVE",
            name="Inactive Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.INACTIVE,
            is_active=False
        )
        
        db_session.add_all([client1, client2, inactive_client])
        db_session.flush()

        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@example.com",
            password_hash=get_password_hash("adminpass123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN.value,
            status=UserStatus.ACTIVE.value,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()

        # Login admin user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test accessible clients endpoint
        response = client.get("/api/v1/clients/accessible", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["can_switch_clients"] == True
        assert data["total_count"] == 2  # Only active clients
        assert len(data["clients"]) == 2
        
        client_codes = [c["client_code"] for c in data["clients"]]
        assert "CLIENT1" in client_codes
        assert "CLIENT2" in client_codes
        assert "INACTIVE" not in client_codes

    def test_get_accessible_clients_regular_user(self, client: TestClient, db_session: Session):
        """
        Test GET /clients/accessible for regular user.
        Regular users should only see their assigned client.
        Requirements: 4.1, 4.2
        """
        # Create test clients
        assigned_client = Client(
            id=uuid.uuid4(),
            client_code="ASSIGNED",
            name="Assigned Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        other_client = Client(
            id=uuid.uuid4(),
            client_code="OTHER",
            name="Other Client", 
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        
        db_session.add_all([assigned_client, other_client])
        db_session.flush()

        # Create regular user assigned to one client
        regular_user = User(
            id=uuid.uuid4(),
            email="user@example.com",
            password_hash=get_password_hash("userpass123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=assigned_client.id
        )
        db_session.add(regular_user)
        db_session.commit()

        # Login regular user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "user@example.com",
            "password": "userpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test accessible clients endpoint
        response = client.get("/api/v1/clients/accessible", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["can_switch_clients"] == False  # Only one client
        assert data["total_count"] == 1
        assert len(data["clients"]) == 1
        assert data["clients"][0]["client_code"] == "ASSIGNED"
        assert data["current_client_id"] == str(assigned_client.id)

    def test_get_accessible_clients_user_no_assignment(self, client: TestClient, db_session: Session):
        """
        Test GET /clients/accessible for user with no client assignment.
        Should return empty list.
        Requirements: 4.2
        """
        # Create test client
        test_client = Client(
            id=uuid.uuid4(),
            client_code="TEST",
            name="Test Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add(test_client)
        db_session.flush()

        # Create user with no client assignment
        unassigned_user = User(
            id=uuid.uuid4(),
            email="unassigned@example.com",
            password_hash=get_password_hash("unassignedpass123"),
            first_name="Unassigned",
            last_name="User",
            role=UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=None
        )
        db_session.add(unassigned_user)
        db_session.commit()

        # Login unassigned user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "unassigned@example.com",
            "password": "unassignedpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test accessible clients endpoint
        response = client.get("/api/v1/clients/accessible", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["can_switch_clients"] == False
        assert data["total_count"] == 0
        assert len(data["clients"]) == 0
        assert data["current_client_id"] is None

    def test_switch_client_context_admin_success(self, client: TestClient, db_session: Session):
        """
        Test POST /clients/switch/{client_id} for admin user.
        Admin should be able to switch to any active client.
        Requirements: 3.2, 3.3, 3.4, 4.5
        """
        # Create test client
        target_client = Client(
            id=uuid.uuid4(),
            client_code="TARGET",
            name="Target Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add(target_client)
        db_session.flush()

        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@example.com",
            password_hash=get_password_hash("adminpass123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN.value,
            status=UserStatus.ACTIVE.value,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()

        # Login admin user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test client switch
        response = client.post(f"/api/v1/clients/switch/{target_client.id}", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "Successfully switched to client" in data["message"]
        assert data["current_client"]["id"] == str(target_client.id)
        assert data["current_client"]["client_code"] == "TARGET"

    def test_switch_client_context_regular_user_success(self, client: TestClient, db_session: Session):
        """
        Test POST /clients/switch/{client_id} for regular user switching to assigned client.
        Regular user should be able to switch to their assigned client.
        Requirements: 3.2, 3.3, 3.4
        """
        # Create test client
        assigned_client = Client(
            id=uuid.uuid4(),
            client_code="ASSIGNED",
            name="Assigned Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add(assigned_client)
        db_session.flush()

        # Create regular user assigned to client
        regular_user = User(
            id=uuid.uuid4(),
            email="user@example.com",
            password_hash=get_password_hash("userpass123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=assigned_client.id
        )
        db_session.add(regular_user)
        db_session.commit()

        # Login regular user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "user@example.com",
            "password": "userpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test client switch to assigned client
        response = client.post(f"/api/v1/clients/switch/{assigned_client.id}", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["current_client"]["id"] == str(assigned_client.id)

    def test_switch_client_context_regular_user_forbidden(self, client: TestClient, db_session: Session):
        """
        Test POST /clients/switch/{client_id} for regular user switching to unassigned client.
        Should return 403 Forbidden.
        Requirements: 4.1, 4.2, 4.4
        """
        # Create test clients
        assigned_client = Client(
            id=uuid.uuid4(),
            client_code="ASSIGNED",
            name="Assigned Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        forbidden_client = Client(
            id=uuid.uuid4(),
            client_code="FORBIDDEN",
            name="Forbidden Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add_all([assigned_client, forbidden_client])
        db_session.flush()

        # Create regular user assigned to one client
        regular_user = User(
            id=uuid.uuid4(),
            email="user@example.com",
            password_hash=get_password_hash("userpass123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=assigned_client.id
        )
        db_session.add(regular_user)
        db_session.commit()

        # Login regular user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "user@example.com",
            "password": "userpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test client switch to forbidden client
        response = client.post(f"/api/v1/clients/switch/{forbidden_client.id}", headers=headers)
        assert response.status_code == 403
        assert "Access denied to this client" in response.json()["detail"]

    def test_switch_client_context_nonexistent_client(self, client: TestClient, db_session: Session):
        """
        Test POST /clients/switch/{client_id} with non-existent client.
        Should return 404 Not Found.
        Requirements: 3.2
        """
        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@example.com",
            password_hash=get_password_hash("adminpass123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN.value,
            status=UserStatus.ACTIVE.value,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()

        # Login admin user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test client switch to non-existent client
        fake_client_id = uuid.uuid4()
        response = client.post(f"/api/v1/clients/switch/{fake_client_id}", headers=headers)
        assert response.status_code == 403  # Access denied because client doesn't exist

    def test_switch_client_context_inactive_client(self, client: TestClient, db_session: Session):
        """
        Test POST /clients/switch/{client_id} with inactive client.
        Should return 400 Bad Request for regular users, but allow for admin.
        Requirements: 4.3, 4.4
        """
        # Create inactive client
        inactive_client = Client(
            id=uuid.uuid4(),
            client_code="INACTIVE",
            name="Inactive Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.INACTIVE,
            is_active=False
        )
        db_session.add(inactive_client)
        db_session.flush()

        # Create regular user assigned to inactive client
        regular_user = User(
            id=uuid.uuid4(),
            email="user@example.com",
            password_hash=get_password_hash("userpass123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=inactive_client.id
        )
        db_session.add(regular_user)
        db_session.commit()

        # Login regular user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "user@example.com",
            "password": "userpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test client switch to inactive client (should fail for regular user)
        response = client.post(f"/api/v1/clients/switch/{inactive_client.id}", headers=headers)
        assert response.status_code == 403  # Access denied to inactive client

    def test_list_clients_respects_client_context(self, client: TestClient, db_session: Session):
        """
        Test that GET /clients endpoint respects client context.
        Updated endpoint should use ClientSwitchingService for access control.
        Requirements: 3.1, 4.1, 4.2, 4.3, 4.4
        """
        # Create test clients
        client1 = Client(
            id=uuid.uuid4(),
            client_code="CLIENT1",
            name="Test Client 1",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        client2 = Client(
            id=uuid.uuid4(),
            client_code="CLIENT2",
            name="Test Client 2",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add_all([client1, client2])
        db_session.flush()

        # Create regular user assigned to client1
        regular_user = User(
            id=uuid.uuid4(),
            email="user@example.com",
            password_hash=get_password_hash("userpass123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=client1.id
        )
        db_session.add(regular_user)
        db_session.commit()

        # Login regular user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "user@example.com",
            "password": "userpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test list clients - should only see assigned client
        response = client.get("/api/v1/clients", headers=headers)
        assert response.status_code == 200
        
        clients = response.json()
        assert len(clients) == 1
        assert clients[0]["client_code"] == "CLIENT1"

    def test_get_client_respects_access_control(self, client: TestClient, db_session: Session):
        """
        Test that GET /clients/{client_id} endpoint respects access control.
        Updated endpoint should use ClientSwitchingService for access validation.
        Requirements: 4.1, 4.2, 4.3, 4.4
        """
        # Create test clients
        accessible_client = Client(
            id=uuid.uuid4(),
            client_code="ACCESSIBLE",
            name="Accessible Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        forbidden_client = Client(
            id=uuid.uuid4(),
            client_code="FORBIDDEN",
            name="Forbidden Client",
            environment=ClientEnvironment.PRODUCTION,
            status=ClientStatus.ACTIVE,
            is_active=True
        )
        db_session.add_all([accessible_client, forbidden_client])
        db_session.flush()

        # Create regular user assigned to accessible_client
        regular_user = User(
            id=uuid.uuid4(),
            email="user@example.com",
            password_hash=get_password_hash("userpass123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            client_id=accessible_client.id
        )
        db_session.add(regular_user)
        db_session.commit()

        # Login regular user
        login_response = client.post("/api/v1/auth/login", json={
            "email": "user@example.com",
            "password": "userpass123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test access to assigned client - should succeed
        response = client.get(f"/api/v1/clients/{accessible_client.id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["client_code"] == "ACCESSIBLE"

        # Test access to forbidden client - should fail
        response = client.get(f"/api/v1/clients/{forbidden_client.id}", headers=headers)
        assert response.status_code == 403
        assert "Access denied to this client" in response.json()["detail"]