
import sys
import logging
from sqlalchemy import text
from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_db_enums_all():
    logger.info("Checking ALL Enum values in Database...")
    
    db = SessionLocal()
    try:
        enum_types = [
            'incident_status', 
            'incident_priority', 
            'changestatus', 
            'change_priority', 
            'asset_status', 
            'health_status', 
            'environment_status'
        ]
        
        for enum_name in enum_types:
            try:
                # Postgres stores enum names as lowercase typically if created via unquoted name
                # But sqlalchemy might have created them with quotes? 
                # Let's check typical lower case first
                result = db.execute(text(f"SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = '{enum_name}'"))
                rows = result.fetchall()
                if not rows:
                     # Try CamelCase or whatever if needed, but typname is usually lower in PG unless quoted.
                     # Let's try to list all enum types to be sure
                     pass
                
                print(f"Enum {enum_name}: {[r[0] for r in rows]}")
            except Exception as e:
                print(f"Error checking {enum_name}: {e}")

    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_db_enums_all()
