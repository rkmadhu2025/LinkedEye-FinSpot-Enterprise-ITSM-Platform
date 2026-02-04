"""
Notification Service for orchestrating multi-channel notifications.
"""
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.email_service import email_service, EmailResult

logger = logging.getLogger(__name__)


class NotificationEventType(str, Enum):
    """All notification event types."""
    # Incident Events
    INCIDENT_CREATED = "incident_created"
    INCIDENT_ASSIGNED = "incident_assigned"
    INCIDENT_UPDATED = "incident_updated"
    INCIDENT_RESOLVED = "incident_resolved"
    INCIDENT_CLOSED = "incident_closed"
    INCIDENT_SLA_WARNING = "incident_sla_warning"
    INCIDENT_SLA_BREACHED = "incident_sla_breached"
    INCIDENT_REOPENED = "incident_reopened"

    # Change Events
    CHANGE_SUBMITTED = "change_submitted"
    CHANGE_PENDING_APPROVAL = "change_pending_approval"
    CHANGE_APPROVED = "change_approved"
    CHANGE_REJECTED = "change_rejected"
    CHANGE_SCHEDULED = "change_scheduled"
    CHANGE_STARTED = "change_started"
    CHANGE_COMPLETED = "change_completed"
    CHANGE_FAILED = "change_failed"
    CHANGE_ROLLBACK = "change_rollback"

    # Problem Events
    PROBLEM_CREATED = "problem_created"
    PROBLEM_ROOT_CAUSE_IDENTIFIED = "problem_root_cause_identified"
    PROBLEM_RESOLVED = "problem_resolved"

    # Alert Events
    ALERT_FIRED = "alert_fired"
    ALERT_RESOLVED = "alert_resolved"
    ALERT_ACKNOWLEDGED = "alert_acknowledged"

    # Asset Events
    ASSET_HEALTH_DEGRADED = "asset_health_degraded"
    ASSET_DOWN = "asset_down"
    ASSET_MAINTENANCE_START = "asset_maintenance_start"
    ASSET_MAINTENANCE_END = "asset_maintenance_end"


# Event type to template mapping
EVENT_TEMPLATE_MAP = {
    NotificationEventType.INCIDENT_CREATED: "incident_created",
    NotificationEventType.INCIDENT_ASSIGNED: "incident_assigned",
    NotificationEventType.INCIDENT_RESOLVED: "incident_resolved",
    NotificationEventType.INCIDENT_SLA_WARNING: "incident_sla_warning",
    NotificationEventType.INCIDENT_SLA_BREACHED: "incident_sla_breached",
    NotificationEventType.CHANGE_APPROVED: "change_approved",
    NotificationEventType.CHANGE_REJECTED: "change_rejected",
    NotificationEventType.CHANGE_SCHEDULED: "change_scheduled",
    NotificationEventType.PROBLEM_ROOT_CAUSE_IDENTIFIED: "problem_root_cause_identified",
    NotificationEventType.ALERT_FIRED: "alert_fired",
    NotificationEventType.ALERT_RESOLVED: "alert_resolved",
}

# Event type to severity mapping
EVENT_SEVERITY_MAP = {
    NotificationEventType.INCIDENT_CREATED: "medium",
    NotificationEventType.INCIDENT_SLA_WARNING: "high",
    NotificationEventType.INCIDENT_SLA_BREACHED: "critical",
    NotificationEventType.ALERT_FIRED: "high",
    NotificationEventType.ASSET_DOWN: "critical",
    NotificationEventType.CHANGE_FAILED: "high",
}


@dataclass
class NotificationRecipient:
    """Notification recipient with preferences."""
    user_id: UUID
    email: str
    full_name: str
    channels: List[str]  # ["email", "in_app", "slack"]


@dataclass
class SuppressionResult:
    """Result of suppression check."""
    is_suppressed: bool
    suppression_id: Optional[UUID] = None
    reason: Optional[str] = None


