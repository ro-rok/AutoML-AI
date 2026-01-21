from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes import upload, pipeline, export, groq, users, graph, aniexplorer, session, eda, clean, transform, train
from app.config import (
    ALLOWED_ORIGINS, 
    REQUEST_TIMEOUT_DEFAULT,
    RATE_LIMIT_UPLOAD_PER_SESSION,
    RATE_LIMIT_UPLOAD_PER_IP,
    RATE_LIMIT_OTHER_PER_SESSION,
    RATE_LIMIT_OTHER_PER_IP
)
from app.utils.logger import log, request_id_var, session_id_var
from app.utils.rate_limiter import rate_limiter
import uuid
import time
import psutil
from datetime import datetime
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Middleware for request tracking, timeout, and rate limiting
@app.middleware("http")
async def add_request_context(request: Request, call_next):
    """Add request context for logging, enforce timeouts, and check rate limits."""
    # Generate request ID
    request_id = str(uuid.uuid4())
    request_id_var.set(request_id)
    
    # Extract session ID from query params if present
    session_id = request.query_params.get("session_id")
    if session_id:
        session_id_var.set(session_id)
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Check rate limits (skip for health/ping endpoints)
    if request.url.path not in ["/", "/ping", "/health"]:
        # Determine endpoint type and limits
        is_upload = "/upload" in request.url.path
        
        if is_upload:
            session_limit = RATE_LIMIT_UPLOAD_PER_SESSION
            ip_limit = RATE_LIMIT_UPLOAD_PER_IP
        else:
            session_limit = RATE_LIMIT_OTHER_PER_SESSION
            ip_limit = RATE_LIMIT_OTHER_PER_IP
        
        # Check session-based rate limit
        if session_id:
            allowed, rate_info = rate_limiter.check_rate_limit(
                identifier=session_id,
                endpoint_type="upload" if is_upload else "other",
                max_requests=session_limit,
                window_seconds=60  # 1 minute window
            )
            
            if not allowed:
                log.warning(
                    f"Rate limit exceeded for session: {request.method} {request.url.path}",
                    session_id=session_id,
                    request_id=request_id
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please wait a moment and try again.",
                        "suggested_action": "Wait before retrying"
                    },
                    headers={
                        "X-RateLimit-Limit": str(rate_info["limit"]),
                        "X-RateLimit-Remaining": str(rate_info["remaining"]),
                        "X-RateLimit-Reset": str(rate_info["reset"]),
                        "Retry-After": str(rate_info["reset"] - int(time.time()))
                    }
                )
        
        # Check IP-based rate limit
        allowed, rate_info = rate_limiter.check_rate_limit(
            identifier=client_ip,
            endpoint_type="upload" if is_upload else "other",
            max_requests=ip_limit,
            window_seconds=60  # 1 minute window
        )
        
        if not allowed:
            log.warning(
                f"Rate limit exceeded for IP: {request.method} {request.url.path}",
                client_ip=client_ip,
                request_id=request_id
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests from your IP. Please wait a moment and try again.",
                    "suggested_action": "Wait before retrying"
                },
                headers={
                    "X-RateLimit-Limit": str(rate_info["limit"]),
                    "X-RateLimit-Remaining": str(rate_info["remaining"]),
                    "X-RateLimit-Reset": str(rate_info["reset"]),
                    "Retry-After": str(rate_info["reset"] - int(time.time()))
                }
            )
    
    # Log request
    start_time = time.time()
    log.info(
        f"Request started: {request.method} {request.url.path}",
        method=request.method,
        path=request.url.path,
        request_id=request_id
    )
    
    try:
        # Apply timeout (skip for /train endpoints as they use job-based polling)
        if "/train" not in request.url.path:
            response = await asyncio.wait_for(
                call_next(request),
                timeout=REQUEST_TIMEOUT_DEFAULT
            )
        else:
            response = await call_next(request)
    except asyncio.TimeoutError:
        duration_ms = (time.time() - start_time) * 1000
        log.error(
            f"Request timeout: {request.method} {request.url.path}",
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            request_id=request_id
        )
        return JSONResponse(
            status_code=504,
            content={
                "error": "REQUEST_TIMEOUT",
                "message": f"Request took longer than {REQUEST_TIMEOUT_DEFAULT} seconds. This can happen on Heroku's free tier. Try reducing your dataset size or simplifying the operation.",
                "suggested_action": "Reduce dataset size or try again"
            }
        )
    
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