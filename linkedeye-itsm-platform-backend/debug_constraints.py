
import sys
import logging
from sqlalchemy import text
from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_constraints():
    logger.info("Checking Constraints and Indexes for 'incidents'...")
    
    db = SessionLocal()
    try:
        # Check Indexes
        print("\nINDEXES:")
        result = db.execute(text("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'incidents'"))
        for row in result.fetchall():
            print(f"- {row[0]}: {row[1]}")
            
        # Check Constraints
        print("\nCONSTRAINTS:")
        result = db.execute(text("""
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'incidents'::regclass
        """))
        for row in result.fetchall():
            print(f"- {row[0]}: {row[1]}")

    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_constraints()
