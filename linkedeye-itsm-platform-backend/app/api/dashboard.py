"""
Dashboard API endpoints for metrics and statistics.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from uuid import UUID as PyUUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.core.database import get_db
from app.models.incident import Incident, IncidentPriority, IncidentStatus
from app.models.change import Change, ChangeStatus
from app.models.asset import Asset, AssetStatus, HealthStatus
from app.models.environment import Environment, EnvironmentStatus
from app.models.problem import Problem, ProblemPriority, ProblemStatus
from app.models.user import User
from app.api.dependencies import get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics", response_model=Dict[str, Any])
async def get_dashboard_metrics(
    client_id: Optional[PyUUID] = Query(None, description="Filter by client ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard metrics and statistics. Optionally filter by client_id."""
    try:
        # Build client filter for each model
        def client_filter(model):
            """Return additional filter clause if client_id is provided."""
            if client_id and hasattr(model, 'client_id'):
                return [model.client_id == client_id]
            return []

        # Incident metrics
        total_incidents = db.query(func.count(Incident.id)).filter(Incident.is_active == True, *client_filter(Incident)).scalar() or 0
        critical_incidents = db.query(func.count(Incident.id)).filter(
            and_(
                Incident.is_active == True,
                Incident.priority == IncidentPriority.CRITICAL.value,
                Incident.status.notin_([IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value]),
                *client_filter(Incident)
            )
        ).scalar() or 0
        open_incidents = db.query(func.count(Incident.id)).filter(
            and_(
                Incident.is_active == True,
                Incident.status.notin_([IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value, IncidentStatus.CANCELLED.value]),
                *client_filter(Incident)
            )
        ).scalar() or 0

        # Calculate SLA compliance
        total_with_sla = db.query(func.count(Incident.id)).filter(
            and_(
                Incident.is_active == True,
                Incident.sla_target.isnot(None),
                *client_filter(Incident)
            )
        ).scalar() or 0
        sla_breached_count = db.query(func.count(Incident.id)).filter(
            and_(
                Incident.is_active == True,
                Incident.sla_breached == True,
                *client_filter(Incident)
            )
        ).scalar() or 0
        sla_compliance = ((total_with_sla - sla_breached_count) / total_with_sla * 100) if total_with_sla > 0 else 100.0
        
        # Change metrics
        pending_changes = db.query(func.count(Change.id)).filter(
            and_(
                Change.is_active == True,
                Change.status.in_([ChangeStatus.PENDING_APPROVAL.value, ChangeStatus.SCHEDULED.value]),
                *client_filter(Change)
            )
        ).scalar() or 0

        # Asset metrics
        total_assets = db.query(func.count(Asset.id)).filter(Asset.is_active == True, *client_filter(Asset)).scalar() or 0
        critical_assets = db.query(func.count(Asset.id)).filter(
            and_(
                Asset.is_active == True,
                Asset.health_status == HealthStatus.CRITICAL.value,
                *client_filter(Asset)
            )
        ).scalar() or 0
        
        # Environment metrics
        total_environments = db.query(func.count(Environment.id)).filter(Environment.is_active == True).scalar() or 0
        active_environments = db.query(func.count(Environment.id)).filter(
            and_(
                Environment.is_active == True,
                Environment.status == EnvironmentStatus.ACTIVE.value
            )
        ).scalar() or 0

        # Problem metrics
        total_problems = db.query(func.count(Problem.id)).filter(Problem.is_active == True, *client_filter(Problem)).scalar() or 0
        open_problems = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.is_active == True,
                Problem.status.notin_([ProblemStatus.RESOLVED.value, ProblemStatus.CLOSED.value]),
                *client_filter(Problem)
            )
        ).scalar() or 0
        critical_problems = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.is_active == True,
                Problem.priority == ProblemPriority.CRITICAL.value,
                Problem.status.notin_([ProblemStatus.RESOLVED.value, ProblemStatus.CLOSED.value]),
                *client_filter(Problem)
            )
        ).scalar() or 0
        high_problems = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.is_active == True,
                Problem.priority == ProblemPriority.HIGH.value,
                Problem.status.notin_([ProblemStatus.RESOLVED.value, ProblemStatus.CLOSED.value]),
                *client_filter(Problem)
            )
        ).scalar() or 0

        # Calculate MTTR (Mean Time To Resolution) - last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        resolved_incidents = db.query(Incident).filter(
            and_(
                Incident.is_active == True,
                Incident.status == IncidentStatus.RESOLVED.value,
                Incident.resolved_at.isnot(None),
                Incident.resolved_at >= thirty_days_ago
            )
        ).all()
        
        mttr_minutes = 0
        if resolved_incidents:
            total_time = sum([
                (inc.resolved_at - inc.created_at).total_seconds() / 60
                for inc in resolved_incidents
                if inc.resolved_at and inc.created_at
            ])
            mttr_minutes = total_time / len(resolved_incidents)
        
        return {
            "client_id": str(client_id) if client_id else None,
            "incidents": {
                "total": total_incidents,
                "critical": critical_incidents,
                "open": open_incidents,
                "sla_compliance": round(sla_compliance, 2)
            },
            "changes": {
                "pending": pending_changes
            },
            "assets": {
                "total": total_assets,
                "critical": critical_assets
            },
            "environments": {
                "total": total_environments,
                "active": active_environments
            },
            "problems": {
                "total": total_problems,
                "open": open_problems,
                "critical": critical_problems,
                "high": high_problems
            },
            "mttr_minutes": round(mttr_minutes, 1),
            "system_uptime": 99.98  # This would come from monitoring system
        }
    
    except Exception as e:
        logger.error(f"Error getting dashboard metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard metrics"
        )


