from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import uuid
from io import BytesIO
from typing import List, Dict, Optional
import traceback
import numpy as np
import magic  # python-magic for content sniffing
from app.utils.mongodb_client import save_session
from app.utils.error_responses import (
    file_too_large_error,
    invalid_file_format_error,
    validation_error,
    internal_server_error
)

router = APIRouter()

# In-memory store for session data (for MVP only)
session_store: Dict[str, Dict] = {}

# File size limits
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
WARNING_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def validate_file_type(contents: bytes, filename: str) -> bool:
    """
    Validate file type by content sniffing (magic bytes), not just extension.
    Returns True if valid CSV or XLSX, False otherwise.
    """
    try:
        # Use python-magic to detect file type by content
        mime = magic.from_buffer(contents, mime=True)
        
        # Accept CSV (text/plain, text/csv) and Excel files
        valid_mimes = [
            'text/plain',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]
        
        if mime in valid_mimes:
            return True
            
        # Fallback: check if it looks like CSV by trying to parse first few lines
        if mime.startswith('text/'):
            try:
                sample = contents[:1024].decode('utf-8', errors='ignore')
                # Check for CSV-like structure (commas, newlines)
                if ',' in sample and '\n' in sample:
                    return True
            except:
                pass
                
        return False
    except Exception as e:
        print(f"Magic detection failed: {e}, falling back to extension check")
        # Fallback to extension check if magic fails
        return filename.endswith(('.csv', '.xlsx'))


def infer_column_type(series: pd.Series) -> str:
    """
    Infer the semantic type of a column beyond pandas dtype.
    Returns: 'numerical', 'categorical', 'boolean', 'datetime', or 'unknown'
    """
    # Check for boolean
    if pd.api.types.is_bool_dtype(series):
        return 'boolean'
    
    # Check for datetime
    if pd.api.types.is_datetime64_any_dtype(series):
        return 'datetime'
    
    # Check for numerical
    if pd.api.types.is_numeric_dtype(series):
        return 'numerical'
    
    # Check for categorical/string
    if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
        # If unique values are less than 50% of total, likely categorical
        unique_ratio = series.nunique() / len(series) if len(series) > 0 else 0
        if unique_ratio < 0.5:
            return 'categorical'
        return 'categorical'  # Default string columns to categorical
    
    return 'unknown'


def suggest_target_column(df: pd.DataFrame) -> Optional[str]:
    """
    Suggest a target column based on heuristics:
    1. Last column
    2. Column with 'target' or 'label' in name (case-insensitive)
    3. Column with 'y' as exact name
    """
    if len(df.columns) == 0:
        return None
    
    # Check for columns with target/label in name
    for col in df.columns:
        col_lower = str(col).lower()
        if 'target' in col_lower or 'label' in col_lower or col_lower == 'y':
            return col
    
    # Default to last column
    return df.columns[-1]


@router.post("/file")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a dataset file (CSV or XLSX) with validation and schema inference.
    
    - Validates file type by content sniffing (magic bytes)
    - Enforces file size limits (100MB hard limit)
    - Infers column types (numerical, categorical, boolean, datetime)
    - Suggests target column based on heuristics
    - Returns schema with sample rows
    """
    try:
        # Read file contents
        contents = await file.read()
        file_size = len(contents)
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise file_too_large_error(
                file_size_mb=file_size / (1024*1024),
                max_size_mb=100
            )
        
        # Validate file type by content sniffing
        if not validate_file_type(contents, file.filename or ''):
            raise invalid_file_format_error(file_type=file.filename or 'unknown')
        
        # Parse file
        buffer = BytesIO(contents)
        
        if file.filename and file.filename.endswith(".csv"):
            df = pd.read_csv(buffer)
        elif file.filename and file.filename.endswith(".xlsx"):
            df = pd.read_excel(buffer)
        else:
            # Try CSV first, then Excel
            try:
                buffer.seek(0)
                df = pd.read_csv(buffer)
            except:
                buffer.seek(0)
                df = pd.read_excel(buffer)
        
        # Check if dataframe is empty
        if df.empty or len(df.columns) == 0:
            raise validation_error(
                field="file",
                message="Empty file. Please upload a file with data."
            )
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Generate schema with inferred types
        schema = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            inferred_type = infer_column_type(df[col])
            null_count = int(df[col].isnull().sum())
            
            # Get sample values (non-null)
            sample_values = df[col].dropna().head(3).tolist()
            
            schema.append({
                "column": col,
                "dtype": dtype,
                "inferred_type": inferred_type,
                "null_count": null_count,
                "sample_values": sample_values,
            })
        
        # Suggest target column
        suggested_target = suggest_target_column(df)
        
        # Store session data in memory
        session_store[session_id] = {
            "data": df,
            "meta": {
                "filename": file.filename,
                "file_size": file_size,
                "target_column": suggested_target,
                "steps": {},
                "row_count": len(df),
                "column_count": len(df.columns),
            }
        }
        
        # Persist session to MongoDB with 7-day expiration
        try:
            save_session(
                session_id=session_id,
                filename=file.filename or "unknown",
                file_size=file_size,
                row_count=len(df),
                column_count=len(df.columns),
                schema=schema,
                target_column=suggested_target,
                expiration_days=7,
            )
        except Exception as e:
            print(f"Warning: Failed to persist session to MongoDB: {e}")
            # Continue anyway - in-memory store is still available
        
        # Generate preview (first 10 rows)
        preview = df.head(10).replace({np.nan: None}).to_dict(orient="records")
        
        return JSONResponse(content={
            "session_id": session_id,
            "filename": file.filename,
            "file_size": file_size,
            "row_count": len(df),
            "column_count": len(df.columns),
            "schema": schema,
            "suggested_target": suggested_target,
            "preview": preview,
        })
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise internal_server_error(error_message=str(e))