@dataclass
class NotificationResult:
    """Result of notification send operation."""
    success: bool
    notifications_created: int = 0
    emails_sent: int = 0
    errors: List[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class NotificationService:
    """
    Central notification orchestration service.

    Handles:
    - Event processing and routing
    - Suppression checking
    - User preference validation
    - Multi-channel delivery
    - Notification logging
    """

    def __init__(self):
        self.email_service = email_service

    async def send_notification(
        self,
        db: Session,
        event_type: NotificationEventType,
        entity_id: UUID,
        entity_type: str,
        recipients: Optional[List[UUID]] = None,
        context: Optional[Dict[str, Any]] = None,
        priority: str = "normal"
    ) -> NotificationResult:
        """
        Process a notification event and send to appropriate channels.

        Args:
            db: Database session
            event_type: Type of notification event
            entity_id: ID of the related entity
            entity_type: Type of entity (incident, change, problem, etc.)
            recipients: Optional list of user IDs (auto-determines if None)
            context: Additional context for template rendering
            priority: Notification priority

        Returns:
            NotificationResult with delivery statistics
        """
        result = NotificationResult(success=True)
        context = context or {}

        try:
            # Enrich context with entity data
            enriched_context = await self.enrich_notification_context(
                db, entity_type, entity_id, context
            )

            # Determine recipients if not provided
            if recipients is None:
                recipient_list = await self.get_notification_recipients(
                    db, entity_type, entity_id, event_type
                )
            else:
                recipient_list = await self._get_recipients_by_ids(db, recipients)

            # Get event severity
            severity = EVENT_SEVERITY_MAP.get(event_type, "medium")

            for recipient in recipient_list:
                try:
                    # Check user preferences
                    prefs = await self._get_user_preferences(db, recipient.user_id)

                    # Process each channel
                    for channel in recipient.channels:
                        if not await self.check_user_preferences(
                            prefs, event_type, channel, severity
                        ):
                            continue

                        # Check quiet hours (except for critical)
                        if channel == "email" and prefs and prefs.quiet_hours_enabled:
                            if prefs.is_quiet_hours() and severity != "critical":
                                continue

                        # Create in-app notification
                        if channel == "in_app":
                            await self._create_in_app_notification(
                                db, recipient.user_id, event_type,
                                entity_type, entity_id, enriched_context, priority
                            )
                            result.notifications_created += 1

                        # Send email notification
                        elif channel == "email":
                            template_name = EVENT_TEMPLATE_MAP.get(event_type)
                            if template_name:
                                # Generate consistent title for email subject
                                email_subject = self._generate_notification_title(event_type, enriched_context)
                                
                                email_result = await self.email_service.send_templated_email(
                                    to=[recipient.email],
                                    template_name=template_name,
                                    context=enriched_context,
                                    priority="high" if severity in ["critical", "high"] else "normal",
                                    subject=email_subject
                                )

                                # Log email delivery
                                await self._log_notification_delivery(
                                    db, recipient.user_id, "email",
                                    email_result, event_type, entity_type, entity_id,
                                    recipient.email
                                )

                                if email_result.success:
                                    result.emails_sent += 1
                                else:
                                    result.errors.append(f"Email to {recipient.email}: {email_result.error}")

                        # Send Slack notification
                        elif channel == "slack" and prefs and prefs.slack_webhook_url:
                            await self._send_slack_notification(
                                prefs.slack_webhook_url,
                                prefs.slack_channel,
                                event_type, enriched_context
                            )

                except Exception as e:
                    logger.error(f"Error notifying recipient {recipient.user_id}: {e}")
                    result.errors.append(f"Recipient {recipient.user_id}: {str(e)}")

            db.commit()
            result.success = len(result.errors) == 0

        except Exception as e:
            logger.error(f"Error processing notification event {event_type}: {e}")
            result.success = False
            result.errors.append(str(e))

        return result

    async def check_suppression(
        self,
        db: Session,
        asset_id: Optional[UUID] = None,
        device_id: Optional[UUID] = None,
        environment_id: Optional[UUID] = None,
        severity: str = None
    ) -> SuppressionResult:
        """
        Check if alerts should be suppressed for a target.

        Args:
            db: Database session
            asset_id: Asset ID to check
            device_id: Network device ID to check
            environment_id: Environment ID to check
            severity: Alert severity level

        Returns:
            SuppressionResult indicating if suppressed
        """
        from app.models import AlertSuppression

        query = db.query(AlertSuppression).filter(
            AlertSuppression.is_active == True
        )

        # Build OR conditions for targets
        conditions = []
        if asset_id:
            conditions.append(AlertSuppression.asset_id == asset_id)
        if device_id:
            conditions.append(AlertSuppression.network_device_id == device_id)
        if environment_id:
            conditions.append(AlertSuppression.environment_id == environment_id)

        if not conditions:
            return SuppressionResult(is_suppressed=False)

        from sqlalchemy import or_
        query = query.filter(or_(*conditions))

        # Check for active, non-expired suppressions
        now = datetime.now(timezone.utc)
        query = query.filter(
            AlertSuppression.start_time <= now
        ).filter(
            (AlertSuppression.end_time == None) | (AlertSuppression.end_time > now)
        )

        suppression = query.first()

        if suppression:
            # Check severity filter
            if severity and suppression.severity_filter:
                if severity.lower() not in [s.lower() for s in suppression.severity_filter]:
                    return SuppressionResult(is_suppressed=False)

            # Increment suppressed count
            suppression.suppressed_count += 1
            db.commit()

            return SuppressionResult(
                is_suppressed=True,
                suppression_id=suppression.id,
                reason=suppression.reason
            )

        return SuppressionResult(is_suppressed=False)

    async def check_user_preferences(
        self,
        prefs,
        event_type: NotificationEventType,
        channel: str,
        severity: str
    ) -> bool:
        """
        Check if user preferences allow notification.

        Args:
            prefs: NotificationPreference object or None
            event_type: Type of event
            channel: Notification channel
            severity: Event severity

        Returns:
            True if notification should be sent
        """
        if prefs is None:
            return True  # Default to sending if no preferences

        # Map event type to category
        event_category_map = {
            "incident": ["incident_created", "incident_assigned", "incident_updated",
                        "incident_resolved", "incident_closed", "incident_sla_warning",
                        "incident_sla_breached", "incident_reopened"],
            "change": ["change_submitted", "change_pending_approval", "change_approved",
                      "change_rejected", "change_scheduled", "change_started",
                      "change_completed", "change_failed", "change_rollback"],
            "problem": ["problem_created", "problem_root_cause_identified", "problem_resolved"],
            "alert": ["alert_fired", "alert_resolved", "alert_acknowledged"],
            "asset": ["asset_health_degraded", "asset_down", "asset_maintenance_start",
                     "asset_maintenance_end"]
        }

        event_name = event_type.value if hasattr(event_type, 'value') else str(event_type)

        # Determine event category
        event_category = None
        for category, events in event_category_map.items():
            if event_name in events:
                event_category = category
                break

        return prefs.should_notify(event_category or "incident", severity, channel)

    async def get_notification_recipients(
        self,
        db: Session,
        entity_type: str,
        entity_id: UUID,
        event_type: NotificationEventType
    ) -> List[NotificationRecipient]:
        """
        Determine recipients for a notification based on entity and event type.

        Args:
            db: Database session
            entity_type: Type of entity
            entity_id: Entity ID
            event_type: Notification event type

        Returns:
            List of NotificationRecipient objects
        """
        from app.models import User, Incident, Change, Problem

        recipients = []
        user_ids = set()

        if entity_type == "incident":
            incident = db.query(Incident).filter(Incident.id == entity_id).first()
            if incident:
                # Add assigned user
                if incident.assigned_to_id:
                    user_ids.add(incident.assigned_to_id)
                # Add creator
                if incident.created_by_id:
                    user_ids.add(incident.created_by_id)

        elif entity_type == "change":
            change = db.query(Change).filter(Change.id == entity_id).first()
            if change:
                if change.requested_by_id:
                    user_ids.add(change.requested_by_id)
                if change.assigned_to_id:
                    user_ids.add(change.assigned_to_id)
                if change.change_manager_id:
                    user_ids.add(change.change_manager_id)

        elif entity_type == "problem":
            problem = db.query(Problem).filter(Problem.id == entity_id).first()
            if problem:
                if problem.assigned_to_id:
                    user_ids.add(problem.assigned_to_id)
                if problem.created_by_id:
                    user_ids.add(problem.created_by_id)

        # Fetch users and build recipient list
        for user_id in user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.is_active:
                recipients.append(NotificationRecipient(
                    user_id=user.id,
                    email=user.email,
                    full_name=f"{user.first_name} {user.last_name}",
                    channels=["email", "in_app"]
                ))

        return recipients

    async def enrich_notification_context(
        self,
        db: Session,
        entity_type: str,
        entity_id: UUID,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Enrich notification context with entity data.

        Args:
            db: Database session
            entity_type: Type of entity
            entity_id: Entity ID
            context: Existing context

        Returns:
            Enriched context dictionary
        """
        from app.models import Incident, Change, Problem, Alert, Asset, User

        enriched = {**context, "app_url": settings.app_url}

        if entity_type == "incident":
            incident = db.query(Incident).filter(Incident.id == entity_id).first()
            if incident:
                enriched["incident"] = incident
                if incident.assigned_to_id:
                    assigned_user = db.query(User).filter(User.id == incident.assigned_to_id).first()
                    enriched["assigned_user"] = assigned_user
                if incident.created_by_id:
                    created_by = db.query(User).filter(User.id == incident.created_by_id).first()
                    enriched["created_by"] = created_by

                # Get affected assets
                if incident.affected_assets:
                    asset_ids = incident.affected_assets
                    if isinstance(asset_ids, list):
                        assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
                        enriched["affected_assets"] = assets

        elif entity_type == "change":
            change = db.query(Change).filter(Change.id == entity_id).first()
            if change:
                enriched["change"] = change
                if change.requested_by_id:
                    requested_by = db.query(User).filter(User.id == change.requested_by_id).first()
                    enriched["requested_by"] = requested_by
                if change.assigned_to_id:
                    assigned_user = db.query(User).filter(User.id == change.assigned_to_id).first()
                    enriched["assigned_user"] = assigned_user

        elif entity_type == "problem":
            problem = db.query(Problem).filter(Problem.id == entity_id).first()
            if problem:
                enriched["problem"] = problem
                if problem.assigned_to_id:
                    assigned_user = db.query(User).filter(User.id == problem.assigned_to_id).first()
                    enriched["assigned_user"] = assigned_user

        elif entity_type == "alert":
            alert = db.query(Alert).filter(Alert.id == entity_id).first()
            if alert:
                enriched["alert"] = alert
                if alert.asset_id:
                    asset = db.query(Asset).filter(Asset.id == alert.asset_id).first()
                    enriched["asset"] = asset

        return enriched

    async def _get_recipients_by_ids(
        self,
        db: Session,
        user_ids: List[UUID]
    ) -> List[NotificationRecipient]:
        """Get recipients by user IDs."""
        from app.models import User

        recipients = []
        for user_id in user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.is_active:
                recipients.append(NotificationRecipient(
                    user_id=user.id,
                    email=user.email,
                    full_name=f"{user.first_name} {user.last_name}",
                    channels=["email", "in_app"]
                ))
        return recipients

    async def _get_user_preferences(self, db: Session, user_id: UUID):
        """Get user notification preferences."""
        from app.models import NotificationPreference

        return db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).first()

    async def _create_in_app_notification(
        self,
        db: Session,
        user_id: UUID,
        event_type: NotificationEventType,
        entity_type: str,
        entity_id: UUID,
        context: Dict[str, Any],
        priority: str
    ):
        """Create an in-app notification."""
        from app.models import Notification

        # Generate title and message based on event type
        title = self._generate_notification_title(event_type, context)
        message = self._generate_notification_message(event_type, context)

        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=entity_type,
            action_url=f"/{entity_type}s/{entity_id}",
            meta_data={
                "event_type": event_type.value if hasattr(event_type, 'value') else str(event_type),
                "entity_id": str(entity_id),
                "entity_type": entity_type
            }
        )
        db.add(notification)

    async def _log_notification_delivery(
        self,
        db: Session,
        user_id: UUID,
        channel: str,
        result: EmailResult,
        event_type: NotificationEventType,
        entity_type: str,
        entity_id: UUID,
        email_to: Optional[str] = None
    ):
        """Log notification delivery attempt."""
        from app.models import NotificationLog

        log = NotificationLog(
            user_id=user_id,
            channel=channel,
            status="sent" if result.success else "failed",
            email_to=email_to,
            email_message_id=result.message_id,
            sent_at=result.sent_at,
            failure_reason=result.error,
            event_type=event_type.value if hasattr(event_type, 'value') else str(event_type),
            entity_type=entity_type,
            entity_id=entity_id
        )

        if not result.success:
            log.failed_at = datetime.now(timezone.utc)

        db.add(log)

    async def _send_slack_notification(
        self,
        webhook_url: str,
        channel: Optional[str],
        event_type: NotificationEventType,
        context: Dict[str, Any]
    ):
        """Send notification to Slack webhook."""
        import httpx

        title = self._generate_notification_title(event_type, context)
        message = self._generate_notification_message(event_type, context)

        payload = {
            "text": f"*{title}*\n{message}",
            "username": "LinkedEye ITSM",
            "icon_emoji": ":bell:"
        }

        if channel:
            payload["channel"] = channel

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")

    def _generate_notification_title(
        self,
        event_type: NotificationEventType,
        context: Dict[str, Any]
    ) -> str:
        """Generate notification title based on event type."""
        event_name = event_type.value if hasattr(event_type, 'value') else str(event_type)

        title_map = {
            "incident_created": "New Incident Created",
            "incident_assigned": "Incident Assigned",
            "incident_resolved": "Incident Resolved",
            "incident_sla_warning": "SLA Warning",
            "incident_sla_breached": "SLA Breached",
            "change_approved": "Change Approved",
            "change_rejected": "Change Rejected",
            "problem_root_cause_identified": "Root Cause Identified",
            "alert_fired": "Alert Fired",
            "alert_resolved": "Alert Resolved",
        }

        base_title = title_map.get(event_name, event_name.replace("_", " ").title())

        # Add entity number if available
        if "incident" in context and hasattr(context["incident"], "number"):
            base_title += f" - {context['incident'].number}"

            # Add asset details if available
            if "affected_assets" in context and context["affected_assets"]:
                # Use the first asset for the subject line to keep it concise
                asset = context["affected_assets"][0]
                details = []
                if asset.hostname:
                    details.append(asset.hostname)
                if asset.ip_address:
                    details.append(str(asset.ip_address))
                
                if details:
                    base_title += f" - {' - '.join(details)}"
        elif "change" in context and hasattr(context["change"], "number"):
            base_title += f" - {context['change'].number}"
        elif "problem" in context and hasattr(context["problem"], "number"):
            base_title += f" - {context['problem'].number}"

        return base_title

    def _generate_notification_message(
        self,
        event_type: NotificationEventType,
        context: Dict[str, Any]
    ) -> str:
        """Generate notification message based on event type."""
        event_name = event_type.value if hasattr(event_type, 'value') else str(event_type)

        if "incident" in context:
            incident = context["incident"]
            title = getattr(incident, "title", "")
            return f"Incident: {title}"
        elif "change" in context:
            change = context["change"]
            title = getattr(change, "title", "")
            return f"Change: {title}"
        elif "problem" in context:
            problem = context["problem"]
            title = getattr(problem, "title", "")
            return f"Problem: {title}"
        elif "alert" in context:
            alert = context["alert"]
            title = getattr(alert, "title", "")
            return f"Alert: {title}"

        return event_name.replace("_", " ").title()


# Singleton instance
notification_service = NotificationService()
