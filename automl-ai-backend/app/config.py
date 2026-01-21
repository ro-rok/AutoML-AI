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

# Frontend URLs for CORS
FRONTEND_URLS = os.getenv("FRONTEND_URLS", "http://localhost:5173").split(",")
PRODUCTION_FRONTEND_URL = os.getenv("PRODUCTION_FRONTEND_URL")

# Combine all allowed origins
ALLOWED_ORIGINS = [url.strip() for url in FRONTEND_URLS]
if PRODUCTION_FRONTEND_URL:
    ALLOWED_ORIGINS.append(PRODUCTION_FRONTEND_URL.strip())

# Request timeout settings (in seconds)
# Most endpoints should complete within 30 seconds
# Training uses job-based polling, so no synchronous timeout needed
REQUEST_TIMEOUT_DEFAULT = int(os.getenv("REQUEST_TIMEOUT_DEFAULT", "30"))
REQUEST_TIMEOUT_TRAINING = int(os.getenv("REQUEST_TIMEOUT_TRAINING", "60"))

# Concurrent job limits
# Limit concurrent training jobs to prevent memory exhaustion on Heroku Eco tier
MAX_CONCURRENT_TRAINING_JOBS = int(os.getenv("MAX_CONCURRENT_TRAINING_JOBS", "2"))

# Cache settings
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "300"))  # 5 minutes default

# Rate limiting settings
# Format: requests per minute
RATE_LIMIT_UPLOAD_PER_SESSION = int(os.getenv("RATE_LIMIT_UPLOAD_PER_SESSION", "2"))
RATE_LIMIT_UPLOAD_PER_IP = int(os.getenv("RATE_LIMIT_UPLOAD_PER_IP", "10"))
RATE_LIMIT_OTHER_PER_SESSION = int(os.getenv("RATE_LIMIT_OTHER_PER_SESSION", "60"))
RATE_LIMIT_OTHER_PER_IP = int(os.getenv("RATE_LIMIT_OTHER_PER_IP", "120"))