@router.get("/incident-trends", response_model=Dict[str, Any])
async def get_incident_trends(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incident trends over time."""
    try:
        if days > 90:
            days = 90
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get incidents by day
        incidents_by_day = db.query(
            func.date(Incident.created_at).label('date'),
            func.count(Incident.id).label('count')
        ).filter(
            and_(
                Incident.is_active == True,
                Incident.created_at >= start_date
            )
        ).group_by(func.date(Incident.created_at)).all()
        
        resolved_by_day = db.query(
            func.date(Incident.resolved_at).label('date'),
            func.count(Incident.id).label('count')
        ).filter(
            and_(
                Incident.is_active == True,
                Incident.status == IncidentStatus.RESOLVED.value,
                Incident.resolved_at.isnot(None),
                Incident.resolved_at >= start_date
            )
        ).group_by(func.date(Incident.resolved_at)).all()
        
        critical_by_day = db.query(
            func.date(Incident.created_at).label('date'),
            func.count(Incident.id).label('count')
        ).filter(
            and_(
                Incident.is_active == True,
                Incident.priority == IncidentPriority.CRITICAL.value,
                Incident.created_at >= start_date
            )
        ).group_by(func.date(Incident.created_at)).all()
        
        return {
            "days": days,
            "total_incidents": [{"date": str(row.date), "count": row.count} for row in incidents_by_day],
            "resolved_incidents": [{"date": str(row.date), "count": row.count} for row in resolved_by_day],
            "critical_incidents": [{"date": str(row.date), "count": row.count} for row in critical_by_day]
        }
    
    except Exception as e:
        logger.error(f"Error getting incident trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incident trends"
        )


@router.get("/incident-categories", response_model=Dict[str, Any])
async def get_incident_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incident distribution by category."""
    try:
        categories = db.query(
            Incident.category,
            func.count(Incident.id).label('count')
        ).filter(
            and_(
                Incident.is_active == True,
                Incident.category.isnot(None)
            )
        ).group_by(Incident.category).all()
        
        return {
            "categories": [
                {"name": cat.category or "Uncategorized", "count": cat.count}
                for cat in categories
            ]
        }
    
    except Exception as e:
        logger.error(f"Error getting incident categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incident categories"
        )

@router.get("/change-trends", response_model=Dict[str, Any])
async def get_change_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get change trends over time."""
    # Placeholder implementation
    return {
        "days": days,
        "labels": [],
        "datasets": []
    }


@router.get("/change-categories", response_model=Dict[str, Any])
async def get_change_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get change distribution by type."""
    # Placeholder implementation
    return {
        "labels": [],
        "datasets": []
    }


@router.get("/team-performance", response_model=Dict[str, Any])
async def get_team_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get team performance metrics."""
    # Placeholder implementation
    return {
        "teams": []
    }


@router.get("/activity", response_model=Dict[str, Any])
async def get_recent_activity(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activity."""
    # Placeholder implementation
    return {
        "activities": []
    }


@router.get("/insights", response_model=Dict[str, Any])
async def get_ai_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-driven insights."""
    # Placeholder implementation
    return {
        "insights": []
    }


@router.get("/alert-funnel", response_model=Dict[str, Any])
async def get_alert_funnel(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get alert-to-incident funnel data.
    Stages: Total Alerts -> Deduplicated -> Incidents Created -> Resolved
    """
    try:
        from app.models.monitoring_alert import MonitoringAlert, AlertStatus

        start_date = datetime.now(timezone.utc) - timedelta(days=min(days, 90))

        # Stage 1: Total alerts received
        total_alerts = db.query(func.count(MonitoringAlert.id)).filter(
            and_(
                MonitoringAlert.is_active == True,
                MonitoringAlert.starts_at >= start_date
            )
        ).scalar() or 0

        # Stage 2: Deduplicated (unique fingerprints)
        deduplicated = db.query(func.count(func.distinct(MonitoringAlert.fingerprint))).filter(
            and_(
                MonitoringAlert.is_active == True,
                MonitoringAlert.starts_at >= start_date
            )
        ).scalar() or 0

        # Stage 3: Alerts that created incidents
        incidents_created = db.query(func.count(MonitoringAlert.id)).filter(
            and_(
                MonitoringAlert.is_active == True,
                MonitoringAlert.starts_at >= start_date,
                MonitoringAlert.incident_id.isnot(None)
            )
        ).scalar() or 0

        # Stage 4: Of those incidents, how many are resolved
        resolved_from_alerts = 0
        if incidents_created > 0:
            resolved_from_alerts = db.query(func.count(func.distinct(MonitoringAlert.incident_id))).filter(
                and_(
                    MonitoringAlert.is_active == True,
                    MonitoringAlert.starts_at >= start_date,
                    MonitoringAlert.incident_id.isnot(None)
                )
            ).join(Incident, Incident.id == MonitoringAlert.incident_id).filter(
                Incident.status.in_([IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value])
            ).scalar() or 0

        # Suppressed / Acknowledged (bonus stage)
        acknowledged = db.query(func.count(MonitoringAlert.id)).filter(
            and_(
                MonitoringAlert.is_active == True,
                MonitoringAlert.starts_at >= start_date,
                MonitoringAlert.status == AlertStatus.ACKNOWLEDGED.value
            )
        ).scalar() or 0

        return {
            "days": days,
            "stages": [
                {"label": "Total Alerts", "count": total_alerts, "color": "#6366f1"},
                {"label": "Deduplicated", "count": deduplicated, "color": "#f59e0b"},
                {"label": "Incidents Created", "count": incidents_created, "color": "#ef4444"},
                {"label": "Resolved", "count": resolved_from_alerts, "color": "#10b981"},
            ],
            "acknowledged": acknowledged,
            "suppression_rate": round((1 - deduplicated / max(total_alerts, 1)) * 100, 1),
            "incident_rate": round(incidents_created / max(deduplicated, 1) * 100, 1),
            "resolution_rate": round(resolved_from_alerts / max(incidents_created, 1) * 100, 1),
        }

    except Exception as e:
        logger.error(f"Error getting alert funnel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alert funnel data"
        )


@router.get("/team-workload", response_model=Dict[str, Any])
async def get_team_workload(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get team workload distribution — active incidents per assignment group.
    Used by the Manager dashboard view.
    """
    try:
        from app.models.group import Group

        # Get all active groups with their incident counts
        groups = db.query(Group).filter(Group.is_active == True).all()

        teams = []
        for group in groups:
            active_count = db.query(func.count(Incident.id)).filter(
                and_(
                    Incident.is_active == True,
                    Incident.assigned_group == group.name,
                    Incident.status.notin_([
                        IncidentStatus.RESOLVED.value,
                        IncidentStatus.CLOSED.value,
                        IncidentStatus.CANCELLED.value
                    ])
                )
            ).scalar() or 0

            # Count group members for capacity
            member_count = len(group.members) if hasattr(group, 'members') and group.members else 5

            # Breakdown by priority
            critical = db.query(func.count(Incident.id)).filter(
                and_(
                    Incident.is_active == True,
                    Incident.assigned_group == group.name,
                    Incident.priority == IncidentPriority.CRITICAL.value,
                    Incident.status.notin_([IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value])
                )
            ).scalar() or 0

            high = db.query(func.count(Incident.id)).filter(
                and_(
                    Incident.is_active == True,
                    Incident.assigned_group == group.name,
                    Incident.priority == IncidentPriority.HIGH.value,
                    Incident.status.notin_([IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value])
                )
            ).scalar() or 0

            teams.append({
                "name": group.name,
                "active": active_count,
                "capacity": member_count * 4,  # ~4 incidents per person capacity
                "critical": critical,
                "high": high,
                "members": member_count,
                "utilization": round(active_count / max(member_count * 4, 1) * 100, 1),
            })

        # Sort by utilization descending (busiest teams first)
        teams.sort(key=lambda t: t["utilization"], reverse=True)

        # Summary metrics
        total_active = sum(t["active"] for t in teams)
        total_capacity = sum(t["capacity"] for t in teams)

        return {
            "teams": teams,
            "summary": {
                "total_active_incidents": total_active,
                "total_capacity": total_capacity,
                "overall_utilization": round(total_active / max(total_capacity, 1) * 100, 1),
                "teams_at_risk": sum(1 for t in teams if t["utilization"] > 80),
            }
        }

    except Exception as e:
        logger.error(f"Error getting team workload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve team workload data"
        )


@router.get("/sla-at-risk", response_model=Dict[str, Any])
async def get_sla_at_risk(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get incidents with SLA approaching breach (within next 2 hours).
    Returns live SLA countdown data for the dashboard.
    """
    try:
        now = datetime.now(timezone.utc)
        two_hours = now + timedelta(hours=2)

        # Incidents with SLA target within next 2 hours that aren't resolved
        at_risk = db.query(Incident).filter(
            and_(
                Incident.is_active == True,
                Incident.sla_target.isnot(None),
                Incident.sla_target <= two_hours,
                Incident.sla_target > now,
                Incident.sla_breached == False,
                Incident.status.notin_([
                    IncidentStatus.RESOLVED.value,
                    IncidentStatus.CLOSED.value,
                    IncidentStatus.CANCELLED.value
                ])
            )
        ).order_by(Incident.sla_target.asc()).limit(10).all()

        # Already breached but not resolved
        breached = db.query(Incident).filter(
            and_(
                Incident.is_active == True,
                or_(
                    Incident.sla_breached == True,
                    and_(
                        Incident.sla_target.isnot(None),
                        Incident.sla_target <= now
                    )
                ),
                Incident.status.notin_([
                    IncidentStatus.RESOLVED.value,
                    IncidentStatus.CLOSED.value,
                    IncidentStatus.CANCELLED.value
                ])
            )
        ).order_by(Incident.created_at.desc()).limit(10).all()

        def format_incident(inc):
            sla_due = inc.sla_target
            if sla_due and sla_due.tzinfo is None:
                sla_due = sla_due.replace(tzinfo=timezone.utc)
            return {
                "id": str(inc.id),
                "number": inc.number or f"INC-{str(inc.id)[:6].upper()}",
                "title": inc.title,
                "priority": inc.priority,
                "status": inc.status,
                "sla_due": sla_due.isoformat() if sla_due else None,
                "sla_breached": inc.sla_breached or (sla_due and sla_due <= now),
                "created_at": inc.created_at.isoformat() if inc.created_at else None,
            }

        return {
            "at_risk": [format_incident(i) for i in at_risk],
            "breached": [format_incident(i) for i in breached],
            "at_risk_count": len(at_risk),
            "breached_count": len(breached),
        }

    except Exception as e:
        logger.error(f"Error getting SLA at-risk data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve SLA at-risk data"
        )


@router.get("/recent-incidents", response_model=Dict[str, Any])
async def get_recent_incidents(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent critical and high priority incidents for dashboard display."""
    try:
        if limit > 50:
            limit = 50

        # Query recent open/in_progress incidents with critical or high priority
        from sqlalchemy.orm import joinedload
        incidents = db.query(Incident).options(joinedload(Incident.assignee)).filter(
            and_(
                Incident.is_active == True,
                Incident.priority.in_([IncidentPriority.CRITICAL.value, IncidentPriority.HIGH.value]),
                Incident.status.notin_([IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value, IncidentStatus.CANCELLED.value])
            )
        ).order_by(Incident.created_at.desc()).limit(limit).all()

        # Format the response
        result = []
        for inc in incidents:
            # Calculate age
            # Ensure both datetimes are timezone-aware
            now = datetime.now(timezone.utc)
            created = inc.created_at.replace(tzinfo=timezone.utc) if inc.created_at.tzinfo is None else inc.created_at
            age_delta = now - created
            age_minutes = int(age_delta.total_seconds() / 60)
            if age_minutes < 60:
                age_str = f"{age_minutes} min ago"
            elif age_minutes < 1440:  # Less than 24 hours
                age_str = f"{age_minutes // 60}h {age_minutes % 60}m ago"
            else:
                age_str = f"{age_minutes // 1440}d {(age_minutes % 1440) // 60}h ago"

            # Calculate SLA percentage (if SLA target exists)
            sla_percent = 100
            if inc.sla_target:
                sla_target = inc.sla_target.replace(tzinfo=timezone.utc) if inc.sla_target.tzinfo is None else inc.sla_target
                sla_delta = sla_target - now
                if sla_delta.total_seconds() <= 0:
                    sla_percent = 0  # SLA breached
                else:
                    # Calculate remaining percentage of SLA time
                    total_sla_seconds = (sla_target - created).total_seconds()
                    remaining_seconds = sla_delta.total_seconds()
                    if total_sla_seconds > 0:
                        sla_percent = min(100, int((remaining_seconds / total_sla_seconds) * 100))

            # Get assignee name (loaded via joinedload)
            assignee_name = None
            if inc.assignee:
                assignee_name = f"{inc.assignee.first_name or ''} {inc.assignee.last_name or ''}".strip() or inc.assignee.email

            result.append({
                "id": str(inc.id),
                "number": inc.number or f"INC-{str(inc.id)[:6].upper()}",
                "title": inc.title,
                "priority": inc.priority,
                "status": inc.status,
                "assignee": assignee_name,
                "slaPercent": sla_percent,
                "age": age_str,
                "createdAt": inc.created_at.isoformat() if inc.created_at else None
            })

        return {
            "incidents": result,
            "total": len(result)
        }

    except Exception as e:
        logger.error(f"Error getting recent incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recent incidents"
        )
