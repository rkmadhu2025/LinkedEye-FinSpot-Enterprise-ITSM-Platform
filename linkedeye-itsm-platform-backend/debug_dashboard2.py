
import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://localhost:8000/api/v1"

def debug_dashboard():
    # 1. Login
    print("Logging in...")
    login_url = f"{BASE_URL}/auth/login"
    data = json.dumps({"email": "admin@finspot.com", "password": "password"}).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    
    try:
        req = urllib.request.Request(login_url, data=data, headers=headers)
        with urllib.request.urlopen(req) as response:
            login_resp = json.loads(response.read().decode('utf-8'))
            
        token = login_resp["access_token"]
        print(f"Got token: {token[:10]}...")
        
        # 2. Call Dashboard
        print("Calling /dashboard/metrics...")
        dashboard_url = f"{BASE_URL}/dashboard/metrics"
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        req = urllib.request.Request(dashboard_url, headers=auth_headers)
        with urllib.request.urlopen(req) as response:
            print(f"Status Code: {response.getcode()}")
            resp_body = response.read().decode('utf-8')
            print(f"Response: {resp_body}")
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_dashboard()
