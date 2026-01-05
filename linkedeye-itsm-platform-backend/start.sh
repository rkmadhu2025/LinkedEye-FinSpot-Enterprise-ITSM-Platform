#!/bin/bash
# Production startup script for ITSM Platform

set -e

echo "Starting ITSM Platform Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Using environment variables."
fi

# Wait for database to be ready
echo "Waiting for database..."
until python -c "from app.core.database import check_db_connection; exit(0 if check_db_connection() else 1)" 2>/dev/null; do
    echo "Database is unavailable - sleeping"
    sleep 2
done
echo "Database is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis..."
until python -c "from app.core.redis import redis_client; exit(0 if redis_client.ping() else 1)" 2>/dev/null; do
    echo "Redis is unavailable - sleeping"
    sleep 2
done
echo "Redis is ready!"

# Initialize database if needed
echo "Initializing database..."
python -c "from app.core.database import init_db; init_db()" || echo "Database already initialized"

# Start application
echo "Starting application..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers ${WORKERS:-4} \
    --log-level ${LOG_LEVEL:-info} \
    --access-log \
    --no-use-colors
