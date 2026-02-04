"""
Seed Finspot team groups and user memberships.
This script creates the organizational structure for Finspot teams.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.group import Group, GroupType
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger(__name__)


async def seed_finspot_teams():
    """Seed Finspot team structure with groups and members."""
    db: Session = SessionLocal()
    
    try:
        # Define team structure
        teams = [
            {
                "name": "DevOps Team",
                "code": "DEVOPS",
                "description": "24/7 Infrastructure support and DevOps operations",
                "group_type": GroupType.OPERATIONS.value,
                "email": "devops@finspot.in",
                "members_emails": [
                    "rajkumar.madhu@rmadhu.in",  # Primary On-Call
                    "hoysala.bise@finspot.in",    # DevOps Lead
                ]
            },
            {
                "name": "Network Operations Team",
                "code": "NETOPS",
                "description": "Network infrastructure, switches, firewalls, routing, and SNMP monitoring",
                "group_type": GroupType.OPERATIONS.value,
                "email": "netops@finspot.in",
                "members_emails": [
                    "siva.kadirannagari@finspot.in",      # Lead
                    "edukondalu.p@finspot.in",
                    "devendrareddy.puppala@finspot.in",
                ]
            },
            {
                "name": "Database Administration",
                "code": "DBA",
                "description": "MySQL, PostgreSQL, MongoDB database administration",
                "group_type": GroupType.OPERATIONS.value,
                "email": "dba@finspot.in",
                "members_emails": [
                    "rajkumar.ashokan@finspot.in",
                ]
            },
            {
                "name": "Trading Platform Team",
                "code": "TRADING",
                "description": "NSE/BSE/NSEFO connectivity and BOD/EOD operations",
                "group_type": GroupType.OPERATIONS.value,
                "email": "trading@finspot.in",
                "members_emails": [
                    "siva.kadirannagari@finspot.in",  # Lead
                    "edukondalu.p@finspot.in",
                ]
            },
            {
                "name": "Management",
                "code": "MGMT",
                "description": "Management and leadership team",
                "group_type": GroupType.MANAGEMENT.value,
                "email": "management@finspot.in",
                "members_emails": [
                    "hoysala.bise@finspot.in",
                ]
            },
        ]
        
        created_groups = []
        
        for team_data in teams:
            # Check if group already exists
            existing_group = db.query(Group).filter(Group.code == team_data["code"]).first()
            
            if existing_group:
                logger.info(f"Group {team_data['name']} already exists, skipping...")
                group = existing_group
            else:
                # Create group
                group = Group(
                    name=team_data["name"],
                    code=team_data["code"],
                    description=team_data["description"],
                    group_type=team_data["group_type"],
                    email=team_data["email"],
                    settings={}
                )
                db.add(group)
                db.flush()  # Get the ID
                logger.info(f"Created group: {team_data['name']}")
            
            # Add members
            for email in team_data["members_emails"]:
                user = db.query(User).filter(User.email == email).first()
                if user:
                    # Check if user is already a member
                    if user not in group.members.all():
                        group.members.append(user)
                        logger.info(f"Added {email} to {team_data['name']}")
                    else:
                        logger.info(f"{email} is already a member of {team_data['name']}")
                else:
                    logger.warning(f"User {email} not found, skipping...")
            
            created_groups.append(group)
        
        db.commit()
        logger.info(f"Successfully seeded {len(created_groups)} teams")
        
        # Print summary
        print("\n=== Finspot Team Structure ===")
        for group in created_groups:
            member_count = group.member_count if hasattr(group, 'member_count') else 0
            print(f"\n{group.name} ({group.code})")
            print(f"  Type: {group.group_type}")
            print(f"  Email: {group.email}")
            print(f"  Members: {member_count}")
            if hasattr(group, 'members'):
                for member in group.members.all():
                    print(f"    - {member.first_name} {member.last_name} ({member.email})")
        
        return created_groups
        
    except Exception as e:
        logger.error(f"Error seeding teams: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding Finspot team structure...")
    asyncio.run(seed_finspot_teams())
    print("\nDone!")
