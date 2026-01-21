# app/utils/cache.py
"""
In-memory caching utility for frequently accessed data.
Implements a simple TTL-based cache to reduce redundant computations.
"""
from typing import Any, Optional
from datetime import datetime, timedelta
import threading


class SimpleCache:
    """
    Thread-safe in-memory cache with TTL (Time To Live) support.
    Suitable for caching EDA results, schema data, and other frequently accessed data.
    """
    
    def __init__(self, default_ttl_seconds: int = 300):
        """
        Initialize cache with default TTL.
        
        Args:
            default_ttl_seconds: Default time-to-live in seconds (default: 300 = 5 minutes)
        """
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._lock = threading.Lock()
        self.default_ttl = default_ttl_seconds
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if it exists and hasn't expired.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value if found and not expired, None otherwise
        """
        with self._lock:
            if key not in self._cache:
                return None
            
            value, expiry = self._cache[key]
            
            # Check if expired
            if datetime.utcnow() > expiry:
                del self._cache[key]
                return None
            
            return value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """
        Set value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Time-to-live in seconds (uses default if not specified)
        """
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expiry = datetime.utcnow() + timedelta(seconds=ttl)
        
        with self._lock:
            self._cache[key] = (value, expiry)
    
    def delete(self, key: str) -> None:
        """
        Delete value from cache.
        
        Args:
            key: Cache key
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cached values."""
        with self._lock:
            self._cache.clear()
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired entries from cache.
        
        Returns:
            Number of entries removed
        """
        now = datetime.utcnow()
        removed = 0
        
        with self._lock:
            expired_keys = [
                key for key, (_, expiry) in self._cache.items()
                if now > expiry
            ]
            
            for key in expired_keys:
                del self._cache[key]
                removed += 1
        
        return removed
    
    def size(self) -> int:
        """Get current cache size (number of entries)."""
        with self._lock:
            return len(self._cache)


# Global cache instance
# Used for caching EDA results, schema data, etc.
cache = SimpleCache(default_ttl_seconds=300)  # 5 minutes default TTL
