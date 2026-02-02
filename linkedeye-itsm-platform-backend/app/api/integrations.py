"""
Integration management API endpoints.
Supports: Monitoring, Ticketing, CI/CD, and Communication tools.
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel, Field, validator
from app.core.database import get_db
from app.models.integration import Integration, IntegrationType, IntegrationStatus, AuthenticationType
from app.models.user import User
from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
from app.models.incident import Incident, IncidentStatus, IncidentPriority
from app.api.dependencies import get_current_user, require_admin
from app.core.logging import get_logger
from app.services.integration_service import IntegrationFactory
from app.services.integration_templates import IntegrationTemplateManager, IntegrationTemplate
import json
import hashlib

logger = get_logger(__name__)
router = APIRouter(prefix="/integrations", tags=["integrations"])


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class IntegrationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    integration_type: Optional[str] = None
    provider: Optional[str] = None
    configuration: dict = Field(default_factory=dict)
    credentials: dict = Field(default_factory=dict)
    webhook_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled_features: List[str] = Field(default_factory=list)
    meta_data: dict = Field(default_factory=dict)
    # Enhanced Authentication Fields
    auth_type: str = Field(default="api_key", description="Authentication type")
    auth_config: dict = Field(default_factory=dict, description="Authentication configuration")
    # Sync Configuration Fields
    sync_interval_minutes: int = Field(default=60, ge=1, description="Sync interval in minutes")
    retry_policy: dict = Field(default_factory=lambda: {"max_retries": 3, "backoff_factor": 2}, description="Retry policy configuration")
    # Health Monitoring Fields
    health_check_url: Optional[str] = Field(None, description="Health check endpoint URL")

    @validator('auth_type')
    def validate_auth_type(cls, v):
        """Validate authentication type."""
        valid_auth_types = [auth_type.value for auth_type in AuthenticationType]
        if v not in valid_auth_types:
            raise ValueError(f"auth_type must be one of: {', '.join(valid_auth_types)}")
        return v

    @validator('auth_config')
    def validate_auth_config(cls, v, values):
        """Validate authentication configuration based on auth_type."""
        auth_type = values.get('auth_type', 'api_key')
        
        if auth_type == AuthenticationType.USERNAME_PASSWORD.value:
            required_fields = ['username_field', 'password_field']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f"auth_config must contain '{field}' for username_password authentication")
        
        elif auth_type == AuthenticationType.OAUTH2.value:
            required_fields = ['client_id', 'client_secret', 'authorization_url', 'token_url']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f"auth_config must contain '{field}' for oauth2 authentication")
        
        elif auth_type == AuthenticationType.BEARER_TOKEN.value:
            if 'token_field' not in v:
                raise ValueError("auth_config must contain 'token_field' for bearer_token authentication")
        
        elif auth_type == AuthenticationType.BASIC_AUTH.value:
            required_fields = ['username_field', 'password_field']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f"auth_config must contain '{field}' for basic_auth authentication")
        
        return v

    @validator('retry_policy')
    def validate_retry_policy(cls, v):
        """Validate retry policy configuration."""
        if 'max_retries' in v and (not isinstance(v['max_retries'], int) or v['max_retries'] < 0):
            raise ValueError("retry_policy.max_retries must be a non-negative integer")
        if 'backoff_factor' in v and (not isinstance(v['backoff_factor'], (int, float)) or v['backoff_factor'] < 1):
            raise ValueError("retry_policy.backoff_factor must be a number >= 1")
        return v


class IntegrationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = None
    configuration: Optional[dict] = None
    credentials: Optional[dict] = None
    webhook_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled_features: Optional[List[str]] = None
    meta_data: Optional[dict] = None
    # Enhanced Authentication Fields
    auth_type: Optional[str] = Field(None, description="Authentication type")
    auth_config: Optional[dict] = Field(None, description="Authentication configuration")
    # Sync Configuration Fields
    sync_interval_minutes: Optional[int] = Field(None, ge=1, description="Sync interval in minutes")
    retry_policy: Optional[dict] = Field(None, description="Retry policy configuration")
    # Health Monitoring Fields
    health_check_url: Optional[str] = Field(None, description="Health check endpoint URL")

    @validator('auth_type')
    def validate_auth_type(cls, v):
        """Validate authentication type."""
        if v is not None:
            valid_auth_types = [auth_type.value for auth_type in AuthenticationType]
            if v not in valid_auth_types:
                raise ValueError(f"auth_type must be one of: {', '.join(valid_auth_types)}")
        return v

    @validator('auth_config')
    def validate_auth_config(cls, v, values):
        """Validate authentication configuration based on auth_type."""
        if v is not None:
            auth_type = values.get('auth_type')
            if auth_type is None:
                return v  # Skip validation if auth_type is not being updated
            
            if auth_type == AuthenticationType.USERNAME_PASSWORD.value:
                required_fields = ['username_field', 'password_field']
                for field in required_fields:
                    if field not in v:
                        raise ValueError(f"auth_config must contain '{field}' for username_password authentication")
            
            elif auth_type == AuthenticationType.OAUTH2.value:
                required_fields = ['client_id', 'client_secret', 'authorization_url', 'token_url']
                for field in required_fields:
                    if field not in v:
                        raise ValueError(f"auth_config must contain '{field}' for oauth2 authentication")
            
            elif auth_type == AuthenticationType.BEARER_TOKEN.value:
                if 'token_field' not in v:
                    raise ValueError("auth_config must contain 'token_field' for bearer_token authentication")
            
            elif auth_type == AuthenticationType.BASIC_AUTH.value:
                required_fields = ['username_field', 'password_field']
                for field in required_fields:
                    if field not in v:
                        raise ValueError(f"auth_config must contain '{field}' for basic_auth authentication")
        
        return v

    @validator('retry_policy')
    def validate_retry_policy(cls, v):
        """Validate retry policy configuration."""
        if v is not None:
            if 'max_retries' in v and (not isinstance(v['max_retries'], int) or v['max_retries'] < 0):
                raise ValueError("retry_policy.max_retries must be a non-negative integer")
            if 'backoff_factor' in v and (not isinstance(v['backoff_factor'], (int, float)) or v['backoff_factor'] < 1):
                raise ValueError("retry_policy.backoff_factor must be a number >= 1")
        return v


class IntegrationResponse(BaseModel):
    id: UUID
    name: str
    integration_type: Optional[str] = None
    provider: Optional[str] = None
    status: Optional[str] = None
    configuration: Optional[dict] = None
    webhook_url: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    sync_status: Optional[str] = None
    sync_error: Optional[str] = None
    enabled_features: Optional[List[str]] = None
    meta_data: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    # Enhanced Authentication Fields
    auth_type: Optional[str] = None
    auth_config: Optional[dict] = None
    # Sync Configuration Fields
    sync_interval_minutes: Optional[int] = None
    retry_policy: Optional[dict] = None
    # Health Monitoring Fields
    health_check_url: Optional[str] = None
    last_health_check: Optional[datetime] = None
    # Credentials are write-only — never returned in responses
    credentials_configured: bool = False

    class Config:
        from_attributes = True

    @classmethod
    def from_integration(cls, integration) -> "IntegrationResponse":
        """Build response from ORM object, masking sensitive fields."""
        data = {
            "id": integration.id,
            "name": integration.name,
            "integration_type": integration.integration_type,
            "provider": integration.provider,
            "status": integration.status,
            "configuration": integration.configuration,
            "webhook_url": integration.webhook_url,
            "last_sync_at": integration.last_sync_at,
            "sync_status": integration.sync_status,
            "sync_error": integration.sync_error,
            "enabled_features": integration.enabled_features,
            "meta_data": integration.meta_data,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
            "auth_type": integration.auth_type,
            "auth_config": {
                k: ("****" if any(s in k.lower() for s in ("password", "secret", "token", "key")) else v)
                for k, v in (integration.auth_config or {}).items()
            },
            "sync_interval_minutes": integration.sync_interval_minutes,
            "retry_policy": integration.retry_policy,
            "health_check_url": integration.health_check_url,
            "last_health_check": getattr(integration, "last_health_check", None),
            "credentials_configured": bool(integration.credentials or integration.api_key),
        }
        return cls(**data)


class IntegrationTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class IntegrationSyncResult(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    synced_at: datetime


class AvailableIntegration(BaseModel):
    provider: str
    name: str
    category: str
    description: str
    required_config: List[str]
    required_credentials: List[str]
    features: List[str]
    auth_type: str
    auth_config: dict


class WebhookPayload(BaseModel):
    data: Dict[str, Any]


class TicketCreate(BaseModel):
    title: str
    description: str
    priority: Optional[str] = "medium"
    project: Optional[str] = None
    issue_type: Optional[str] = "Task"


class MessageSend(BaseModel):
    channel: Optional[str] = None
    to: Optional[List[str]] = None
    subject: Optional[str] = None
    text: str
    html: Optional[bool] = False


# =============================================================================
# AVAILABLE INTEGRATIONS CATALOG
# =============================================================================

INTEGRATION_CATALOG = {
    # Monitoring Tools
    "prometheus": {
        "name": "Prometheus",
        "category": "monitoring",
        "description": "Open-source monitoring and alerting toolkit",
        "required_config": ["url"],
        "required_credentials": [],
        "features": ["alerts", "metrics", "queries"],
        "auth_type": "bearer_token",
        "auth_config": {"token_field": "token"}
    },
    "grafana": {
        "name": "Grafana",
        "category": "monitoring",
        "description": "Analytics and interactive visualization platform",
        "required_config": ["url"],
        "required_credentials": ["api_key"],
        "features": ["dashboards", "alerts", "annotations"],
        "auth_type": "api_key",
        "auth_config": {"api_key_field": "api_key", "header_name": "Authorization"}
    },
    "datadog": {
        "name": "Datadog",
        "category": "monitoring",
        "description": "Cloud monitoring and security platform",
        "required_config": ["site"],
        "required_credentials": ["api_key", "app_key"],
        "features": ["monitors", "events", "metrics"],
        "auth_type": "api_key",
        "auth_config": {"api_key_field": "api_key", "app_key_field": "app_key"}
    },
    "newrelic": {
        "name": "New Relic",
        "category": "monitoring",
        "description": "Application performance monitoring",
        "required_config": [],
        "required_credentials": ["api_key"],
        "features": ["applications", "alerts", "insights"],
        "auth_type": "api_key",
        "auth_config": {"api_key_field": "api_key", "header_name": "X-Api-Key"}
    },

    # Automation Tools
    "stackstorm": {
        "name": "StackStorm",
        "category": "automation",
        "description": "Event-driven automation platform for runbook automation, auto-remediation, and ChatOps",
        "required_config": ["url"],
        "required_credentials": ["api_key"],
        "features": ["actions", "workflows", "rules", "sensors", "executions"],
        "auth_type": "api_key",
        "auth_config": {"api_key_field": "api_key", "header_name": "St2-Api-Key"}
    },

    # Ticketing Tools
    "servicenow": {
        "name": "ServiceNow",
        "category": "ticketing",
        "description": "Enterprise IT service management",
        "required_config": ["instance"],
        "required_credentials": ["username", "password"],
        "features": ["incidents", "changes", "problems", "cmdb"],
        "auth_type": "username_password",
        "auth_config": {"username_field": "username", "password_field": "password", "auth_url": "/api/now/auth"}
    },
    "jira": {
        "name": "Jira",
        "category": "ticketing",
        "description": "Project tracking and issue management",
        "required_config": ["domain", "project"],
        "required_credentials": ["email", "api_token"],
        "features": ["issues", "projects", "sprints"],
        "auth_type": "basic_auth",
        "auth_config": {"username_field": "email", "password_field": "api_token"}
    },
    "zendesk": {
        "name": "Zendesk",
        "category": "ticketing",
        "description": "Customer service and engagement platform",
        "required_config": ["subdomain"],
        "required_credentials": ["email", "api_token"],
        "features": ["tickets", "users", "organizations"],
        "auth_type": "basic_auth",
        "auth_config": {"username_field": "email", "password_field": "api_token"}
    },

    # CI/CD Tools
    "jenkins": {
        "name": "Jenkins",
        "category": "cicd",
        "description": "Open-source automation server",
        "required_config": ["url"],
        "required_credentials": ["username", "api_token"],
        "features": ["jobs", "builds", "pipelines"],
        "auth_type": "basic_auth",
        "auth_config": {"username_field": "username", "password_field": "api_token"}
    },
    "gitlab": {
        "name": "GitLab CI",
        "category": "cicd",
        "description": "GitLab CI/CD pipelines",
        "required_config": ["url", "project_id"],
        "required_credentials": ["access_token"],
        "features": ["pipelines", "jobs", "deployments"],
        "auth_type": "bearer_token",
        "auth_config": {"token_field": "access_token"}
    },
    "github": {
        "name": "GitHub Actions",
        "category": "cicd",
        "description": "GitHub CI/CD workflows",
        "required_config": ["owner", "repo"],
        "required_credentials": ["access_token"],
        "features": ["workflows", "runs", "artifacts"],
        "auth_type": "bearer_token",
        "auth_config": {"token_field": "access_token"}
    },

    # Communication Tools
    "email": {
        "name": "Email (SMTP)",
        "category": "communication",
        "description": "Email notifications via SMTP",
        "required_config": ["smtp_host", "smtp_port", "from_email"],
        "required_credentials": ["username", "password"],
        "features": ["send_email"],
        "auth_type": "username_password",
        "auth_config": {"username_field": "username", "password_field": "password"}
    },
    "slack": {
        "name": "Slack",
        "category": "communication",
        "description": "Team messaging and collaboration",
        "required_config": [],
        "required_credentials": ["bot_token"],
        "features": ["messages", "channels", "reactions"],
        "auth_type": "bearer_token",
        "auth_config": {"token_field": "bot_token"}
    },
    "teams": {
        "name": "Microsoft Teams",
        "category": "communication",
        "description": "Microsoft Teams notifications",
        "required_config": ["webhook_url"],
        "required_credentials": [],
        "features": ["messages", "cards"],
        "auth_type": "api_key",
        "auth_config": {}
    },
    "webhook": {
        "name": "Webhook",
        "category": "communication",
        "description": "Generic HTTP webhook integration",
        "required_config": ["url", "method"],
        "required_credentials": [],
        "features": ["send"],
        "auth_type": "custom",
        "auth_config": {}
    },
    "sms": {
        "name": "SMS (Twilio)",
        "category": "communication",
        "description": "SMS notifications via Twilio",
        "required_config": ["from_number"],
        "required_credentials": ["account_sid", "auth_token"],
        "features": ["send_sms"],
        "auth_type": "basic_auth",
        "auth_config": {"username_field": "account_sid", "password_field": "auth_token"}
    }
}


# =============================================================================
# INTEGRATION CRUD ENDPOINTS
# =============================================================================

@router.get("/available", response_model=List[AvailableIntegration])
async def list_available_integrations(
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_current_user)
):
    """List all available integration types."""
    result = []
    for provider, info in INTEGRATION_CATALOG.items():
        if category and info["category"] != category:
            continue
        result.append(AvailableIntegration(
            provider=provider,
            name=info["name"],
            category=info["category"],
            description=info["description"],
            required_config=info["required_config"],
            required_credentials=info["required_credentials"],
            features=info["features"],
            auth_type=info["auth_type"],
            auth_config=info["auth_config"]
        ))
    return result


@router.get("/templates", response_model=Dict[str, Any])
async def list_integration_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    provider: Optional[str] = Query(None, description="Get specific provider template"),
    current_user: User = Depends(get_current_user)
):
    """List integration provider templates with configuration requirements."""
    try:
        if provider:
            # Get specific provider template
            template = IntegrationTemplateManager.get_template_dict(provider)
            if not template:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Template not found for provider: {provider}"
                )
            return {"provider": provider, "template": template}
        
        # Get all templates or filtered by category
        if category:
            from app.services.integration_templates import IntegrationCategory
            try:
                cat_enum = IntegrationCategory(category)
                templates = IntegrationTemplateManager.get_templates_by_category(cat_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid category: {category}"
                )
        else:
            templates = IntegrationTemplateManager.get_all_templates()
        
        # Convert to dict format
        result = {}
        for provider_name, template in templates.items():
            result[provider_name] = template.to_dict()
        
        return {"templates": result, "categories": IntegrationTemplateManager.get_provider_categories()}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing integration templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve integration templates"
        )


@router.post("/templates/{provider}/validate", response_model=Dict[str, Any])
async def validate_integration_configuration(
    provider: str,
    config_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Validate integration configuration against provider template."""
    try:
        template = IntegrationTemplateManager.get_template(provider)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template not found for provider: {provider}"
            )
        
        # Separate config and credentials
        config = config_data.get("configuration", {})
        credentials = config_data.get("credentials", {})
        
        # Validate configuration
        config_validation = IntegrationTemplateManager.validate_configuration(provider, config)
        
        # Validate credentials
        cred_validation = IntegrationTemplateManager.validate_credentials(provider, credentials)
        
        # Combine results
        all_errors = config_validation["errors"] + cred_validation["errors"]
        all_warnings = config_validation["warnings"] + cred_validation["warnings"]
        
        is_valid = len(all_errors) == 0
        
        return {
            "valid": is_valid,
            "errors": all_errors,
            "warnings": all_warnings,
            "provider": provider,
            "template_info": {
                "name": template.name,
                "category": template.category.value,
                "auth_type": template.auth_type,
                "required_config": template.required_config,
                "required_auth": template.required_auth
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating integration configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate integration configuration"
        )


@router.get("/templates/{provider}/populate", response_model=Dict[str, Any])
async def populate_integration_template(
    provider: str,
    current_user: User = Depends(get_current_user)
):
    """Get integration template with default values populated."""
    try:
        template = IntegrationTemplateManager.get_template(provider)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template not found for provider: {provider}"
            )
        
        # Populate with defaults
        populated_config = IntegrationTemplateManager.populate_template_defaults(provider)
        
        return {
            "provider": provider,
            "template": template.to_dict(),
            "populated_config": populated_config,
            "help_text": template.help_text
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error populating integration template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to populate integration template"
        )


