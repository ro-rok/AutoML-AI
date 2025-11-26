from fastapi import APIRouter, Query
from app.utils.mongodb_client import get_user_jobs
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/history")
async def user_history(user_id: str = Query(...)):
    try:
        jobs = get_user_jobs(user_id)
        return JSONResponse(content=jobs)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
