
import sys
import logging
from sqlalchemy import text
from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_schema():
    logger.info("Checking Table Columns...")
    
    db = SessionLocal()
    tables = ['incidents', 'assets', 'environments', 'changes']
    
    try:
        for table in tables:
            print(f"\nTABLE: {table}")
            result = db.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'"))
            rows = result.fetchall()
            for row in rows:
                print(f"  - {row[0]}: {row[1]}")

    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_schema()
