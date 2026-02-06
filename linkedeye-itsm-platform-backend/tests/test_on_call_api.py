import pytest
from uuid import uuid4
from datetime import datetime, timedelta

def test_create_schedule_invalid_user(client, admin_headers):
    """Test creating a schedule with a non-existent user."""
    payload = {
        "user_id": str(uuid4()),
        "start_time": datetime.utcnow().isoformat(),
        "end_time": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "notes": "Test Schedule"
    }
    response = client.post("/api/v1/on-call/schedules", json=payload, headers=admin_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_add_schedule_member_invalid_user(client, admin_headers):
    """Test adding a non-existent user to a schedule."""
    # 1. Create a schedule first (without user to be safe)
    sched_payload = {
        "notes": "Member Test Schedule"
    }
    sched_res = client.post("/api/v1/on-call/schedules", json=sched_payload, headers=admin_headers)
    assert sched_res.status_code == 201
    schedule_id = sched_res.json()["id"]

    # 2. Add invalid member
    member_payload = {
        "user_id": str(uuid4()),
        "rotation_order": 1,
        "member_type": "primary"
    }
    response = client.post(f"/api/v1/on-call/schedules/{schedule_id}/members", json=member_payload, headers=admin_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_create_override_invalid_user(client, admin_headers):
    """Test creating an override with non-existent users."""
    # 1. Create a schedule
    sched_payload = {
        "notes": "Override Test Schedule"
    }
    sched_res = client.post("/api/v1/on-call/schedules", json=sched_payload, headers=admin_headers)
    assert sched_res.status_code == 201
    schedule_id = sched_res.json()["id"]

    # 2. Try override with invalid original user
    override_payload = {
        "original_user_id": str(uuid4()),
        "replacement_user_id": str(uuid4()), # Also invalid, but original checks first
        "start_time": datetime.utcnow().isoformat(),
        "end_time": (datetime.utcnow() + timedelta(hours=4)).isoformat()
    }
    response = client.post(f"/api/v1/on-call/schedules/{schedule_id}/overrides", json=override_payload, headers=admin_headers)
    assert response.status_code == 404
    # Our code checks original_user_id first
    assert "User not found" in response.json()["detail"] or "Original user not found" in response.json()["detail"]

def test_create_override_global_endpoint(client, admin_headers):
    """Test the global override creation endpoint used by frontend."""
    # 1. Create a schedule
    sched_payload = {"notes": "Global Override Test"}
    sched_res = client.post("/api/v1/on-call/schedules", json=sched_payload, headers=admin_headers)
    assert sched_res.status_code == 201
    schedule_id = sched_res.json()["id"]

    # 2. We need a valid user for this one to pass initial checks, or we can check simple validation 
    # Use invalid user to check it reaches the logic
    override_payload = {
        "schedule_id": schedule_id,
        "original_user_id": str(uuid4()),
        "replacement_user_id": str(uuid4()),
        "start_time": datetime.utcnow().isoformat(),
        "end_time": (datetime.utcnow() + timedelta(hours=4)).isoformat()
    }
    
    # POST to /overrides (Global)
    response = client.post("/api/v1/on-call/overrides", json=override_payload, headers=admin_headers)
    
    # It should call create_override, which checks users and returns 404
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"] or "Original user not found" in response.json()["detail"]
