"""
On-Call Service for managing schedules, rotations, and escalations.
"""
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone, timedelta, time
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.config import settings
from app.models import (
    OnCallSchedule,
    OnCallScheduleMember,
    OnCallShift,
    OnCallOverride,
    OnCallIncident,
    OnCallHandoffNote,
    EscalationPolicy,
    EscalationLevel,
    User,
    Incident,
    ShiftStatus,
    OverrideStatus,
    RotationType,
)
from app.services.notification_service import notification_service, NotificationEventType

logger = logging.getLogger(__name__)


@dataclass
class OnCallUser:
    """On-call user information."""
    user_id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: str  # primary, secondary, backup
    schedule_id: UUID
    schedule_name: str


@dataclass
class EscalationResult:
    """Result of an escalation action."""
    success: bool
    escalated_to_level: int
    notified_users: List[UUID]
    next_escalation_at: Optional[datetime]
    error: Optional[str] = None


@dataclass
class ScheduleGenerationResult:
    """Result of shift generation."""
    success: bool
    shifts_created: int
    start_date: datetime
    end_date: datetime
    errors: List[str]


class OnCallService:
    """
    Service for managing on-call schedules and escalations.
    """

    async def get_current_on_call(
        self,
        db: Session,
        schedule_id: Optional[UUID] = None,
        client_id: Optional[UUID] = None
    ) -> List[OnCallUser]:
        """
        Get currently on-call users.

        Args:
            db: Database session
            schedule_id: Optional specific schedule
            client_id: Optional client filter

        Returns:
            List of OnCallUser objects
        """
        now = datetime.now(timezone.utc)
        result = []

        # Build query
        query = db.query(OnCallSchedule).filter(OnCallSchedule.is_active == True)

        if schedule_id:
            query = query.filter(OnCallSchedule.id == schedule_id)
        if client_id:
            query = query.filter(OnCallSchedule.client_id == client_id)

        schedules = query.all()

        for schedule in schedules:
            # Check for active shifts first
            active_shifts = db.query(OnCallShift).filter(
                OnCallShift.schedule_id == schedule.id,
                OnCallShift.status.in_([ShiftStatus.SCHEDULED.value, ShiftStatus.ACTIVE.value]),
                OnCallShift.start_time <= now.isoformat(),
                OnCallShift.end_time >= now.isoformat()
            ).order_by(OnCallShift.shift_type).all()

            if active_shifts:
                for shift in active_shifts:
                    user = shift.user
                    if user and user.is_active:
                        result.append(OnCallUser(
                            user_id=user.id,
                            email=user.email,
                            full_name=f"{user.first_name} {user.last_name}",
                            phone=getattr(user, 'phone', None),
                            role=shift.shift_type,
                            schedule_id=schedule.id,
                            schedule_name=schedule.name
                        ))
            else:
                # Calculate from rotation
                users = schedule.get_current_on_call_users(db)
                for i, user in enumerate(users):
                    role = "primary" if i == 0 else "secondary"
                    result.append(OnCallUser(
                        user_id=user.id,
                        email=user.email,
                        full_name=f"{user.first_name} {user.last_name}",
                        phone=getattr(user, 'phone', None),
                        role=role,
                        schedule_id=schedule.id,
                        schedule_name=schedule.name
                    ))

        return result

    async def escalate_incident(
        self,
        db: Session,
        incident_id: UUID,
        escalation_policy_id: Optional[UUID] = None,
        reason: str = None
    ) -> EscalationResult:
        """
        Escalate an incident to the next level.

        Args:
            db: Database session
            incident_id: Incident to escalate
            escalation_policy_id: Optional specific policy
            reason: Reason for escalation

        Returns:
            EscalationResult with status
        """
        try:
            # Get or create on-call incident tracking
            on_call_incident = db.query(OnCallIncident).filter(
                OnCallIncident.incident_id == incident_id
            ).first()

            if not on_call_incident:
                incident = db.query(Incident).filter(Incident.id == incident_id).first()
                if not incident:
                    return EscalationResult(
                        success=False,
                        escalated_to_level=0,
                        notified_users=[],
                        next_escalation_at=None,
                        error="Incident not found"
                    )

                on_call_incident = OnCallIncident(
                    incident_id=incident_id,
                    escalation_policy_id=escalation_policy_id,
                    current_level=0
                )
                db.add(on_call_incident)

            # Get escalation policy
            policy = None
            if escalation_policy_id:
                policy = db.query(EscalationPolicy).filter(
                    EscalationPolicy.id == escalation_policy_id
                ).first()
            elif on_call_incident.escalation_policy_id:
                policy = on_call_incident.escalation_policy

            if not policy:
                # Use default policy for client
                incident = db.query(Incident).filter(Incident.id == incident_id).first()
                if incident and incident.client_id:
                    policy = db.query(EscalationPolicy).filter(
                        EscalationPolicy.client_id == incident.client_id,
                        EscalationPolicy.is_default == True,
                        EscalationPolicy.is_active == True
                    ).first()

            if not policy:
                return EscalationResult(
                    success=False,
                    escalated_to_level=on_call_incident.current_level,
                    notified_users=[],
                    next_escalation_at=None,
                    error="No escalation policy found"
                )

            # Get next level
            current_level = on_call_incident.current_level
            next_level = policy.get_next_level(current_level)

            if not next_level:
                return EscalationResult(
                    success=False,
                    escalated_to_level=current_level,
                    notified_users=[],
                    next_escalation_at=None,
                    error="No more escalation levels"
                )

            # Get users for this level
            target_users = next_level.get_target_users(db)

            if not target_users:
                return EscalationResult(
                    success=False,
                    escalated_to_level=current_level,
                    notified_users=[],
                    next_escalation_at=None,
                    error="No users found for escalation level"
                )

            # Notify users
            notified_user_ids = []
            for user in target_users:
                # Send notifications via configured channels
                channels = next_level.notification_channels or ["email", "in_app"]

                # Record notification
                on_call_incident.add_notification(user.id, channels)
                notified_user_ids.append(user.id)

                # Actually send the notifications
                await notification_service.send_notification(
                    db=db,
                    event_type=NotificationEventType.INCIDENT_ASSIGNED,
                    entity_id=incident_id,
                    entity_type="incident",
                    recipients=[user.id],
                    priority="high"
                )

            # Update tracking
            on_call_incident.add_escalation(
                from_level=current_level,
                to_level=next_level.level_order,
                reason=reason
            )
            on_call_incident.escalation_policy_id = policy.id

            # Calculate next escalation time
            next_next_level = policy.get_next_level(next_level.level_order)
            next_escalation_at = None
            if next_next_level:
                next_escalation_at = datetime.now(timezone.utc) + timedelta(
                    minutes=next_next_level.escalation_delay_minutes
                )

            db.commit()

            return EscalationResult(
                success=True,
                escalated_to_level=next_level.level_order,
                notified_users=notified_user_ids,
                next_escalation_at=next_escalation_at
            )

        except Exception as e:
            logger.error(f"Error escalating incident {incident_id}: {e}")
            return EscalationResult(
                success=False,
                escalated_to_level=0,
                notified_users=[],
                next_escalation_at=None,
                error=str(e)
            )

    async def acknowledge_incident(
        self,
        db: Session,
        incident_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Acknowledge an incident (stops escalation).

        Args:
            db: Database session
            incident_id: Incident ID
            user_id: User acknowledging

        Returns:
            True if successful
        """
        on_call_incident = db.query(OnCallIncident).filter(
            OnCallIncident.incident_id == incident_id
        ).first()

        if not on_call_incident:
            return False

        on_call_incident.acknowledged_by_id = user_id
        on_call_incident.acknowledged_at = datetime.now(timezone.utc).isoformat()

        db.commit()
        return True

    async def generate_shifts(
        self,
        db: Session,
        schedule_id: UUID,
        start_date: datetime,
        end_date: datetime,
        overwrite: bool = False
    ) -> ScheduleGenerationResult:
        """
        Generate shifts for a schedule.

        Args:
            db: Database session
            schedule_id: Schedule to generate for
            start_date: Start of generation period
            end_date: End of generation period
            overwrite: Whether to overwrite existing shifts

        Returns:
            ScheduleGenerationResult
        """
        errors = []

        try:
            schedule = db.query(OnCallSchedule).filter(
                OnCallSchedule.id == schedule_id
            ).first()

            if not schedule:
                return ScheduleGenerationResult(
                    success=False,
                    shifts_created=0,
                    start_date=start_date,
                    end_date=end_date,
                    errors=["Schedule not found"]
                )

            # Get available members
            members = [m for m in schedule.members if m.is_available]
            if not members:
                return ScheduleGenerationResult(
                    success=False,
                    shifts_created=0,
                    start_date=start_date,
                    end_date=end_date,
                    errors=["No available members"]
                )

            # Delete existing shifts if overwrite
            if overwrite:
                db.query(OnCallShift).filter(
                    OnCallShift.schedule_id == schedule_id,
                    OnCallShift.start_time >= start_date.isoformat(),
                    OnCallShift.end_time <= end_date.isoformat(),
                    OnCallShift.status == ShiftStatus.SCHEDULED.value
                ).delete()

            # Generate shifts based on rotation type
            shifts_created = 0
            current_date = start_date
            member_index = 0

            if schedule.rotation_type == RotationType.DAILY.value:
                shift_length = timedelta(days=1)
            elif schedule.rotation_type == RotationType.WEEKLY.value:
                shift_length = timedelta(days=7)
            else:
                shift_length = timedelta(days=schedule.rotation_length_days)

            while current_date < end_date:
                # Create primary shift
                member = members[member_index % len(members)]
                shift_end = min(current_date + shift_length, end_date)

                shift = OnCallShift(
                    schedule_id=schedule_id,
                    user_id=member.user_id,
                    start_time=current_date.isoformat(),
                    end_time=shift_end.isoformat(),
                    shift_type="primary",
                    status=ShiftStatus.SCHEDULED.value
                )
                db.add(shift)
                shifts_created += 1

                # Create secondary shift if we have enough members
                if len(members) > 1:
                    secondary_member = members[(member_index + 1) % len(members)]
                    secondary_shift = OnCallShift(
                        schedule_id=schedule_id,
                        user_id=secondary_member.user_id,
                        start_time=current_date.isoformat(),
                        end_time=shift_end.isoformat(),
                        shift_type="secondary",
                        status=ShiftStatus.SCHEDULED.value
                    )
                    db.add(secondary_shift)
                    shifts_created += 1

                current_date = shift_end
                member_index += 1

            db.commit()

            return ScheduleGenerationResult(
                success=True,
                shifts_created=shifts_created,
                start_date=start_date,
                end_date=end_date,
                errors=errors
            )

        except Exception as e:
            logger.error(f"Error generating shifts: {e}")
            return ScheduleGenerationResult(
                success=False,
                shifts_created=0,
                start_date=start_date,
                end_date=end_date,
                errors=[str(e)]
            )

    async def create_override(
        self,
        db: Session,
        schedule_id: UUID,
        original_user_id: UUID,
        replacement_user_id: Optional[UUID],
        start_time: datetime,
        end_time: datetime,
        override_type: str,
        reason: str = None,
        created_by_id: UUID = None
    ) -> OnCallOverride:
        """
        Create a schedule override.

        Args:
            db: Database session
            schedule_id: Schedule ID
            original_user_id: User being replaced
            replacement_user_id: User taking over (None for removal)
            start_time: Override start
            end_time: Override end
            override_type: Type of override
            reason: Reason for override
            created_by_id: User creating the override

        Returns:
            Created OnCallOverride
        """
        override = OnCallOverride(
            schedule_id=schedule_id,
            original_user_id=original_user_id,
            replacement_user_id=replacement_user_id,
            start_time=start_time.isoformat(),
            end_time=end_time.isoformat(),
            override_type=override_type,
            reason=reason,
            status=OverrideStatus.APPROVED.value,
            created_by_id=created_by_id
        )

        db.add(override)

        # Update affected shifts
        affected_shifts = db.query(OnCallShift).filter(
            OnCallShift.schedule_id == schedule_id,
            OnCallShift.user_id == original_user_id,
            OnCallShift.status == ShiftStatus.SCHEDULED.value,
            or_(
                and_(
                    OnCallShift.start_time >= start_time.isoformat(),
                    OnCallShift.start_time < end_time.isoformat()
                ),
                and_(
                    OnCallShift.end_time > start_time.isoformat(),
                    OnCallShift.end_time <= end_time.isoformat()
                )
            )
        ).all()

        for shift in affected_shifts:
            if replacement_user_id:
                # Create override shift
                override_shift = OnCallShift(
                    schedule_id=schedule_id,
                    user_id=replacement_user_id,
                    start_time=max(shift.start_time, start_time.isoformat()),
                    end_time=min(shift.end_time, end_time.isoformat()),
                    shift_type="override",
                    original_user_id=original_user_id,
                    override_id=override.id,
                    status=ShiftStatus.SCHEDULED.value
                )
                db.add(override_shift)
            else:
                # Mark original shift as cancelled
                shift.status = ShiftStatus.CANCELLED.value

        db.commit()
        db.refresh(override)

        return override

    async def create_handoff_note(
        self,
        db: Session,
        schedule_id: UUID,
        from_user_id: UUID,
        to_user_id: UUID,
        summary: str = None,
        notes: str = None,
        open_incidents: List[Dict] = None,
        ongoing_issues: List[Dict] = None,
        action_items: List[Dict] = None
    ) -> OnCallHandoffNote:
        """
        Create a shift handoff note.

        Args:
            db: Database session
            schedule_id: Schedule ID
            from_user_id: User handing off
            to_user_id: User receiving
            summary: Handoff summary
            notes: Additional notes
            open_incidents: List of open incident summaries
            ongoing_issues: List of ongoing issues
            action_items: List of action items

        Returns:
            Created OnCallHandoffNote
        """
        handoff = OnCallHandoffNote(
            schedule_id=schedule_id,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            handoff_time=datetime.now(timezone.utc).isoformat(),
            summary=summary,
            notes=notes,
            open_incidents=open_incidents or [],
            ongoing_issues=ongoing_issues or [],
            action_items=action_items or []
        )

        db.add(handoff)
        db.commit()
        db.refresh(handoff)

        # Notify the receiving user
        await notification_service.send_notification(
            db=db,
            event_type=NotificationEventType.ASSET_MAINTENANCE_START,  # Reuse event type
            entity_id=handoff.id,
            entity_type="handoff",
            recipients=[to_user_id],
            context={
                "handoff": handoff,
                "from_user_name": f"User {from_user_id}"
            }
        )

        return handoff

    async def get_schedule_calendar(
        self,
        db: Session,
        schedule_id: UUID,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Get calendar view of shifts for a schedule.

        Args:
            db: Database session
            schedule_id: Schedule ID
            start_date: Calendar start
            end_date: Calendar end

        Returns:
            List of shift events for calendar
        """
        shifts = db.query(OnCallShift).filter(
            OnCallShift.schedule_id == schedule_id,
            OnCallShift.status != ShiftStatus.CANCELLED.value,
            OnCallShift.start_time >= start_date.isoformat(),
            OnCallShift.end_time <= end_date.isoformat()
        ).all()

        schedule = db.query(OnCallSchedule).filter(
            OnCallSchedule.id == schedule_id
        ).first()

        events = []
        for shift in shifts:
            user = shift.user
            events.append({
                "id": str(shift.id),
                "title": f"{user.first_name} {user.last_name}" if user else "Unknown",
                "start": shift.start_time,
                "end": shift.end_time,
                "type": shift.shift_type,
                "status": shift.status,
                "color": schedule.color if schedule else "#3B82F6",
                "user_id": str(shift.user_id),
                "user_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
                "user_email": user.email if user else None
            })

        return events

    async def get_on_call_analytics(
        self,
        db: Session,
        user_id: Optional[UUID] = None,
        schedule_id: Optional[UUID] = None,
        client_id: Optional[UUID] = None,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> Dict[str, Any]:
        """
        Get on-call analytics.

        Args:
            db: Database session
            user_id: Optional user filter
            schedule_id: Optional schedule filter
            client_id: Optional client filter
            start_date: Period start
            end_date: Period end

        Returns:
            Analytics dictionary
        """
        if not start_date:
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
        if not end_date:
            end_date = datetime.now(timezone.utc)

        # Build query for on-call incidents
        query = db.query(OnCallIncident).filter(
            OnCallIncident.created_at >= start_date.isoformat(),
            OnCallIncident.created_at <= end_date.isoformat()
        )

        if schedule_id:
            query = query.filter(OnCallIncident.schedule_id == schedule_id)

        if user_id:
            query = query.filter(
                or_(
                    OnCallIncident.acknowledged_by_id == user_id,
                    OnCallIncident.resolved_by_id == user_id
                )
            )

        incidents = query.all()

        # Calculate metrics
        total_incidents = len(incidents)
        acknowledged = [i for i in incidents if i.acknowledged_at]
        escalated = [i for i in incidents if len(i.escalations or []) > 0]

        # Time to acknowledge calculations
        tta_values = []
        for incident in acknowledged:
            if incident.acknowledged_at and incident.created_at:
                ack_time = datetime.fromisoformat(incident.acknowledged_at.replace('Z', '+00:00'))
                created = datetime.fromisoformat(str(incident.created_at).replace('Z', '+00:00'))
                tta = (ack_time - created).total_seconds()
                tta_values.append(tta)

        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_incidents": total_incidents,
            "acknowledged_count": len(acknowledged),
            "escalated_count": len(escalated),
            "acknowledgement_rate": len(acknowledged) / total_incidents * 100 if total_incidents > 0 else 0,
            "avg_time_to_acknowledge_seconds": sum(tta_values) / len(tta_values) if tta_values else None,
            "min_time_to_acknowledge_seconds": min(tta_values) if tta_values else None,
            "max_time_to_acknowledge_seconds": max(tta_values) if tta_values else None,
            "escalation_rate": len(escalated) / total_incidents * 100 if total_incidents > 0 else 0
        }


# Singleton instance
on_call_service = OnCallService()
