"""
Application configuration management using Pydantic settings.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator
import os
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    app_name: str = "ITSM Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # Database
    database_url: Optional[str] = None
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "itsm_platform"
    database_user: str = "itsm_user"
    database_password: str = "itsm_password"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    # JWT - defaults to a secure random key if not provided (should be set in production)
    jwt_secret_key: str = "REPLACE_WITH_STRONG_RANDOM_SECRET_MIN_64_CHARS"  # MUST override via JWT_SECRET_KEY env var
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # Domain Configuration
    frontend_domain: str = "fs-le-dev-inc.finspot.in"
    backend_api_domain: str = "fs-le-dev-inc.api.finspot.in"

    # CORS and Security
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "https://fs-le-dev-inc.finspot.in"
    ]
    allowed_hosts: List[str] = [
        "localhost",
        "127.0.0.1",
        "fs-le-dev-inc.finspot.in"
    ]
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # Monitoring
    prometheus_enabled: bool = True
    prometheus_port: int = 9090
    
    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60
    
    # Database Pool
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_pool_recycle: int = 3600
    db_pool_pre_ping: bool = True

    # Email Configuration (SMTP)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: str = "noreply@linkedeye.finspot.in"
    smtp_from_name: str = "LinkedEye ITSM"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False

    # AWS SES Configuration (Alternative to SMTP)
    aws_ses_enabled: bool = False
    aws_ses_region: Optional[str] = None
    aws_ses_access_key: Optional[str] = None
    aws_ses_secret_key: Optional[str] = None

    # Notification Settings
    notification_batch_size: int = 100
    notification_retry_attempts: int = 3
    notification_retry_delay: int = 300  # seconds
    notification_digest_enabled: bool = True

    # Application URL (for email links)
    app_url: str = "https://fs-le-dev-inc.finspot.in"

    # AI Chat Configuration
    ai_enabled: bool = True  # Set to True to enable AI chat
    ai_provider: str = "claude"  # Primary: "openai", "azure", "claude", "ollama"
    ai_fallback_provider: Optional[str] = "ollama"  # Fallback provider if primary fails

    # OpenAI Configuration
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4"
    openai_temperature: float = 0.7
    openai_max_tokens: int = 500

    # Azure OpenAI Configuration
    azure_openai_api_key: Optional[str] = None
    azure_openai_endpoint: Optional[str] = None
    azure_openai_deployment: str = "gpt-4"
    azure_openai_api_version: str = "2024-02-15-preview"

    # Claude (Anthropic) Configuration
    anthropic_api_key: Optional[str] = None
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 1024

    # Ollama Configuration (Local LLM or Open WebUI)
    ollama_base_url: str = "https://chat.finspot.in"
    ollama_model: str = "llama3.2:latest"  # Change to your preferred model
    ollama_temperature: float = 0.7
    ollama_api_key: Optional[str] = None  # Required for Open WebUI authentication

    # Integration Resilience Settings
    integration_ssl_verify: bool = True  # Enable SSL verification for integrations
    integration_timeout_seconds: int = 30  # Default timeout for integration calls
    integration_max_retries: int = 3  # Maximum retry attempts
    integration_retry_base_delay: float = 1.0  # Base delay for exponential backoff
    integration_circuit_breaker_threshold: int = 5  # Failures before circuit opens
    integration_circuit_breaker_timeout: int = 30  # Seconds before half-open
    integration_rate_limit_per_second: float = 10.0  # Rate limit for external APIs
    integration_max_concurrent_requests: int = 10  # Max concurrent requests per integration

    # Internal SSL Settings (for internal services in K8s)
    internal_ssl_verify: bool = False  # Internal K8s services may use self-signed certs

    # Twilio Configuration (for SMS and Voice notifications)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None  # Your Twilio phone number
    twilio_api_key_sid: Optional[str] = None  # Optional: API Key SID for enhanced security
    twilio_api_key_secret: Optional[str] = None  # Optional: API Key Secret
    twilio_enabled: bool = True  # Enable/disable Twilio notifications
    twilio_default_notification_phone: Optional[str] = None  # Default phone for alerts

    # Voice Assistant Configuration
    voice_webhook_base_url: Optional[str] = None  # Public URL for Twilio callbacks (e.g., ngrok or production URL)
    voice_call_timeout: int = 30  # Ring timeout in seconds
    voice_max_retries: int = 3  # Maximum call retry attempts
    voice_retry_delay: int = 300  # Delay between retries in seconds
    voice_auto_call_priorities: str = "critical,high"  # Priorities that trigger automatic calls

    # Voice Agent Service Configuration (External Microservice)
    voice_agent_enabled: bool = True  # Enable external voice agent service
    voice_agent_url: str = "http://voice-agent:8001"  # URL of voice agent service
    voice_agent_service_token: str = "shared-secret-token-change-me"  # Shared token for service-to-service auth
    voice_agent_timeout: int = 30  # Timeout for voice agent requests
    voice_agent_ws_token_secret: str = "ws-token-secret-change-me"  # Secret for signing WebSocket tokens

    @validator("app_url", pre=True, always=True)
    def build_app_url(cls, v, values):
        """Build app URL from frontend domain if not explicitly set."""
        if v and v != "https://fs-le-dev-inc.finspot.in":
            return v
        if "frontend_domain" in values and values["frontend_domain"]:
            return f"https://{values['frontend_domain']}"
        return v
    
    @validator("allowed_origins", "allowed_hosts", pre=True)
    def parse_comma_separated_list(cls, v):
        if isinstance(v, str):
            # Handle JSON array format: ["http://localhost:3000","http://localhost:5173"]
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Handle comma-separated format: http://localhost:3000,http://localhost:5173
            return [item.strip().strip('"\'') for item in v.split(",")]
        return v

    @validator("allowed_origins")
    def add_domain_origins(cls, v, values):
        """Add configured domains to allowed origins."""
        domains = []
        if "frontend_domain" in values and values["frontend_domain"]:
            domains.append(f"https://{values['frontend_domain']}")
        if "backend_api_domain" in values and values["backend_api_domain"]:
            domains.append(f"https://{values['backend_api_domain']}")
        return list(set(v + domains))  # Remove duplicates

    @validator("allowed_hosts")
    def add_domain_hosts(cls, v, values):
        """Add configured domains to allowed hosts."""
        domains = []
        if "frontend_domain" in values and values["frontend_domain"]:
            domains.append(values["frontend_domain"])
        if "backend_api_domain" in values and values["backend_api_domain"]:
            domains.append(values["backend_api_domain"])
        return list(set(v + domains))  # Remove duplicates
    
    @validator("jwt_secret_key")
    def validate_jwt_secret(cls, v, values):
        """Warn about placeholder JWT secret in production but don't fail."""
        env = values.get("environment", "production")
        if env == "production" and v == "REPLACE_WITH_STRONG_RANDOM_SECRET_MIN_64_CHARS":
            logger.warning(
                "WARNING: Using default JWT_SECRET_KEY. "
                "Set a secure secret in production with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        return v

    @validator("database_url", pre=True, always=True)
    def build_database_url(cls, v, values):
        if v:
            return v
        # Build from components with defaults
        user = values.get('database_user') or 'itsm_user'
        password = values.get('database_password') or 'itsm_password'
        host = values.get('database_host') or 'localhost'
        port = values.get('database_port') or 5432
        name = values.get('database_name') or 'itsm_platform'
        return f"postgresql://{user}:{password}@{host}:{port}/{name}"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Log domain configuration for debugging
logger.info(f"Domain configuration - Frontend domain: {settings.frontend_domain}")
logger.info(f"Domain configuration - Backend API domain: {settings.backend_api_domain}")
logger.info(f"Domain configuration - Allowed origins: {settings.allowed_origins}")
logger.info(f"Domain configuration - Allowed hosts: {settings.allowed_hosts}")
logger.info(f"Domain configuration - App URL: {settings.app_url}")