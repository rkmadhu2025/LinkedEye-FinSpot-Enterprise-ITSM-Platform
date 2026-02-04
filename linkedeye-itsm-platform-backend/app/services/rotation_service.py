"""
On-Call Rotation Service

Provides rotation calculation, shift generation, coverage gap detection,
and handoff management.
"""
from datetime import datetime, timezone, timedelta, time
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.models.on_call import (
    OnCallSchedule, OnCallScheduleMember, OnCallShift, OnCallOverride,
    OnCallHandoffNote, RotationType, ShiftType, ShiftStatus, OverrideStatus
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class RotationService:
    """Service for on-call rotation management."""

    @staticmethod
    def get_current_on_call(
        db: Session,
        schedule_id: str,
        at_time: Optional[datetime] = None
    ) -> Optional[OnCallScheduleMember]:
        """Determine who is currently on-call based on rotation rules."""
        if at_time is None:
            at_time = datetime.now(timezone.utc)

        schedule = db.query(OnCallSchedule).filter(
            OnCallSchedule.id == schedule_id
        ).first()
        if not schedule:
            return None

        # Check for active overrides first
        overrides = db.query(OnCallOverride).filter(
            OnCallOverride.schedule_id == schedule_id,
            OnCallOverride.status == OverrideStatus.APPROVED.value,
        ).all()

        for override in overrides:
            start = datetime.fromisoformat(override.start_time) if isinstance(override.start_time, str) else override.start_time
            end = datetime.fromisoformat(override.end_time) if isinstance(override.end_time, str) else override.end_time
            if start <= at_time <= end and override.replacement_user_id:
                # Return the override member
                member = db.query(OnCallScheduleMember).filter(
                    OnCallScheduleMember.schedule_id == schedule_id,
                    OnCallScheduleMember.user_id == override.replacement_user_id
                ).first()
                if member:
                    return member

        # Get active members ordered by rotation_order
        members = db.query(OnCallScheduleMember).filter(
            OnCallScheduleMember.schedule_id == schedule_id,
            OnCallScheduleMember.is_available == True
        ).order_by(OnCallScheduleMember.rotation_order).all()

        if not members:
            return None

        if len(members) == 1:
            return members[0]

        # Calculate rotation position based on schedule start and rotation length
        if schedule.start_time:
            start = schedule.start_time if hasattr(schedule.start_time, 'timestamp') else datetime.fromisoformat(str(schedule.start_time))
            elapsed = at_time - start
            rotation_days = 7  # Default weekly
            position = (elapsed.days // rotation_days) % len(members)
            return members[position]

        return members[0]

    @staticmethod
    def generate_shifts(
        db: Session,
        schedule_id: str,
        start_date: datetime,
        end_date: datetime,
        rotation_days: int = 7
    ) -> List[OnCallShift]:
        """Generate shift records for a date range based on rotation."""
        schedule = db.query(OnCallSchedule).filter(
            OnCallSchedule.id == schedule_id
        ).first()
        if not schedule:
            return []

        members = db.query(OnCallScheduleMember).filter(
            OnCallScheduleMember.schedule_id == schedule_id,
            OnCallScheduleMember.is_available == True
        ).order_by(OnCallScheduleMember.rotation_order).all()

        if not members:
            return []

        shifts = []
        current = start_date
        position = 0

        while current < end_date:
            shift_end = min(current + timedelta(days=rotation_days), end_date)
            member = members[position % len(members)]

            shift = OnCallShift(
                schedule_id=schedule_id,
                user_id=member.user_id,
                start_time=current.isoformat(),
                end_time=shift_end.isoformat(),
                shift_type=ShiftType.PRIMARY.value,
                status=ShiftStatus.SCHEDULED.value,
            )
            db.add(shift)
            shifts.append(shift)

            current = shift_end
            position += 1

        db.flush()
        logger.info(f"Generated {len(shifts)} shifts for schedule {schedule_id}")
        return shifts

    @staticmethod
    def detect_coverage_gaps(
        db: Session,
        schedule_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Find time periods with no on-call coverage."""
        shifts = db.query(OnCallShift).filter(
            OnCallShift.schedule_id == schedule_id,
            OnCallShift.status.in_([ShiftStatus.SCHEDULED.value, ShiftStatus.ACTIVE.value])
        ).order_by(OnCallShift.start_time).all()

        gaps = []

        if not shifts:
            gaps.append({
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "duration_hours": (end_date - start_date).total_seconds() / 3600
            })
            return gaps

        # Check gap before first shift
        first_start = datetime.fromisoformat(shifts[0].start_time) if isinstance(shifts[0].start_time, str) else shifts[0].start_time
        if first_start > start_date:
            gaps.append({
                "start": start_date.isoformat(),
                "end": first_start.isoformat(),
                "duration_hours": (first_start - start_date).total_seconds() / 3600
            })

        # Check gaps between shifts
        for i in range(len(shifts) - 1):
            current_end = datetime.fromisoformat(shifts[i].end_time) if isinstance(shifts[i].end_time, str) else shifts[i].end_time
            next_start = datetime.fromisoformat(shifts[i + 1].start_time) if isinstance(shifts[i + 1].start_time, str) else shifts[i + 1].start_time

            if current_end < next_start:
                gaps.append({
                    "start": current_end.isoformat(),
                    "end": next_start.isoformat(),
                    "duration_hours": (next_start - current_end).total_seconds() / 3600
                })

        # Check gap after last shift
        last_end = datetime.fromisoformat(shifts[-1].end_time) if isinstance(shifts[-1].end_time, str) else shifts[-1].end_time
        if last_end < end_date:
            gaps.append({
                "start": last_end.isoformat(),
                "end": end_date.isoformat(),
                "duration_hours": (end_date - last_end).total_seconds() / 3600
            })

        return gaps

    @staticmethod
    def perform_handoff(
        db: Session,
        schedule_id: str,
        from_user_id: str,
        to_user_id: str,
        summary: str = "",
        open_incidents: list = None,
        action_items: list = None
    ) -> OnCallHandoffNote:
        """Create a handoff note between on-call shifts."""
        note = OnCallHandoffNote(
            schedule_id=schedule_id,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            handoff_time=datetime.now(timezone.utc).isoformat(),
            summary=summary,
            open_incidents=open_incidents or [],
            action_items=action_items or [],
        )
        db.add(note)
        db.flush()
        logger.info(f"Handoff note created: {from_user_id} -> {to_user_id}")
        return note
