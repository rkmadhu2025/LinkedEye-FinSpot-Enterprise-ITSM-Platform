"""
Rate limiting middleware for API endpoints.
"""
from typing import Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from app.core.redis import redis_client
from app.core.config import settings
from app.core.logging import get_logger
import time

logger = get_logger(__name__)


class RateLimiter:
    """Rate limiter using Redis."""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.enabled = getattr(settings, 'rate_limit_enabled', True)
    
    async def __call__(self, request: Request, call_next: Callable):
        """Rate limiting middleware."""
        if not self.enabled:
            return await call_next(request)
        
        # Get client identifier
        client_id = self._get_client_id(request)
        
        # Check rate limit
        if not await self._check_rate_limit(client_id):
            logger.warning(f"Rate limit exceeded for {client_id}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        response = await call_next(request)
        return response
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier."""
        # Try to get user ID from token if available
        # Otherwise use IP address
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"rate_limit:{ip}"
    
    async def _check_rate_limit(self, client_id: str) -> bool:
        """Check if client has exceeded rate limit."""
        try:
            if not redis_client:
                return True  # Allow if Redis is not available
            
            key = f"{client_id}:{int(time.time() / 60)}"
            current = redis_client.incr(key)
            
            if current == 1:
                redis_client.expire(key, 60)
            
            return current <= self.requests_per_minute
        
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return True  # Allow on error to prevent blocking


# Global rate limiter instance
rate_limiter = RateLimiter(requests_per_minute=getattr(settings, 'rate_limit_per_minute', 60))
