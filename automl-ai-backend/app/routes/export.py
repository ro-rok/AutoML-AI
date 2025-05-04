import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.utils.export_utils import generate_pdf, generate_ipynb
from .upload import session_store
from fastapi import BackgroundTasks


router = APIRouter()


class ExportRequest(BaseModel):
    session_id: str


@router.post("/pdf")
async def export_pdf(payload: ExportRequest, background_tasks: BackgroundTasks):
    try:
        if payload.session_id not in session_store:
            raise HTTPException(status_code=404, detail="Session not found.")
        session_data = session_store[payload.session_id]
        path = generate_pdf(payload.session_id, session_data)
        background_tasks.add_task(os.remove, path)
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf", background=background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")


@router.post("/ipynb")
async def export_ipynb(payload: ExportRequest):
    try:
        if payload.session_id not in session_store:
            raise HTTPException(status_code=404, detail="Session not found.")
        session_data = session_store[payload.session_id]
        path = generate_ipynb(payload.session_id, session_data)
        BackgroundTasks.add_task(os.remove, path)
        return FileResponse(path, filename=os.path.basename(path), media_type="application/json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Notebook generation failed: {e}")