@router.post("", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def create_integration(
    integration_data: IntegrationCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new integration."""
    try:
        # If provider is specified, validate against template and populate defaults
        if integration_data.provider:
            template = IntegrationTemplateManager.get_template(integration_data.provider)
            if template:
                # Validate configuration against template
                config_validation = IntegrationTemplateManager.validate_configuration(
                    integration_data.provider, 
                    integration_data.configuration
                )
                cred_validation = IntegrationTemplateManager.validate_credentials(
                    integration_data.provider, 
                    integration_data.credentials
                )
                
                # Check for validation errors
                all_errors = config_validation["errors"] + cred_validation["errors"]
                if all_errors:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Integration configuration validation failed",
                            "errors": all_errors,
                            "warnings": config_validation["warnings"] + cred_validation["warnings"]
                        }
                    )
                
                # Populate template defaults if not already set
                populated_config = IntegrationTemplateManager.populate_template_defaults(
                    integration_data.provider,
                    {
                        "auth_type": integration_data.auth_type,
                        "auth_config": integration_data.auth_config,
                        "sync_interval_minutes": integration_data.sync_interval_minutes,
                        "retry_policy": integration_data.retry_policy,
                        "health_check_url": integration_data.health_check_url
                    }
                )
                
                # Update integration data with populated values
                if not integration_data.auth_type or integration_data.auth_type == "api_key":
                    integration_data.auth_type = populated_config.get("auth_type", integration_data.auth_type)
                if not integration_data.auth_config:
                    integration_data.auth_config = populated_config.get("auth_config", integration_data.auth_config)
                if not integration_data.health_check_url:
                    integration_data.health_check_url = populated_config.get("health_check_url")

        new_integration = Integration(
            name=integration_data.name,
            integration_type=integration_data.integration_type,
            provider=integration_data.provider,
            status=IntegrationStatus.ACTIVE.value,
            configuration=integration_data.configuration,
            credentials=integration_data.credentials,
            webhook_url=integration_data.webhook_url,
            api_key=integration_data.api_key,
            enabled_features=integration_data.enabled_features,
            meta_data=integration_data.meta_data,
            # Enhanced Authentication Fields
            auth_type=integration_data.auth_type,
            auth_config=integration_data.auth_config,
            # Sync Configuration Fields
            sync_interval_minutes=integration_data.sync_interval_minutes,
            retry_policy=integration_data.retry_policy,
            # Health Monitoring Fields
            health_check_url=integration_data.health_check_url
        )

        db.add(new_integration)
        db.commit()
        db.refresh(new_integration)

        logger.info(f"Integration created: {integration_data.name} by user {current_user.id}")

        return IntegrationResponse.from_integration(new_integration)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create integration"
        )


@router.get("", response_model=List[IntegrationResponse])
async def list_integrations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    integration_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List integrations with filtering and pagination."""
    try:
        query = db.query(Integration)

        if integration_type:
            query = query.filter(Integration.integration_type == integration_type)
        if category:
            # Map category to providers
            providers = [p for p, info in INTEGRATION_CATALOG.items() if info["category"] == category]
            if providers:
                query = query.filter(Integration.provider.in_(providers))
        if status_filter:
            query = query.filter(Integration.status == status_filter)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Integration.name.ilike(search_term),
                    Integration.provider.ilike(search_term)
                )
            )

        # Filter by current user's client for multi-tenant isolation
        if hasattr(current_user, 'client_id') and current_user.client_id:
            query = query.filter(
                or_(
                    Integration.client_id == current_user.client_id,
                    Integration.client_id.is_(None)
                )
            )

        query = query.order_by(Integration.created_at.desc())
        integrations = query.offset(skip).limit(limit).all()

        return [IntegrationResponse.from_integration(i) for i in integrations]

    except Exception as e:
        logger.error(f"Error listing integrations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve integrations"
        )


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get integration by ID."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )

        return IntegrationResponse.from_integration(integration)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve integration"
        )


