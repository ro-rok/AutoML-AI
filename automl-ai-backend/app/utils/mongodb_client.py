from datetime import datetime
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

