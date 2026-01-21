from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, pipeline, export, groq, users, graph, aniexplorer, session, eda, clean, transform, train
from app.config import ALLOWED_ORIGINS
from app.utils.logger import log, request_id_var, session_id_var
import uuid
import time
import psutil
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Middleware for request tracking
@app.middleware("http")
async def add_request_context(request: Request, call_next):
    """Add request context for logging."""
    # Generate request ID
    request_id = str(uuid.uuid4())
    request_id_var.set(request_id)
    
    # Extract session ID from query params if present
    session_id = request.query_params.get("session_id")
    if session_id:
        session_id_var.set(session_id)
    
    # Log request
    start_time = time.time()
    log.info(
        f"Request started: {request.method} {request.url.path}",
        method=request.method,
        path=request.url.path,
        request_id=request_id
    )
    
    # Process request
    response = await call_next(request)
    
    # Log response
    duration_ms = (time.time() - start_time) * 1000
    log.info(
        f"Request completed: {request.method} {request.url.path}",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        request_id=request_id
    )
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    return response


@app.get("/")
async def root():
    return {"status": "ok", "message": "AutoML-AI Backend is running"}


@app.get("/ping")
def ping():
    return {"status": "ok"}


@app.get("/health")
async def health():
    """
    Health check endpoint for monitoring.
    Returns system status and resource usage.
    """
    try:
        # Get system metrics
        process = psutil.Process()
        memory_info = process.memory_info()
        cpu_percent = process.cpu_percent(interval=0.1)
        
        # Get system-wide metrics
        system_memory = psutil.virtual_memory()
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "process": {
                "memory_rss_mb": memory_info.rss / 1024 / 1024,
                "memory_vms_mb": memory_info.vms / 1024 / 1024,
                "cpu_percent": cpu_percent,
            },
            "system": {
                "memory_total_mb": system_memory.total / 1024 / 1024,
                "memory_available_mb": system_memory.available / 1024 / 1024,
                "memory_percent": system_memory.percent,
                "cpu_count": psutil.cpu_count(),
            }
        }
        
        log.info("Health check", **health_data)
        
        return health_data
    except Exception as e:
        log.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


app.include_router(users.router, prefix="/user")
app.include_router(upload.router, prefix="/upload")
app.include_router(pipeline.router, prefix="/pipeline")
app.include_router(export.router, prefix="/export")
app.include_router(groq.router, prefix="/groq")
app.include_router(graph.router, prefix="/graph")
app.include_router(aniexplorer.router, prefix="/aniexplorer")
app.include_router(session.router, prefix="/session")
app.include_router(eda.router, prefix="/eda")
app.include_router(clean.router, prefix="/clean")
app.include_router(transform.router, prefix="/transform")
app.include_router(train.router, prefix="/train")