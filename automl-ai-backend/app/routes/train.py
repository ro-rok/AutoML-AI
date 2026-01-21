from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import time
from datetime import datetime
from app.utils.mongodb_client import (
    get_session,
    get_dataset,
    save_training_results,
    get_training_results,
)
from app.utils.models import train_and_evaluate, MODEL_MAP, CLASSIFICATION_MODELS
from app.utils.logger import log, log_operation, job_id_var
import pandas as pd
import numpy as np
import traceback

router = APIRouter()

# In-memory job store (will be replaced with Redis in production)
_jobs: Dict[str, Dict[str, Any]] = {}


class ModelConfig(BaseModel):
    id: str
    name: str
    type: str
    hyperparameters: Optional[Dict[str, Any]] = None
    enabled: bool = True


class TrainingConfig(BaseModel):
    models: List[ModelConfig]
    test_size: float = 0.2
    random_state: int = 42
    hyperparameter_tuning: bool = False
    tuning_method: Optional[str] = None
    cv_folds: Optional[int] = 5


def run_training_job(job_id: str, session_id: str, config: TrainingConfig):
    """
    Background task to run training job.
    """
    # Set job_id in context for logging
    job_id_var.set(job_id)
    
    start_time = time.time()
    log.info(
        f"Training job started",
        job_id=job_id,
        session_id=session_id,
        num_models=len([m for m in config.models if m.enabled])
    )
    
    try:
        # Update job status to running
        _jobs[job_id]["status"] = "running"
        _jobs[job_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Get session and dataset
        log.info("Loading session and dataset")
        session = get_session(session_id)
        if not session:
            raise Exception("Session not found")
        
        dataset = get_dataset(session_id)
        if not dataset:
            raise Exception("Dataset not found. Please complete upload and preprocessing steps first.")
        
        # Convert dataset to DataFrame
        df = pd.DataFrame(dataset)
        log.info(f"Dataset loaded: {len(df)} rows, {len(df.columns)} columns")
        
        # Get target column
        target_column = session.get("target_column")
        if not target_column or target_column not in df.columns:
            raise Exception(f"Target column '{target_column}' not found in dataset")
        
        # Prepare features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Train each enabled model
        enabled_models = [m for m in config.models if m.enabled]
        results = []
        
        for idx, model_config in enumerate(enabled_models):
            model_start_time = time.time()
            
            try:
                _jobs[job_id]["current_model"] = model_config.name
                _jobs[job_id]["current_iteration"] = idx + 1
                _jobs[job_id]["progress"] = int((idx / len(enabled_models)) * 100)
                _jobs[job_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"
                
                log.info(
                    f"Training model {idx + 1}/{len(enabled_models)}",
                    model_name=model_config.name,
                    model_type=model_config.type
                )
                
                # Train model
                model_name, params, scores, cm, test_data = train_and_evaluate(
                    model_key=model_config.type,
                    X=X,
                    y=y,
                    user_params=model_config.hyperparameters,
                    test_size=config.test_size,
                    random_state=config.random_state,
                    stratify=True
                )
                
                model_duration = (time.time() - model_start_time) * 1000
                
                log.info(
                    f"Model training completed",
                    model_name=model_config.name,
                    duration_ms=model_duration,
                    accuracy=scores.get("accuracy", 0)
                )
                
                # Calculate feature importance for tree-based models
                feature_importance = None
                if model_config.type in ["random_forest", "decision_tree", "xgboost", "lightgbm"]:
                    # Feature importance will be calculated in train_and_evaluate
                    # For now, we'll skip it to keep things simple
                    pass
                
                # Store result
                result = {
                    "model_id": model_config.id,
                    "model_name": model_config.name,
                    "model_type": model_config.type,
                    "metrics": scores,
                    "confusion_matrix": cm.tolist() if cm is not None else None,
                    "feature_importance": feature_importance,
                    "training_time": model_duration,
                    "trained_at": datetime.utcnow().isoformat() + "Z",
                }
                
                results.append(result)
                
            except Exception as e:
                model_duration = (time.time() - model_start_time) * 1000
                log.error(
                    f"Error training model {model_config.name}",
                    error=str(e),
                    duration_ms=model_duration
                )
                traceback.print_exc()
                # Continue with next model
                continue
        
        # Save results to database
        log.info("Saving training results to database")
        save_training_results(session_id, results)
        
        # Update job status to completed
        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["progress"] = 100
        _jobs[job_id]["results"] = results
        _jobs[job_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        total_duration = (time.time() - start_time) * 1000
        log.info(
            f"Training job completed",
            job_id=job_id,
            duration_ms=total_duration,
            num_models_trained=len(results)
        )
        
    except Exception as e:
        total_duration = (time.time() - start_time) * 1000
        log.error(
            f"Training job failed",
            job_id=job_id,
            error=str(e),
            duration_ms=total_duration
        )
        traceback.print_exc()
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = {
            "code": "TRAINING_FAILED",
            "message": str(e),
            "suggested_action": "Check your dataset and try again. If the error persists, try reducing dataset size or selecting simpler models."
        }
        _jobs[job_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"


@router.post("")
async def start_training(
    session_id: str,
    config: TrainingConfig,
    background_tasks: BackgroundTasks
):
    """
    Start training job for selected models.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Body:
        config: Training configuration with model selection and parameters
    
    Returns:
        Job ID for polling training status
    """
    # Validate session exists
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Your session may have expired. Please start a new pipeline."
        )
    
    # Validate target column is set
    target_column = session.get("target_column")
    if not target_column:
        raise HTTPException(
            status_code=400,
            detail="Target column not set. Please select a target column before training."
        )
    
    # Validate at least one model is enabled
    enabled_models = [m for m in config.models if m.enabled]
    if not enabled_models:
        raise HTTPException(
            status_code=400,
            detail="No models selected for training. Please enable at least one model."
        )
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    _jobs[job_id] = {
        "job_id": job_id,
        "session_id": session_id,
        "status": "pending",
        "progress": 0,
        "current_model": None,
        "current_iteration": 0,
        "total_iterations": len(enabled_models),
        "results": [],
        "error": None,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    
    # Start training in background
    background_tasks.add_task(run_training_job, job_id, session_id, config)
    
    return JSONResponse(content={
        "job_id": job_id,
        "status": "pending",
        "message": "Training job queued"
    })


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """
    Get status of a training job.
    
    Path Parameters:
        job_id: Job identifier returned from /train endpoint
    
    Returns:
        Job status including progress, current model, and results
    """
    if job_id not in _jobs:
        raise HTTPException(
            status_code=404,
            detail="Job not found. The job may have expired or been deleted."
        )
    
    job = _jobs[job_id]
    
    response = {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": job["progress"],
        "current_model": job["current_model"],
        "current_iteration": job["current_iteration"],
        "total_iterations": job["total_iterations"],
    }
    
    if job["status"] == "completed":
        response["results"] = job["results"]
    
    if job["status"] == "failed":
        response["error"] = job["error"]
    
    return JSONResponse(content=response)


@router.get("/results")
async def get_results(session_id: str):
    """
    Get training results for a session.
    
    Query Parameters:
        session_id: UUID session identifier
    
    Returns:
        List of training results
    """
    results = get_training_results(session_id)
    
    if not results:
        raise HTTPException(
            status_code=404,
            detail="No training results found for this session. Please train models first."
        )
    
    return JSONResponse(content={"results": results})