@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: UUID,
    integration_data: IntegrationUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update an integration."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )

        # If provider exists and configuration/credentials are being updated, validate against template
        if integration.provider:
            template = IntegrationTemplateManager.get_template(integration.provider)
            if template:
                # Get current values for validation
                current_config = integration.configuration or {}
                current_creds = integration.credentials or {}
                
                # Update with new values if provided
                if integration_data.configuration is not None:
                    current_config.update(integration_data.configuration)
                if integration_data.credentials is not None:
                    current_creds.update(integration_data.credentials)
                
                # Validate updated configuration
                config_validation = IntegrationTemplateManager.validate_configuration(
                    integration.provider, 
                    current_config
                )
                cred_validation = IntegrationTemplateManager.validate_credentials(
                    integration.provider, 
                    current_creds
                )
                
                # Check for validation errors
                all_errors = config_validation["errors"] + cred_validation["errors"]
                if all_errors:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Integration configuration validation failed",
                            "errors": all_errors,
                            "warnings": config_validation["warnings"] + cred_validation["warnings"]
                        }
                    )

        update_data = integration_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(integration, field, value)

        from sqlalchemy.orm.attributes import flag_modified
        if 'configuration' in update_data:
            flag_modified(integration, 'configuration')
        if 'credentials' in update_data:
            flag_modified(integration, 'credentials')
        if 'enabled_features' in update_data:
            flag_modified(integration, 'enabled_features')
        if 'meta_data' in update_data:
            flag_modified(integration, 'meta_data')
        if 'auth_config' in update_data:
            flag_modified(integration, 'auth_config')
        if 'retry_policy' in update_data:
            flag_modified(integration, 'retry_policy')

        db.commit()
        db.refresh(integration)

        logger.info(f"Integration updated: {integration.name} by user {current_user.id}")

        return IntegrationResponse.from_integration(integration)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update integration"
        )


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete an integration (soft delete)."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )

        integration.status = IntegrationStatus.INACTIVE.value
        db.commit()

        logger.info(f"Integration deleted: {integration.name} by user {current_user.id}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete integration"
        )


