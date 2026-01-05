
import sys
import logging
from sqlalchemy import text
from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_db_enums():
    logger.info("Checking Enum values in Database...")
    
    db = SessionLocal()
    try:
        # Check incident_status enum values
        result = db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'incident_status'"))
        rows = result.fetchall()
        print("incident_status values:", [r[0] for r in rows])

        # Check incident_priority enum values
        result = db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'incident_priority'"))
        rows = result.fetchall()
        print("incident_priority values:", [r[0] for r in rows])

    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_db_enums()
