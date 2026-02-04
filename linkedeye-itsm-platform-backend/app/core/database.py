"""
Database configuration and session management.
"""
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from sqlalchemy.pool import StaticPool
from app.core.config import settings
import logging
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

# Import all models to ensure they're registered with SQLAlchemy
# Models are imported in init_db to avoid circular imports

logger = logging.getLogger(__name__)


def sanitize_database_url(url: str) -> tuple:
    """
    Remove unsupported parameters from database URL and extract schema.
    Returns (sanitized_url, schema).
    """
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)

    # Extract schema if present
    schema = query_params.pop('schema', ['public'])[0] if 'schema' in query_params else 'public'

    # Rebuild query string without schema
    new_query = urlencode(query_params, doseq=True)

    # Rebuild URL
    sanitized = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))

    return sanitized, schema


# Sanitize database URL to remove unsupported 'schema' parameter
database_url, db_schema = sanitize_database_url(settings.database_url)

# Database engine with connection pooling
pool_size = getattr(settings, 'db_pool_size', 20)
max_overflow = getattr(settings, 'db_max_overflow', 10)
pool_recycle = getattr(settings, 'db_pool_recycle', 3600)
pool_pre_ping = getattr(settings, 'db_pool_pre_ping', True)

# Set search_path via options if schema is specified
connect_args = {
    "connect_timeout": 10,
    "application_name": "itsm_platform"
}
if db_schema and db_schema != 'public':
    connect_args["options"] = f"-c search_path={db_schema}"

engine = create_engine(
    database_url,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_pre_ping=pool_pre_ping,
    pool_recycle=pool_recycle,
    echo=settings.debug,
    connect_args=connect_args
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
class Base(DeclarativeBase):
    pass

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
            IncidentActivity, AlertSuppression, NotificationPreference,
            NotificationLog, EmailTemplate, VoiceCall, VoiceCallLog
        )
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")

        # Create default admin user if not exists
        create_default_admin()

    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def create_default_admin():
    """Create default admin user if not exists."""
    try:
        from app.models.user import User, UserRole, UserStatus
        from app.core.security import get_password_hash

        db = SessionLocal()
        try:
            # Check if admin user exists
            admin = db.query(User).filter(User.email == "admin@finspot.in").first()

            if not admin:
                # Create default admin user
                # Note: password_hash is the field name, role/status are stored as string values
                admin = User(
                    email="admin@finspot.in",
                    password_hash=get_password_hash("Admin@123"),
                    first_name="Admin",
                    last_name="User",
                    role=UserRole.ADMIN.value,
                    status=UserStatus.ACTIVE.value,
                    is_active=True,
                    phone="+919176772077"
                )
                db.add(admin)
                db.commit()
                logger.info("Default admin user created: admin@finspot.in / Admin@123")
            else:
                logger.info("Admin user already exists")

            # Create default environment if not exists
            create_default_environment(db)

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error creating default admin: {e}")


def create_default_environment(db):
    """Create default environment if not exists."""
    try:
        from app.models.environment import Environment

        env = db.query(Environment).filter(Environment.name == "Production").first()

        if not env:
            environments = [
                Environment(name="Production", code="production", description="Production environment", environment_type="production", is_active=True),
                Environment(name="Staging", code="staging", description="Staging environment", environment_type="staging", is_active=True),
                Environment(name="Development", code="development", description="Development environment", environment_type="development", is_active=True),
            ]
            for e in environments:
                db.add(e)
            db.commit()
            logger.info("Default environments created: Production, Staging, Development")
        else:
            logger.info("Default environments already exist")

    except Exception as e:
        logger.error(f"Error creating default environments: {e}")


def check_db_connection():
    """Check database connection health."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False