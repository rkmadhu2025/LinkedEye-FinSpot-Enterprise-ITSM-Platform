import pytest
from uuid import uuid4
from app.models.user import UserRole, UserStatus

def test_list_users(client, admin_headers):
    response = client.get("/api/v1/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # At least the admin user should be there
    assert len(data) >= 1

def test_create_user(client, admin_headers):
    user_data = {
        "email": "newuser@example.com",
        "password": "Password123!",
        "first_name": "New",
        "last_name": "User",
        "role": UserRole.USER.value,
        "department": "Engineering"
    }
    response = client.post("/api/v1/users", json=user_data, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["firstName"] == user_data["first_name"]
    assert "id" in data

def test_get_user(client, admin_headers):
    # First create a user
    user_data = {
        "email": "getuser@example.com",
        "password": "Password123!",
        "first_name": "Get",
        "last_name": "User",
        "role": UserRole.USER.value
    }
    create_res = client.post("/api/v1/users", json=user_data, headers=admin_headers)
    user_id = create_res.json()["id"]

    # Now get it
    response = client.get(f"/api/v1/users/{user_id}", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == user_data["email"]

def test_update_user(client, admin_headers):
    # Create user
    user_data = {
        "email": "updateuser@example.com",
        "password": "Password123!",
        "first_name": "Update",
        "last_name": "User",
        "role": UserRole.USER.value
    }
    create_res = client.post("/api/v1/users", json=user_data, headers=admin_headers)
    user_id = create_res.json()["id"]

    # Update
    update_data = {
        "first_name": "Updated",
        "job_title": "Senior Engineer"
    }
    response = client.put(f"/api/v1/users/{user_id}", json=update_data, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["firstName"] == "Updated"
    assert data["jobTitle"] == "Senior Engineer"

def test_delete_user(client, admin_headers):
    # Create user
    user_data = {
        "email": "deleteuser@example.com",
        "password": "Password123!",
        "first_name": "Delete",
        "last_name": "User",
        "role": UserRole.USER.value
    }
    create_res = client.post("/api/v1/users", json=user_data, headers=admin_headers)
    user_id = create_res.json()["id"]

    # Delete
    response = client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)
    assert response.status_code == 204

    # Verify deleted (soft delete usually sets active=False or status=INACTIVE)
    # The delete endpoint implementation sets is_active=False and status=INACTIVE
    get_res = client.get(f"/api/v1/users/{user_id}", headers=admin_headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["isActive"] is False
