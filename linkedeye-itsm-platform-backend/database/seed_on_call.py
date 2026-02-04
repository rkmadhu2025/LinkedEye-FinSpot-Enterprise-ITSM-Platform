import logging
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User
from app.models.group import Group
from app.models.on_call import OnCallSchedule, EscalationPolicy, EscalationLevel, Urgency, EscalationTargetType
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_oncall():
    try:
        engine = create_engine(str(settings.database_url))
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        logger.info("Starting On-Call seeding...")

        # 1. Ensure User exists
        admin_user = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin_user:
            logger.info("Creating admin user...")
            admin_user = User(
                email="admin@example.com",
                hashed_password=get_password_hash("password"),
                first_name="Admin",
                last_name="User",
                is_active=True,
                is_superuser=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        
        # 2. Ensure Group exists
        devops_group = db.query(Group).filter(Group.name == "DevOps Team").first()
        if not devops_group:
            logger.info("Creating DevOps group...")
            devops_group = Group(
                name="DevOps Team",
                description="Core infrastructure team",
                organization_id=None # Assuming global or single-tenant for now
            )
            db.add(devops_group)
            db.commit()
            db.refresh(devops_group)

        # 3. Create On-Call Schedule
        # Active schedule (Now +/- 7 days)
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(days=1)
        end_time = now + timedelta(days=7)
        
        schedule = db.query(OnCallSchedule).filter(
            OnCallSchedule.user_id == admin_user.id,
            OnCallSchedule.group_id == devops_group.id
        ).first()

        if not schedule:
            logger.info("Creating On-Call Schedule...")
            schedule = OnCallSchedule(
                user_id=admin_user.id,
                group_id=devops_group.id,
                start_time=start_time,
                end_time=end_time,
                is_primary=True,
                notes="Primary on-call rotation for this week",
                created_by=admin_user.id
            )
            db.add(schedule)
            db.commit()
            logger.info("On-Call Schedule created.")
        else:
            logger.info("On-Call Schedule already exists.")

        # 4. Create Escalation Policy
        policy = db.query(EscalationPolicy).filter(EscalationPolicy.name == "Default DevOps Policy").first()
        if not policy:
            logger.info("Creating Escalation Policy...")
            policy = EscalationPolicy(
                name="Default DevOps Policy",
                description="Standard escalation for infrastructure incidents",
                repeat_count=3,
                repeat_interval_minutes=15,
                default_urgency=Urgency.HIGH.value,
                is_default=True,
                created_by_id=admin_user.id
            )
            db.add(policy)
            db.commit()
            db.refresh(policy)

            # Add Level 1
            level1 = EscalationLevel(
                policy_id=policy.id,
                level_order=1,
                escalation_delay_minutes=0,
                target_type=EscalationTargetType.USER.value,
                target_user_id=admin_user.id,
                notification_channels=["email"]
            )
            db.add(level1)
            
            # Add Level 2
            level2 = EscalationLevel(
                policy_id=policy.id,
                level_order=2,
                escalation_delay_minutes=15,
                target_type=EscalationTargetType.GROUP.value,
                target_group_id=devops_group.id,
                notification_channels=["email", "sms"]
            )
            db.add(level2)
            
            db.commit()
            logger.info("Escalation Policy seeded.")
        else:
            logger.info("Escalation Policy already exists.")

        logger.info("On-Call seeding completed successfully!")

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_oncall()
