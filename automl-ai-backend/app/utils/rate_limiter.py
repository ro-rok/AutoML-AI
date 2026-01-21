# app/utils/rate_limiter.py
"""
Rate limiting utility for API endpoints.
Implements token bucket algorithm for rate limiting by session ID and IP address.
"""
from typing import Dict, Tuple
from datetime import datetime, timedelta
import threading


class RateLimiter:
    """
    Token bucket rate limiter with per-session and per-IP limits.
    """
    
    def __init__(self):
        """Initialize rate limiter with empty buckets."""
        # Format: {key: (tokens, last_refill_time)}
        self._buckets: Dict[str, Tuple[float, datetime]] = {}
        self._lock = threading.Lock()
    
    def _get_bucket_key(self, identifier: str, endpoint_type: str) -> str:
        """Generate bucket key from identifier and endpoint type."""
        return f"{endpoint_type}:{identifier}"
    
    def _refill_bucket(
        self,
        current_tokens: float,
        last_refill: datetime,
        max_tokens: int,
        refill_rate: float
    ) -> Tuple[float, datetime]:
        """
        Refill bucket based on time elapsed since last refill.
        
        Args:
            current_tokens: Current number of tokens in bucket
            last_refill: Last refill timestamp
            max_tokens: Maximum bucket capacity
            refill_rate: Tokens added per second
        
        Returns:
            Tuple of (new_token_count, current_time)
        """
        now = datetime.utcnow()
        elapsed = (now - last_refill).total_seconds()
        
        # Calculate tokens to add
        tokens_to_add = elapsed * refill_rate
        new_tokens = min(max_tokens, current_tokens + tokens_to_add)
        
        return (new_tokens, now)
    
    def check_rate_limit(
        self,
        identifier: str,
        endpoint_type: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, Dict[str, any]]:
        """
        Check if request is within rate limit.
        
        Args:
            identifier: Session ID or IP address
            endpoint_type: Type of endpoint (e.g., "upload", "other")
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
        
        Returns:
            Tuple of (is_allowed, rate_limit_info)
            rate_limit_info contains: limit, remaining, reset_time
        """
        bucket_key = self._get_bucket_key(identifier, endpoint_type)
        refill_rate = max_requests / window_seconds  # Tokens per second
        
        with self._lock:
            now = datetime.utcnow()
            
            # Get or create bucket
            if bucket_key not in self._buckets:
                self._buckets[bucket_key] = (max_requests, now)
            
            current_tokens, last_refill = self._buckets[bucket_key]
            
            # Refill bucket
            new_tokens, refill_time = self._refill_bucket(
                current_tokens,
                last_refill,
                max_requests,
                refill_rate
            )
            
            # Check if request can be allowed
            if new_tokens >= 1.0:
                # Allow request and consume token
                self._buckets[bucket_key] = (new_tokens - 1.0, refill_time)
                
                # Calculate reset time (when bucket will be full again)
                tokens_needed = max_requests - (new_tokens - 1.0)
                reset_seconds = tokens_needed / refill_rate
                reset_time = int((refill_time + timedelta(seconds=reset_seconds)).timestamp())
                
                return (True, {
                    "limit": max_requests,
                    "remaining": int(new_tokens - 1.0),
                    "reset": reset_time
                })
            else:
                # Rate limit exceeded
                # Calculate when next token will be available
                tokens_needed = 1.0 - new_tokens
                reset_seconds = tokens_needed / refill_rate
                reset_time = int((refill_time + timedelta(seconds=reset_seconds)).timestamp())
                
                return (False, {
                    "limit": max_requests,
                    "remaining": 0,
                    "reset": reset_time
                })
    
    def cleanup_old_buckets(self, max_age_seconds: int = 3600) -> int:
        """
        Remove buckets that haven't been used recently.
        
        Args:
            max_age_seconds: Maximum age in seconds (default: 1 hour)
        
        Returns:
            Number of buckets removed
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=max_age_seconds)
        removed = 0
        
        with self._lock:
            old_keys = [
                key for key, (_, last_refill) in self._buckets.items()
                if last_refill < cutoff
            ]
            
            for key in old_keys:
                del self._buckets[key]
                removed += 1
        
        return removed


# Global rate limiter instance
rate_limiter = RateLimiter()
