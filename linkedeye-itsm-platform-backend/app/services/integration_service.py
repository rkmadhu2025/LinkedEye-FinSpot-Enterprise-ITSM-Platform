"""
Integration Service - Central service for managing external tool integrations.
Supports: Monitoring, Ticketing, CI/CD, and Communication tools.
"""
import httpx
import json
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum
from abc import ABC, abstractmethod
from app.core.logging import get_logger

logger = get_logger(__name__)


class IntegrationCategory(str, Enum):
    """Categories of integrations."""
    MONITORING = "monitoring"
    TICKETING = "ticketing"
    CICD = "cicd"
    COMMUNICATION = "communication"


# =============================================================================
# BASE INTEGRATION CLASS
# =============================================================================

class BaseIntegration(ABC):
    """Abstract base class for all integrations."""

    def __init__(self, config: Dict[str, Any], credentials: Dict[str, Any]):
        self.config = config
        self.credentials = credentials
        self.timeout = config.get("timeout", 30)

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection to the external service."""
        pass

    @abstractmethod
    async def sync(self) -> Dict[str, Any]:
        """Sync data with the external service."""
        pass

    async def process_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process incoming webhook payload.
        
        Args:
            payload: Webhook payload data
            
        Returns:
            Dict containing success status and processing details
        """
        return {"success": True, "message": "Webhook received (default processing)"}

    def _get_headers(self) -> Dict[str, str]:
        """Get default headers for API requests."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }


# =============================================================================
# MONITORING INTEGRATIONS
# =============================================================================

class PrometheusIntegration(BaseIntegration):
    """Prometheus monitoring integration."""

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Prometheus."""
        try:
            url = self.config.get("url", "http://localhost:9090")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{url}/api/v1/status/config")
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to Prometheus successfully"}
                return {"success": False, "message": f"Prometheus returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Prometheus connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync alerts from Prometheus."""
        try:
            url = self.config.get("url", "http://localhost:9090").rstrip('/')
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Fetch active alerts
                response = await client.get(f"{url}/api/v1/alerts")
                if response.status_code == 200:
                    data = response.json()
                    alerts = data.get("data", {}).get("alerts", [])
                    
                    # Format alerts for processing
                    formatted_alerts = []
                    for alert in alerts:
                        # Prometheus alert format
                        if isinstance(alert, dict):
                            formatted_alerts.append({
                                "status": "firing" if alert.get("state") == "firing" else "resolved",
                                "labels": alert.get("labels", {}),
                                "annotations": alert.get("annotations", {}),
                                "startsAt": alert.get("activeAt") or alert.get("startsAt"),
                                "endsAt": alert.get("endsAt"),
                                "generatorURL": alert.get("generatorURL"),
                            })
                    
                    return {
                        "success": True, 
                        "alerts_count": len(formatted_alerts), 
                        "alerts": formatted_alerts
                    }
                return {"success": False, "message": f"Failed to fetch alerts: {response.status_code}"}
        except Exception as e:
            logger.error(f"Prometheus sync error: {e}")
            return {"success": False, "message": str(e)}

    async def query(self, query: str) -> Dict[str, Any]:
        """Execute a PromQL query."""
        try:
            url = self.config.get("url", "http://localhost:9090")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{url}/api/v1/query", params={"query": query})
                if response.status_code == 200:
                    return {"success": True, "data": response.json()}
                return {"success": False, "message": f"Query failed: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class GrafanaIntegration(BaseIntegration):
    """Grafana monitoring/visualization integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        api_key = self.credentials.get("api_key")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Grafana."""
        try:
            url = self.config.get("url", "http://localhost:3000")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{url}/api/health", headers=self._get_headers())
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to Grafana successfully"}
                return {"success": False, "message": f"Grafana returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Grafana connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync dashboards and alerts from Grafana."""
        try:
            url = self.config.get("url", "http://localhost:3000").rstrip('/')
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # Get dashboards
                dash_response = await client.get(f"{url}/api/search?type=dash-db", headers=self._get_headers())
                dashboards = dash_response.json() if dash_response.status_code == 200 else []

                # Get alerts (Grafana unified alerting)
                alerts = []
                try:
                    # Try unified alerting API
                    alert_response = await client.get(f"{url}/api/ruler/grafana/api/v1/rules", headers=self._get_headers())
                    if alert_response.status_code == 200:
                        rules_data = alert_response.json()
                        # Extract alerts from rules
                        for namespace, groups in rules_data.items():
                            for group in groups:
                                for rule in group.get("rules", []):
                                    if rule.get("type") == "alerting":
                                        alerts.append({
                                            "status": "firing",  # Default, actual status from alert instances
                                            "labels": rule.get("labels", {}),
                                            "annotations": rule.get("annotations", {}),
                                            "name": rule.get("name", "Unknown"),
                                        })
                except Exception:
                    # Fallback to legacy alerts API
                    try:
                        alert_response = await client.get(f"{url}/api/alerts", headers=self._get_headers())
                        if alert_response.status_code == 200:
                            alerts = alert_response.json()
                    except Exception:
                        pass

                # Format alerts for processing
                formatted_alerts = []
                for alert in alerts:
                    if isinstance(alert, dict):
                        formatted_alerts.append({
                            "status": alert.get("state", "firing") if alert.get("state") else "firing",
                            "labels": alert.get("labels", {}),
                            "annotations": alert.get("annotations", {}),
                            "startsAt": alert.get("newStateDate") or alert.get("startsAt"),
                            "endsAt": alert.get("endsAt"),
                            "dashboardURL": alert.get("dashboardUrl"),
                            "panelURL": alert.get("panelUrl"),
                            "valueString": alert.get("valueString"),
                        })

                return {
                    "success": True,
                    "dashboards_count": len(dashboards),
                    "alerts_count": len(formatted_alerts),
                    "dashboards": dashboards[:10],
                    "alerts": formatted_alerts
                }
        except Exception as e:
            logger.error(f"Grafana sync error: {e}")
            return {"success": False, "message": str(e)}

    async def create_annotation(self, dashboard_id: int, text: str, tags: List[str] = None) -> Dict[str, Any]:
        """Create an annotation in Grafana."""
        try:
            url = self.config.get("url", "http://localhost:3000")
            payload = {
                "dashboardId": dashboard_id,
                "text": text,
                "tags": tags or [],
                "time": int(datetime.now(timezone.utc).timestamp() * 1000)
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{url}/api/annotations", json=payload, headers=self._get_headers())
                if response.status_code in [200, 201]:
                    return {"success": True, "annotation_id": response.json().get("id")}
                return {"success": False, "message": f"Failed to create annotation: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class DatadogIntegration(BaseIntegration):
    """Datadog monitoring integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        headers["DD-API-KEY"] = self.credentials.get("api_key", "")
        headers["DD-APPLICATION-KEY"] = self.credentials.get("app_key", "")
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Datadog."""
        try:
            site = self.config.get("site", "datadoghq.com")
            url = f"https://api.{site}/api/v1/validate"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to Datadog successfully"}
                return {"success": False, "message": f"Datadog returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Datadog connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync monitors and events from Datadog."""
        try:
            site = self.config.get("site", "datadoghq.com")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Get monitors
                monitors_url = f"https://api.{site}/api/v1/monitor"
                monitors_response = await client.get(monitors_url, headers=self._get_headers())
                monitors = monitors_response.json() if monitors_response.status_code == 200 else []

                return {
                    "success": True,
                    "monitors_count": len(monitors),
                    "monitors": monitors[:10]
                }
        except Exception as e:
            logger.error(f"Datadog sync error: {e}")
            return {"success": False, "message": str(e)}

    async def send_event(self, title: str, text: str, alert_type: str = "info", tags: List[str] = None) -> Dict[str, Any]:
        """Send an event to Datadog."""
        try:
            site = self.config.get("site", "datadoghq.com")
            url = f"https://api.{site}/api/v1/events"
            payload = {
                "title": title,
                "text": text,
                "alert_type": alert_type,
                "tags": tags or []
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                if response.status_code in [200, 201, 202]:
                    return {"success": True, "event": response.json()}
                return {"success": False, "message": f"Failed to send event: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class NewRelicIntegration(BaseIntegration):
    """New Relic monitoring integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        headers["Api-Key"] = self.credentials.get("api_key", "")
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to New Relic."""
        try:
            url = "https://api.newrelic.com/v2/applications.json"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to New Relic successfully"}
                return {"success": False, "message": f"New Relic returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"New Relic connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync applications and alerts from New Relic."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Get applications
                apps_response = await client.get(
                    "https://api.newrelic.com/v2/applications.json",
                    headers=self._get_headers()
                )
                apps = apps_response.json().get("applications", []) if apps_response.status_code == 200 else []

                return {
                    "success": True,
                    "applications_count": len(apps),
                    "applications": apps[:10]
                }
        except Exception as e:
            logger.error(f"New Relic sync error: {e}")
            return {"success": False, "message": str(e)}


class StackStormIntegration(BaseIntegration):
    """StackStorm automation platform integration."""

    def _get_auth(self) -> tuple:
        """Get authentication credentials for StackStorm."""
        # Support both API key and username/password
        api_key = self.credentials.get("api_key", "")
        if api_key:
            return None, {"St2-Api-Key": api_key}
        
        username = self.credentials.get("username", "")
        password = self.credentials.get("password", "")
        if username and password:
            return (username, password), {}
        
        return None, {}

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        _, header_auth = self._get_auth()
        headers.update(header_auth)
        return headers

    async def _get_auth_token(self) -> Optional[str]:
        """Get StackStorm auth token using username/password (Basic Auth)."""
        try:
            username = self.credentials.get("username", "")
            password = self.credentials.get("password", "")
            if not username or not password:
                return None

            url = self.config.get("url", "https://fs-le-dev-stackstom.finspot.in").rstrip("/")
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # StackStorm auth endpoint - requires Basic Auth
                auth_url = f"{url}/auth/v1/tokens"
                response = await client.post(
                    auth_url,
                    auth=(username, password)  # Use Basic Auth, not JSON body
                )
                if response.status_code == 201:
                    data = response.json()
                    return data.get("token", "")
                else:
                    logger.error(f"StackStorm auth failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            logger.error(f"StackStorm token auth error: {e}")
        return None

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to StackStorm API."""
        try:
            url = self.config.get("url", "https://fs-le-dev-stackstom.finspot.in")
            # Remove trailing slash if present
            url = url.rstrip("/")
            
            # Try to get auth token if using username/password
            auth_token = await self._get_auth_token()
            headers = self._get_headers()
            if auth_token:
                headers["X-Auth-Token"] = auth_token
            
            auth_creds, _ = self._get_auth()
            
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # Test the API health endpoint
                api_url = f"{url}/api/v1/" if "/api/" not in url else f"{url}/v1/"
                response = await client.get(
                    api_url,
                    headers=headers,
                    auth=auth_creds if auth_creds else None
                )
                if response.status_code == 200:
                    data = response.json()
                    version = data.get("version", "unknown")
                    return {"success": True, "message": f"Connected to StackStorm v{version} successfully"}
                return {"success": False, "message": f"StackStorm returned status {response.status_code}: {response.text[:200]}"}
        except Exception as e:
            logger.error(f"StackStorm connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync actions, rules, and workflows from StackStorm."""
        try:
            url = self.config.get("url", "https://fs-le-dev-stackstom.finspot.in").rstrip("/")
            auth_token = await self._get_auth_token()
            headers = self._get_headers()
            if auth_token:
                headers["X-Auth-Token"] = auth_token
            
            auth_creds, _ = self._get_auth()
            api_base = f"{url}/api/v1" if "/api/" not in url else f"{url}/v1"
            
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # Get actions
                actions_response = await client.get(
                    f"{api_base}/actions",
                    headers=headers,
                    auth=auth_creds if auth_creds else None
                )
                actions = actions_response.json() if actions_response.status_code == 200 else []

                # Get rules
                rules_response = await client.get(
                    f"{api_base}/rules",
                    headers=headers,
                    auth=auth_creds if auth_creds else None
                )
                rules = rules_response.json() if rules_response.status_code == 200 else []

                # Get executions
                executions_response = await client.get(
                    f"{api_base}/executions?limit=20",
                    headers=headers,
                    auth=auth_creds if auth_creds else None
                )
                executions = executions_response.json() if executions_response.status_code == 200 else []

                return {
                    "success": True,
                    "actions_count": len(actions) if isinstance(actions, list) else 0,
                    "rules_count": len(rules) if isinstance(rules, list) else 0,
                    "recent_executions": len(executions) if isinstance(executions, list) else 0,
                    "actions": (actions[:10] if isinstance(actions, list) else []),
                    "rules": (rules[:10] if isinstance(rules, list) else []),
                    "executions": (executions[:10] if isinstance(executions, list) else [])
                }
        except Exception as e:
            logger.error(f"StackStorm sync error: {e}")
            return {"success": False, "message": str(e)}

    async def run_action(self, action: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a StackStorm action."""
        try:
            url = self.config.get("url", "https://fs-le-dev-stackstom.finspot.in").rstrip("/")
            auth_token = await self._get_auth_token()
            headers = self._get_headers()
            if auth_token:
                headers["X-Auth-Token"] = auth_token
            
            auth_creds, _ = self._get_auth()
            api_base = f"{url}/api/v1" if "/api/" not in url else f"{url}/v1"
            
            payload = {
                "action": action,
                "parameters": parameters or {}
            }
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.post(
                    f"{api_base}/executions",
                    json=payload,
                    headers=headers,
                    auth=auth_creds if auth_creds else None
                )
                if response.status_code in [200, 201, 202]:
                    execution = response.json()
                    return {"success": True, "execution_id": execution.get("id"), "execution": execution}
                return {"success": False, "message": f"Failed to run action: {response.status_code} - {response.text[:200]}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def get_execution_status(self, execution_id: str) -> Dict[str, Any]:
        """Get the status of a StackStorm execution."""
        try:
            url = self.config.get("url", "https://fs-le-dev-stackstom.finspot.in").rstrip("/")
            auth_token = await self._get_auth_token()
            headers = self._get_headers()
            if auth_token:
                headers["X-Auth-Token"] = auth_token
            
            auth_creds, _ = self._get_auth()
            api_base = f"{url}/api/v1" if "/api/" not in url else f"{url}/v1"
            
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.get(
                    f"{api_base}/executions/{execution_id}",
                    headers=headers,
                    auth=auth_creds if auth_creds else None
                )
                if response.status_code == 200:
                    execution = response.json()
                    return {
                        "success": True,
                        "status": execution.get("status"),
                        "result": execution.get("result"),
                        "execution": execution
                    }
                return {"success": False, "message": f"Failed to get execution: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


# =============================================================================
# TICKETING INTEGRATIONS
# =============================================================================

class ServiceNowIntegration(BaseIntegration):
    """ServiceNow ITSM integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        username = self.credentials.get("username", "")
        password = self.credentials.get("password", "")
        if username and password:
            import base64
            auth = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {auth}"
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to ServiceNow."""
        try:
            instance = self.config.get("instance", "")
            url = f"https://{instance}.service-now.com/api/now/table/sys_user?sysparm_limit=1"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to ServiceNow successfully"}
                return {"success": False, "message": f"ServiceNow returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"ServiceNow connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync incidents from ServiceNow."""
        try:
            instance = self.config.get("instance", "")
            url = f"https://{instance}.service-now.com/api/now/table/incident?sysparm_limit=100"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    incidents = response.json().get("result", [])
                    return {"success": True, "incidents_count": len(incidents), "incidents": incidents[:10]}
                return {"success": False, "message": f"Failed to sync: {response.status_code}"}
        except Exception as e:
            logger.error(f"ServiceNow sync error: {e}")
            return {"success": False, "message": str(e)}

    async def create_incident(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an incident in ServiceNow."""
        try:
            instance = self.config.get("instance", "")
            url = f"https://{instance}.service-now.com/api/now/table/incident"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=data, headers=self._get_headers())
                if response.status_code in [200, 201]:
                    return {"success": True, "incident": response.json().get("result")}
                return {"success": False, "message": f"Failed to create incident: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def update_incident(self, sys_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an incident in ServiceNow."""
        try:
            instance = self.config.get("instance", "")
            url = f"https://{instance}.service-now.com/api/now/table/incident/{sys_id}"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.patch(url, json=data, headers=self._get_headers())
                if response.status_code == 200:
                    return {"success": True, "incident": response.json().get("result")}
                return {"success": False, "message": f"Failed to update incident: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class JiraIntegration(BaseIntegration):
    """Jira ticketing integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        email = self.credentials.get("email", "")
        api_token = self.credentials.get("api_token", "")
        if email and api_token:
            import base64
            auth = base64.b64encode(f"{email}:{api_token}".encode()).decode()
            headers["Authorization"] = f"Basic {auth}"
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Jira."""
        try:
            domain = self.config.get("domain", "")
            url = f"https://{domain}/rest/api/3/myself"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    user = response.json()
                    return {"success": True, "message": f"Connected as {user.get('displayName', 'Unknown')}"}
                return {"success": False, "message": f"Jira returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Jira connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync issues from Jira."""
        try:
            domain = self.config.get("domain", "")
            project = self.config.get("project", "")
            jql = f"project = {project} ORDER BY created DESC" if project else "ORDER BY created DESC"
            url = f"https://{domain}/rest/api/3/search"
            params = {"jql": jql, "maxResults": 100}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                if response.status_code == 200:
                    data = response.json()
                    issues = data.get("issues", [])
                    return {"success": True, "issues_count": len(issues), "issues": issues[:10]}
                return {"success": False, "message": f"Failed to sync: {response.status_code}"}
        except Exception as e:
            logger.error(f"Jira sync error: {e}")
            return {"success": False, "message": str(e)}

    async def create_issue(self, project_key: str, summary: str, description: str, issue_type: str = "Task") -> Dict[str, Any]:
        """Create an issue in Jira."""
        try:
            domain = self.config.get("domain", "")
            url = f"https://{domain}/rest/api/3/issue"
            payload = {
                "fields": {
                    "project": {"key": project_key},
                    "summary": summary,
                    "description": {
                        "type": "doc",
                        "version": 1,
                        "content": [{"type": "paragraph", "content": [{"type": "text", "text": description}]}]
                    },
                    "issuetype": {"name": issue_type}
                }
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                if response.status_code in [200, 201]:
                    return {"success": True, "issue": response.json()}
                return {"success": False, "message": f"Failed to create issue: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class ZendeskIntegration(BaseIntegration):
    """Zendesk ticketing integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        email = self.credentials.get("email", "")
        api_token = self.credentials.get("api_token", "")
        if email and api_token:
            import base64
            auth = base64.b64encode(f"{email}/token:{api_token}".encode()).decode()
            headers["Authorization"] = f"Basic {auth}"
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Zendesk."""
        try:
            subdomain = self.config.get("subdomain", "")
            url = f"https://{subdomain}.zendesk.com/api/v2/users/me.json"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    user = response.json().get("user", {})
                    return {"success": True, "message": f"Connected as {user.get('name', 'Unknown')}"}
                return {"success": False, "message": f"Zendesk returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Zendesk connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync tickets from Zendesk."""
        try:
            subdomain = self.config.get("subdomain", "")
            url = f"https://{subdomain}.zendesk.com/api/v2/tickets.json?sort_by=created_at&sort_order=desc"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    tickets = response.json().get("tickets", [])
                    return {"success": True, "tickets_count": len(tickets), "tickets": tickets[:10]}
                return {"success": False, "message": f"Failed to sync: {response.status_code}"}
        except Exception as e:
            logger.error(f"Zendesk sync error: {e}")
            return {"success": False, "message": str(e)}

    async def create_ticket(self, subject: str, description: str, priority: str = "normal") -> Dict[str, Any]:
        """Create a ticket in Zendesk."""
        try:
            subdomain = self.config.get("subdomain", "")
            url = f"https://{subdomain}.zendesk.com/api/v2/tickets.json"
            payload = {
                "ticket": {
                    "subject": subject,
                    "comment": {"body": description},
                    "priority": priority
                }
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                if response.status_code in [200, 201]:
                    return {"success": True, "ticket": response.json().get("ticket")}
                return {"success": False, "message": f"Failed to create ticket: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


# =============================================================================
# CI/CD INTEGRATIONS
# =============================================================================

class JenkinsIntegration(BaseIntegration):
    """Jenkins CI/CD integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        username = self.credentials.get("username", "")
        api_token = self.credentials.get("api_token", "")
        if username and api_token:
            import base64
            auth = base64.b64encode(f"{username}:{api_token}".encode()).decode()
            headers["Authorization"] = f"Basic {auth}"
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Jenkins."""
        try:
            url = self.config.get("url", "http://localhost:8080")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{url}/api/json", headers=self._get_headers())
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to Jenkins successfully"}
                return {"success": False, "message": f"Jenkins returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Jenkins connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync jobs from Jenkins."""
        try:
            url = self.config.get("url", "http://localhost:8080")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{url}/api/json?tree=jobs[name,url,color,lastBuild[number,result,timestamp]]", headers=self._get_headers())
                if response.status_code == 200:
                    jobs = response.json().get("jobs", [])
                    return {"success": True, "jobs_count": len(jobs), "jobs": jobs[:20]}
                return {"success": False, "message": f"Failed to sync: {response.status_code}"}
        except Exception as e:
            logger.error(f"Jenkins sync error: {e}")
            return {"success": False, "message": str(e)}

    async def trigger_build(self, job_name: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Trigger a Jenkins job build."""
        try:
            url = self.config.get("url", "http://localhost:8080")
            if parameters:
                build_url = f"{url}/job/{job_name}/buildWithParameters"
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(build_url, params=parameters, headers=self._get_headers())
            else:
                build_url = f"{url}/job/{job_name}/build"
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(build_url, headers=self._get_headers())

            if response.status_code in [200, 201, 202]:
                return {"success": True, "message": f"Build triggered for {job_name}"}
            return {"success": False, "message": f"Failed to trigger build: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class GitLabCIIntegration(BaseIntegration):
    """GitLab CI/CD integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        headers["PRIVATE-TOKEN"] = self.credentials.get("access_token", "")
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to GitLab."""
        try:
            url = self.config.get("url", "https://gitlab.com")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{url}/api/v4/user", headers=self._get_headers())
                if response.status_code == 200:
                    user = response.json()
                    return {"success": True, "message": f"Connected as {user.get('username', 'Unknown')}"}
                return {"success": False, "message": f"GitLab returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"GitLab connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync pipelines from GitLab."""
        try:
            url = self.config.get("url", "https://gitlab.com")
            project_id = self.config.get("project_id", "")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{url}/api/v4/projects/{project_id}/pipelines",
                    headers=self._get_headers()
                )
                if response.status_code == 200:
                    pipelines = response.json()
                    return {"success": True, "pipelines_count": len(pipelines), "pipelines": pipelines[:20]}
                return {"success": False, "message": f"Failed to sync: {response.status_code}"}
        except Exception as e:
            logger.error(f"GitLab sync error: {e}")
            return {"success": False, "message": str(e)}

    async def trigger_pipeline(self, ref: str = "main", variables: Dict[str, str] = None) -> Dict[str, Any]:
        """Trigger a GitLab pipeline."""
        try:
            url = self.config.get("url", "https://gitlab.com")
            project_id = self.config.get("project_id", "")
            trigger_token = self.credentials.get("trigger_token", "")

            payload = {"token": trigger_token, "ref": ref}
            if variables:
                for key, value in variables.items():
                    payload[f"variables[{key}]"] = value

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{url}/api/v4/projects/{project_id}/trigger/pipeline",
                    data=payload
                )
                if response.status_code in [200, 201]:
                    return {"success": True, "pipeline": response.json()}
                return {"success": False, "message": f"Failed to trigger pipeline: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class GitHubActionsIntegration(BaseIntegration):
    """GitHub Actions CI/CD integration."""

    def _get_headers(self) -> Dict[str, str]:
        headers = super()._get_headers()
        headers["Authorization"] = f"Bearer {self.credentials.get('access_token', '')}"
        headers["Accept"] = "application/vnd.github.v3+json"
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to GitHub."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get("https://api.github.com/user", headers=self._get_headers())
                if response.status_code == 200:
                    user = response.json()
                    return {"success": True, "message": f"Connected as {user.get('login', 'Unknown')}"}
                return {"success": False, "message": f"GitHub returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"GitHub connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync workflow runs from GitHub Actions."""
        try:
            owner = self.config.get("owner", "")
            repo = self.config.get("repo", "")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/actions/runs",
                    headers=self._get_headers()
                )
                if response.status_code == 200:
                    runs = response.json().get("workflow_runs", [])
                    return {"success": True, "runs_count": len(runs), "runs": runs[:20]}
                return {"success": False, "message": f"Failed to sync: {response.status_code}"}
        except Exception as e:
            logger.error(f"GitHub sync error: {e}")
            return {"success": False, "message": str(e)}

    async def trigger_workflow(self, workflow_id: str, ref: str = "main", inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Trigger a GitHub Actions workflow."""
        try:
            owner = self.config.get("owner", "")
            repo = self.config.get("repo", "")
            payload = {"ref": ref}
            if inputs:
                payload["inputs"] = inputs

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
                    json=payload,
                    headers=self._get_headers()
                )
                if response.status_code in [200, 201, 204]:
                    return {"success": True, "message": "Workflow triggered successfully"}
                return {"success": False, "message": f"Failed to trigger workflow: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


# =============================================================================
# COMMUNICATION INTEGRATIONS
# =============================================================================

class EmailIntegration(BaseIntegration):
    """Email (SMTP) communication integration."""

    async def test_connection(self) -> Dict[str, Any]:
        """Test SMTP connection."""
        try:
            import smtplib
            host = self.config.get("smtp_host", "smtp.gmail.com")
            port = self.config.get("smtp_port", 587)
            username = self.credentials.get("username", "")
            password = self.credentials.get("password", "")

            with smtplib.SMTP(host, port, timeout=10) as server:
                server.starttls()
                if username and password:
                    server.login(username, password)
                return {"success": True, "message": "SMTP connection successful"}
        except Exception as e:
            logger.error(f"Email connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Email doesn't need sync."""
        return {"success": True, "message": "Email integration doesn't require sync"}

    async def send_email(self, to: List[str], subject: str, body: str, html: bool = False) -> Dict[str, Any]:
        """Send an email."""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            host = self.config.get("smtp_host", "smtp.gmail.com")
            port = self.config.get("smtp_port", 587)
            username = self.credentials.get("username", "")
            password = self.credentials.get("password", "")
            from_email = self.config.get("from_email", username)

            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = ", ".join(to)
            msg["Subject"] = subject

            msg.attach(MIMEText(body, "html" if html else "plain"))

            with smtplib.SMTP(host, port, timeout=30) as server:
                server.starttls()
                if username and password:
                    server.login(username, password)
                server.sendmail(from_email, to, msg.as_string())

            return {"success": True, "message": f"Email sent to {len(to)} recipients"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class SlackIntegration(BaseIntegration):
    """Slack communication integration."""

    async def test_connection(self) -> Dict[str, Any]:
        """Test Slack connection."""
        try:
            token = self.credentials.get("bot_token", "")
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get("https://slack.com/api/auth.test", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        return {"success": True, "message": f"Connected to workspace: {data.get('team', 'Unknown')}"}
                    return {"success": False, "message": data.get("error", "Unknown error")}
                return {"success": False, "message": f"Slack returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Slack connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Sync channels from Slack."""
        try:
            token = self.credentials.get("bot_token", "")
            headers = {"Authorization": f"Bearer {token}"}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get("https://slack.com/api/conversations.list", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        channels = data.get("channels", [])
                        return {"success": True, "channels_count": len(channels), "channels": channels[:20]}
                    return {"success": False, "message": data.get("error", "Unknown error")}
                return {"success": False, "message": f"Failed to sync: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def send_message(self, channel: str, text: str, blocks: List[Dict] = None) -> Dict[str, Any]:
        """Send a message to Slack."""
        try:
            token = self.credentials.get("bot_token", "")
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            payload = {"channel": channel, "text": text}
            if blocks:
                payload["blocks"] = blocks

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post("https://slack.com/api/chat.postMessage", json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        return {"success": True, "message_ts": data.get("ts")}
                    return {"success": False, "message": data.get("error", "Unknown error")}
                return {"success": False, "message": f"Failed to send message: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class TeamsIntegration(BaseIntegration):
    """Microsoft Teams communication integration."""

    async def test_connection(self) -> Dict[str, Any]:
        """Test Teams webhook connection."""
        try:
            webhook_url = self.config.get("webhook_url", "")
            if not webhook_url:
                return {"success": False, "message": "Webhook URL not configured"}

            # Send a test message
            payload = {
                "@type": "MessageCard",
                "summary": "Test Connection",
                "sections": [{"text": "This is a test message from ITSM Platform"}]
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(webhook_url, json=payload)
                if response.status_code == 200:
                    return {"success": True, "message": "Teams webhook connected successfully"}
                return {"success": False, "message": f"Teams returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Teams connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Teams webhook doesn't need sync."""
        return {"success": True, "message": "Teams webhook doesn't require sync"}

    async def send_message(self, title: str, text: str, color: str = "0076D7") -> Dict[str, Any]:
        """Send a message to Teams."""
        try:
            webhook_url = self.config.get("webhook_url", "")
            payload = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": color,
                "summary": title,
                "sections": [{
                    "activityTitle": title,
                    "text": text
                }]
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(webhook_url, json=payload)
                if response.status_code == 200:
                    return {"success": True, "message": "Message sent to Teams"}
                return {"success": False, "message": f"Failed to send message: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class WebhookIntegration(BaseIntegration):
    """Generic Webhook integration."""

    async def test_connection(self) -> Dict[str, Any]:
        """Test webhook endpoint."""
        try:
            url = self.config.get("url", "")
            method = self.config.get("method", "POST")
            headers = self.config.get("headers", {})

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers)
                else:
                    response = await client.post(url, json={"test": True}, headers=headers)

                if response.status_code < 400:
                    return {"success": True, "message": f"Webhook endpoint returned {response.status_code}"}
                return {"success": False, "message": f"Webhook returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Webhook connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """Webhook doesn't need sync."""
        return {"success": True, "message": "Webhook doesn't require sync"}

    async def send(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send data to webhook."""
        try:
            url = self.config.get("url", "")
            method = self.config.get("method", "POST")
            headers = self.config.get("headers", {})

            # Add signature if secret is configured
            secret = self.credentials.get("secret", "")
            if secret:
                signature = hmac.new(
                    secret.encode(),
                    json.dumps(payload).encode(),
                    hashlib.sha256
                ).hexdigest()
                headers["X-Signature"] = signature

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method.upper() == "GET":
                    response = await client.get(url, params=payload, headers=headers)
                else:
                    response = await client.post(url, json=payload, headers=headers)

                if response.status_code < 400:
                    return {"success": True, "status_code": response.status_code}
                return {"success": False, "message": f"Webhook returned status {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


class SMSIntegration(BaseIntegration):
    """SMS integration via Twilio."""

    async def test_connection(self) -> Dict[str, Any]:
        """Test Twilio SMS connection."""
        try:
            account_sid = self.credentials.get("account_sid", "")
            auth_token = self.credentials.get("auth_token", "")

            import base64
            auth = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
            headers = {"Authorization": f"Basic {auth}"}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
                    headers=headers
                )
                if response.status_code == 200:
                    return {"success": True, "message": "Twilio SMS connected successfully"}
                return {"success": False, "message": f"Twilio returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"SMS connection error: {e}")
            return {"success": False, "message": str(e)}

    async def sync(self) -> Dict[str, Any]:
        """SMS doesn't need sync."""
        return {"success": True, "message": "SMS integration doesn't require sync"}

    async def send_sms(self, to: str, message: str) -> Dict[str, Any]:
        """Send an SMS via Twilio."""
        try:
            account_sid = self.credentials.get("account_sid", "")
            auth_token = self.credentials.get("auth_token", "")
            from_number = self.config.get("from_number", "")

            import base64
            auth = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
            headers = {"Authorization": f"Basic {auth}"}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                    data={"From": from_number, "To": to, "Body": message},
                    headers=headers
                )
                if response.status_code in [200, 201]:
                    return {"success": True, "message_sid": response.json().get("sid")}
                return {"success": False, "message": f"Failed to send SMS: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}


# =============================================================================
# INTEGRATION FACTORY
# =============================================================================

class IntegrationFactory:
    """Factory for creating integration instances with enhanced authentication support."""

    _integrations = {
        # Monitoring
        "prometheus": PrometheusIntegration,
        "grafana": GrafanaIntegration,
        "datadog": DatadogIntegration,
        "newrelic": NewRelicIntegration,

        # Automation
        "stackstorm": StackStormIntegration,

        # Ticketing
        "servicenow": ServiceNowIntegration,
        "jira": JiraIntegration,
        "zendesk": ZendeskIntegration,

        # CI/CD
        "jenkins": JenkinsIntegration,
        "gitlab": GitLabCIIntegration,
        "github": GitHubActionsIntegration,

        # Communication
        "email": EmailIntegration,
        "slack": SlackIntegration,
        "teams": TeamsIntegration,
        "webhook": WebhookIntegration,
        "sms": SMSIntegration,
    }

    @classmethod
    def get_integration(cls, provider: str, config: Dict[str, Any], credentials: Dict[str, Any]) -> Optional[BaseIntegration]:
        """Get an integration instance by provider name."""
        integration_class = cls._integrations.get(provider.lower())
        if integration_class:
            return integration_class(config, credentials)
        return None

    @classmethod
    def create_integration_service(
        cls, 
        provider: str, 
        config: Dict[str, Any], 
        auth_type: str, 
        auth_config: Dict[str, Any],
        credentials: Dict[str, Any]
    ) -> Optional['EnhancedBaseIntegration']:
        """
        Create an integration service instance with enhanced authentication support.
        
        Args:
            provider: Integration provider name (e.g., 'servicenow', 'jira')
            config: Integration configuration (URLs, settings, etc.)
            auth_type: Authentication type (username_password, oauth2, etc.)
            auth_config: Authentication configuration (endpoints, headers, etc.)
            credentials: Authentication credentials
            
        Returns:
            Enhanced integration instance or None if provider not found
        """
        integration_class = cls._integrations.get(provider.lower())
        if not integration_class:
            logger.error(f"Unknown integration provider: {provider}")
            return None
        
        try:
            # Create enhanced integration instance
            enhanced_integration = EnhancedBaseIntegration(
                base_integration_class=integration_class,
                config=config,
                auth_type=auth_type,
                auth_config=auth_config,
                credentials=credentials
            )
            return enhanced_integration
        except Exception as e:
            logger.error(f"Failed to create integration service for {provider}: {e}")
            return None

    @classmethod
    def get_available_integrations(cls) -> Dict[str, List[str]]:
        """Get list of available integrations by category."""
        return {
            "monitoring": ["prometheus", "grafana", "datadog", "newrelic"],
            "automation": ["stackstorm"],
            "ticketing": ["servicenow", "jira", "zendesk"],
            "cicd": ["jenkins", "gitlab", "github"],
            "communication": ["email", "slack", "teams", "webhook", "sms"]
        }

    @classmethod
    def get_auth_headers(cls, auth_type: str, auth_config: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate authentication headers for the specified auth type.
        
        Args:
            auth_type: Authentication type
            auth_config: Authentication configuration
            credentials: Authentication credentials
            
        Returns:
            Dict containing HTTP headers for authentication
        """
        from app.services.authentication_manager import AuthenticationManager
        auth_manager = AuthenticationManager()
        return auth_manager.get_auth_headers(auth_type, auth_config, credentials)

    @classmethod
    def supports_oauth2_flow(cls, provider: str) -> bool:
        """Check if provider supports OAuth 2.0 flow."""
        oauth2_providers = {
            'jira', 'github', 'gitlab', 'slack', 'teams'
        }
        return provider.lower() in oauth2_providers


# =============================================================================
# ENHANCED BASE INTEGRATION
# =============================================================================

class EnhancedBaseIntegration:
    """
    Enhanced integration wrapper that adds authentication support to existing integrations.
    """
    
    def __init__(
        self, 
        base_integration_class, 
        config: Dict[str, Any], 
        auth_type: str, 
        auth_config: Dict[str, Any],
        credentials: Dict[str, Any]
    ):
        """
        Initialize enhanced integration.
        
        Args:
            base_integration_class: The original integration class
            config: Integration configuration
            auth_type: Authentication type
            auth_config: Authentication configuration
            credentials: Authentication credentials
        """
        self.auth_type = auth_type
        self.auth_config = auth_config
        self.enhanced_credentials = credentials
        
        # Create the base integration instance
        self.base_integration = base_integration_class(config, credentials)
        
        # Import authentication manager
        from app.services.authentication_manager import AuthenticationManager
        self.auth_manager = AuthenticationManager()
        
        # Override the _get_headers method to use enhanced authentication
        self._original_get_headers = self.base_integration._get_headers
        self.base_integration._get_headers = self._get_enhanced_headers
    
    def _get_enhanced_headers(self) -> Dict[str, str]:
        """Get enhanced authentication headers."""
        # Start with base headers
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Add authentication headers based on auth_type
        auth_headers = self.auth_manager.get_auth_headers(
            self.auth_type, 
            self.auth_config, 
            self.enhanced_credentials
        )
        headers.update(auth_headers)
        
        return headers
    
    def _handle_oauth2_flow(self) -> Dict[str, Any]:
        """
        Handle OAuth 2.0 authorization flow.
        
        Returns:
            Dict containing OAuth flow results
        """
        try:
            client_id = self.enhanced_credentials.get('client_id')
            client_secret = self.enhanced_credentials.get('client_secret')
            authorization_url = self.auth_config.get('authorization_url')
            token_url = self.auth_config.get('token_url')
            redirect_uri = self.auth_config.get('redirect_uri')
            scope = self.auth_config.get('scope', '')
            
            if not all([client_id, client_secret, authorization_url, token_url]):
                return {
                    'success': False,
                    'message': 'Missing required OAuth 2.0 configuration'
                }
            
            # Generate authorization URL
            auth_url = f"{authorization_url}?client_id={client_id}&response_type=code&scope={scope}"
            if redirect_uri:
                auth_url += f"&redirect_uri={redirect_uri}"
            
            return {
                'success': True,
                'authorization_url': auth_url,
                'message': 'OAuth 2.0 flow initiated. User must authorize access.'
            }
            
        except Exception as e:
            logger.error(f"OAuth 2.0 flow error: {e}")
            return {
                'success': False,
                'message': f'OAuth 2.0 flow failed: {str(e)}'
            }
    
    async def exchange_oauth_code(self, authorization_code: str) -> Dict[str, Any]:
        """
        Exchange OAuth authorization code for access token.
        
        Args:
            authorization_code: Authorization code from OAuth callback
            
        Returns:
            Dict containing token exchange results
        """
        try:
            client_id = self.enhanced_credentials.get('client_id')
            client_secret = self.enhanced_credentials.get('client_secret')
            token_url = self.auth_config.get('token_url')
            redirect_uri = self.auth_config.get('redirect_uri')
            
            payload = {
                'grant_type': 'authorization_code',
                'code': authorization_code,
                'client_id': client_id,
                'client_secret': client_secret
            }
            
            if redirect_uri:
                payload['redirect_uri'] = redirect_uri
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(token_url, data=payload)
                
                if response.status_code == 200:
                    token_data = response.json()
                    access_token = token_data.get('access_token')
                    
                    if access_token:
                        # Update credentials with access token
                        self.enhanced_credentials['access_token'] = access_token
                        if 'refresh_token' in token_data:
                            self.enhanced_credentials['refresh_token'] = token_data['refresh_token']
                        
                        return {
                            'success': True,
                            'access_token': access_token,
                            'token_data': token_data
                        }
                
                return {
                    'success': False,
                    'message': f'Token exchange failed: HTTP {response.status_code}'
                }
                
        except Exception as e:
            logger.error(f"OAuth token exchange error: {e}")
            return {
                'success': False,
                'message': f'Token exchange failed: {str(e)}'
            }
    
    def __getattr__(self, name):
        """Delegate attribute access to the base integration."""
        return getattr(self.base_integration, name)
