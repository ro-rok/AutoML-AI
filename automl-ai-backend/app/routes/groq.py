from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict
from app.utils.groq_assistant import build_prompt, stream_groq_response
import os

router = APIRouter()

class GroqRequest(BaseModel):
    step: str
    metadata: Dict

@router.post("/suggest")
async def get_suggestions(request: Request, body: GroqRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"error": "GROQ_API_KEY not set"}

    messages = build_prompt(body.step, body.metadata)

    async def response_generator():
        async for chunk in stream_groq_response(api_key, messages):
            yield chunk

    return StreamingResponse(response_generator(), media_type="text/event-stream")
