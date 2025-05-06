# 1. Use a small official Python base image
FROM python:3.11-slim AS builder

# 2. Install build dependencies
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy and install Python deps into a wheel cache
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

# 4. Create a clean runtime image
FROM python:3.11-slim
WORKDIR /app

# 5. Install only the wheels (no compiler toolchain)
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-deps /wheels/* \
 && rm -rf /wheels

# 6. Copy your app code
COPY . .

# 7. Expose and set the entrypoint
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