# =============================================================================
# INTEGRATION ACTIONS
# =============================================================================

@router.post("/{integration_id}/test", response_model=IntegrationTestResult)
async def test_integration_connection(
    integration_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test integration connection."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )

        # Get the integration service
        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}

        # Add webhook_url and api_key to config if set
        if integration.webhook_url:
            config["webhook_url"] = integration.webhook_url
        if integration.api_key:
            credentials["api_key"] = integration.api_key

        integration_service = IntegrationFactory.get_integration(provider, config, credentials)

        if not integration_service:
            return IntegrationTestResult(
                success=False,
                message=f"Unknown integration provider: {provider}"
            )

        result = await integration_service.test_connection()

        # Update integration status based on test result
        if result.get("success"):
            integration.status = IntegrationStatus.ACTIVE.value
            integration.sync_error = None
        else:
            integration.status = IntegrationStatus.ERROR.value
            integration.sync_error = result.get("message")

        db.commit()

        logger.info(f"Integration test: {integration.name} - {'success' if result.get('success') else 'failed'}")

        return IntegrationTestResult(
            success=result.get("success", False),
            message=result.get("message", ""),
            details=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing integration connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to test integration connection"
        )


@router.post("/{integration_id}/sync", response_model=IntegrationSyncResult)
async def sync_integration(
    integration_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger integration sync."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )

        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}

        if integration.webhook_url:
            config["webhook_url"] = integration.webhook_url
        if integration.api_key:
            credentials["api_key"] = integration.api_key

        integration_service = IntegrationFactory.get_integration(provider, config, credentials)

        if not integration_service:
            return IntegrationSyncResult(
                success=False,
                message=f"Unknown integration provider: {provider}",
                synced_at=datetime.now(timezone.utc)
            )

        result = await integration_service.sync()

        # Process alerts and create incidents for Prometheus/Grafana
        incidents_created = 0
        alerts_processed = 0
        
        if result.get("success") and provider in ["prometheus", "grafana"]:
            try:
                # Helper functions
                def generate_fingerprint(labels: Dict[str, Any]) -> str:
                    """Generate fingerprint from labels."""
                    label_str = json.dumps(sorted(labels.items()), sort_keys=True)
                    return hashlib.sha256(label_str.encode()).hexdigest()
                
                def map_severity(severity_str: str) -> AlertSeverity:
                    """Map severity string to enum."""
                    severity_lower = severity_str.lower()
                    if severity_lower in ['critical', 'error']:
                        return AlertSeverity.CRITICAL
                    elif severity_lower in ['high']:
                        return AlertSeverity.HIGH
                    elif severity_lower in ['warning', 'warn']:
                        return AlertSeverity.WARNING
                    elif severity_lower in ['info', 'information']:
                        return AlertSeverity.LOW
                    else:
                        return AlertSeverity.MEDIUM
                
                def map_severity_to_priority(severity: AlertSeverity) -> IncidentPriority:
                    """Map alert severity to incident priority."""
                    mapping = {
                        AlertSeverity.CRITICAL: IncidentPriority.CRITICAL,
                        AlertSeverity.HIGH: IncidentPriority.HIGH,
                        AlertSeverity.MEDIUM: IncidentPriority.MEDIUM,
                        AlertSeverity.LOW: IncidentPriority.LOW,
                    }
                    return mapping.get(severity, IncidentPriority.MEDIUM)
                
                def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
                    """Parse datetime string."""
                    if not dt_str:
                        return None
                    try:
                        if dt_str.endswith('Z'):
                            dt_str = dt_str[:-1] + '+00:00'
                        return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    except Exception:
                        return datetime.now(timezone.utc)
                
                def generate_incident_number(db: Session) -> str:
                    """Generate incident number."""
                    from sqlalchemy import func
                    result = db.query(func.max(Incident.number)).scalar()
                    if result:
                        try:
                            if "INC-" in result:
                                num = int(result.replace("INC-", ""))
                                return f"INC-{num + 1:06d}"
                            else:
                                num_str = result.replace("INC", "")
                                num = int(num_str) + 1
                                return f"INC{num:07d}"
                        except (ValueError, AttributeError):
                            pass
                    incident_count = db.query(Incident).count() + 1
                    return f"INC-{incident_count:06d}"
                
                alerts_data = result.get("alerts", [])
                if not alerts_data and result.get("alerts_count", 0) > 0:
                    # If sync returned alerts_count but no alerts array, try to get from data
                    alerts_data = result.get("data", {}).get("alerts", [])
                
                logger.info(f"Processing {len(alerts_data)} alerts from {provider} sync. Result keys: {list(result.keys())}")
                
                if not alerts_data:
                    logger.warning(f"No alerts found in sync result. Result: {json.dumps(result, default=str)[:500]}")
                
                for alert_data in alerts_data:
                    try:
                        # Handle different alert formats
                        if isinstance(alert_data, dict):
                            labels = alert_data.get("labels", {})
                            annotations = alert_data.get("annotations", {})
                            alert_status = alert_data.get("status", "firing")
                            starts_at = alert_data.get("startsAt") or alert_data.get("starts_at")
                            
                            fingerprint = labels.get("fingerprint") or generate_fingerprint(labels)
                            alert_name = labels.get("alertname") or labels.get("alertName") or "Unknown Alert"
                            severity_str = labels.get("severity", "warning")
                            severity = map_severity(severity_str)
                            message = annotations.get("description") or annotations.get("summary") or f"Alert: {alert_name}"
                            
                            # Check if alert already exists
                            existing_alert = db.query(MonitoringAlert).filter(
                                MonitoringAlert.fingerprint == fingerprint
                            ).first()
                            
                            if alert_status in ["firing", "alerting"]:
                                if existing_alert:
                                    existing_alert.status = AlertStatus.FIRING.value
                                    existing_alert.severity = severity.value
                                    existing_alert.message = message
                                    existing_alert.labels = labels
                                    existing_alert.annotations = annotations
                                    existing_alert.starts_at = parse_datetime(starts_at) if starts_at else datetime.now(timezone.utc)
                                    existing_alert.ends_at = None
                                    monitoring_alert = existing_alert
                                else:
                                    monitoring_alert = MonitoringAlert(
                                        integration_id=integration.id,
                                        name=alert_name,
                                        severity=severity.value,
                                        status=AlertStatus.FIRING.value,
                                        source=provider,
                                        message=message,
                                        labels=labels,
                                        annotations=annotations,
                                        fingerprint=fingerprint,
                                        starts_at=parse_datetime(starts_at) if starts_at else datetime.now(timezone.utc)
                                    )
                                    db.add(monitoring_alert)
                                    db.flush()
                                
                                alerts_processed += 1
                                logger.debug(f"Processing alert: {alert_name}, fingerprint: {fingerprint}, status: {alert_status}")
                                
                                # Auto-create incident if not already linked
                                if not monitoring_alert.incident_id:
                                    # Check if incident already exists by external_id
                                    existing_incident = db.query(Incident).filter(
                                        Incident.external_id == fingerprint
                                    ).first()
                                    
                                    if not existing_incident:
                                        try:
                                            incident = Incident(
                                                number=generate_incident_number(db),
                                                title=f"[Alert] {alert_name}",
                                                description=f"{message}\n\nSource: {provider.capitalize()}\nSeverity: {severity_str}\nFingerprint: {fingerprint}\n\nLabels: {json.dumps(labels, indent=2)}",
                                                status=IncidentStatus.NEW.value,
                                                priority=map_severity_to_priority(severity).value,
                                                source=provider.capitalize(),
                                                alert_rule=alert_name,
                                                external_id=fingerprint,
                                                custom_fields={
                                                    "alert_id": str(monitoring_alert.id),
                                                    "integration_id": str(integration.id),
                                                    "fingerprint": fingerprint,
                                                    "labels": labels,
                                                    "annotations": annotations,
                                                    "auto_created": True
                                                }
                                            )
                                            db.add(incident)
                                            db.flush()
                                            
                                            monitoring_alert.incident_id = incident.id
                                            incidents_created += 1
                                            logger.info(f"✅ Auto-created incident {incident.number} from {provider} alert {alert_name}")
                                        except Exception as incident_error:
                                            logger.error(f"❌ Failed to create incident for alert {alert_name}: {incident_error}")
                                            logger.error(f"   Alert data: {json.dumps(alert_data, default=str)[:200]}")
                                    else:
                                        # Link to existing incident
                                        monitoring_alert.incident_id = existing_incident.id
                                        logger.info(f"🔗 Linked alert to existing incident {existing_incident.number}")
                                else:
                                    logger.debug(f"Alert {alert_name} already linked to incident {monitoring_alert.incident_id}")
                    except Exception as e:
                        logger.error(f"Error processing alert during sync: {e}")
                        continue
                
                if incidents_created > 0 or alerts_processed > 0:
                    logger.info(f"Sync processed {alerts_processed} alerts and created {incidents_created} incidents")
            except Exception as e:
                logger.error(f"Error processing alerts during sync: {e}")

        # Update sync status
        integration.last_sync_at = datetime.now(timezone.utc)
        if result.get("success"):
            integration.sync_status = "success"
            integration.sync_error = None
        else:
            integration.sync_status = "error"
            integration.sync_error = result.get("message")

        db.commit()

        sync_message = result.get("message", "Sync completed")
        if incidents_created > 0:
            sync_message += f". Created {incidents_created} incidents from {alerts_processed} alerts."

        logger.info(f"Integration sync: {integration.name} - {'success' if result.get('success') else 'failed'}")

        return IntegrationSyncResult(
            success=result.get("success", False),
            message=sync_message,
            data={
                **result,
                "incidents_created": incidents_created,
                "alerts_processed": alerts_processed
            },
            synced_at=datetime.now(timezone.utc)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync integration"
        )


