"""
Production-grade resilience patterns for external integrations.
Implements circuit breakers, retry with exponential backoff, and bulkhead patterns.
"""
import asyncio
import functools
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Callable, Any, Optional, Dict, Type
from dataclasses import dataclass, field
from collections import defaultdict
import logging
import httpx

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5          # Failures before opening
    success_threshold: int = 2          # Successes to close from half-open
    timeout_seconds: float = 30.0       # Time in open state before half-open
    excluded_exceptions: tuple = ()     # Exceptions that don't count as failures


@dataclass
class CircuitBreakerState:
    """State tracking for a circuit breaker."""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.

    Prevents cascading failures by stopping calls to failing services
    and allowing them time to recover.
    """

    _instances: Dict[str, 'CircuitBreaker'] = {}

    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitBreakerState()
        self._lock = asyncio.Lock()

    @classmethod
    def get_or_create(cls, name: str, config: Optional[CircuitBreakerConfig] = None) -> 'CircuitBreaker':
        """Get existing or create new circuit breaker by name."""
        if name not in cls._instances:
            cls._instances[name] = cls(name, config)
        return cls._instances[name]

    @classmethod
    def get_all_states(cls) -> Dict[str, Dict[str, Any]]:
        """Get states of all circuit breakers for monitoring."""
        return {
            name: {
                "state": cb.state.state.value,
                "failure_count": cb.state.failure_count,
                "success_count": cb.state.success_count,
                "last_failure": cb.state.last_failure_time.isoformat() if cb.state.last_failure_time else None,
            }
            for name, cb in cls._instances.items()
        }

    async def _check_state_transition(self):
        """Check if state should transition."""
        if self.state.state == CircuitState.OPEN:
            if self.state.last_failure_time:
                elapsed = (datetime.now(timezone.utc) - self.state.last_failure_time).total_seconds()
                if elapsed >= self.config.timeout_seconds:
                    logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN")
                    self.state.state = CircuitState.HALF_OPEN
                    self.state.success_count = 0

    async def can_execute(self) -> bool:
        """Check if request can proceed."""
        async with self._lock:
            await self._check_state_transition()

            if self.state.state == CircuitState.CLOSED:
                return True
            elif self.state.state == CircuitState.HALF_OPEN:
                return True  # Allow test request
            else:  # OPEN
                return False

    async def record_success(self):
        """Record successful call."""
        async with self._lock:
            self.state.last_success_time = datetime.now(timezone.utc)

            if self.state.state == CircuitState.HALF_OPEN:
                self.state.success_count += 1
                if self.state.success_count >= self.config.success_threshold:
                    logger.info(f"Circuit breaker '{self.name}' transitioning to CLOSED")
                    self.state.state = CircuitState.CLOSED
                    self.state.failure_count = 0
            elif self.state.state == CircuitState.CLOSED:
                # Reset failure count on success
                self.state.failure_count = 0

    async def record_failure(self, exception: Exception):
        """Record failed call."""
        # Check if exception is excluded
        if isinstance(exception, self.config.excluded_exceptions):
            return

        async with self._lock:
            self.state.failure_count += 1
            self.state.last_failure_time = datetime.now(timezone.utc)

            if self.state.state == CircuitState.HALF_OPEN:
                # Any failure in half-open goes back to open
                logger.warning(f"Circuit breaker '{self.name}' transitioning to OPEN (half-open test failed)")
                self.state.state = CircuitState.OPEN
            elif self.state.state == CircuitState.CLOSED:
                if self.state.failure_count >= self.config.failure_threshold:
                    logger.warning(f"Circuit breaker '{self.name}' transitioning to OPEN (threshold reached)")
                    self.state.state = CircuitState.OPEN


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open."""
    def __init__(self, circuit_name: str):
        self.circuit_name = circuit_name
        super().__init__(f"Circuit breaker '{circuit_name}' is OPEN - service unavailable")


