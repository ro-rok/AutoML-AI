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