# =============================================================================
# TICKETING ACTIONS
# =============================================================================

@router.post("/{integration_id}/tickets", response_model=Dict[str, Any])
async def create_ticket(
    integration_id: UUID,
    ticket_data: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a ticket in external ticketing system."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")

        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}

        integration_service = IntegrationFactory.get_integration(provider, config, credentials)

        if not integration_service:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown provider: {provider}")

        # Call appropriate method based on provider
        if provider == "servicenow":
            result = await integration_service.create_incident({
                "short_description": ticket_data.title,
                "description": ticket_data.description,
                "urgency": ticket_data.priority
            })
        elif provider == "jira":
            project = ticket_data.project or config.get("project", "")
            result = await integration_service.create_issue(
                project, ticket_data.title, ticket_data.description, ticket_data.issue_type
            )
        elif provider == "zendesk":
            result = await integration_service.create_ticket(
                ticket_data.title, ticket_data.description, ticket_data.priority
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider doesn't support ticket creation")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# CI/CD ACTIONS
# =============================================================================

@router.post("/{integration_id}/trigger", response_model=Dict[str, Any])
async def trigger_build(
    integration_id: UUID,
    job_name: Optional[str] = Query(None),
    ref: str = Query("main"),
    parameters: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger a CI/CD build or pipeline."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")

        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}

        integration_service = IntegrationFactory.get_integration(provider, config, credentials)

        if not integration_service:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown provider: {provider}")

        if provider == "jenkins":
            if not job_name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="job_name is required for Jenkins")
            result = await integration_service.trigger_build(job_name, parameters)
        elif provider == "gitlab":
            result = await integration_service.trigger_pipeline(ref, parameters)
        elif provider == "github":
            workflow_id = config.get("workflow_id", "")
            if not workflow_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="workflow_id not configured")
            result = await integration_service.trigger_workflow(workflow_id, ref, parameters)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider doesn't support build triggering")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering build: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# COMMUNICATION ACTIONS
