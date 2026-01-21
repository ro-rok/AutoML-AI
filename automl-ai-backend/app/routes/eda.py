from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from app.routes.upload import session_store
from app.utils.logger import log, log_operation
from app.utils.cache import cache
from app.utils.error_responses import session_not_found_error, internal_server_error
import time

router = APIRouter()


def calculate_column_stats(series: pd.Series) -> Dict[str, Any]:
    """
    Calculate comprehensive statistics for a numerical column.
    
    Returns:
        Dictionary with mean, median, std, min, max, q25, q75, skewness
    """
    stats = {
        "mean": float(series.mean()) if not series.empty else 0.0,
        "median": float(series.median()) if not series.empty else 0.0,
        "std": float(series.std()) if not series.empty else 0.0,
        "min": float(series.min()) if not series.empty else 0.0,
        "max": float(series.max()) if not series.empty else 0.0,
        "q25": float(series.quantile(0.25)) if not series.empty else 0.0,
        "q75": float(series.quantile(0.75)) if not series.empty else 0.0,
        "skewness": float(series.skew()) if not series.empty else 0.0,
    }
    
    # Replace NaN values with 0
    for key in stats:
        if pd.isna(stats[key]) or np.isnan(stats[key]) or np.isinf(stats[key]):
            stats[key] = 0.0
    
    return stats


def calculate_categorical_summary(series: pd.Series, top_n: int = 10) -> Dict[str, Any]:
    """
    Calculate summary statistics for a categorical column.
    
    Args:
        series: Pandas series with categorical data
        top_n: Number of top values to return
    
    Returns:
        Dictionary with unique_count and top_values
    """
    unique_count = int(series.nunique())
    value_counts = series.value_counts().head(top_n)
    
    top_values = [
        {"value": str(val), "count": int(count)}
        for val, count in value_counts.items()
    ]
    
    return {
        "unique_count": unique_count,
        "top_values": top_values,
    }


def calculate_correlation_matrix(df: pd.DataFrame, numerical_cols: List[str]) -> List[List[float]]:
    """
    Calculate correlation matrix for numerical columns.
    
    Args:
        df: DataFrame with data
        numerical_cols: List of numerical column names
    
    Returns:
        2D list representing correlation matrix
    """
    if not numerical_cols or len(numerical_cols) < 2:
        return []
    
    corr_matrix = df[numerical_cols].corr()
    
    # Replace NaN with 0
    corr_matrix = corr_matrix.fillna(0)
    
    # Convert to list of lists
    return corr_matrix.values.tolist()


def identify_missing_values(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    """
    Identify columns with missing values and calculate statistics.
    
    Args:
        df: DataFrame with data
    
    Returns:
        Dictionary mapping column names to missing value stats
    """
    missing_info = {}
    
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        if null_count > 0:
            total_count = len(df)
            percentage = (null_count / total_count * 100) if total_count > 0 else 0
            
            missing_info[col] = {
                "count": null_count,
                "percentage": round(percentage, 2),
            }
    
    return missing_info


@router.get("/summary")
async def get_eda_summary(session_id: str):
    """
    Get comprehensive EDA summary for a session's dataset.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Returns:
        EDA summary including:
        - Summary statistics for numerical columns
        - Value counts for categorical columns
        - Correlation matrix
        - Skewness for numerical features
        - Missing values information
    
    Requirements: 6.1, 6.2, 6.3, 6.5, 14.2
    """
    start_time = time.time()
    log.info("EDA summary requested", session_id=session_id)
    
    # Check cache first
    cache_key = f"eda_summary:{session_id}"
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        log.info("EDA summary served from cache", session_id=session_id)
        return JSONResponse(content=cached_result)
    
    # Check if session exists
    if session_id not in session_store:
        raise session_not_found_error(session_id=session_id)
    
    try:
        # Get dataframe from session
        df = session_store[session_id]["data"]
        log.info(f"Dataset loaded for EDA: {len(df)} rows, {len(df.columns)} columns")
        
        # Identify column types
        numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
        
        # Calculate summary statistics for numerical columns
        stats_start = time.time()
        numerical_summary = {}
        for col in numerical_cols:
            numerical_summary[col] = calculate_column_stats(df[col])
        stats_duration = (time.time() - stats_start) * 1000
        log.info(f"Calculated numerical statistics", duration_ms=stats_duration, num_columns=len(numerical_cols))
        
        # Calculate value counts for categorical columns
        cat_start = time.time()
        categorical_summary = {}
        for col in categorical_cols:
            categorical_summary[col] = calculate_categorical_summary(df[col])
        cat_duration = (time.time() - cat_start) * 1000
        log.info(f"Calculated categorical statistics", duration_ms=cat_duration, num_columns=len(categorical_cols))
        
        # Calculate correlation matrix
        corr_start = time.time()
        correlations = calculate_correlation_matrix(df, numerical_cols)
        corr_duration = (time.time() - corr_start) * 1000
        log.info(f"Calculated correlation matrix", duration_ms=corr_duration)
        
        # Extract skewness from numerical summary
        skewness = {
            col: stats["skewness"]
            for col, stats in numerical_summary.items()
        }
        
        # Identify missing values
        missing_values = identify_missing_values(df)
        
        total_duration = (time.time() - start_time) * 1000
        log.info(f"EDA summary completed", duration_ms=total_duration)
        
        result = {
            "session_id": session_id,
            "numerical_summary": numerical_summary,
            "categorical_summary": categorical_summary,
            "correlations": correlations,
            "correlation_columns": numerical_cols,  # Column names for correlation matrix
            "skewness": skewness,
            "missing_values": missing_values,
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "numerical_columns": numerical_cols,
            "categorical_columns": categorical_cols,
        }
        
        # Cache the result for 5 minutes
        cache.set(cache_key, result, ttl_seconds=300)
        
        return JSONResponse(content=result)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        duration = (time.time() - start_time) * 1000
        log.error(f"EDA summary failed", error=str(e), duration_ms=duration)
        raise internal_server_error(error_message=f"Failed to generate EDA summary: {str(e)}")
