# ── Production Dockerfile for Google Cloud Run ──
FROM python:3.11-slim

# Prevent Python from writing bytecode and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Create non-root user for security
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid 1001 --create-home appuser

WORKDIR /app

# Install dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code and gunicorn config
COPY gunicorn_conf.py .
COPY app/ ./app/

# Switch to non-root user
USER appuser

# Expose the Cloud Run port
EXPOSE 8080

# Use gunicorn with uvicorn workers for production
# Shell form so $PORT is expanded from environment variable
CMD gunicorn -c gunicorn_conf.py app.main:app
