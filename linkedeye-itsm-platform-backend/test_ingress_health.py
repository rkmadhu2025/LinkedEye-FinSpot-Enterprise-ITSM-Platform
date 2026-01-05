import argparse
import sys
import time
import requests
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def check_health(url, retries=5, delay=5):
    """Check health endpoint."""
    endpoint = f"{url.rstrip('/')}/api/v1/health"
    logger.info(f"Checking health at {endpoint}...")
    
    for i in range(retries):
        try:
            response = requests.get(endpoint, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    logger.info("✅ Health check passed: Service is healthy")
                    return True
                else:
                    logger.warning(f"⚠️ Service returned 200 but status is {data.get('status')}")
            else:
                logger.warning(f"⚠️ Health check failed with status code: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Connection error: {e}")
            
        if i < retries - 1:
            logger.info(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            
    logger.error("❌ Health check failed after all retries")
    return False

def check_ingress_rules(url):
    """Verify ingress routing."""
    # Check backend route
    backend_url = f"{url.rstrip('/')}/api/v1/health"
    try:
        r = requests.get(backend_url, timeout=5)
        if r.status_code == 200:
             logger.info("✅ Ingress routing to backend confirmed")
        else:
             logger.error(f"❌ Ingress routing to backend failed: {r.status_code}")
    except Exception as e:
        logger.error(f"❌ Ingress routing check failed: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test ITSM Platform Ingress and Health")
    parser.add_argument("--url", default="https://itsm.example.com", help="Base URL of the ingress")
    args = parser.parse_args()
    
    logger.info(f"Starting ingress test for {args.url}")
    
    if check_health(args.url):
        check_ingress_rules(args.url)
        sys.exit(0)
    else:
        sys.exit(1)
