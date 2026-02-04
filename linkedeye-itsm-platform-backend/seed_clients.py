"""
Seed script to add client/tenant data to the LinkedEye ITSM Platform.
Run this script to populate the clients table with production, DR, UAT, and DEV environments.
"""

import os
import sys

# Add the parent directory to the path so we can import from the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.client import Client, ClientEnvironment, ClientStatus
from app.core.config import settings

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Client data to seed
CLIENT_DATA = [
    # IndMoney clients
    {
        "client_code": "indmoney-dr",
        "name": "IndMoney DR",
        "display_name": "IndMoney (DR)",
        "short_name": "IndMoney-DR",
        "environment": "dr",
        "location": "indmoney-dr-le.finspot.in",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    {
        "client_code": "indmoney-prod",
        "name": "IndMoney Production",
        "display_name": "IndMoney (PROD)",
        "short_name": "IndMoney",
        "environment": "production",
        "location": "indmoney-prod-le.finspot.in",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    {
        "client_code": "indmoney-ifsc",
        "name": "IndMoney IFSC",
        "display_name": "IndMoney IFSC (PROD)",
        "short_name": "IndMoney-IFSC",
        "environment": "production",
        "location": "indmoney-ifsc-le.finspot.in",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    # FinSpot clients
    {
        "client_code": "fs-le-dr",
        "name": "FinSpot DR",
        "display_name": "FinSpot (DR)",
        "short_name": "FS-DR",
        "environment": "dr",
        "location": "fs-le-dr.finspot.in",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "IT Services",
    },
    {
        "client_code": "fs-le-isv",
        "name": "FinSpot ISV",
        "display_name": "FinSpot ISV (PROD)",
        "short_name": "FS-ISV",
        "environment": "production",
        "location": "fs-le-isv.finspot.in",
        "sla_tier": "premium",
        "support_hours": "24x7",
        "industry": "IT Services",
    },
    {
        "client_code": "fs-ifsc",
        "name": "FinSpot IFSC",
        "display_name": "FinSpot IFSC (PROD)",
        "short_name": "FS-IFSC",
        "environment": "production",
        "location": "fs-ifsc-le.finspot.in",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "IT Services",
    },
    {
        "client_code": "fs-le-dx",
        "name": "FinSpot DX",
        "display_name": "FinSpot DX (PROD)",
        "short_name": "FS-DX",
        "environment": "production",
        "location": "fs-le-dx.finspot.in",
        "sla_tier": "premium",
        "support_hours": "24x7",
        "industry": "IT Services",
    },
    {
        "client_code": "fs-le-uat",
        "name": "FinSpot UAT",
        "display_name": "FinSpot (UAT)",
        "short_name": "FS-UAT",
        "environment": "uat",
        "location": "fs-le-uat.finspot.in",
        "sla_tier": "standard",
        "support_hours": "8x5",
        "industry": "IT Services",
    },
    {
        "client_code": "fs-le-dev",
        "name": "FinSpot DEV",
        "display_name": "FinSpot (DEV)",
        "short_name": "FS-DEV",
        "environment": "development",
        "location": "fs-le-dev.finspot.in",
        "sla_tier": "standard",
        "support_hours": "8x5",
        "industry": "IT Services",
    },
    # PLIndia
    {
        "client_code": "plindia-prod",
        "name": "PLIndia Production",
        "display_name": "PLIndia (PROD)",
        "short_name": "PLIndia",
        "environment": "production",
        "location": "prod-le.plindia.com",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    # Neo Wealth
    {
        "client_code": "neowealth-prod",
        "name": "Neo Wealth Production",
        "display_name": "Neo Wealth (PROD)",
        "short_name": "NeoWealth",
        "environment": "production",
        "location": "prod-le.neo-wealth.com",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    # Flattrade
    {
        "client_code": "flattrade-prod",
        "name": "Flattrade Production",
        "display_name": "Flattrade (PROD)",
        "short_name": "Flattrade",
        "environment": "production",
        "location": "prod-le.flattrade.in",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    # Way2Wealth
    {
        "client_code": "w2w-prod",
        "name": "Way2Wealth Production",
        "display_name": "Way2Wealth (PROD)",
        "short_name": "W2W",
        "environment": "production",
        "location": "w2w-prod-le.way2wealth.com",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    # Lemonn
    {
        "client_code": "lemonn-prod",
        "name": "Lemonn Production",
        "display_name": "Lemonn (PROD)",
        "short_name": "Lemonn",
        "environment": "production",
        "location": "lemonn-prod-le.finspot.in",
        "sla_tier": "premium",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
    # Mirae
    {
        "client_code": "mirae-prod",
        "name": "Mirae Asset Production",
        "display_name": "Mirae Asset (PROD)",
        "short_name": "Mirae",
        "environment": "production",
        "location": "fs-le-prod-mirae.com",
        "sla_tier": "enterprise",
        "support_hours": "24x7",
        "industry": "Financial Services",
    },
]


def seed_clients():
    """Seed client data into the database."""
    db = SessionLocal()

    try:
        created_count = 0
        skipped_count = 0

        for client_data in CLIENT_DATA:
            # Check if client already exists
            existing = db.query(Client).filter(
                Client.client_code == client_data["client_code"]
            ).first()

            if existing:
                print(f"Skipping existing client: {client_data['client_code']}")
                skipped_count += 1
                continue

            # Map environment string to enum
            env_map = {
                "production": ClientEnvironment.PRODUCTION,
                "dr": ClientEnvironment.DR,
                "uat": ClientEnvironment.UAT,
                "development": ClientEnvironment.DEVELOPMENT,
                "staging": ClientEnvironment.STAGING,
            }

            client = Client(
                client_code=client_data["client_code"],
                name=client_data["name"],
                display_name=client_data.get("display_name"),
                short_name=client_data.get("short_name"),
                environment=env_map.get(client_data["environment"], ClientEnvironment.PRODUCTION),
                location=client_data.get("location"),
                sla_tier=client_data.get("sla_tier", "standard"),
                support_hours=client_data.get("support_hours", "24x7"),
                industry=client_data.get("industry"),
                status=ClientStatus.ACTIVE,
                is_active=True,
                max_users=100,
                max_assets=1000,
            )

            db.add(client)
            created_count += 1
            print(f"Created client: {client_data['client_code']} ({client_data['environment'].upper()})")

        db.commit()

        print(f"\n{'='*50}")
        print(f"Seeding complete!")
        print(f"Created: {created_count} clients")
        print(f"Skipped: {skipped_count} clients (already exist)")
        print(f"{'='*50}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding clients: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting client seeding...")
    print(f"Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}")
    print()
    seed_clients()
