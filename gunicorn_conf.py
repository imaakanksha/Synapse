"""
Gunicorn configuration for production deployment on Google Cloud Run.
Dynamically scales workers based on available CPU cores.
"""

import multiprocessing
import os

# Bind to 0.0.0.0 on the PORT env var (Cloud Run sets this)
bind = "0.0.0.0:" + os.getenv("PORT", "8080")

# Worker configuration
# Cloud Run typically gives 1-2 vCPUs, so keep workers conservative
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_tmp_dir = "/dev/shm"  # Use shared memory for better performance

# Timeouts
timeout = 120  # Cloud Run has a max of 3600s, but 120s is a good default
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# Security
limit_request_line = 8190
limit_request_fields = 100
