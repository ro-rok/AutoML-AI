from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

def save_job_record(session_id, filename, df_shape, pipeline_steps, model_config, metrics):
    return supabase.table("ml_jobs").insert({
        "id": session_id,
        "filename": filename,
        "n_rows": df_shape[0],
        "n_cols": df_shape[1],
        "pipeline": pipeline_steps,
        "model": model_config,
        "metrics": metrics
    }).execute()
