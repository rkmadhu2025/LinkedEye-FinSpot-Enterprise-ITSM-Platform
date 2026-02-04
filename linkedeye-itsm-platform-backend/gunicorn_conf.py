import multiprocessing
import os

# Gunicorn configuration file
# https://docs.gunicorn.org/en/stable/configure.html#configuration-file

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
# For CPU-bound apps: 2 * CPUs + 1
# For I/O-bound apps (like this one with heavy DB usage), we can use more or use async workers
workers_per_core = 1
cores = multiprocessing.cpu_count()
default_web_concurrency = workers_per_core * cores + 1
web_concurrency = int(os.getenv("WEB_CONCURRENCY", default_web_concurrency))
workers = web_concurrency

# Worker class
worker_class = "uvicorn.workers.UvicornWorker"

# Worker lifecycle
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# Process naming
proc_name = "itsm-backend"

# Daemon
daemon = False
