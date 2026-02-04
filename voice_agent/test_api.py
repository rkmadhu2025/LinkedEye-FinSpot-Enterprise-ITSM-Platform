import requests
import json
import time

def test_endpoint(name, url, method="GET", data=None):
    print(f"\nTesting {name} ({url})...")
    start = time.time()
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        else:
            response = requests.post(url, json=data, timeout=30)
        
        duration = time.time() - start
        print(f"Status Code: {response.status_code}")
        print(f"Time Taken: {duration:.2f}s")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response (text): {response.text[:100]}...")
    except Exception as e:
        print(f"Error: {e}")

# 1. Test Health
test_endpoint("Health", "http://localhost:8000/health")

# 2. Test Chat
test_endpoint("Chat", "http://localhost:8000/chat", method="POST", data={"text": "Hello"})

# 3. Test TTS (just headers)
print("\nTesting TTS (/tts)...")
try:
    response = requests.get("http://localhost:8000/tts?text=test", stream=True, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Content Type: {response.headers.get('Content-Type')}")
    # Read first chunk
    chunk = next(response.iter_content(chunk_size=1024))
    print(f"Received audio chunk of size {len(chunk)}")
except Exception as e:
    print(f"Error: {e}")