# =============================================================================

@router.post("/{integration_id}/send", response_model=Dict[str, Any])
async def send_message(
    integration_id: UUID,
    message: MessageSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message via communication integration."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")

        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}

        if integration.webhook_url:
            config["webhook_url"] = integration.webhook_url

        integration_service = IntegrationFactory.get_integration(provider, config, credentials)

        if not integration_service:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown provider: {provider}")

        if provider == "email":
            if not message.to:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'to' is required for email")
            result = await integration_service.send_email(
                message.to, message.subject or "Notification", message.text, message.html
            )
        elif provider == "slack":
            if not message.channel:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'channel' is required for Slack")
            result = await integration_service.send_message(message.channel, message.text)
        elif provider == "teams":
            result = await integration_service.send_message(message.subject or "Notification", message.text)
        elif provider == "sms":
            if not message.to or len(message.to) == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'to' is required for SMS")
            result = await integration_service.send_sms(message.to[0], message.text)
        elif provider == "webhook":
            result = await integration_service.send({"text": message.text, "subject": message.subject})
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider doesn't support messaging")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# WEBHOOK RECEIVER
# =============================================================================

@router.post("/{integration_id}/webhook", response_model=Dict[str, Any])
async def receive_webhook(
    integration_id: UUID,
    payload: WebhookPayload,
    x_webhook_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Receive webhook from external integration. Requires valid webhook secret or API key."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")

        # Validate webhook authentication
        expected_secret = (integration.credentials or {}).get("webhook_secret") or integration.api_key
        if expected_secret:
            if not x_webhook_secret or x_webhook_secret != expected_secret:
                logger.warning(f"Webhook auth failed for integration {integration.name}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or missing webhook secret"
                )
        else:
            logger.warning(f"Webhook received for integration {integration.name} with no secret configured — consider adding one")

        logger.info(f"Webhook received for integration {integration.name}")

        # Get the integration service
        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}

        if integration.webhook_url:
            config["webhook_url"] = integration.webhook_url
        if integration.api_key:
            credentials["api_key"] = integration.api_key

        integration_service = IntegrationFactory.get_integration(provider, config, credentials)

        if not integration_service:
            return {"success": False, "message": f"Unknown integration provider: {provider}", "details": {}}

        # Process webhook based on provider
        result = await integration_service.process_webhook(payload.data)

        return {"success": result.get("success", False), "message": result.get("message", "Webhook processed"), "details": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# MONITORING ACTIONS
# =============================================================================

@router.post("/{integration_id}/query", response_model=Dict[str, Any])
async def execute_query(
    integration_id: UUID,
    query: str = Query(..., description="Query to execute"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a query on monitoring integration (e.g., PromQL for Prometheus)."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")

        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}

        integration_service = IntegrationFactory.get_integration(provider, config, credentials)

        if not integration_service:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown provider: {provider}")

        if provider == "prometheus" and hasattr(integration_service, 'query'):
            result = await integration_service.query(query)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider doesn't support queries")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing query: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
