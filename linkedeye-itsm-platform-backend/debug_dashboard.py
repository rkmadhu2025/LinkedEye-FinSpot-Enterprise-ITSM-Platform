
import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

def debug_dashboard():
    # 1. Login
    try:
        login_resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "admin@finspot.com", "password": "password"}
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
