"""
Input validation utilities.
"""
from typing import Any, Optional
from pydantic import validator, BaseModel
import re
from ipaddress import ip_address, AddressValueError


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_ip_address(ip: str) -> bool:
    """Validate IP address format."""
    try:
        ip_address(ip)
        return True
    except AddressValueError:
        return False


def validate_hostname(hostname: str) -> bool:
    """Validate hostname format."""
    if len(hostname) > 253:
        return False
    
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
    return bool(re.match(pattern, hostname))


def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
    """Sanitize string input."""
    # Remove null bytes and trim whitespace
    sanitized = value.replace('\x00', '').strip()
    
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def validate_uuid(uuid_string: str) -> bool:
    """Validate UUID format."""
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, uuid_string.lower()))


class PaginationParams(BaseModel):
    """Pagination parameters."""
    skip: int = 0
    limit: int = 100
    
    @validator('skip')
    def validate_skip(cls, v):
        if v < 0:
            raise ValueError('skip must be >= 0')
        return v
    
    @validator('limit')
    def validate_limit(cls, v):
        if v < 1:
            raise ValueError('limit must be >= 1')
        if v > 1000:
            raise ValueError('limit must be <= 1000')
        return v
