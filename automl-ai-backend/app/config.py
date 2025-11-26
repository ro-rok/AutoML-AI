from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not set in environment variables. Please set it and try again.")

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI not set in environment variables. Please set it and try again.")

MONGODB_DB = os.getenv("MONGODB_DB", "automl_ai")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION", "ml_jobs")
