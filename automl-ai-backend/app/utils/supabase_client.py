from supabase import create_client
from dotenv import load_dotenv
load_dotenv()
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE = os.getenv("SUPABASE_KEY")
ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

client = create_client(SUPABASE_URL, SERVICE_ROLE)
anon_client = create_client(SUPABASE_URL, ANON_KEY)

def save_job_record(session_id, user_id, filename, df_shape, pipeline_steps, model_config, metrics):
    return client.table("ml_jobs").insert({
        "id": session_id,
        "user_id": user_id,
        "filename": filename,
        "n_rows": df_shape[0],
        "n_cols": df_shape[1],
        "pipeline": pipeline_steps,
        "model": model_config,
        "metrics": metrics
    }).execute()

def get_user_jobs(user_id: str):
    return client.table("ml_jobs").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()