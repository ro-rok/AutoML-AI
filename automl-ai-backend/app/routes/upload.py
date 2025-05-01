from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import uuid
from io import BytesIO
from typing import List, Dict
import traceback
import numpy as np

router = APIRouter()

# In-memory store for session data (for MVP only)
session_store: Dict[str, pd.DataFrame] = {}

@router.post("/file")
async def upload_dataset(file: UploadFile = File(...)):
    # Check file type
    if not file.filename.endswith((".csv", ".xlsx")):
        raise HTTPException(status_code=400, detail="Only .csv or .xlsx files are supported.")

    try:
        # Read the file content
        contents = await file.read()
        buffer = BytesIO(contents)

        # Parse CSV or Excel
        if file.filename.endswith(".csv"):
            df = pd.read_csv(buffer)
        else:
            df = pd.read_excel(buffer)

        # Create UUID for this session
        session_id = str(uuid.uuid4())
        session_store[session_id] = df

        # Generate schema preview
        schema = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            dtype_group = (
                "numerical" if pd.api.types.is_numeric_dtype(df[col]) else
                "categorical" if pd.api.types.is_string_dtype(df[col]) else
                "boolean" if pd.api.types.is_bool_dtype(df[col]) else
                "datetime" if pd.api.types.is_datetime64_any_dtype(df[col]) else
                "unknown"
            )
            schema.append({
                "column": col,
                "dtype": dtype,
                "inferred_type": dtype_group,
                "null_count": int(df[col].isnull().sum())
            })

        return JSONResponse(content={
            "session_id": session_id,
            "filename": file.filename,
            "preview": df.head(5).replace({np.nan: None}).to_dict(orient="records"),
            "schema": schema
        })

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