def circuit_breaker(name: str, config: Optional[CircuitBreakerConfig] = None):
    """
    Decorator to wrap async functions with circuit breaker pattern.

    Usage:
        @circuit_breaker("prometheus_api")
        async def fetch_metrics():
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            cb = CircuitBreaker.get_or_create(name, config)

            if not await cb.can_execute():
                raise CircuitOpenError(name)

            try:
                result = await func(*args, **kwargs)
                await cb.record_success()
                return result
            except Exception as e:
                await cb.record_failure(e)
                raise

        return wrapper
    return decorator


@dataclass
class RetryConfig:
    """Configuration for retry with exponential backoff."""
    max_retries: int = 3
    base_delay: float = 1.0           # Initial delay in seconds
    max_delay: float = 60.0           # Maximum delay cap
    exponential_base: float = 2.0     # Backoff multiplier
    jitter: bool = True               # Add random jitter
    retryable_exceptions: tuple = (
        httpx.TimeoutException,
        httpx.ConnectError,
        httpx.ReadError,
        ConnectionError,
        TimeoutError,
    )
    retryable_status_codes: tuple = (429, 500, 502, 503, 504)


def retry_with_backoff(config: Optional[RetryConfig] = None):
    """
    Decorator for retry with exponential backoff.

    Usage:
        @retry_with_backoff(RetryConfig(max_retries=5))
        async def api_call():
            ...
    """
    cfg = config or RetryConfig()

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(cfg.max_retries + 1):
                try:
                    result = await func(*args, **kwargs)

                    # Check for retryable HTTP status codes
                    if isinstance(result, dict) and result.get("status_code") in cfg.retryable_status_codes:
                        if attempt < cfg.max_retries:
                            delay = _calculate_delay(attempt, cfg)
                            logger.warning(
                                f"Retryable status code {result.get('status_code')} "
                                f"from {func.__name__}, attempt {attempt + 1}/{cfg.max_retries + 1}, "
                                f"retrying in {delay:.2f}s"
                            )
                            await asyncio.sleep(delay)
                            continue

                    return result

                except cfg.retryable_exceptions as e:
                    last_exception = e

                    if attempt < cfg.max_retries:
                        delay = _calculate_delay(attempt, cfg)
                        logger.warning(
                            f"Retryable exception in {func.__name__}: {type(e).__name__}, "
                            f"attempt {attempt + 1}/{cfg.max_retries + 1}, "
                            f"retrying in {delay:.2f}s"
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"Max retries ({cfg.max_retries}) exceeded for {func.__name__}: {e}"
                        )
                        raise

                except Exception as e:
                    # Non-retryable exception
                    logger.error(f"Non-retryable exception in {func.__name__}: {type(e).__name__}: {e}")
                    raise

            if last_exception:
                raise last_exception

        return wrapper
    return decorator


def _calculate_delay(attempt: int, config: RetryConfig) -> float:
    """Calculate delay with exponential backoff and optional jitter."""
    import random

    delay = config.base_delay * (config.exponential_base ** attempt)
    delay = min(delay, config.max_delay)

    if config.jitter:
        # Add jitter: random value between 0 and 100% of delay
        jitter_amount = delay * random.random()
        delay = delay + jitter_amount

    return delay


class RateLimiter:
    """
    Token bucket rate limiter for external API calls.
    Prevents hitting API rate limits.
    """

    def __init__(
        self,
        rate: float,           # Tokens per second
        burst: int = 10,       # Maximum burst size
        name: str = "default"
    ):
        self.rate = rate
        self.burst = burst
        self.name = name
        self.tokens = float(burst)
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: int = 1) -> bool:
        """Acquire tokens, returns True if successful."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.last_update = now

            # Add tokens based on elapsed time
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    async def wait_for_token(self, tokens: int = 1):
        """Wait until tokens are available."""
        while not await self.acquire(tokens):
            await asyncio.sleep(0.1)


# Global rate limiters for common integrations
_rate_limiters: Dict[str, RateLimiter] = {}


def get_rate_limiter(name: str, rate: float = 10.0, burst: int = 20) -> RateLimiter:
    """Get or create a rate limiter by name."""
    if name not in _rate_limiters:
        _rate_limiters[name] = RateLimiter(rate=rate, burst=burst, name=name)
    return _rate_limiters[name]


def rate_limited(limiter_name: str, rate: float = 10.0, burst: int = 20):
    """
    Decorator to rate limit async functions.

    Usage:
        @rate_limited("prometheus", rate=5.0, burst=10)
        async def query_prometheus():
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            limiter = get_rate_limiter(limiter_name, rate, burst)
            await limiter.wait_for_token()
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class BulkheadFull(Exception):
    """Raised when bulkhead has no available slots."""
    pass


class Bulkhead:
    """
    Bulkhead pattern - limits concurrent calls to protect resources.
    """

    def __init__(self, max_concurrent: int = 10, name: str = "default"):
        self.max_concurrent = max_concurrent
        self.name = name
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._current = 0
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Acquire a slot."""
        acquired = self._semaphore.locked()
        if not acquired:
            async with self._lock:
                self._current += 1
        return await self._semaphore.acquire()

    def release(self):
        """Release a slot."""
        self._semaphore.release()
        asyncio.create_task(self._decrement())

    async def _decrement(self):
        async with self._lock:
            self._current = max(0, self._current - 1)

    @property
    def available(self) -> int:
        """Number of available slots."""
        return self.max_concurrent - self._current


_bulkheads: Dict[str, Bulkhead] = {}


def get_bulkhead(name: str, max_concurrent: int = 10) -> Bulkhead:
    """Get or create a bulkhead by name."""
    if name not in _bulkheads:
        _bulkheads[name] = Bulkhead(max_concurrent=max_concurrent, name=name)
    return _bulkheads[name]


