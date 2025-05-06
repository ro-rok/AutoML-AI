# Use a slim Python image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Create and switch to app directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port
ENV PORT=8000
EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
