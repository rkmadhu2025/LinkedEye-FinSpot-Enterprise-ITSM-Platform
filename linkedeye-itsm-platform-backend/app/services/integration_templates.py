"""
Integration Provider Templates System

This module provides pre-configured templates for common integration providers,
including authentication requirements, configuration fields, and validation rules.
"""

from typing import Dict, List, Any, Optional
from enum import Enum
from app.models.integration import AuthenticationType


class IntegrationCategory(str, Enum):
    """Categories of integrations."""
    MONITORING = "monitoring"
    TICKETING = "ticketing"
    CICD = "cicd"
    COMMUNICATION = "communication"


class IntegrationTemplate:
    """Template for an integration provider."""
    
    def __init__(
        self,
        name: str,
        category: IntegrationCategory,
        description: str,
        auth_type: str,
        required_config: List[str],
        required_auth: List[str],
        optional_config: List[str] = None,
        optional_auth: List[str] = None,
        auth_config: Dict[str, Any] = None,
        health_check_endpoint: str = None,
        features: List[str] = None,
        validation_rules: Dict[str, Any] = None,
        help_text: Dict[str, str] = None
    ):
        self.name = name
        self.category = category
        self.description = description
        self.auth_type = auth_type
        self.required_config = required_config or []
        self.required_auth = required_auth or []
        self.optional_config = optional_config or []
        self.optional_auth = optional_auth or []
        self.auth_config = auth_config or {}
        self.health_check_endpoint = health_check_endpoint
        self.features = features or []
        self.validation_rules = validation_rules or {}
        self.help_text = help_text or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert template to dictionary representation."""
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "auth_type": self.auth_type,
            "required_config": self.required_config,
            "required_auth": self.required_auth,
            "optional_config": self.optional_config,
            "optional_auth": self.optional_auth,
            "auth_config": self.auth_config,
            "health_check_endpoint": self.health_check_endpoint,
            "features": self.features,
            "validation_rules": self.validation_rules,
            "help_text": self.help_text
        }


# =============================================================================
# INTEGRATION TEMPLATES CATALOG
# =============================================================================

INTEGRATION_TEMPLATES: Dict[str, IntegrationTemplate] = {
    # Monitoring Tools
    "prometheus": IntegrationTemplate(
        name="Prometheus",
        category=IntegrationCategory.MONITORING,
        description="Open-source monitoring and alerting toolkit",
        auth_type=AuthenticationType.BEARER_TOKEN.value,
        required_config=["url"],
        required_auth=["token"],
        optional_config=["timeout", "verify_ssl"],
        auth_config={
            "token_field": "token",
            "header_name": "Authorization",
            "header_format": "Bearer {token}"
        },
        health_check_endpoint="/api/v1/status/config",
        features=["alerts", "metrics", "queries", "health_monitoring"],
        validation_rules={
            "url": {"pattern": r"^https?://.*", "message": "URL must start with http:// or https://"},
            "token": {"min_length": 10, "message": "Token must be at least 10 characters"}
        },
        help_text={
            "url": "Prometheus server URL (e.g., http://prometheus.example.com:9090)",
            "token": "Bearer token for authentication (if required by your Prometheus setup)"
        }
    ),
    
    "grafana": IntegrationTemplate(
        name="Grafana",
        category=IntegrationCategory.MONITORING,
        description="Analytics and interactive visualization platform",
        auth_type=AuthenticationType.API_KEY.value,
        required_config=["url"],
        required_auth=["api_key"],
        optional_config=["timeout", "verify_ssl", "org_id"],
        auth_config={
            "api_key_field": "api_key",
            "header_name": "Authorization",
            "header_format": "Bearer {api_key}"
        },
        health_check_endpoint="/api/health",
        features=["dashboards", "alerts", "annotations", "health_monitoring"],
        validation_rules={
            "url": {"pattern": r"^https?://.*", "message": "URL must start with http:// or https://"},
            "api_key": {"min_length": 20, "message": "API key must be at least 20 characters"}
        },
        help_text={
            "url": "Grafana server URL (e.g., http://grafana.example.com:3000)",
            "api_key": "Grafana API key with appropriate permissions",
            "org_id": "Organization ID (optional, defaults to main org)"
        }
    ),
    
    "datadog": IntegrationTemplate(
        name="Datadog",
        category=IntegrationCategory.MONITORING,
        description="Cloud monitoring and security platform",
        auth_type=AuthenticationType.API_KEY.value,
        required_config=["site"],
        required_auth=["api_key", "app_key"],
        optional_config=["timeout"],
        auth_config={
            "api_key_field": "api_key",
            "app_key_field": "app_key",
            "api_key_header": "DD-API-KEY",
            "app_key_header": "DD-APPLICATION-KEY"
        },
        health_check_endpoint="/api/v1/validate",
        features=["monitors", "events", "metrics", "logs"],
        validation_rules={
            "site": {"enum": ["datadoghq.com", "datadoghq.eu", "us3.datadoghq.com", "us5.datadoghq.com"], 
                    "message": "Site must be a valid Datadog site"},
            "api_key": {"min_length": 32, "message": "API key must be 32 characters"},
            "app_key": {"min_length": 40, "message": "Application key must be 40 characters"}
        },
        help_text={
            "site": "Datadog site (e.g., datadoghq.com for US1, datadoghq.eu for EU)",
            "api_key": "Datadog API key from your account settings",
            "app_key": "Datadog application key from your account settings"
        }
    ),
    
    "newrelic": IntegrationTemplate(
        name="New Relic",
        category=IntegrationCategory.MONITORING,
        description="Application performance monitoring",
        auth_type=AuthenticationType.API_KEY.value,
        required_config=[],
        required_auth=["api_key"],
        optional_config=["timeout", "account_id"],
        auth_config={
            "api_key_field": "api_key",
            "header_name": "Api-Key"
        },
        health_check_endpoint="/v2/applications.json",
        features=["applications", "alerts", "insights", "infrastructure"],
        validation_rules={
            "api_key": {"pattern": r"^NRAK-[A-Z0-9]{27}$", "message": "API key must be in format NRAK-XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"}
        },
        help_text={
            "api_key": "New Relic API key (starts with NRAK-)",
            "account_id": "New Relic account ID (optional, for specific account queries)"
        }
    ),

    # Ticketing Tools
    "servicenow": IntegrationTemplate(
        name="ServiceNow",
        category=IntegrationCategory.TICKETING,
        description="Enterprise IT service management",
        auth_type=AuthenticationType.USERNAME_PASSWORD.value,
        required_config=["instance"],
        required_auth=["username", "password"],
        optional_config=["timeout", "verify_ssl", "table_prefix"],
        auth_config={
            "username_field": "username",
            "password_field": "password",
            "auth_url": "/api/now/auth",
            "auth_method": "basic"
        },
        health_check_endpoint="/api/now/table/sys_user?sysparm_limit=1",
        features=["incidents", "changes", "problems", "cmdb", "users"],
        validation_rules={
            "instance": {"pattern": r"^[a-zA-Z0-9-]+$", "message": "Instance name should only contain letters, numbers, and hyphens"},
            "username": {"min_length": 3, "message": "Username must be at least 3 characters"},
            "password": {"min_length": 8, "message": "Password must be at least 8 characters"}
        },
        help_text={
            "instance": "ServiceNow instance name (e.g., 'dev12345' for dev12345.service-now.com)",
            "username": "ServiceNow username",
            "password": "ServiceNow password",
            "table_prefix": "Custom table prefix (optional)"
        }
    ),
    
    "jira": IntegrationTemplate(
        name="Jira",
        category=IntegrationCategory.TICKETING,
        description="Project tracking and issue management",
        auth_type=AuthenticationType.BASIC_AUTH.value,
        required_config=["domain", "project"],
        required_auth=["email", "api_token"],
        optional_config=["timeout", "verify_ssl", "default_issue_type"],
        auth_config={
            "username_field": "email",
            "password_field": "api_token"
        },
        health_check_endpoint="/rest/api/3/myself",
        features=["issues", "projects", "sprints", "workflows"],
        validation_rules={
            "domain": {"pattern": r"^[a-zA-Z0-9-]+\.atlassian\.net$", "message": "Domain must be in format: yoursite.atlassian.net"},
            "email": {"pattern": r"^[^@]+@[^@]+\.[^@]+$", "message": "Must be a valid email address"},
            "api_token": {"min_length": 20, "message": "API token must be at least 20 characters"},
            "project": {"pattern": r"^[A-Z]{2,10}$", "message": "Project key must be 2-10 uppercase letters"}
        },
        help_text={
            "domain": "Jira Cloud domain (e.g., yourcompany.atlassian.net)",
            "project": "Default project key (e.g., PROJ, DEV)",
            "email": "Your Atlassian account email",
            "api_token": "Jira API token from your Atlassian account settings",
            "default_issue_type": "Default issue type for created tickets (e.g., Task, Bug)"
        }
    ),
    
    "zendesk": IntegrationTemplate(
        name="Zendesk",
        category=IntegrationCategory.TICKETING,
        description="Customer service and engagement platform",
        auth_type=AuthenticationType.BASIC_AUTH.value,
        required_config=["subdomain"],
        required_auth=["email", "api_token"],
        optional_config=["timeout", "verify_ssl"],
        auth_config={
            "username_field": "email",
            "password_field": "api_token",
            "username_suffix": "/token"
        },
        health_check_endpoint="/api/v2/users/me.json",
        features=["tickets", "users", "organizations", "groups"],
        validation_rules={
            "subdomain": {"pattern": r"^[a-zA-Z0-9-]+$", "message": "Subdomain should only contain letters, numbers, and hyphens"},
            "email": {"pattern": r"^[^@]+@[^@]+\.[^@]+$", "message": "Must be a valid email address"},
            "api_token": {"min_length": 40, "message": "API token must be at least 40 characters"}
        },
        help_text={
            "subdomain": "Zendesk subdomain (e.g., 'company' for company.zendesk.com)",
            "email": "Your Zendesk agent email",
            "api_token": "Zendesk API token from your profile settings"
        }
    ),

    # CI/CD Tools
    "jenkins": IntegrationTemplate(
        name="Jenkins",
        category=IntegrationCategory.CICD,
        description="Open-source automation server",
        auth_type=AuthenticationType.BASIC_AUTH.value,
        required_config=["url"],
        required_auth=["username", "api_token"],
        optional_config=["timeout", "verify_ssl", "crumb_issuer"],
        auth_config={
            "username_field": "username",
            "password_field": "api_token"
        },
        health_check_endpoint="/api/json",
        features=["jobs", "builds", "pipelines", "queue"],
        validation_rules={
            "url": {"pattern": r"^https?://.*", "message": "URL must start with http:// or https://"},
            "username": {"min_length": 3, "message": "Username must be at least 3 characters"},
            "api_token": {"min_length": 10, "message": "API token must be at least 10 characters"}
        },
        help_text={
            "url": "Jenkins server URL (e.g., http://jenkins.example.com:8080)",
            "username": "Jenkins username",
            "api_token": "Jenkins API token from user configuration",
            "crumb_issuer": "Enable CSRF protection (true/false)"
        }
    ),
    
    "gitlab": IntegrationTemplate(
        name="GitLab CI",
        category=IntegrationCategory.CICD,
        description="GitLab CI/CD pipelines",
        auth_type=AuthenticationType.BEARER_TOKEN.value,
        required_config=["url", "project_id"],
        required_auth=["access_token"],
        optional_config=["timeout", "verify_ssl", "ref"],
        auth_config={
            "token_field": "access_token",
            "header_name": "PRIVATE-TOKEN"
        },
        health_check_endpoint="/api/v4/user",
        features=["pipelines", "jobs", "deployments", "merge_requests"],
        validation_rules={
            "url": {"pattern": r"^https?://.*", "message": "URL must start with http:// or https://"},
            "project_id": {"pattern": r"^\d+$", "message": "Project ID must be a number"},
            "access_token": {"min_length": 20, "message": "Access token must be at least 20 characters"}
        },
        help_text={
            "url": "GitLab instance URL (e.g., https://gitlab.com or https://gitlab.example.com)",
            "project_id": "GitLab project ID (found in project settings)",
            "access_token": "GitLab personal access token with API scope",
            "ref": "Default branch/ref for operations (e.g., main, master)"
        }
    ),
    
    "github": IntegrationTemplate(
        name="GitHub Actions",
        category=IntegrationCategory.CICD,
        description="GitHub CI/CD workflows",
        auth_type=AuthenticationType.BEARER_TOKEN.value,
        required_config=["owner", "repo"],
        required_auth=["access_token"],
        optional_config=["timeout", "workflow_id", "ref"],
        auth_config={
            "token_field": "access_token",
            "header_name": "Authorization",
            "header_format": "Bearer {access_token}"
        },
        health_check_endpoint="/user",
        features=["workflows", "runs", "artifacts", "releases"],
        validation_rules={
            "owner": {"pattern": r"^[a-zA-Z0-9-]+$", "message": "Owner must be a valid GitHub username or organization"},
            "repo": {"pattern": r"^[a-zA-Z0-9-_.]+$", "message": "Repository name must be valid"},
            "access_token": {"pattern": r"^gh[ps]_[A-Za-z0-9_]{36,255}$", "message": "Must be a valid GitHub token (starts with ghp_ or ghs_)"}
        },
        help_text={
            "owner": "GitHub username or organization name",
            "repo": "Repository name",
            "access_token": "GitHub personal access token with workflow scope",
            "workflow_id": "Specific workflow ID or filename (optional)",
            "ref": "Default branch for workflow triggers (e.g., main, master)"
        }
    ),

    # Communication Tools
    "email": IntegrationTemplate(
        name="Email (SMTP)",
        category=IntegrationCategory.COMMUNICATION,
        description="Email notifications via SMTP",
        auth_type=AuthenticationType.USERNAME_PASSWORD.value,
        required_config=["smtp_host", "smtp_port", "from_email"],
        required_auth=["username", "password"],
        optional_config=["use_tls", "use_ssl", "timeout"],
        auth_config={
            "username_field": "username",
            "password_field": "password"
        },
        features=["send_email", "html_email", "attachments"],
        validation_rules={
            "smtp_host": {"pattern": r"^[a-zA-Z0-9.-]+$", "message": "SMTP host must be a valid hostname"},
            "smtp_port": {"range": [1, 65535], "message": "SMTP port must be between 1 and 65535"},
            "from_email": {"pattern": r"^[^@]+@[^@]+\.[^@]+$", "message": "Must be a valid email address"},
            "username": {"min_length": 3, "message": "Username must be at least 3 characters"}
        },
        help_text={
            "smtp_host": "SMTP server hostname (e.g., smtp.gmail.com)",
            "smtp_port": "SMTP server port (25, 465, 587)",
            "from_email": "Email address to send from",
            "username": "SMTP authentication username",
            "password": "SMTP authentication password",
            "use_tls": "Use TLS encryption (true/false)",
            "use_ssl": "Use SSL encryption (true/false)"
        }
    ),
    
    "slack": IntegrationTemplate(
        name="Slack",
        category=IntegrationCategory.COMMUNICATION,
        description="Team messaging and collaboration",
        auth_type=AuthenticationType.BEARER_TOKEN.value,
        required_config=[],
        required_auth=["bot_token"],
        optional_config=["timeout", "default_channel"],
        auth_config={
            "token_field": "bot_token",
            "header_name": "Authorization",
            "header_format": "Bearer {bot_token}"
        },
        health_check_endpoint="/api/auth.test",
        features=["messages", "channels", "reactions", "files"],
        validation_rules={
            "bot_token": {"pattern": r"^xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+$", "message": "Must be a valid Slack bot token (starts with xoxb-)"}
        },
        help_text={
            "bot_token": "Slack bot token from your app configuration (starts with xoxb-)",
            "default_channel": "Default channel for messages (e.g., #general, @username)"
        }
    ),
    
    "teams": IntegrationTemplate(
        name="Microsoft Teams",
        category=IntegrationCategory.COMMUNICATION,
        description="Microsoft Teams notifications",
        auth_type=AuthenticationType.CUSTOM.value,
        required_config=["webhook_url"],
        required_auth=[],
        optional_config=["timeout"],
        auth_config={},
        features=["messages", "cards", "mentions"],
        validation_rules={
            "webhook_url": {"pattern": r"^https://[a-zA-Z0-9.-]+\.webhook\.office\.com/.*", 
                           "message": "Must be a valid Teams webhook URL"}
        },
        help_text={
            "webhook_url": "Microsoft Teams incoming webhook URL from channel connectors"
        }
    ),
    
    "webhook": IntegrationTemplate(
        name="Webhook",
        category=IntegrationCategory.COMMUNICATION,
        description="Generic HTTP webhook integration",
        auth_type=AuthenticationType.CUSTOM.value,
        required_config=["url", "method"],
        required_auth=[],
        optional_config=["timeout", "headers", "verify_ssl"],
        auth_config={},
        features=["send", "custom_headers", "custom_payload"],
        validation_rules={
            "url": {"pattern": r"^https?://.*", "message": "URL must start with http:// or https://"},
            "method": {"enum": ["GET", "POST", "PUT", "PATCH"], "message": "Method must be GET, POST, PUT, or PATCH"}
        },
        help_text={
            "url": "Webhook endpoint URL",
            "method": "HTTP method (GET, POST, PUT, PATCH)",
            "headers": "Custom headers as JSON object (optional)",
            "verify_ssl": "Verify SSL certificates (true/false)"
        }
    ),
    
    "sms": IntegrationTemplate(
        name="SMS (Twilio)",
        category=IntegrationCategory.COMMUNICATION,
        description="SMS notifications via Twilio",
        auth_type=AuthenticationType.BASIC_AUTH.value,
        required_config=["from_number"],
        required_auth=["account_sid", "auth_token"],
        optional_config=["timeout"],
        auth_config={
            "username_field": "account_sid",
            "password_field": "auth_token"
        },
        health_check_endpoint="/2010-04-01/Accounts/{account_sid}.json",
        features=["send_sms", "delivery_status"],
        validation_rules={
            "from_number": {"pattern": r"^\+[1-9]\d{1,14}$", "message": "Must be a valid phone number in E.164 format (+1234567890)"},
            "account_sid": {"pattern": r"^AC[a-f0-9]{32}$", "message": "Must be a valid Twilio Account SID (starts with AC)"},
            "auth_token": {"min_length": 32, "message": "Auth token must be at least 32 characters"}
        },
        help_text={
            "from_number": "Twilio phone number in E.164 format (e.g., +1234567890)",
            "account_sid": "Twilio Account SID from your console",
            "auth_token": "Twilio Auth Token from your console"
        }
    )
}


class IntegrationTemplateManager:
    """Manager for integration provider templates."""
    
    @classmethod
    def get_template(cls, provider: str) -> Optional[IntegrationTemplate]:
        """Get template for a specific provider."""
        return INTEGRATION_TEMPLATES.get(provider.lower())
    
    @classmethod
    def get_templates_by_category(cls, category: IntegrationCategory) -> Dict[str, IntegrationTemplate]:
        """Get all templates for a specific category."""
        return {
            provider: template 
            for provider, template in INTEGRATION_TEMPLATES.items() 
            if template.category == category
        }
    
    @classmethod
    def get_all_templates(cls) -> Dict[str, IntegrationTemplate]:
        """Get all available templates."""
        return INTEGRATION_TEMPLATES.copy()
    
    @classmethod
    def get_template_dict(cls, provider: str) -> Optional[Dict[str, Any]]:
        """Get template as dictionary for a specific provider."""
        template = cls.get_template(provider)
        return template.to_dict() if template else None
    
    @classmethod
    def validate_configuration(cls, provider: str, config: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Validate configuration against template rules.
        
        Args:
            provider: Integration provider name
            config: Configuration to validate
            
        Returns:
            Dict with 'errors' and 'warnings' lists
        """
        template = cls.get_template(provider)
        if not template:
            return {"errors": [f"Unknown provider: {provider}"], "warnings": []}
        
        errors = []
        warnings = []
        
        # Check required config fields
        for field in template.required_config:
            if field not in config or not config[field]:
                errors.append(f"Required configuration field '{field}' is missing")
        
        # Validate field values against rules
        for field, value in config.items():
            if field in template.validation_rules:
                rule = template.validation_rules[field]
                
                # Pattern validation
                if "pattern" in rule:
                    import re
                    if not re.match(rule["pattern"], str(value)):
                        errors.append(rule.get("message", f"Field '{field}' has invalid format"))
                
                # Enum validation
                if "enum" in rule:
                    if value not in rule["enum"]:
                        errors.append(f"Field '{field}' must be one of: {', '.join(rule['enum'])}")
                
                # Range validation
                if "range" in rule:
                    try:
                        num_value = int(value)
                        min_val, max_val = rule["range"]
                        if not (min_val <= num_value <= max_val):
                            errors.append(f"Field '{field}' must be between {min_val} and {max_val}")
                    except (ValueError, TypeError):
                        errors.append(f"Field '{field}' must be a number")
                
                # Length validation
                if "min_length" in rule:
                    if len(str(value)) < rule["min_length"]:
                        errors.append(rule.get("message", f"Field '{field}' is too short"))
        
        return {"errors": errors, "warnings": warnings}
    
    @classmethod
    def validate_credentials(cls, provider: str, credentials: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Validate credentials against template requirements.
        
        Args:
            provider: Integration provider name
            credentials: Credentials to validate
            
        Returns:
            Dict with 'errors' and 'warnings' lists
        """
        template = cls.get_template(provider)
        if not template:
            return {"errors": [f"Unknown provider: {provider}"], "warnings": []}
        
        errors = []
        warnings = []
        
        # Check required auth fields
        for field in template.required_auth:
            if field not in credentials or not credentials[field]:
                errors.append(f"Required credential field '{field}' is missing")
        
        # Validate credential values against rules
        for field, value in credentials.items():
            if field in template.validation_rules:
                rule = template.validation_rules[field]
                
                # Pattern validation
                if "pattern" in rule:
                    import re
                    if not re.match(rule["pattern"], str(value)):
                        errors.append(rule.get("message", f"Credential '{field}' has invalid format"))
                
                # Length validation
                if "min_length" in rule:
                    if len(str(value)) < rule["min_length"]:
                        errors.append(rule.get("message", f"Credential '{field}' is too short"))
        
        return {"errors": errors, "warnings": warnings}
    
    @classmethod
    def get_provider_categories(cls) -> Dict[str, List[str]]:
        """Get providers organized by category."""
        categories = {}
        for provider, template in INTEGRATION_TEMPLATES.items():
            category = template.category.value
            if category not in categories:
                categories[category] = []
            categories[category].append(provider)
        return categories
    
    @classmethod
    def populate_template_defaults(cls, provider: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Populate configuration with template defaults.
        
        Args:
            provider: Integration provider name
            config: Existing configuration (optional)
            
        Returns:
            Configuration with template defaults applied
        """
        template = cls.get_template(provider)
        if not template:
            return config or {}
        
        result = config.copy() if config else {}
        
        # Add auth_type from template
        if "auth_type" not in result:
            result["auth_type"] = template.auth_type
        
        # Add auth_config from template
        if "auth_config" not in result and template.auth_config:
            result["auth_config"] = template.auth_config.copy()
        
        # Add health_check_url if available
        if "health_check_url" not in result and template.health_check_endpoint:
            result["health_check_url"] = template.health_check_endpoint
        
        # Add default sync interval
        if "sync_interval_minutes" not in result:
            result["sync_interval_minutes"] = 60
        
        # Add default retry policy
        if "retry_policy" not in result:
            result["retry_policy"] = {"max_retries": 3, "backoff_factor": 2}
        
        return result