# Use a slim Python base image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for Heroku
ENV PORT=8000
EXPOSE 8000

# Start the FastAPI server
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-5000}