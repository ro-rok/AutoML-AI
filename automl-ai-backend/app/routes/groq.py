from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List
from ..utils.groq_assistant import build_prompt, stream_groq_response
from .upload import session_store
import os, json
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

class GroqRequest(BaseModel):
    session_id: str
    question: str
    page: str

@router.post("/suggest")
async def suggest(req: GroqRequest):
    print("Incoming payload:", req)

    if req.session_id not in session_store:
        raise HTTPException(404, "Invalid session_id")
    api_key = os.getenv("GROQ_API_KEY") or ""
    if not api_key:
        raise HTTPException(500, "GROQ_API_KEY not set")

    # merge in full session metadata
    try:
        data = session_store[req.session_id]["data"]
        meta = session_store[req.session_id]["meta"]

        messages = build_prompt(
                    req.page, 
                    data,
                    meta['steps'],
                    meta['target_column'],
                    req.question,
                )

        buffer: List[str] = []
        async for piece in stream_groq_response(api_key, messages):
            buffer.append(piece)

        full_answer = "".join(buffer).strip()
        
        session_store[req.session_id]["meta"].setdefault("tips", {}).setdefault(req.page, []).append(full_answer)
        return {"answer": full_answer}
    except Exception as e:
        print(f"Error in suggest: {e}")
        raise HTTPException(500, "Error in suggest" + str(e))