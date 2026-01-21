from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.utils.mongodb_client import (
    get_session,
    update_session_target,
    extend_session,
    delete_session,
    update_session_state,
)

router = APIRouter()


class UpdateTargetRequest(BaseModel):
    target_column: str


class ExtendSessionRequest(BaseModel):
    days: int = 7


class UpdateStateRequest(BaseModel):
    state_version: int
    updates: Dict[str, Any]


@router.get("/state")
async def get_session_state(session_id: str):
    """
    Get the current state of a session.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Returns:
        Full session state including metadata, schema, steps, operations log, and expiration
    """
    session = get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Your session may have expired. Please start a new pipeline."
        )
    
    # Return full session state as per design document
    return JSONResponse(content={
        "session_id": session.get("session_id"),
        "created_at": session.get("created_at"),
        "expires_at": session.get("expires_at"),
        "state_version": session.get("state_version", 1),
        "current_step": session.get("current_step", "upload"),
        "steps": session.get("steps", {}),
        "dataset": {
            "filename": session.get("filename"),
            "row_count": session.get("row_count"),
            "column_count": session.get("column_count"),
            "schema": session.get("schema", []),
            "target_column": session.get("target_column"),
            "sample_rows": []  # TODO: Add sample rows if needed
        },
        "operations_log": session.get("operations_log", []),
        "trained_models": session.get("trained_models", []),
        "selected_model_id": session.get("selected_model_id"),
    })


@router.put("/state")
async def update_state(session_id: str, request: UpdateStateRequest):
    """
    Update session state with version conflict detection.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Body:
        state_version: Expected current state version
        updates: Partial session state updates
    
    Returns:
        Success message with new state version
        
    Raises:
        409 Conflict: If state version is stale
        404 Not Found: If session doesn't exist
    """
    success, new_version, error = update_session_state(
        session_id,
        request.state_version,
        request.updates
    )
    
    if not success:
        if error == "SESSION_NOT_FOUND":
            raise HTTPException(
                status_code=404,
                detail="Session not found. Your session may have expired."
            )
        elif error == "STALE_STATE_VERSION":
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "STALE_STATE_VERSION",
                    "message": "Session state has been updated by another request",
                    "current_state_version": new_version,
                    "suggested_action": "Refresh session state and retry"
                }
            )
    
    return JSONResponse(content={
        "success": True,
        "new_state_version": new_version
    })


@router.put("/target")
async def update_target_column(session_id: str, request: UpdateTargetRequest):
    """
    Update the target column for a session.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Body:
        target_column: Name of the target column
    
    Returns:
        Success message
    """
    success = update_session_target(session_id, request.target_column)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Session not found or could not be updated."
        )
    
    return JSONResponse(content={
        "success": True,
        "message": "Target column updated successfully",
        "target_column": request.target_column,
    })


@router.post("/extend")
async def extend_session_expiration(session_id: str, request: ExtendSessionRequest):
    """
    Extend session expiration by specified number of days.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Body:
        days: Number of days to extend (default: 7)
    
    Returns:
        Success message with new expiration date
    """
    success = extend_session(session_id, request.days)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Session not found or could not be extended."
        )
    
    # Get updated session to return new expiration
    session = get_session(session_id)
    
    return JSONResponse(content={
        "success": True,
        "message": f"Session extended by {request.days} days",
        "expires_at": session.get("expires_at") if session else None,
    })


@router.post("/clear")
async def clear_session(session_id: str):
    """
    Clear/delete a session and all its data.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Returns:
        Success message
    """
    success = delete_session(session_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Session not found or could not be deleted."
        )
    
    return JSONResponse(content={
        "success": True,
        "message": "Session cleared successfully",
    })
