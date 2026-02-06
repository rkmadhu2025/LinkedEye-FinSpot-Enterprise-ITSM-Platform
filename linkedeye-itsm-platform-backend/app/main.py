"""
Main FastAPI application for ITSM Platform.
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import uuid
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db, check_db_connection
from app.core.logging import configure_logging, get_logger, log_request, log_response, log_error
from app.core.redis import redis_client
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limit import rate_limiter
from app.api.auth import router as auth_router
from app.api.incidents import router as incidents_router
from app.api.changes import router as changes_router
from app.api.assets import router as assets_router
from app.api.users import router as users_router
from app.api.environments import router as environments_router
from app.api.dashboard import router as dashboard_router
from app.api.problems import router as problems_router
from app.api.alerts import router as alerts_router
from app.api.integrations import router as integrations_router
from app.api.oauth2 import router as oauth2_router
from app.api.groups import router as groups_router
from app.api.network_devices import router as network_devices_router
from app.api.network_topology import router as network_topology_router
from app.api.reports import router as reports_router
from app.api.analytics import router as analytics_router
from app.api.settings import router as settings_router
try:
    from app.api.notification_preferences import router as notification_preferences_router
except ImportError:
    notification_preferences_router = None
from app.api.alert_suppressions import router as alert_suppressions_router
from app.api.clients import router as clients_router
from app.api.on_call import router as on_call_router
from app.api.monitoring import router as monitoring_router
from app.api.infrastructure import router as infrastructure_router
from app.api.asset_workflow import router as asset_workflow_router
from app.api.chat import router as chat_router
from app.api.device_import import router as device_import_router
from app.api.user_preferences import router as user_preferences_router
from app.api.webhooks import router as webhooks_router
from app.api.device_templates import router as device_templates_router
from app.api.debug import router as debug_router
from app.api.metrics import router as metrics_router
from app.api.status_pages import router as status_pages_router, public_router as public_status_router
from app.api.postmortems import router as postmortems_router
from app.api.runbooks import router as runbooks_router
from app.api.alert_intelligence import router as alert_intelligence_router
from app.api.chatops import router as chatops_router
from app.api.sms import router as sms_router


# Configure logging
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting ITSM Platform API", version=settings.app_version)
    
    # Initialize database
    try:
        init_db()
        if check_db_connection():
            logger.info("Database connection established")
        else:
            logger.error("Database connection failed")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    
    # Check Redis connection
    try:
        if redis_client.ping():
            logger.info("Redis connection established")
        else:
            logger.error("Redis connection failed")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

    # Initialize Twilio service
    try:
        from app.services.twilio_service import twilio_service
        if settings.twilio_enabled and settings.twilio_account_sid:
            twilio_service.initialize(
                account_sid=settings.twilio_account_sid,
                auth_token=settings.twilio_auth_token,
                from_number=settings.twilio_from_number,
                api_key_sid=settings.twilio_api_key_sid,
                api_key_secret=settings.twilio_api_key_secret
            )
            logger.info("Twilio service initialized")
        else:
            logger.info("Twilio service disabled or not configured")
    except Exception as e:
        logger.error(f"Twilio initialization failed: {e}")

    yield
    
    # Shutdown
    logger.info("Shutting down ITSM Platform API")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Enterprise ITSM Platform API",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Add security headers middleware (before CORS)
app.add_middleware(SecurityHeadersMiddleware)



# Add rate limiting middleware
if settings.rate_limit_enabled:
    app.middleware("http")(rate_limiter)

# Add trusted host middleware for security
if not settings.debug:
    allowed_hosts = getattr(settings, 'allowed_hosts', ["localhost", "127.0.0.1"])
    if isinstance(allowed_hosts, str):
        allowed_hosts = [h.strip() for h in allowed_hosts.split(",")]
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts
    )


# Add CORS middleware (must be outer to RateLimit and TrustedHost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page", "X-Total-Pages", "X-Request-ID"],
)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log HTTP requests and responses."""
    # Generate request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Log request
    start_time = time.time()
    log_request(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        query_params=str(request.query_params),
        client_ip=request.client.host if request.client else None
    )
    
    try:
        # Process request
        response = await call_next(request)
        
        # Log response
        duration_ms = (time.time() - start_time) * 1000
        log_response(
            request_id=request_id,
            status_code=response.status_code,
            duration_ms=duration_ms
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    except Exception as e:
        # Log error
        duration_ms = (time.time() - start_time) * 1000
        log_error(e, context={"request_id": request_id, "duration_ms": duration_ms})
        
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
            headers={"X-Request-ID": request_id}
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    log_error(exc, context={"request_id": request_id, "path": request.url.path})
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
        headers={"X-Request-ID": request_id}
    )


# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check."""
    return {"status": "healthy", "version": settings.app_version}


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with dependencies."""
    health_status = {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": time.time(),
        "checks": {
            "database": check_db_connection(),
            "redis": redis_client.ping()
        }
    }
    
    # Determine overall status
    if not all(health_status["checks"].values()):
        health_status["status"] = "unhealthy"
    
    return health_status


@app.get("/api/v1/health")
async def api_health_check():
    """API versioned health check alias."""
    return await health_check()


# Include API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(incidents_router, prefix="/api/v1")
app.include_router(changes_router, prefix="/api/v1")
app.include_router(assets_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(environments_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(problems_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(integrations_router, prefix="/api/v1")
app.include_router(oauth2_router, prefix="/api/v1")
app.include_router(groups_router, prefix="/api/v1")
app.include_router(network_devices_router, prefix="/api/v1")
app.include_router(network_topology_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
if notification_preferences_router:
    app.include_router(notification_preferences_router, prefix="/api/v1")
app.include_router(alert_suppressions_router, prefix="/api/v1")
app.include_router(clients_router, prefix="/api/v1")
app.include_router(on_call_router, prefix="/api/v1")
app.include_router(monitoring_router, prefix="/api/v1")
app.include_router(infrastructure_router, prefix="/api/v1")
app.include_router(asset_workflow_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(device_import_router, prefix="/api/v1")
app.include_router(user_preferences_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(device_templates_router, prefix="/api/v1/device-templates")
if settings.debug:
    app.include_router(debug_router, prefix="/api/v1")
app.include_router(metrics_router, prefix="/api/v1")
app.include_router(status_pages_router, prefix="/api/v1")
app.include_router(public_status_router, prefix="/api/v1")
app.include_router(postmortems_router, prefix="/api/v1")
app.include_router(runbooks_router, prefix="/api/v1")
app.include_router(alert_intelligence_router, prefix="/api/v1")
app.include_router(chatops_router, prefix="/api/v1")
app.include_router(sms_router, prefix="/api/v1")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "docs_url": "/docs" if settings.debug else None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )