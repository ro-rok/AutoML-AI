"""
Structured logging utility for observability.
"""
import logging
import json
import time
import psutil
from datetime import datetime
from typing import Optional, Dict, Any
from contextvars import ContextVar
from functools import wraps

# Context variables for request tracking
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
session_id_var: ContextVar[Optional[str]] = ContextVar('session_id', default=None)
job_id_var: ContextVar[Optional[str]] = ContextVar('job_id', default=None)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)

logger = logging.getLogger(__name__)


class StructuredLogger:
    """Structured logger with context support."""
    
    @staticmethod
    def _get_memory_usage() -> Dict[str, float]:
        """Get current memory usage in MB."""
        process = psutil.Process()
        memory_info = process.memory_info()
        return {
            "rss_mb": memory_info.rss / 1024 / 1024,
            "vms_mb": memory_info.vms / 1024 / 1024,
        }
    
    @staticmethod
    def _build_log_entry(
        level: str,
        message: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Build structured log entry."""
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "message": message,
        }
        
        # Add context variables
        request_id = request_id_var.get()
        if request_id:
            entry["request_id"] = request_id
        
        session_id = session_id_var.get()
        if session_id:
            entry["session_id"] = session_id
        
        job_id = job_id_var.get()
        if job_id:
            entry["job_id"] = job_id
        
        # Add additional fields
        entry.update(kwargs)
        
        return entry
    
    @staticmethod
    def info(message: str, **kwargs):
        """Log info message."""
        entry = StructuredLogger._build_log_entry("INFO", message, **kwargs)
        logger.info(json.dumps(entry))
    
    @staticmethod
    def error(message: str, **kwargs):
        """Log error message."""
        entry = StructuredLogger._build_log_entry("ERROR", message, **kwargs)
        logger.error(json.dumps(entry))
    
    @staticmethod
    def warning(message: str, **kwargs):
        """Log warning message."""
        entry = StructuredLogger._build_log_entry("WARNING", message, **kwargs)
        logger.warning(json.dumps(entry))
    
    @staticmethod
    def operation_start(operation: str, **kwargs):
        """Log operation start with memory snapshot."""
        memory = StructuredLogger._get_memory_usage()
        StructuredLogger.info(
            f"Operation started: {operation}",
            operation=operation,
            memory_start=memory,
            **kwargs
        )
    
    @staticmethod
    def operation_end(operation: str, duration_ms: float, **kwargs):
        """Log operation end with memory snapshot and duration."""
        memory = StructuredLogger._get_memory_usage()
        StructuredLogger.info(
            f"Operation completed: {operation}",
            operation=operation,
            duration_ms=duration_ms,
            memory_end=memory,
            **kwargs
        )


def log_operation(operation_name: str):
    """
    Decorator to log operation timing and memory usage.
    
    Usage:
        @log_operation("train_model")
        def train_model(...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            StructuredLogger.operation_start(operation_name)
            
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                StructuredLogger.operation_end(operation_name, duration_ms, status="success")
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                StructuredLogger.operation_end(
                    operation_name,
                    duration_ms,
                    status="error",
                    error=str(e)
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            StructuredLogger.operation_start(operation_name)
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                StructuredLogger.operation_end(operation_name, duration_ms, status="success")
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                StructuredLogger.operation_end(
                    operation_name,
                    duration_ms,
                    status="error",
                    error=str(e)
                )
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Export convenience functions
log = StructuredLogger
