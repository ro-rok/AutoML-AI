from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from pymongo import MongoClient, errors

from app.config import MONGODB_URI, MONGODB_DB, MONGODB_COLLECTION
from app.utils.sanitize_np import sanitize_numpy

load_dotenv()

_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
try:
    _client.admin.command("ping")
except errors.PyMongoError as exc:
    raise RuntimeError(f"Unable to connect to MongoDB: {exc}") from exc

_db = _client[MONGODB_DB]
_ml_jobs = _db[MONGODB_COLLECTION]
_sessions = _db["sessions"]  # New collection for session persistence
_datasets = _db["datasets"]  # Collection for storing processed datasets
_training_results = _db["training_results"]  # Collection for training results


def _serialize_document(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if doc is None:
        return None

    serialized: Dict[str, Any] = {}
    for key, value in doc.items():
        if key == "_id":
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat() + "Z"
        else:
            serialized[key] = value
    return serialized


def save_session(
    session_id: str,
    filename: str,
    file_size: int,
    row_count: int,
    column_count: int,
    schema: List[Dict[str, Any]],
    target_column: Optional[str] = None,
    expiration_days: int = 7,
) -> str:
    """
    Save or update a session in MongoDB with 7-day expiration.
    
    Args:
        session_id: UUID session identifier
        filename: Name of uploaded file
        file_size: Size of file in bytes
        row_count: Number of rows in dataset
        column_count: Number of columns in dataset
        schema: List of column schema dictionaries
        target_column: Selected target column (optional)
        expiration_days: Number of days until session expires (default: 7)
    
    Returns:
        session_id
    """
    now = datetime.utcnow()
    expires_at = now + timedelta(days=expiration_days)
    
    # Initialize step states
    steps = {
        "upload": {
            "status": "completed",
            "completed_at": now.isoformat() + "Z",
            "validations": [],
            "ai_suggestions": [],
            "artifacts": []
        },
        "eda": {"status": "ready", "validations": [], "ai_suggestions": [], "artifacts": []},
        "clean": {"status": "locked", "validations": [], "ai_suggestions": [], "artifacts": []},
        "transform": {"status": "locked", "validations": [], "ai_suggestions": [], "artifacts": []},
        "train": {"status": "locked", "validations": [], "ai_suggestions": [], "artifacts": []},
        "results": {"status": "locked", "validations": [], "ai_suggestions": [], "artifacts": []},
        "export": {"status": "locked", "validations": [], "ai_suggestions": [], "artifacts": []}
    }
    
    document = {
        "session_id": session_id,
        "filename": filename,
        "file_size": file_size,
        "row_count": row_count,
        "column_count": column_count,
        "schema": sanitize_numpy(schema),
        "target_column": target_column,
        "expires_at": expires_at,
        "updated_at": now,
        "state_version": 1,
        "current_step": "eda",
        "steps": steps,
        "operations_log": [],
        "trained_models": [],
        "selected_model_id": None,
    }
    
    _sessions.update_one(
        {"session_id": session_id},
        {
            "$set": document,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    
    # Create TTL index on expires_at if it doesn't exist
    try:
        _sessions.create_index("expires_at", expireAfterSeconds=0)
    except:
        pass  # Index might already exist
    
    return session_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a session from MongoDB.
    
    Args:
        session_id: UUID session identifier
    
    Returns:
        Session document or None if not found
    """
    doc = _sessions.find_one({"session_id": session_id})
    return _serialize_document(doc)


def update_session_target(session_id: str, target_column: str) -> bool:
    """
    Update the target column for a session.
    
    Args:
        session_id: UUID session identifier
        target_column: Name of target column
    
    Returns:
        True if updated successfully, False otherwise
    """
    result = _sessions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "target_column": target_column,
                "updated_at": datetime.utcnow(),
            }
        }
    )
    return result.modified_count > 0


def extend_session(session_id: str, days: int = 7) -> bool:
    """
    Extend session expiration by specified number of days.
    
    Args:
        session_id: UUID session identifier
        days: Number of days to extend (default: 7)
    
    Returns:
        True if extended successfully, False otherwise
    """
    session = _sessions.find_one({"session_id": session_id})
    if not session:
        return False
    
    new_expires_at = datetime.utcnow() + timedelta(days=days)
    result = _sessions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "expires_at": new_expires_at,
                "updated_at": datetime.utcnow(),
            }
        }
    )
    return result.modified_count > 0


def delete_session(session_id: str) -> bool:
    """
    Delete a session from MongoDB.
    
    Args:
        session_id: UUID session identifier
    
    Returns:
        True if deleted successfully, False otherwise
    """
    result = _sessions.delete_one({"session_id": session_id})
    return result.deleted_count > 0


def update_session_state(
    session_id: str,
    state_version: int,
    updates: Dict[str, Any]
) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Update session state with version conflict detection.
    
    Args:
        session_id: UUID session identifier
        state_version: Expected current state version
        updates: Dictionary of fields to update
    
    Returns:
        Tuple of (success, new_state_version, error_message)
        - If successful: (True, new_version, None)
        - If version conflict: (False, current_version, "STALE_STATE_VERSION")
        - If session not found: (False, None, "SESSION_NOT_FOUND")
    """
    session = _sessions.find_one({"session_id": session_id})
    if not session:
        return False, None, "SESSION_NOT_FOUND"
    
    current_version = session.get("state_version", 1)
    if current_version != state_version:
        return False, current_version, "STALE_STATE_VERSION"
    
    new_version = current_version + 1
    updates["state_version"] = new_version
    updates["updated_at"] = datetime.utcnow()
    
    result = _sessions.update_one(
        {"session_id": session_id, "state_version": state_version},
        {"$set": updates}
    )
    
    if result.modified_count > 0:
        return True, new_version, None
    else:
        # Race condition - version changed between find and update
        session = _sessions.find_one({"session_id": session_id})
        current_version = session.get("state_version", 1) if session else None
        return False, current_version, "STALE_STATE_VERSION"


def update_step_status(
    session_id: str,
    step_name: str,
    status: str,
    validations: Optional[List[str]] = None,
    ai_suggestions: Optional[List[str]] = None,
    artifacts: Optional[List[str]] = None
) -> bool:
    """
    Update the status of a specific pipeline step.
    
    Args:
        session_id: UUID session identifier
        step_name: Name of the step (upload, eda, clean, etc.)
        status: New status (locked, ready, in_progress, completed, error)
        validations: Optional list of validation messages
        ai_suggestions: Optional list of AI suggestions
        artifacts: Optional list of artifact URLs
    
    Returns:
        True if updated successfully, False otherwise
    """
    update_fields = {
        f"steps.{step_name}.status": status,
        "updated_at": datetime.utcnow(),
    }
    
    if status == "completed":
        update_fields[f"steps.{step_name}.completed_at"] = datetime.utcnow().isoformat() + "Z"
    
    if validations is not None:
        update_fields[f"steps.{step_name}.validations"] = validations
    
    if ai_suggestions is not None:
        update_fields[f"steps.{step_name}.ai_suggestions"] = ai_suggestions
    
    if artifacts is not None:
        update_fields[f"steps.{step_name}.artifacts"] = artifacts
    
    result = _sessions.update_one(
        {"session_id": session_id},
        {"$set": update_fields}
    )
    
    return result.modified_count > 0


def add_operation_to_log(
    session_id: str,
    operation: Dict[str, Any]
) -> bool:
    """
    Add an operation (clean/transform) to the session's operations log.
    
    Args:
        session_id: UUID session identifier
        operation: Operation dictionary with type, details, timestamp
    
    Returns:
        True if added successfully, False otherwise
    """
    operation["timestamp"] = datetime.utcnow().isoformat() + "Z"
    
    result = _sessions.update_one(
        {"session_id": session_id},
        {
            "$push": {"operations_log": sanitize_numpy(operation)},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return result.modified_count > 0


def save_job_record(
    session_id: str,
    user_id: str,
    filename: str,
    df_shape: Tuple[int, int],
    pipeline_steps,
    model_config,
    metrics,
):
    now = datetime.utcnow()
    document = {
        "id": str(session_id),
        "user_id": str(user_id),
        "filename": str(filename),
        "n_rows": int(df_shape[0]),
        "n_cols": int(df_shape[1]),
        "pipeline": sanitize_numpy(pipeline_steps),
        "model": sanitize_numpy(model_config),
        "metrics": sanitize_numpy(metrics),
    }
    _ml_jobs.update_one(
        {"id": document["id"]},
        {
            "$set": {**document, "updated_at": now},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return document["id"]


def get_user_jobs(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    cursor = (
        _ml_jobs.find({"user_id": str(user_id)})
        .sort("created_at", -1)
        .limit(limit)
    )
    return [_serialize_document(doc) for doc in cursor]


def save_dataset(session_id: str, data: List[Dict[str, Any]]) -> bool:
    """
    Save processed dataset for a session.
    
    Args:
        session_id: UUID session identifier
        data: List of row dictionaries
    
    Returns:
        True if saved successfully
    """
    now = datetime.utcnow()
    document = {
        "session_id": session_id,
        "data": sanitize_numpy(data),
        "updated_at": now,
    }
    
    _datasets.update_one(
        {"session_id": session_id},
        {
            "$set": document,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return True


def get_dataset(session_id: str) -> Optional[List[Dict[str, Any]]]:
    """
    Retrieve processed dataset for a session.
    
    Args:
        session_id: UUID session identifier
    
    Returns:
        List of row dictionaries or None if not found
    """
    doc = _datasets.find_one({"session_id": session_id})
    if doc:
        return doc.get("data")
    return None


def save_training_results(
    session_id: str,
    results: List[Dict[str, Any]]
) -> bool:
    """
    Save training results for a session.
    
    Args:
        session_id: UUID session identifier
        results: List of training result dictionaries
    
    Returns:
        True if saved successfully
    """
    now = datetime.utcnow()
    document = {
        "session_id": session_id,
        "results": sanitize_numpy(results),
        "updated_at": now,
    }
    
    _training_results.update_one(
        {"session_id": session_id},
        {
            "$set": document,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return True


def get_training_results(session_id: str) -> Optional[List[Dict[str, Any]]]:
    """
    Retrieve training results for a session.
    
    Args:
        session_id: UUID session identifier
    
    Returns:
        List of training result dictionaries or None if not found
    """
    doc = _training_results.find_one({"session_id": session_id})
    if doc:
        return doc.get("results")
    return None



