"""
Seed complete production-like data for Finspot LinkedEye ITSM.
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.group import Group, GroupType
from app.models.on_call import OnCallSchedule
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.core.security import get_password_hash
from app.core.logging import get_logger

logger = get_logger(__name__)

def seed_data():
    db: Session = SessionLocal()
    try:
        print("Starting data seeding...")

        # 1. Create Users
        users_data = [
            {"email": "rajkumar.madhu@rmadhu.in", "username": "rajkumar.madhu", "first_name": "Rajkumar", "last_name": "Madhu", "role": UserRole.ADMIN},
            {"email": "hoysala.bise@finspot.in", "username": "hoysala.bise", "first_name": "Hoysala", "last_name": "Bise", "role": UserRole.ADMIN},
            {"email": "siva.kadirannagari@finspot.in", "username": "siva.k", "first_name": "Siva", "last_name": "Kadirannagari", "role": UserRole.AGENT},
            {"email": "edukondalu.p@finspot.in", "username": "edukondalu.p", "first_name": "Edukondalu", "last_name": "P", "role": UserRole.AGENT},
            {"email": "devendrareddy.puppala@finspot.in", "username": "devendra.p", "first_name": "Devendra", "last_name": "Puppala", "role": UserRole.AGENT},
            {"email": "rajkumar.ashokan@finspot.in", "username": "rajkumar.a", "first_name": "Rajkumar", "last_name": "Ashokan", "role": UserRole.AGENT},
            {"email": "management@finspot.in", "username": "management", "first_name": "Management", "last_name": "User", "role": UserRole.READONLY},
        ]

        users_map = {}
        for u in users_data:
            user = db.query(User).filter(User.email == u["email"]).first()
            if not user:
                user = User(
                    email=u["email"],
                    username=u["username"],
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    password_hash=get_password_hash("Finspot@123"),
                    role=u["role"],
                    is_active=True,
                    is_email_verified=True
                )
                db.add(user)
                db.flush()
                print(f"Created user: {u['username']}")
            users_map[u["email"]] = user

        # 2. Create Groups
        groups_data = [
            {
                "name": "DevOps Team", "code": "DEVOPS", "type": GroupType.OPERATIONS, "email": "devops@finspot.in",
                "members": ["rajkumar.madhu@rmadhu.in", "hoysala.bise@finspot.in"]
            },
            {
                "name": "Network Operations", "code": "NETOPS", "type": GroupType.OPERATIONS, "email": "netops@finspot.in",
                "members": ["siva.kadirannagari@finspot.in", "edukondalu.p@finspot.in", "devendrareddy.puppala@finspot.in"]
            },
            {
                "name": "Database Admin", "code": "DBA", "type": GroupType.OPERATIONS, "email": "dba@finspot.in",
                "members": ["rajkumar.ashokan@finspot.in"]
            },
            {
                "name": "Trading Platform", "code": "TRADING", "type": GroupType.OPERATIONS, "email": "trading@finspot.in",
                "members": ["siva.kadirannagari@finspot.in", "edukondalu.p@finspot.in"]
            },
            {
                "name": "Management", "code": "MGMT", "type": GroupType.MANAGEMENT, "email": "management@finspot.in",
                "members": ["management@finspot.in", "hoysala.bise@finspot.in"]
            }
        ]

        groups_map = {}
        for g in groups_data:
            group = db.query(Group).filter(Group.code == g["code"]).first()
            if not group:
                group = Group(
                    name=g["name"],
                    code=g["code"],
                    group_type=g["type"],
                    email=g["email"],
                    description=f"{g['name']} Group"
                )
                db.add(group)
                db.flush()
                print(f"Created group: {g['name']}")
            
            # Add members
            for email in g["members"]:
                 if email in users_map:
                    user = users_map[email]
                    if user not in group.members:
                        group.members.append(user)
                        print(f"Added {user.username} to {group.name}")
            
            groups_map[g["code"]] = group

        # 3. Create On-Call Schedules
        # DevOps: Rajkumar Primary
        now = datetime.utcnow()
        week_start = now - timedelta(days=now.weekday())
        week_end = week_start + timedelta(days=7)

        schedules = [
            {
                "group": "DEVOPS", "user": "rajkumar.madhu@rmadhu.in", 
                "start": week_start, "end": week_end, "primary": True
            },
            {
                "group": "NETOPS", "user": "siva.kadirannagari@finspot.in", 
                "start": week_start, "end": week_end, "primary": True
            },
            {
                "group": "DBA", "user": "rajkumar.ashokan@finspot.in", 
                "start": week_start, "end": week_end, "primary": True
            }
        ]

        for s in schedules:
            if s["group"] in groups_map and s["user"] in users_map:
                schedule = OnCallSchedule(
                    group_id=groups_map[s["group"]].id,
                    user_id=users_map[s["user"]].id,
                    start_time=s["start"],
                    end_time=s["end"],
                    is_primary=s["primary"],
                    created_by=users_map[s["user"]].id
                )
                db.add(schedule)
                print(f"Created on-call schedule for {s['group']}")

        # 4. Create Alerts
        alerts_data = [
            {"title": "High CPU Usage on Core Switch", "severity": AlertSeverity.CRITICAL, "source": "Zabbix", "status": AlertStatus.OPEN},
            {"title": "Database Replication Lag", "severity": AlertSeverity.HIGH, "source": "Prometheus", "status": AlertStatus.ACKNOWLEDGED},
            {"title": "Disk Space Low on Trading Server", "severity": AlertSeverity.MEDIUM, "source": "Nagios", "status": AlertStatus.OPEN},
            {"title": "Backup Successful", "severity": AlertSeverity.INFO, "source": "System", "status": AlertStatus.RESOLVED},
        ]

        for a in alerts_data:
            alert = Alert(
                title=a["title"],
                description=f"Automated alert from {a['source']}",
                severity=a["severity"],
                status=a["status"],
                source=a["source"],
                metadata={}
            )
            db.add(alert)
            print(f"Created alert: {a['title']}")

        db.commit()
        print("Data seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