def bulkhead(name: str, max_concurrent: int = 10, timeout: float = 30.0):
    """
    Decorator to limit concurrent executions.

    Usage:
        @bulkhead("external_api", max_concurrent=5)
        async def call_api():
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            bh = get_bulkhead(name, max_concurrent)

            try:
                await asyncio.wait_for(bh.acquire(), timeout=timeout)
            except asyncio.TimeoutError:
                raise BulkheadFull(f"Bulkhead '{name}' is full, max concurrent: {max_concurrent}")

            try:
                return await func(*args, **kwargs)
            finally:
                bh.release()

        return wrapper
    return decorator


def get_resilience_status() -> Dict[str, Any]:
    """Get status of all resilience components for monitoring."""
    return {
        "circuit_breakers": CircuitBreaker.get_all_states(),
        "rate_limiters": {
            name: {"tokens": rl.tokens, "rate": rl.rate, "burst": rl.burst}
            for name, rl in _rate_limiters.items()
        },
        "bulkheads": {
            name: {"available": bh.available, "max": bh.max_concurrent}
            for name, bh in _bulkheads.items()
        }
    }


class ResilientHttpClient:
    """
    HTTP client with built-in resilience patterns.

    Usage:
        client = ResilientHttpClient(
            base_url="https://api.example.com",
            circuit_name="example_api",
            verify_ssl=True
        )
        response = await client.get("/endpoint")
    """

    def __init__(
        self,
        base_url: str,
        circuit_name: Optional[str] = None,
        timeout: float = 30.0,
        verify_ssl: bool = True,
        retry_config: Optional[RetryConfig] = None,
        rate_limit: Optional[float] = None,  # Requests per second
        max_concurrent: int = 10,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        self.headers = headers or {}

        # Set up resilience components
        self.circuit_name = circuit_name or base_url
        self.circuit_breaker = CircuitBreaker.get_or_create(self.circuit_name) if circuit_name else None
        self.retry_config = retry_config or RetryConfig()
        self.rate_limiter = get_rate_limiter(self.circuit_name, rate_limit or 10.0) if rate_limit else None
        self.bulkhead = get_bulkhead(self.circuit_name, max_concurrent)

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make a resilient HTTP request."""
        url = f"{self.base_url}{path}"

        # Apply rate limiting
        if self.rate_limiter:
            await self.rate_limiter.wait_for_token()

        # Check circuit breaker
        if self.circuit_breaker and not await self.circuit_breaker.can_execute():
            raise CircuitOpenError(self.circuit_name)

        # Acquire bulkhead slot
        try:
            await asyncio.wait_for(self.bulkhead.acquire(), timeout=self.timeout)
        except asyncio.TimeoutError:
            raise BulkheadFull(f"Bulkhead '{self.circuit_name}' is full")

        last_exception = None

        try:
            for attempt in range(self.retry_config.max_retries + 1):
                try:
                    async with httpx.AsyncClient(
                        timeout=self.timeout,
                        verify=self.verify_ssl
                    ) as client:
                        # Merge headers
                        request_headers = {**self.headers, **kwargs.pop('headers', {})}

                        response = await client.request(
                            method,
                            url,
                            headers=request_headers,
                            **kwargs
                        )

                        # Check for retryable status codes
                        if response.status_code in self.retry_config.retryable_status_codes:
                            if attempt < self.retry_config.max_retries:
                                delay = _calculate_delay(attempt, self.retry_config)
                                logger.warning(
                                    f"Retryable status {response.status_code} from {url}, "
                                    f"retrying in {delay:.2f}s"
                                )
                                await asyncio.sleep(delay)
                                continue

                        # Record success
                        if self.circuit_breaker:
                            await self.circuit_breaker.record_success()

                        return {
                            "success": response.status_code < 400,
                            "status_code": response.status_code,
                            "data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                            "headers": dict(response.headers)
                        }

                except self.retry_config.retryable_exceptions as e:
                    last_exception = e

                    if attempt < self.retry_config.max_retries:
                        delay = _calculate_delay(attempt, self.retry_config)
                        logger.warning(f"Retryable error: {e}, retrying in {delay:.2f}s")
                        await asyncio.sleep(delay)
                    else:
                        if self.circuit_breaker:
                            await self.circuit_breaker.record_failure(e)
                        raise

        finally:
            self.bulkhead.release()

        if last_exception:
            raise last_exception

        return {"success": False, "error": "Unknown error"}

    async def get(self, path: str, **kwargs) -> Dict[str, Any]:
        """GET request."""
        return await self._request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs) -> Dict[str, Any]:
        """POST request."""
        return await self._request("POST", path, **kwargs)

    async def put(self, path: str, **kwargs) -> Dict[str, Any]:
        """PUT request."""
        return await self._request("PUT", path, **kwargs)

    async def patch(self, path: str, **kwargs) -> Dict[str, Any]:
        """PATCH request."""
        return await self._request("PATCH", path, **kwargs)

    async def delete(self, path: str, **kwargs) -> Dict[str, Any]:
        """DELETE request."""
        return await self._request("DELETE", path, **kwargs)
