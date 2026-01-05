"""
Structured logging configuration using structlog.
"""
import logging
import structlog
from typing import Any
from app.core.config import settings


def configure_logging():
    """Configure structured logging for the application."""
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if settings.log_format == "json" 
            else structlog.dev.ConsoleRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.log_level.upper()),
    )


def get_logger(name: str = None) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


# Application logger
logger = get_logger(__name__)


class LoggerMixin:
    """Mixin to add logging capabilities to classes."""
    
    @property
    def logger(self) -> structlog.BoundLogger:
        """Get logger for this class."""
        return get_logger(self.__class__.__name__)


def log_request(request_id: str, method: str, path: str, **kwargs):
    """Log HTTP request."""
    logger.info(
        "HTTP request",
        request_id=request_id,
        method=method,
        path=path,
        **kwargs
    )


def log_response(request_id: str, status_code: int, duration_ms: float, **kwargs):
    """Log HTTP response."""
    logger.info(
        "HTTP response",
        request_id=request_id,
        status_code=status_code,
        duration_ms=duration_ms,
        **kwargs
    )


def log_error(error: Exception, context: dict = None, **kwargs):
    """Log application error."""
    logger.error(
        "Application error",
        error=str(error),
        error_type=type(error).__name__,
        context=context or {},
        **kwargs
    )


def log_security_event(event_type: str, user_id: str = None, **kwargs):
    """Log security-related events."""
    logger.warning(
        "Security event",
        event_type=event_type,
        user_id=user_id,
        **kwargs
    )