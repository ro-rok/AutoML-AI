# app/utils/error_responses.py
"""
Standardized error response utilities for consistent API error handling.
All error responses follow the same format for better client-side handling.
"""
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any


class APIError(HTTPException):
    """
    Custom exception class for API errors with consistent format.
    """
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        suggested_action: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize API error.
        
        Args:
            status_code: HTTP status code
            error_code: Machine-readable error code (e.g., "SESSION_NOT_FOUND")
            message: Human-readable error message
            suggested_action: Suggested action for the user
            details: Additional error details
        """
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.suggested_action = suggested_action
        self.details = details or {}
        
        super().__init__(status_code=status_code, detail=self.to_dict())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary format."""
        error_dict = {
            "error": self.error_code,
            "message": self.message,
        }
        
        if self.suggested_action:
            error_dict["suggested_action"] = self.suggested_action
        
        if self.details:
            error_dict["details"] = self.details
        
        return error_dict


def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    suggested_action: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """
    Create a standardized error response.
    
    Args:
        status_code: HTTP status code
        error_code: Machine-readable error code
        message: Human-readable error message
        suggested_action: Suggested action for the user
        details: Additional error details
    
    Returns:
        JSONResponse with standardized error format
    """
    content = {
        "error": error_code,
        "message": message,
    }
    
    if suggested_action:
        content["suggested_action"] = suggested_action
    
    if details:
        content["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )


# Common error responses
def session_not_found_error(session_id: str) -> APIError:
    """Error for when session is not found."""
    return APIError(
        status_code=404,
        error_code="SESSION_NOT_FOUND",
        message="Session not found. Your session may have expired.",
        suggested_action="Please start a new pipeline",
        details={"session_id": session_id}
    )


def file_too_large_error(file_size_mb: float, max_size_mb: int = 100) -> APIError:
    """Error for when uploaded file is too large."""
    return APIError(
        status_code=400,
        error_code="FILE_TOO_LARGE",
        message=f"File too large ({file_size_mb:.1f}MB). Maximum size is {max_size_mb}MB.",
        suggested_action="Try reducing your dataset or sampling rows",
        details={"file_size_mb": file_size_mb, "max_size_mb": max_size_mb}
    )


def invalid_file_format_error(file_type: str) -> APIError:
    """Error for when file format is not supported."""
    return APIError(
        status_code=400,
        error_code="INVALID_FILE_FORMAT",
        message=f"Unsupported file format: {file_type}",
        suggested_action="Please upload CSV or XLSX files",
        details={"file_type": file_type}
    )


def training_timeout_error() -> APIError:
    """Error for when training takes too long."""
    return APIError(
        status_code=504,
        error_code="TRAINING_TIMEOUT",
        message="Training took longer than expected. This can happen on Heroku's free tier.",
        suggested_action="Try reducing your dataset size or disabling hyperparameter tuning"
    )


def memory_error() -> APIError:
    """Error for when operation runs out of memory."""
    return APIError(
        status_code=507,
        error_code="INSUFFICIENT_MEMORY",
        message="Not enough memory to complete this operation.",
        suggested_action="Try reducing your dataset size or selecting a simpler model"
    )


def validation_error(field: str, message: str) -> APIError:
    """Error for validation failures."""
    return APIError(
        status_code=422,
        error_code="VALIDATION_ERROR",
        message=f"Validation failed: {message}",
        suggested_action="Check your input and try again",
        details={"field": field}
    )


def internal_server_error(error_message: str) -> APIError:
    """Error for unexpected server errors."""
    return APIError(
        status_code=500,
        error_code="INTERNAL_SERVER_ERROR",
        message="Something went wrong on our end. We're looking into it.",
        suggested_action="Please try again in a moment",
        details={"error": error_message}
    )
