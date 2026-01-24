from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
from datetime import datetime
from app.routes.upload import session_store
from app.routes.clean import snapshot_store, idempotency_store
from app.utils.preprocessing import apply_encoding, apply_scaling, apply_skewness_fix
from app.utils.mongodb_client import save_dataset
from imblearn.over_sampling import SMOTE, RandomOverSampler
from imblearn.under_sampling import RandomUnderSampler

router = APIRouter()


class TransformOperation(BaseModel):
    type: str  # 'encoding', 'scaling', 'skew_correction', 'class_balancing'
    columns: List[str]
    method: str
    parameters: Optional[Dict[str, Any]] = None


class TransformPreviewRequest(BaseModel):
    session_id: str
    operations: List[TransformOperation]


class TransformApplyRequest(BaseModel):
    session_id: str
    operations: List[TransformOperation]
    idempotency_key: Optional[str] = None
    state_version: Optional[int] = None


def apply_transform_operation(df: pd.DataFrame, target_column: Optional[str], operation: TransformOperation) -> pd.DataFrame:
    """
    Apply a single transformation operation to a dataframe.
    
    Args:
        df: DataFrame to transform
        target_column: Name of target column (excluded from transformations)
        operation: TransformOperation specifying type, columns, and method
    
    Returns:
        Transformed DataFrame
    """
    df = df.copy()
    
    # Validate columns exist
    for col in operation.columns:
        if col not in df.columns:
            raise ValueError(f"Column '{col}' not found in dataset")
    
    if operation.type == "encoding":
        # Apply encoding to categorical columns
        df = apply_encoding(df, operation.method, operation.columns)
    
    elif operation.type == "scaling":
        # Apply scaling to numerical columns
        df = apply_scaling(df, operation.method, operation.columns)
    
    elif operation.type == "skew_correction":
        # Apply skewness correction to numerical columns
        df = apply_skewness_fix(df, operation.method, operation.columns)
    
    elif operation.type == "class_balancing":
        # Class balancing requires target column
        if not target_column or target_column not in df.columns:
            raise ValueError("Target column required for class balancing")
        
        # Separate features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Apply balancing
        if operation.method == "smote":
            # Check if we have enough samples for SMOTE
            min_samples = y.value_counts().min()
            if min_samples < 2:
                raise ValueError("Not enough samples in minority class for SMOTE. Try random oversampling instead.")
            k_neighbors = min(5, min_samples - 1)
            smote = SMOTE(random_state=42, k_neighbors=k_neighbors)
            X_resampled, y_resampled = smote.fit_resample(X, y)
        
        elif operation.method == "random_oversample":
            ros = RandomOverSampler(random_state=42)
            X_resampled, y_resampled = ros.fit_resample(X, y)
        
        elif operation.method == "random_undersample":
            rus = RandomUnderSampler(random_state=42)
            X_resampled, y_resampled = rus.fit_resample(X, y)
        
        else:
            raise ValueError(f"Unknown balancing method: {operation.method}")
        
        # Reconstruct dataframe
        df = pd.DataFrame(X_resampled, columns=X.columns)
        df[target_column] = y_resampled
    
    else:
        raise ValueError(f"Unknown transformation type: {operation.type}")
    
    return df


