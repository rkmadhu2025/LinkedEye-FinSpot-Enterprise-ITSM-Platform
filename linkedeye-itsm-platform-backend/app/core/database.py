"""
Database configuration and session management.
"""
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.core.config import settings
import logging

# Import all models to ensure they're registered with SQLAlchemy
# Models are imported in init_db to avoid circular imports

logger = logging.getLogger(__name__)

# Database engine with connection pooling
pool_size = getattr(settings, 'db_pool_size', 20)
max_overflow = getattr(settings, 'db_max_overflow', 10)
pool_recycle = getattr(settings, 'db_pool_recycle', 3600)
pool_pre_ping = getattr(settings, 'db_pool_pre_ping', True)

engine = create_engine(
    settings.database_url,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_pre_ping=pool_pre_ping,
    pool_recycle=pool_recycle,
    echo=settings.debug,
    connect_args={
        "connect_timeout": 10,
        "application_name": "itsm_platform"
    }
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


def get_db() -> Session:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    try:
        # Import models here to ensure they are registered with Base.metadata
        from app.models import (
            User, Incident, Change, Asset, Environment,
            ChangeApproval, AssetRelationship, Problem, Alert, Integration,
            Group, NetworkDevice, NetworkTopology, Report, MLModel,
            Recommendation, Anomaly, Setting, AuditLog, Notification,
            IncidentActivity
        )
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def check_db_connection():
    """Check database connection health."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False