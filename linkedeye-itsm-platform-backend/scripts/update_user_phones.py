"""
Update users with phone numbers for voice testing.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User

def update_users():
    db: Session = SessionLocal()
    try:
        print("Updating users with phone numbers...")
        
        user_phones = {
            "rajkumar.madhu@rmadhu.in": "+919176772077",
            "admin@finspot.in": "+919176772077",
            "hoysala.bise@finspot.in": "+919176772077",
            "siva.kadirannagari@finspot.in": "+919176772077",
        }

        for email, phone in user_phones.items():
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.phone = phone
                print(f"Updated {email} with phone {phone}")
        
        db.commit()
        print("User update completed successfully!")

    except Exception as e:
        print(f"Error updating users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_users()
