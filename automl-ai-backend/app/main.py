from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, pipeline, export, groq

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/upload")
app.include_router(pipeline.router, prefix="/pipeline")
app.include_router(export.router, prefix="/export")
app.include_router(groq.router, prefix="/groq")
