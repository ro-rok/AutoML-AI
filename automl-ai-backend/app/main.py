from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, pipeline, export, groq, users, graph, aniexplorer, session, eda, clean, transform
from app.config import ALLOWED_ORIGINS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "AutoML-AI Backend is running"}

@app.get("/ping")
def ping():
    return {"status": "ok"}

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