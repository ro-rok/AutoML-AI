from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from app.utils.mongodb_client import (
    get_session,
    update_session_target,
    extend_session,
    delete_session,
)

router = APIRouter()


class UpdateTargetRequest(BaseModel):
    target_column: str


class ExtendSessionRequest(BaseModel):
    days: int = 7


@router.get("/state")
async def get_session_state(session_id: str):
    """
    Get the current state of a session.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Returns:
        Session state including metadata, schema, and expiration
    """
    session = get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Your session may have expired. Please start a new pipeline."
        )
    
    return JSONResponse(content=session)


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
