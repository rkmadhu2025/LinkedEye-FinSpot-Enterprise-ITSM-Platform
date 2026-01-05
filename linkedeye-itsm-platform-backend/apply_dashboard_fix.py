
import sys
import logging
from sqlalchemy import text
from app.core.database import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_schema_fixes():
    logger.info("Starting schema fix for Dashboard 500 Error...")
    
    commands = [
        # Incidents
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "UPDATE incidents SET is_active = TRUE WHERE is_active IS NULL",
        "ALTER TABLE incidents ALTER COLUMN is_active SET NOT NULL",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",

        # Changes
        "ALTER TABLE changes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "UPDATE changes SET is_active = TRUE WHERE is_active IS NULL",
        "ALTER TABLE changes ALTER COLUMN is_active SET NOT NULL",
        "ALTER TABLE changes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",
        "ALTER TABLE changes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",

        # Assets
        "ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "UPDATE assets SET is_active = TRUE WHERE is_active IS NULL",
        "ALTER TABLE assets ALTER COLUMN is_active SET NOT NULL",
        "ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",
        "ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",

        # Environments
        "ALTER TABLE environments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "UPDATE environments SET is_active = TRUE WHERE is_active IS NULL",
        "ALTER TABLE environments ALTER COLUMN is_active SET NOT NULL",
        "ALTER TABLE environments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",
        "ALTER TABLE environments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL",
    ]

    db = SessionLocal()
    try:
        for cmd in commands:
            try:
                logger.info(f"Executing: {cmd}")
                db.execute(text(cmd))
                db.commit()
            except Exception as e:
                logger.warning(f"Error executing command '{cmd}': {e}")
                db.rollback()
        
        logger.info("Schema fixes applied successfully.")
        
    except Exception as e:
        logger.error(f"Critical error during schema fix: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    apply_schema_fixes()
