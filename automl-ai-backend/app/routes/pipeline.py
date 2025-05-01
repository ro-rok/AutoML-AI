from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from app.routes.upload import session_store
import pandas as pd
import numpy as np
from app.utils.preprocessing import apply_encoding, apply_scaling, apply_balancing


router = APIRouter()

# Request schema for cleaning
class CleaningRequest(BaseModel):
    session_id: str
    fill_strategies: Dict[str, str]  # Column name to fill and strategy (mean, median, mode, drop)

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

class EDARequest(BaseModel):
    session_id: str
    target_column: Optional[str] = None  # For classification imbalance

@router.post("/eda")
async def perform_eda(payload: EDARequest):
    session_id = payload.session_id
    target_col = payload.target_column

    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")

    df = session_store[session_id]

    try:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()

        # Correlation
        corr_matrix = df[numeric_cols].corr().round(2).fillna(0).to_dict()

        # Skewness
        skewness = df[numeric_cols].skew().round(2).fillna(0).to_dict()

        # Unique count (for encoding decisions)
        uniques = {col: int(df[col].nunique()) for col in cat_cols}

        # Class distribution if target column is provided
        class_dist = {}
        if target_col and target_col in df.columns:
            class_dist = df[target_col].value_counts().to_dict()

        # Describe numeric columns
        stats = df[numeric_cols].describe().round(2).fillna(0).to_dict()

        return {
            "session_id": session_id,
            "correlation_matrix": corr_matrix,
            "skewness": skewness,
            "unique_values": uniques,
            "class_distribution": class_dist,
            "numeric_summary": stats,
            "num_rows": df.shape[0],
            "num_columns": df.shape[1]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TransformRequest(BaseModel):
    session_id: str
    target_column: str
    encoding: Optional[str] = None          # "label" | "onehot"
    scaling: Optional[str] = None           # "standard" | "minmax"
    balancing: Optional[str] = None         # "smote" | "undersample"
    drop_columns: Optional[List[str]] = []  # Optional columns to drop

@router.post("/transform")
async def transform_data(payload: TransformRequest):
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")

    df = session_store[session_id].copy()
    target = payload.target_column

    try:
        # Drop any columns user marked for exclusion
        df.drop(columns=payload.drop_columns, errors='ignore', inplace=True)

        # Separate X and y
        X = df.drop(columns=[target])
        y = df[target]

        # Apply encoding
        cat_columns = X.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
        if payload.encoding:
            X = apply_encoding(X, payload.encoding, cat_columns)

        # Apply scaling
        num_columns = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
        if payload.scaling:
            X = apply_scaling(X, payload.scaling, num_columns)

        # Apply balancing
        if payload.balancing:
            X, y = apply_balancing(X, y, payload.balancing)

        # Combine again for preview
        df_transformed = pd.concat([X, y], axis=1)
        session_store[session_id] = df_transformed

        return {
            "session_id": session_id,
            "transformed_preview": df_transformed.head(5).to_dict(orient="records"),
            "shape": df_transformed.shape
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))