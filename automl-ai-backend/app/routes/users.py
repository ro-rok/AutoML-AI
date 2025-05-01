from fastapi import APIRouter, Query
from app.utils.supabase_client import get_user_jobs
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/history")
async def user_history(user_id: str = Query(...)):
    try:
        result = get_user_jobs(user_id)
        return JSONResponse(result.data)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
