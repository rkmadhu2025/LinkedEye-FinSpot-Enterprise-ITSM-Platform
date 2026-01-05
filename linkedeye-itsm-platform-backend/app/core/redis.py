"""
Redis configuration and utilities for caching and session management.
"""
import redis
import json
from datetime import datetime
from typing import Any, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client wrapper with utility methods."""
    
    def __init__(self):
        self.redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis."""
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set value in Redis with optional expiration."""
        try:
            serialized_value = json.dumps(value, default=str)
            if expire:
                return self.redis_client.setex(key, expire, serialized_value)
            else:
                return self.redis_client.set(key, serialized_value)
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from Redis."""
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False
    
    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for key."""
        try:
            return bool(self.redis_client.expire(key, seconds))
        except Exception as e:
            logger.error(f"Redis EXPIRE error for key {key}: {e}")
            return False
    
    def ping(self) -> bool:
        """Check Redis connection health."""
        try:
            return self.redis_client.ping()
        except Exception as e:
            logger.error(f"Redis PING error: {e}")
            return False
    
    def flushdb(self) -> bool:
        """Flush current database (use with caution)."""
        try:
            return self.redis_client.flushdb()
        except Exception as e:
            logger.error(f"Redis FLUSHDB error: {e}")
            return False

    def incr(self, key: str) -> int:
        """Increment value of key."""
        try:
            return self.redis_client.incr(key)
        except Exception as e:
            logger.error(f"Redis INCR error for key {key}: {e}")
            return 0


# Global Redis client instance
redis_client = RedisClient()


def get_redis() -> RedisClient:
    """Dependency to get Redis client."""
    return redis_client


# Session management utilities
class SessionManager:
    """Manage user sessions in Redis."""
    
    def __init__(self, redis_client: RedisClient):
        self.redis = redis_client
        self.session_prefix = "session:"
        self.user_sessions_prefix = "user_sessions:"
    
    def create_session(self, user_id: str, session_data: dict, expire_seconds: int = 3600) -> str:
        """Create a new user session."""
        import uuid
        session_id = str(uuid.uuid4())
        session_key = f"{self.session_prefix}{session_id}"
        
        # Store session data
        session_data.update({
            "user_id": user_id,
            "created_at": str(datetime.utcnow()),
            "session_id": session_id
        })
        
        self.redis.set(session_key, session_data, expire_seconds)
        
        # Track user sessions
        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        user_sessions = self.redis.get(user_sessions_key) or []
        user_sessions.append(session_id)
        self.redis.set(user_sessions_key, user_sessions, expire_seconds)
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data."""
        session_key = f"{self.session_prefix}{session_id}"
        return self.redis.get(session_key)
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        session_key = f"{self.session_prefix}{session_id}"
        session_data = self.redis.get(session_key)
        
        if session_data:
            user_id = session_data.get("user_id")
            if user_id:
                # Remove from user sessions list
                user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
                user_sessions = self.redis.get(user_sessions_key) or []
                if session_id in user_sessions:
                    user_sessions.remove(session_id)
                    self.redis.set(user_sessions_key, user_sessions)
        
        return self.redis.delete(session_key)
    
    def delete_user_sessions(self, user_id: str) -> bool:
        """Delete all sessions for a user."""
        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        user_sessions = self.redis.get(user_sessions_key) or []
        
        # Delete all session keys
        for session_id in user_sessions:
            session_key = f"{self.session_prefix}{session_id}"
            self.redis.delete(session_key)
        
        # Delete user sessions list
        return self.redis.delete(user_sessions_key)


# Global session manager
session_manager = SessionManager(redis_client)