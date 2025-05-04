from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from app.routes.upload import session_store
import pandas as pd
import numpy as np
from app.utils.preprocessing import apply_encoding, apply_scaling, apply_balancing, apply_skewness_fix
from app.utils.models import MODEL_MAP, train_and_evaluate
from app.utils.supabase_client import save_job_record
from app.utils.explainability import get_shap_values
from app.utils.sanitize_np import sanitize_numpy
from fastapi.encoders import jsonable_encoder


router = APIRouter()

# Request schema for cleaning
class CleaningRequest(BaseModel):
    session_id: str
    fill_strategies: Dict[str, str]  

@router.post("/clean")
async def clean_data(payload: CleaningRequest):
    session_id = payload.session_id
    fill_map = payload.fill_strategies
    target_col = payload.fill_strategies.get("target_column", None)
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")

    df = session_store[session_id]["data"].copy()
    if target_col and target_col in df.columns:
        session_store[session_id]["meta"]["target_column"] = target_col
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

        # Update the session with cleaned data and meta
        session_store[session_id]["data"] = df
        if session_store[session_id]["meta"]["steps"].get("clean") is None:
            session_store[session_id]["meta"]["steps"]["clean"] = [fill_map]
        else:
            session_store[session_id]["meta"]["steps"]["clean"].append(fill_map)
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

    df = session_store[session_id]["data"]

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
    encoding: Optional[str] = None
    encoding_columns: Optional[List[str]] = []
    scaling: Optional[str] = None
    scaling_columns: Optional[List[str]] = []
    balancing: Optional[str] = None
    balancing_columns: Optional[List[str]] = []
    drop_columns: Optional[List[str]] = []
    skewness: Optional[str] = None
    skewness_columns: Optional[List[str]] = []

@router.post("/transform")
async def transform_data(payload: TransformRequest):
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")

    df = session_store[session_id]["data"].copy()
    target = session_store[session_id]["meta"].get("target_column", None)
    if target is None:
        target = payload.target_column
    try:
        # Drop any columns user marked for exclusion
        df.drop(columns=payload.drop_columns + [target], errors='ignore', inplace=True)

        X = df.copy()
        y = session_store[session_id]["data"][target]  # keep y from original
    
        # Apply encoding only on user-selected categorical columns
        if payload.encoding and payload.encoding != "none":
            X = apply_encoding(X, payload.encoding, payload.encoding_columns)

        # Apply skewness fix
        if payload.skewness and payload.skewness != "none":
            X = apply_skewness_fix(X, payload.skewness, payload.skewness_columns)

        # Apply scaling only on user-selected numeric columns
        if payload.scaling and payload.scaling != "none":
            X = apply_scaling(X, payload.scaling, payload.scaling_columns)

        # Apply balancing
        if payload.balancing and payload.balancing != "none":
            X, y = apply_balancing(X, y, payload.balancing)

        df_transformed = pd.concat([X, y], axis=1)
        session_store[session_id]["data"] = df_transformed
        if session_store[session_id]["meta"]["steps"].get("transform") is None:
            session_store[session_id]["meta"]["steps"]["transform"] = []
        session_store[session_id]["meta"]["steps"]["transform"].append({
            "encoding": {payload.encoding: payload.encoding_columns} if payload.encoding else {},
            "scaling": {payload.scaling: payload.scaling_columns} if payload.scaling else {},
            "balancing": {payload.balancing: payload.balancing_columns} if payload.balancing else {},
            "skew_fix": {payload.skewness: payload.skewness_columns} if payload.skewness else {},
            "dropped_columns": payload.drop_columns
        })

        return {
            "session_id": session_id,
            "transformed_preview": df_transformed.head(5).replace({np.nan: None}).to_dict(orient="records"),
            "shape": df_transformed.shape
        }

    except Exception as e:
        print("Transform Error:", e)
        raise HTTPException(status_code=500, detail=str(e))


class TrainRequest(BaseModel):
    session_id: str
    target_column: str
    model_key: str
    hyperparameters: Optional[Dict] = {}
    test_size: Optional[float] = 0.2
    random_state: Optional[int] = 42
    stratify: Optional[bool] = True

@router.post("/train")
async def train_model(payload: TrainRequest):
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")
    target_column = session_store[session_id]["meta"].get("target_column", None)
    if target_column is None:
        target_column = payload.target_column
    df = session_store[session_id]["data"]
    meta = session_store[session_id]["meta"]
    y = df[payload.target_column]
    X = df.drop(columns=[payload.target_column])

    try:
        model_name, params_used, scores, cm = train_and_evaluate(
            model_key=payload.model_key,
            X=X,
            y=y,
            user_params=payload.hyperparameters,
            test_size=payload.test_size if hasattr(payload, 'test_size') else 0.2,
            random_state=payload.random_state if hasattr(payload, 'random_state') else 42,
            stratify=payload.stratify if hasattr(payload, 'stratify') else True
        )
        user_id = meta.get("user_id", "00000000-0000-0000-0000-000000000000")

        try:
            save_job_record(
                user_id=user_id,
                session_id=session_id,
                filename=meta["filename"],
                df_shape=df.shape,
                pipeline_steps=meta["steps"],
                model_config={"model": model_name, "params": params_used},
                metrics=scores
            )
        except Exception as e:
            print("Error saving job record:", e)

        if session_store[session_id]["meta"]["steps"].get("train") is None:
            session_store[session_id]["meta"]["steps"]["train"] = []

        session_store[session_id]["meta"]["steps"]["train"].append({
            "model": model_name,
            "params": params_used,
            "metrics": scores,
            "confusion_matrix": cm.tolist() if cm is not None else None,
        })

        return jsonable_encoder({
            "session_id": session_id,
            "model": model_name,
            "params_used": params_used,
            "evaluation": sanitize_numpy(scores),
            "rows": int(len(df)),
            "features": int(X.shape[1]),
            "confusion_matrix": sanitize_numpy(cm) if cm is not None else None
        })

    except Exception as e:
        print("Train Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class ExplainRequest(BaseModel):
    session_id: str
    target_column: str
    model_key: str
    hyperparameters: Optional[Dict] = {}

@router.post("/explain")
async def explain_model(payload: ExplainRequest):
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")
    
    target_column = session_store[session_id]["meta"].get("target_column", None)
    if target_column is None:
        target_column = payload.target_column
    df = session_store[session_id]
    y = df[payload.target_column]
    X = df.drop(columns=[payload.target_column])

    try:
        model_name, params_used, _ = train_and_evaluate(payload.model_key, X, y, payload.hyperparameters)
        model = MODEL_MAP[payload.model_key](**params_used)
        model.fit(X, y)

        shap_values = get_shap_values(model, X, model_type="tree" if "tree" in payload.model_key else "default")

        if shap_values is None:
            raise HTTPException(status_code=500, detail="SHAP values could not be computed.")
        
        session_store[session_id]["meta"]["steps"]["explain"].append({  
            "model": model_name,
            "params": params_used,
            "shap_values": shap_values.tolist() if isinstance(shap_values, np.ndarray) else shap_values
        })

        return {
            "session_id": session_id,
            "shap_importance": shap_values
        }

    except Exception as e:
        print("Explain Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class SessionRequest(BaseModel):
    session_id: str

@router.post("/data")
def get_data(payload: SessionRequest):
    print("Get Data Payload:", payload)
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")
    print("Session Store:", session_store[session_id])
    return {
        "session_id": session_id,
        "session_data": jsonable_encoder(sanitize_numpy(session_store[session_id])),
    }