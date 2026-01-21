from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
from datetime import datetime
from app.routes.upload import session_store
from app.utils.mongodb_client import get_session

router = APIRouter()

# Store for step snapshots (for reset functionality)
snapshot_store: Dict[str, Dict[str, Any]] = {}

# Store for idempotency keys
idempotency_store: Dict[str, Dict[str, Any]] = {}


class CleaningOperation(BaseModel):
    column: str
    strategy: str  # 'drop_rows', 'fill_mean', 'fill_median', 'fill_mode', 'fill_constant', 'forward_fill', 'backward_fill'
    fill_value: Optional[Any] = None  # For 'fill_constant' strategy


class CleanPreviewRequest(BaseModel):
    session_id: str
    operations: List[CleaningOperation]


class CleanApplyRequest(BaseModel):
    session_id: str
    operations: List[CleaningOperation]
    idempotency_key: Optional[str] = None
    state_version: Optional[int] = None


def apply_cleaning_operation(df: pd.DataFrame, operation: CleaningOperation) -> pd.DataFrame:
    """
    Apply a single cleaning operation to a dataframe.
    
    Args:
        df: DataFrame to clean
        operation: CleaningOperation specifying column and strategy
    
    Returns:
        Cleaned DataFrame
    """
    df = df.copy()
    col = operation.column
    
    if col not in df.columns:
        raise ValueError(f"Column '{col}' not found in dataset")
    
    strategy = operation.strategy
    
    if strategy == "drop_rows":
        # Drop rows where this column has missing values
        df = df.dropna(subset=[col])
    
    elif strategy == "fill_mean":
        # Fill with mean (numerical columns only)
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise ValueError(f"Cannot fill mean for non-numerical column '{col}'")
        df[col] = df[col].fillna(df[col].mean())
    
    elif strategy == "fill_median":
        # Fill with median (numerical columns only)
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise ValueError(f"Cannot fill median for non-numerical column '{col}'")
        df[col] = df[col].fillna(df[col].median())
    
    elif strategy == "fill_mode":
        # Fill with mode (most frequent value)
        mode_value = df[col].mode()
        if len(mode_value) > 0:
            df[col] = df[col].fillna(mode_value[0])
    
    elif strategy == "fill_constant":
        # Fill with a constant value
        if operation.fill_value is None:
            raise ValueError(f"fill_value required for 'fill_constant' strategy")
        df[col] = df[col].fillna(operation.fill_value)
    
    elif strategy == "forward_fill":
        # Forward fill (propagate last valid observation forward)
        df[col] = df[col].fillna(method='ffill')
    
    elif strategy == "backward_fill":
        # Backward fill (propagate next valid observation backward)
        df[col] = df[col].fillna(method='bfill')
    
    else:
        raise ValueError(f"Unknown cleaning strategy: {strategy}")
    
    return df


@router.post("/preview")
async def preview_cleaning(request: CleanPreviewRequest):
    """
    Preview the effect of cleaning operations without modifying the dataset.
    
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
        
        # Apply all cleaning operations
        df_cleaned = df_original.copy()
        for operation in request.operations:
            df_cleaned = apply_cleaning_operation(df_cleaned, operation)
        
        # Generate before/after preview (sample rows that were affected)
        # Find rows that have missing values in any of the affected columns
        affected_columns = [op.column for op in request.operations]
        
        # Get sample rows with missing values (before cleaning)
        rows_with_missing = df_original[df_original[affected_columns].isnull().any(axis=1)]
        sample_indices = rows_with_missing.head(5).index.tolist()
        
        # Get before/after for these rows
        before_sample = df_original.loc[sample_indices].replace({np.nan: None}).to_dict(orient="records")
        after_sample = df_cleaned.loc[df_cleaned.index.isin(sample_indices)].replace({np.nan: None}).to_dict(orient="records")
        
        # Calculate statistics
        original_row_count = len(df_original)
        cleaned_row_count = len(df_cleaned)
        rows_deleted = original_row_count - cleaned_row_count
        
        return JSONResponse(content={
            "preview": {
                "before": before_sample,
                "after": after_sample,
                "changed_rows": len(sample_indices),
                "deleted_rows": rows_deleted,
            },
            "new_row_count": cleaned_row_count,
            "new_column_count": len(df_cleaned.columns),
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to preview cleaning: {str(e)}"
        )


@router.post("/apply")
async def apply_cleaning(request: CleanApplyRequest):
    """
    Apply cleaning operations to the dataset and update session state.
    
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
        snapshot_key = f"{session_id}:clean"
        if snapshot_key not in snapshot_store:
            snapshot_store[snapshot_key] = {
                "data": session["data"].copy(),
                "meta": session["meta"].copy(),
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        # Apply all cleaning operations
        df_cleaned = session["data"].copy()
        for operation in request.operations:
            df_cleaned = apply_cleaning_operation(df_cleaned, operation)
        
        # Update session data
        session["data"] = df_cleaned
        session["meta"]["row_count"] = len(df_cleaned)
        session["meta"]["column_count"] = len(df_cleaned.columns)
        session["meta"]["state_version"] = current_version + 1
        
        # Store cleaning operations in session metadata
        if "cleaning_operations" not in session["meta"]:
            session["meta"]["cleaning_operations"] = []
        session["meta"]["cleaning_operations"].extend([op.dict() for op in request.operations])
        
        # Mark clean step as completed
        if "steps" not in session["meta"]:
            session["meta"]["steps"] = {}
        session["meta"]["steps"]["clean"] = {
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
        }
        
        response_data = {
            "success": True,
            "new_row_count": len(df_cleaned),
            "new_column_count": len(df_cleaned.columns),
            "applied_operations": [op.dict() for op in request.operations],
            "state_version": session["meta"]["state_version"],
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
            detail=f"Failed to apply cleaning: {str(e)}"
        )


@router.post("/reset")
async def reset_cleaning(session_id: str):
    """
    Reset the dataset to the state before cleaning operations were applied.
    
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
        snapshot_key = f"{session_id}:clean"
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
        
        # Clear cleaning operations
        if "cleaning_operations" in session["meta"]:
            del session["meta"]["cleaning_operations"]
        
        # Mark clean step as not completed
        if "steps" in session["meta"] and "clean" in session["meta"]["steps"]:
            del session["meta"]["steps"]["clean"]
        
        return JSONResponse(content={
            "success": True,
            "message": "Dataset reset to state before cleaning",
            "row_count": len(session["data"]),
            "column_count": len(session["data"].columns),
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset cleaning: {str(e)}"
        )
