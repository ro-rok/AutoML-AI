from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
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
    target_column: str
    fill_strategies: Dict[str, str]

@router.post("/clean")
async def clean_data(payload: CleaningRequest):
    sid = payload.session_id
    if sid not in session_store:
        raise HTTPException(404, "Invalid session ID")

    try:
        df: pd.DataFrame = session_store[sid]["data"]
        orig_nulls = df.isnull().sum().to_dict()
        to_clean = {c: n for c,n in orig_nulls.items() if n > 0}

        # update target
        if payload.target_column in df.columns:
            session_store[sid]["meta"]["target_column"] = payload.target_column

        # apply strategies
        df_clean = df.copy()
        for col, strat in payload.fill_strategies.items():
            if strat == "mean":
                df_clean[col] = df_clean[col].fillna(df_clean[col].mean())
            elif strat == "median":
                df_clean[col] = df_clean[col].fillna(df_clean[col].median())
            elif strat == "mode":
                df_clean[col] = df_clean[col].fillna(df_clean[col].mode()[0])
            elif strat == "drop":
                df_clean = df_clean.dropna(subset=[col])
            else:
                raise HTTPException(400, f"Unknown strategy '{strat}'")

        # persist cleaned df
        session_store[sid]["data"] = df_clean
        session_store[sid]["meta"]["steps"].setdefault("clean", []).append(payload.fill_strategies)

        # after null summary
        after_nulls = df_clean.isnull().sum().to_dict()

        # identify column types
        num_cols = df_clean.select_dtypes(include="number").columns.tolist()
        cat_cols = df_clean.select_dtypes(include=["object","category","bool"]).columns.tolist()

        # graph types
        graph_types = {
        "numeric": ["histogram","boxplot","qq","line","scatter"],
        "categorical": ["bar","pie"]
        }

        preview = df_clean.head(5).replace({np.nan: None}).to_dict(orient="records")

        return {
        "session_id": sid,
        "preview": preview,
        "before_nulls": to_clean,
        "after_nulls": after_nulls,
        "numeric_cols": num_cols,
        "categorical_cols": cat_cols,
        "graph_types": graph_types,
        "rows": df_clean.shape[0],
        "columns": df_clean.shape[1],
        "target_column": session_store[sid]["meta"]["target_column"]
        }

    except Exception as e:
        print("Cleaning Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class EDARequest(BaseModel):
    session_id: str
    target_column: Optional[str] = None  # For classification imbalance

@router.post("/eda")
async def perform_eda(payload: EDARequest):
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")
    target_col = session_store[session_id]["meta"].get("target_column", None)
    if target_col is None:
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
    df = session_store[session_id]["data"]
    meta = session_store[session_id]["meta"]
    target_column = meta.get("target_column", None)
    y = df[target_column]
    X = df.drop(columns=[target_column])

    try:
        model_name, params_used, scores, cm, df_test = train_and_evaluate(
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
            "test": df_test
        })

        # if session_store[session_id]["meta"]["steps"].get("explain") is None:
        #     session_store[session_id]["meta"]["steps"]["explain"] = {}
        # session_store[session_id]["meta"]["steps"]["explain"] ={
        #     "model": model_name,
        #     "params": params_used,
        #     "shap_values": shap_values,
        #     "X_test": X_test
        # } 

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
    model_key: str

@router.post("/explain")
async def explain_model(payload: ExplainRequest):
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")
    try:
        model_key = payload.model_key
        shap_values = session_store[session_id]["meta"]["steps"]["explain"].get("shap_values", None)
        if shap_values is None:
            raise HTTPException(status_code=400, detail="SHAP values not available.")
        return {
            "session_id": session_id,
            "shap_importance": shap_values.tolist() if isinstance(shap_values, np.ndarray) else shap_values
        }

    except Exception as e:
        print("Explain Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class SessionRequest(BaseModel):
    session_id: str


@router.post("/data")
def get_data(payload: SessionRequest):
    session_id = payload.session_id
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")

    entry = session_store[session_id]
    df: pd.DataFrame = entry["data"]
    meta: Dict[str, Any] = entry["meta"]

    # turn the DataFrame into a list of plain dicts
    data_records = df.to_dict(orient="records")

    return {
        "session_id": session_id,
        "session_data": {
            "data": data_records,
            "meta": meta
        }
    }
    
@router.get("/metrics")
async def get_metrics(session_id: str):
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Invalid session ID.")
    train_steps = session_store[session_id]["meta"]["steps"].get("train", [])
    metrics = { step["model"]: step["metrics"] for step in train_steps }
    print("Metrics:", metrics)
    return {"metrics": metrics}