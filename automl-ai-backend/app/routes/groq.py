from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from ..utils.groq_assistant import build_prompt, stream_groq_response
from app.utils.mongodb_client import get_session
from app.utils.logger import log
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()


class AssistantRequest(BaseModel):
    session_id: str
    prompt: str
    context: Optional[dict] = None


@router.post("/suggest")
async def suggest(req: AssistantRequest):
    """
    Stream AI assistant suggestions token-by-token.
    
    Requirements: 12.1, 12.2, 12.6, 14.10
    """
    log.info(f"Assistant request for session {req.session_id}")
    
    # Get session from MongoDB
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Your session may have expired."
        )
    
    # Get API key
    api_key = os.getenv("GROQ_API_KEY") or ""
    if not api_key:
        log.error("GROQ_API_KEY not set")
        raise HTTPException(
            status_code=500,
            detail="AI assistant is not configured. Please contact support."
        )

    try:
        # Get data from session
        data = session.get("data", [])
        if not data and "dataset" in session:
            data = session["dataset"].get("sample_rows", [])
        
        df = pd.DataFrame(data) if data else pd.DataFrame()
        
        # Get metadata
        meta = session.get("meta", {})
        steps = meta.get("steps", {})
        
        # Get dataset info
        dataset_info = session.get("dataset", {})
        target_column = dataset_info.get("target_column", meta.get('target_column', ''))
        
        # Get current step from context
        current_step = req.context.get("currentStep", "upload") if req.context else "upload"
        
        # Build prompt
        messages = build_prompt(
            current_step,
            df,
            steps,
            target_column,
            req.prompt,
        )
        
        # Stream response
        async def generate():
            try:
                async for token in stream_groq_response(api_key, messages):
                    yield f"data: {token}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                log.error(f"Error streaming response: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except Exception as e:
        log.error(f"Error in suggest: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Assistant error: {str(e)}"
        )