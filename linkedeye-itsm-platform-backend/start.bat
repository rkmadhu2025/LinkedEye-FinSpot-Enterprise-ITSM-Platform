@echo off
REM Production startup script for ITSM Platform (Windows)

echo Starting ITSM Platform Backend...

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found. Using environment variables.
)

REM Wait for database to be ready
echo Waiting for database...
:wait_db
python -c "from app.core.database import check_db_connection; exit(0 if check_db_connection() else 1)" 2>nul
if errorlevel 1 (
    echo Database is unavailable - sleeping
    timeout /t 2 /nobreak >nul
    goto wait_db
)
echo Database is ready!

REM Wait for Redis to be ready
echo Waiting for Redis...
:wait_redis
python -c "from app.core.redis import redis_client; exit(0 if redis_client.ping() else 1)" 2>nul
if errorlevel 1 (
    echo Redis is unavailable - sleeping
    timeout /t 2 /nobreak >nul
    goto wait_redis
)
echo Redis is ready!

REM Initialize database if needed
echo Initializing database...
python -c "from app.core.database import init_db; init_db()" 2>nul || echo Database already initialized

REM Start application
echo Starting application...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info --access-log
