
import requests
import sys
import os

BASE_URL = "http://localhost:8000/api/v1"

def debug_dashboard():
    # 1. Login
    try:
        ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@finspot.com")
        ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
        if not ADMIN_PASSWORD:
            raise RuntimeError("ADMIN_PASSWORD environment variable is required for debug_dashboard")
        login_resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        login_resp.raise_for_status()
        
        token = login_resp.json()["access_token"]
        print(f"Got token: {token[:10]}...")
        
        # 2. Call Dashboard
        print("Calling /dashboard/metrics...")
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/dashboard/metrics", headers=headers)
        
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_dashboard()
