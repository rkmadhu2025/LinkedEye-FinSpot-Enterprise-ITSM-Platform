"""
Alert Intelligence Service

Provides fingerprinting, deduplication, correlation, and noise reduction logic.
"""
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.alert_intelligence import (
    AlertGroup, AlertCorrelation, AlertNoiseStats,
    AlertGroupStatus, CorrelationType
)
from app.models.monitoring_alert import MonitoringAlert
from app.core.logging import get_logger

logger = get_logger(__name__)


class AlertIntelligenceService:
    """Service for alert deduplication, grouping, and correlation."""

    @staticmethod
    def compute_fingerprint(source: str, alertname: str, instance: str = "") -> str:
        """Compute SHA256 fingerprint for deduplication."""
        raw = f"{source}:{alertname}:{instance}".lower().strip()
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    @staticmethod
    def process_alert(
        db: Session,
        alert_id: str,
        source: str,
        alertname: str,
        instance: str = "",
        severity: str = "medium",
        title: str = "",
        labels: dict = None,
        client_id: str = None
    ) -> AlertGroup:
        """Process an incoming alert: deduplicate or create new group."""
        fingerprint = AlertIntelligenceService.compute_fingerprint(source, alertname, instance)

        # Check for existing active group
        group = db.query(AlertGroup).filter(
            AlertGroup.fingerprint == fingerprint,
            AlertGroup.status.in_([AlertGroupStatus.ACTIVE.value, AlertGroupStatus.ACKNOWLEDGED.value])
        ).first()

        now = datetime.now(timezone.utc)

        if group:
            # Deduplicate: add to existing group
            alert_ids = list(group.alert_ids or [])
            if alert_id not in alert_ids:
                alert_ids.append(alert_id)
            group.alert_ids = alert_ids
            group.alert_count = len(alert_ids)
            group.last_seen_at = now
            group.severity = severity  # Update to latest severity
            logger.info(f"Alert deduplicated into group {group.id} (count: {group.alert_count})")
        else:
            # Create new group
            group = AlertGroup(
                fingerprint=fingerprint,
                title=title or f"{source}: {alertname}",
                severity=severity,
                first_seen_at=now,
                last_seen_at=now,
                alert_count=1,
                alert_ids=[alert_id],
                source=source,
                labels=labels or {},
                client_id=client_id,
            )
            db.add(group)
            logger.info(f"New alert group created: {fingerprint}")

        db.flush()
        return group

    @staticmethod
    def correlate_alerts(
        db: Session,
        time_window_minutes: int = 5,
        client_id: str = None
    ) -> list:
        """Find correlations between recent alert groups."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=time_window_minutes)

        query = db.query(AlertGroup).filter(
            AlertGroup.status == AlertGroupStatus.ACTIVE.value,
            AlertGroup.last_seen_at >= cutoff
        )
        if client_id:
            query = query.filter(AlertGroup.client_id == client_id)

        groups = query.all()
        correlations = []

        # Temporal correlation: groups that appeared within the same time window
        for i, g1 in enumerate(groups):
            for g2 in groups[i + 1:]:
                time_diff = abs((g1.first_seen_at - g2.first_seen_at).total_seconds())
                if time_diff < time_window_minutes * 60:
                    # Check if correlation already exists
                    existing = db.query(AlertCorrelation).filter(
                        AlertCorrelation.alert_group_ids.contains([str(g1.id), str(g2.id)])
                    ).first()

                    if not existing:
                        confidence = max(0.3, 1.0 - (time_diff / (time_window_minutes * 60)))

                        # Determine correlation type
                        corr_type = CorrelationType.TEMPORAL.value
                        if g1.source == g2.source:
                            corr_type = CorrelationType.SAME_SOURCE.value
                            confidence = min(1.0, confidence + 0.2)

                        correlation = AlertCorrelation(
                            alert_group_ids=[str(g1.id), str(g2.id)],
                            correlation_type=corr_type,
                            confidence_score=round(confidence, 2),
                            description=f"Alerts from {g1.source} and {g2.source} appeared within {int(time_diff)}s",
                            evidence={"time_diff_seconds": int(time_diff)},
                            detected_at=datetime.now(timezone.utc),
                            client_id=client_id,
                        )
                        db.add(correlation)
                        correlations.append(correlation)

        db.flush()
        return correlations

    @staticmethod
    def calculate_noise_stats(
        db: Session,
        target_date: Optional[datetime] = None,
        client_id: str = None
    ) -> AlertNoiseStats:
        """Calculate noise reduction stats for a date."""
        if target_date is None:
            target_date = datetime.now(timezone.utc).date()

        # Count total alerts for the day
        total_query = db.query(func.count(AlertGroup.id)).filter(
            func.date(AlertGroup.first_seen_at) == target_date
        )
        if client_id:
            total_query = total_query.filter(AlertGroup.client_id == client_id)

        groups = db.query(AlertGroup).filter(
            func.date(AlertGroup.first_seen_at) == target_date
        )
        if client_id:
            groups = groups.filter(AlertGroup.client_id == client_id)
        groups = groups.all()

        total_alerts = sum(g.alert_count for g in groups)
        total_groups = len(groups)
        deduplicated = total_alerts - total_groups
        suppressed_groups = len([g for g in groups if g.status == AlertGroupStatus.SUPPRESSED.value])
        actionable = total_groups - suppressed_groups

        noise_reduction = round(((total_alerts - actionable) / total_alerts * 100), 2) if total_alerts > 0 else 0

        stats = AlertNoiseStats(
            date=target_date,
            total_alerts=total_alerts,
            deduplicated=deduplicated,
            grouped=total_groups,
            suppressed=suppressed_groups,
            actionable=actionable,
            noise_reduction_percentage=noise_reduction,
            client_id=client_id,
        )

        return stats
