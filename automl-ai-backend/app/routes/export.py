from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List
from app.utils.export_utils import generate_pdf, generate_ipynb

router = APIRouter()

class ExportPDFRequest(BaseModel):
    session_id: str
    metadata: Dict
    metrics: Dict
    tips: List[str]

@router.post("/pdf")
async def export_pdf(payload: ExportPDFRequest):
    try:
        path = generate_pdf(payload.session_id, payload)
        return FileResponse(path, filename=path, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ExportIPYNBRequest(BaseModel):
    code_steps: List[str]

@router.post("/ipynb")
async def export_ipynb(payload: ExportIPYNBRequest):
    try:
        path = generate_ipynb(payload.code_steps)
        return FileResponse(path, filename=path, media_type="application/json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
