"""
Application configuration management using Pydantic settings.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator
import os


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    app_name: str = "ITSM Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "production"
    
    # Database
    database_url: str
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "itsm_platform"
    database_user: str
    database_password: str
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
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
    
    @validator("database_url", pre=True)
    def build_database_url(cls, v, values):
        if v:
            return v
        return (
            f"postgresql://{values.get('database_user')}:"
            f"{values.get('database_password')}@"
            f"{values.get('database_host')}:"
            f"{values.get('database_port')}/"
            f"{values.get('database_name')}"
        )
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()