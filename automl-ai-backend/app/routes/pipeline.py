from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from app.routes.upload import session_store
import pandas as pd
import numpy as np

router = APIRouter()

# Request schema for cleaning
class CleaningRequest(BaseModel):
    session_id: str
    fill_strategies: Dict[str, str]  # e.g., {"age": "mean", "bmi": "median", "gender": "mode"}

@router.post("/clean")
async def clean_data(payload: CleaningRequest):
    session_id = payload.session_id
    fill_map = payload.fill_strategies

    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")

    df = session_store[session_id].copy()

    try:
        # Apply fill strategy per column
        for col, strategy in fill_map.items():
            if strategy == "mean":
                df[col] = df[col].fillna(df[col].mean())
            elif strategy == "median":
                df[col] = df[col].fillna(df[col].median())
            elif strategy == "mode":
                df[col] = df[col].fillna(df[col].mode()[0])
            elif strategy == "drop":
                df = df.dropna(subset=[col])
            else:
                raise ValueError(f"Unknown strategy '{strategy}' for column '{col}'.")

        # Update the session with cleaned data
        session_store[session_id] = df

        # Return summary
        null_summary = {
            col: int(df[col].isnull().sum())
            for col in df.columns
        }

        return {
            "session_id": session_id,
            "preview": df.head(5).to_dict(orient="records"),
            "null_summary": null_summary,
            "rows": df.shape[0],
            "columns": df.shape[1]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
