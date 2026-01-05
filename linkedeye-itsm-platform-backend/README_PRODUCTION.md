# ITSM Platform - Production Deployment Guide

## Overview
This guide covers production-level deployment and configuration for the LinkedEye-FinSpot ITSM Platform.

## Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## Environment Configuration

### 1. Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Critical Production Settings:**
- `JWT_SECRET_KEY`: Use a strong, randomly generated secret (min 32 characters)
- `DATABASE_PASSWORD`: Strong database password
- `DEBUG=false`: Always false in production
- `ENVIRONMENT=production`
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins
- `RATE_LIMIT_ENABLED=true`: Enable rate limiting
- `RATE_LIMIT_PER_MINUTE=60`: Adjust based on your needs

### 2. Database Configuration
- Connection pooling is configured with:
  - Pool size: 20 connections
  - Max overflow: 10 connections
  - Pool recycle: 3600 seconds
  - Pre-ping: Enabled for connection health checks

### 3. Security Features

#### Rate Limiting
- Enabled by default: 60 requests per minute per IP
- Configurable via `RATE_LIMIT_PER_MINUTE`
- Uses Redis for distributed rate limiting

#### Security Headers
Automatically added to all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `Referrer-Policy`

#### Authentication
- JWT tokens with configurable expiration
- Refresh token support
- Password hashing with bcrypt
- Account lockout after failed attempts

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Option 2: Manual Deployment

#### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 2. Database Setup
```bash
# Run migrations (if using Alembic)
alembic upgrade head

# Or initialize database
python -c "from app.core.database import init_db; init_db()"
```

#### 3. Run Application
```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production (with multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Option 3: Using Gunicorn (Production)

```bash
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
```

## Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET_KEY
- [ ] Configure ALLOWED_ORIGINS properly
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up SSL certificates
- [ ] Enable rate limiting
- [ ] Review and configure CORS properly

### Database
- [ ] Use connection pooling
- [ ] Set up database backups
- [ ] Configure database replication (if needed)
- [ ] Monitor database performance
- [ ] Set appropriate connection limits

### Monitoring
- [ ] Set up application logging
- [ ] Configure log rotation
- [ ] Set up health check monitoring
- [ ] Configure Prometheus metrics (if enabled)
- [ ] Set up alerting

### Performance
- [ ] Configure Redis for caching
- [ ] Set up CDN for static assets (if applicable)
- [ ] Configure database indexes
- [ ] Optimize query performance
- [ ] Set up load balancing (if needed)

### Backup & Recovery
- [ ] Set up automated database backups
- [ ] Test backup restoration
- [ ] Document recovery procedures
- [ ] Set up disaster recovery plan

## Health Checks

### Basic Health Check
```bash
curl http://localhost:8000/health
```

### Detailed Health Check
```bash
curl http://localhost:8000/health/detailed
```

## API Documentation

### Swagger UI (Development Only)
- URL: `http://localhost:8000/docs`
- Only available when `DEBUG=true`

### ReDoc
- URL: `http://localhost:8000/redoc`
- Only available when `DEBUG=true`

## Monitoring Endpoints

### Metrics (if Prometheus enabled)
- URL: `http://localhost:9090/metrics`

## Troubleshooting

### Database Connection Issues
1. Check database is running
2. Verify connection string
3. Check firewall rules
4. Verify credentials

### Redis Connection Issues
1. Check Redis is running
2. Verify REDIS_URL
3. Check network connectivity

### Rate Limiting Issues
- Check Redis connectivity
- Verify rate limit settings
- Check logs for rate limit errors

## Performance Tuning

### Database
- Adjust pool size based on load
- Monitor connection usage
- Optimize slow queries

### Application
- Adjust worker count based on CPU cores
- Monitor memory usage
- Set up caching strategies

### Redis
- Configure memory limits
- Set up persistence
- Monitor memory usage

## Support

For issues or questions:
1. Check application logs
2. Review health check endpoints
3. Check database and Redis connectivity
4. Review error logs in `/app/logs`

## License
Proprietary - LinkedEye-FinSpot Enterprise ITSM Platform
