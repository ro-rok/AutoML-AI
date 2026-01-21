import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.utils.export_utils import generate_pdf, generate_ipynb
from app.utils.mongodb_client import get_session
from app.utils.logger import log


router = APIRouter()


class ExportConfig(BaseModel):
    """Configuration for export customization"""
    include_sections: Optional[Dict[str, bool]] = None
    selected_model: Optional[str] = None
    branding: Optional[Dict[str, Any]] = None


class ExportRequest(BaseModel):
    session_id: str
    config: Optional[ExportConfig] = None


@router.post("/pdf")
async def export_pdf(payload: ExportRequest, background_tasks: BackgroundTasks):
    """
    Generate a multi-page PDF report with charts and summaries.
    
    Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 14.8
    """
    try:
        log.info(f"PDF export requested for session {payload.session_id}")
        
        # Get session from MongoDB
        session = get_session(payload.session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Session not found. Your session may have expired. Please start a new pipeline."
            )
        
        # Set default config if not provided
        config = payload.config or ExportConfig()
        if not config.include_sections:
            config.include_sections = {
                "datasetSummary": True,
                "edaCharts": True,
                "cleaningSummary": True,
                "transformSummary": True,
                "modelEvaluation": True,
                "featureImportance": True,
            }
        
        # Generate PDF
        path = generate_pdf(payload.session_id, session, config.dict())
        
        # Check file size (10MB limit)
        file_size = os.path.getsize(path)
        if file_size > 10 * 1024 * 1024:  # 10MB
            os.remove(path)
            raise HTTPException(
                status_code=413,
                detail="PDF file size exceeds 10MB limit. Try excluding some sections."
            )
        
        log.info(f"PDF generated successfully: {path} ({file_size} bytes)")
        
        # Schedule cleanup
        background_tasks.add_task(os.remove, path)
        
        return FileResponse(
            path,
            filename=os.path.basename(path),
            media_type="application/pdf",
            background=background_tasks
        )
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"PDF generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {str(e)}"
        )


@router.post("/notebook")
async def export_notebook(payload: ExportRequest, background_tasks: BackgroundTasks):
    """
    Generate a runnable Jupyter notebook with executable cells for each pipeline step.
    
    Requirements: 11.1, 11.2, 11.7, 14.9
    """
    try:
        log.info(f"Notebook export requested for session {payload.session_id}")
        
        # Get session from MongoDB
        session = get_session(payload.session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Session not found. Your session may have expired. Please start a new pipeline."
            )
        
        # Set default config if not provided
        config = payload.config or ExportConfig()
        
        # Generate notebook
        path = generate_ipynb(payload.session_id, session, config.dict())
        
        # Check file size (5MB limit)
        file_size = os.path.getsize(path)
        if file_size > 5 * 1024 * 1024:  # 5MB
            os.remove(path)
            raise HTTPException(
                status_code=413,
                detail="Notebook file size exceeds 5MB limit."
            )
        
        log.info(f"Notebook generated successfully: {path} ({file_size} bytes)")
        
        # Schedule cleanup
        background_tasks.add_task(os.remove, path)
        
        return FileResponse(
            path,
            filename=os.path.basename(path),
            media_type="application/x-ipynb+json",
            background=background_tasks
        )
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Notebook generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Notebook generation failed: {str(e)}"
        )