@router.post("/preview")
async def preview_transform(request: TransformPreviewRequest):
    """
    Preview the effect of transformation operations without modifying the dataset.
    
    Returns before/after samples and statistics about changes.
    """
    try:
        session_id = request.session_id
        
        # Get session data
        if session_id not in session_store:
            raise HTTPException(
                status_code=404,
                detail="Session not found. Your session may have expired. Please start a new pipeline."
            )
        
        session = session_store[session_id]
        df_original = session["data"].copy()
        target_column = session["meta"].get("target_column")
        
        # Apply all transformation operations
        df_transformed = df_original.copy()
        for operation in request.operations:
            df_transformed = apply_transform_operation(df_transformed, target_column, operation)
        
        # Generate before/after preview
        # Get sample rows (first 5)
        sample_indices = df_original.head(5).index.tolist()
        
        # Get affected columns
        affected_columns = []
        for operation in request.operations:
            affected_columns.extend(operation.columns)
        affected_columns = list(set(affected_columns))
        
        # Get before/after for these rows and columns
        before_sample = df_original.loc[sample_indices, affected_columns].replace({np.nan: None}).to_dict(orient="records")
        
        # For transformed data, we need to handle potential index changes (from balancing)
        if len(df_transformed) != len(df_original):
            # Class balancing changed row count, show first 5 rows
            after_sample = df_transformed.head(5)[affected_columns].replace({np.nan: None}).to_dict(orient="records")
        else:
            after_sample = df_transformed.loc[sample_indices, affected_columns].replace({np.nan: None}).to_dict(orient="records")
        
        return JSONResponse(content={
            "preview": {
                "before": before_sample,
                "after": after_sample,
                "affected_columns": affected_columns,
            },
            "new_row_count": len(df_transformed),
            "new_column_count": len(df_transformed.columns),
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to preview transformation: {str(e)}"
        )


@router.post("/apply")
async def apply_transform(request: TransformApplyRequest):
    """
    Apply transformation operations to the dataset and update session state.
    
    Supports idempotency via idempotency_key to prevent duplicate applications.
    Supports state versioning to detect conflicts.
    """
    try:
        session_id = request.session_id
        idempotency_key = request.idempotency_key
        
        # Check idempotency
        if idempotency_key:
            idempotency_cache_key = f"{session_id}:{idempotency_key}"
            if idempotency_cache_key in idempotency_store:
                # Return cached response
                return JSONResponse(content=idempotency_store[idempotency_cache_key])
        
        # Get session data
        if session_id not in session_store:
            raise HTTPException(
                status_code=404,
                detail="Session not found. Your session may have expired. Please start a new pipeline."
            )
        
        session = session_store[session_id]
        target_column = session["meta"].get("target_column")
        
        # Check state version for conflicts
        current_version = session["meta"].get("state_version", 0)
        if request.state_version is not None and request.state_version != current_version:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "STALE_STATE_VERSION",
                    "message": "Session state has been updated by another request",
                    "current_state_version": current_version,
                    "suggested_action": "Refresh session state and retry"
                }
            )
        
        # Store snapshot before applying (for reset functionality)
        snapshot_key = f"{session_id}:transform"
        if snapshot_key not in snapshot_store:
            snapshot_store[snapshot_key] = {
                "data": session["data"].copy(),
                "meta": session["meta"].copy(),
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        # Apply all transformation operations
        df_transformed = session["data"].copy()
        for operation in request.operations:
            df_transformed = apply_transform_operation(df_transformed, target_column, operation)
        
        # Update session data
        session["data"] = df_transformed
        session["meta"]["row_count"] = len(df_transformed)
        session["meta"]["column_count"] = len(df_transformed.columns)
        session["meta"]["state_version"] = current_version + 1
        
        # Store transformation operations in session metadata
        if "transform_operations" not in session["meta"]:
            session["meta"]["transform_operations"] = []
        session["meta"]["transform_operations"].extend([op.dict() for op in request.operations])
        
        # Mark transform step as completed
        if "steps" not in session["meta"]:
            session["meta"]["steps"] = {}
        session["meta"]["steps"]["transform"] = {
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
        }
        
        # Save transformed dataset to MongoDB for training
        try:
            dataset_dict = df_transformed.replace({np.nan: None}).to_dict(orient="records")
            save_dataset(session_id, dataset_dict)
        except Exception as e:
            # Log but don't fail - in-memory store is still available
            print(f"Warning: Failed to save dataset to MongoDB after transform: {e}")
        
        response_data = {
            "success": True,
            "new_row_count": len(df_transformed),
            "new_column_count": len(df_transformed.columns),
            "applied_operations": [op.dict() for op in request.operations],
            "state_version": session["meta"]["state_version"],
            "transformed_preview": df_transformed.head(10).replace({np.nan: None}).to_dict(orient="records"),
        }
        
        # Cache response for idempotency
        if idempotency_key:
            idempotency_cache_key = f"{session_id}:{idempotency_key}"
            idempotency_store[idempotency_cache_key] = response_data
        
        return JSONResponse(content=response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply transformation: {str(e)}"
        )


@router.post("/reset")
async def reset_transform(session_id: str):
    """
    Reset the dataset to the state before transformation operations were applied.
    
    Query Parameters:
        session_id: UUID session identifier
    """
    try:
        # Get session data
        if session_id not in session_store:
            raise HTTPException(
                status_code=404,
                detail="Session not found. Your session may have expired. Please start a new pipeline."
            )
        
        # Get snapshot
        snapshot_key = f"{session_id}:transform"
        if snapshot_key not in snapshot_store:
            raise HTTPException(
                status_code=404,
                detail="No snapshot found for this step. Cannot reset."
            )
        
        snapshot = snapshot_store[snapshot_key]
        session = session_store[session_id]
        
        # Restore from snapshot
        session["data"] = snapshot["data"].copy()
        session["meta"] = snapshot["meta"].copy()
        
        # Clear transformation operations
        if "transform_operations" in session["meta"]:
            del session["meta"]["transform_operations"]
        
        # Mark transform step as not completed
        if "steps" in session["meta"] and "transform" in session["meta"]["steps"]:
            del session["meta"]["steps"]["transform"]
        
        return JSONResponse(content={
            "success": True,
            "message": "Dataset reset to state before transformation",
            "row_count": len(session["data"]),
            "column_count": len(session["data"].columns),
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset transformation: {str(e)}"
        )
