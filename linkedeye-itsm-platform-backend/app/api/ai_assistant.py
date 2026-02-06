"""
AI Assistant API endpoints for LinkedEye ITSM Platform.

Provides AI-powered features:
- Incident classification
- Troubleshooting assistance
- Postmortem generation
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.user import User
from app.models.incident import Incident
from app.api.dependencies import get_current_user
from app.services.flowise_service import flowise_service, FlowiseServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/ai-assistant", tags=["ai-assistant"])


# Pydantic Models
class IncidentClassificationRequest(BaseModel):
    """Request for AI-powered incident classification."""
    title: str = Field(..., min_length=10, max_length=255, description="Incident title")
    description: str = Field(..., min_length=20, description="Detailed incident description")


class IncidentClassificationResponse(BaseModel):
    """Response containing AI classification results."""
    severity: str = Field(..., description="Classified severity: P1, P2, P3, or P4")
    category: str = Field(..., description="Incident category")
    reasoning: str = Field(..., description="Explanation of classification")
    suggested_actions: list[str] = Field(default_factory=list, description="Recommended actions")
    estimated_impact: str = Field(..., description="Estimated impact description")
    sla_breach_risk: bool = Field(..., description="Whether incident risks SLA breach")
    ai_available: bool = Field(..., description="Whether AI classification was available")
    ai_confidence: Optional[str] = Field(None, description="Confidence level: high, medium, low")


class TroubleshootingRequest(BaseModel):
    """Request for AI troubleshooting assistance."""
    query: str = Field(..., min_length=10, description="Troubleshooting question")
    incident_id: Optional[UUID] = Field(None, description="Related incident ID for context")


class TroubleshootingResponse(BaseModel):
    """Response containing troubleshooting guidance."""
    answer: str = Field(..., description="Detailed troubleshooting steps")
    sources: list[dict] = Field(default_factory=list, description="Source runbooks referenced")
    confidence: str = Field(..., description="Answer confidence: high, medium, low, none")
    ai_available: bool = Field(..., description="Whether AI assistant was available")
    session_id: Optional[str] = Field(None, description="Session ID for continued conversation")


class PostmortemRequest(BaseModel):
    """Request for AI postmortem generation."""
    incident_id: UUID = Field(..., description="Incident ID to generate postmortem for")


class HealthCheckResponse(BaseModel):
    """AI assistant health check response."""
    status: str = Field(..., description="Health status: healthy or unhealthy")
    flowise_url: str = Field(..., description="Flowise service URL")
    chatflows_configured: int = Field(..., description="Number of chatflows configured")
    response_time_ms: Optional[int] = Field(None, description="Response time in milliseconds")


# API Endpoints

@router.post("/classify-incident", response_model=IncidentClassificationResponse)
async def classify_incident(
    request: IncidentClassificationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Classify incident using AI to determine severity and category.

    This endpoint uses Flowise AI to analyze the incident description and provide:
    - Severity classification (P1-P4)
    - Category classification
    - Reasoning for the classification
    - Suggested immediate actions
    - Impact estimation

    **Use Case**: Auto-classify incidents during creation to reduce manual triage time.

    **Example Request**:
    ```json
    {
        "title": "Database connection pool exhausted",
        "description": "Production API returning 500 errors. Database logs show max connections (100/100) reached. Started 10 minutes ago."
    }
    ```

    **Example Response**:
    ```json
    {
        "severity": "P2",
        "category": "Infrastructure",
        "reasoning": "Connection pool exhaustion causing API failures indicates high-severity infrastructure issue requiring immediate attention.",
        "suggested_actions": [
            "Check database server resources (CPU, memory, connections)",
            "Identify and kill long-running queries",
            "Temporarily increase connection pool size",
            "Review application connection handling for leaks"
        ],
        "estimated_impact": "All API users affected (estimated 5000+ users)",
        "sla_breach_risk": true,
        "ai_available": true,
        "ai_confidence": "high"
    }
    ```
    """
    try:
        logger.info(f"Classifying incident via AI for user {current_user.email}")

        result = await flowise_service.classify_incident(
            title=request.title,
            description=request.description
        )

        return IncidentClassificationResponse(**result)

    except FlowiseServiceError as e:
        logger.error(f"Flowise service error during classification: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI classification service unavailable: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during AI classification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during classification"
        )


@router.post("/troubleshoot", response_model=TroubleshootingResponse)
async def get_troubleshooting_advice(
    request: TroubleshootingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered troubleshooting assistance from runbook knowledge base.

    This endpoint uses RAG (Retrieval Augmented Generation) to search incident runbooks
    and provide step-by-step troubleshooting guidance.

    **Use Case**: Help engineers quickly find resolution steps during active incidents.

    **Example Request**:
    ```json
    {
        "query": "How do I troubleshoot high CPU usage on a production server?",
        "incident_id": "550e8400-e29b-41d4-a716-446655440000"
    }
    ```

    **Example Response**:
    ```json
    {
        "answer": "Based on high-cpu-troubleshooting.md:\\n\\n1. **Identify the process**:\\n   Run `top -o %CPU` to see which process is consuming CPU\\n\\n2. **Determine if legitimate load**:\\n   - Check Grafana for traffic spikes\\n   - Review recent deployments\\n\\n3. **Collect diagnostics**:\\n   ```bash\\n   mpstat -P ALL 1 5\\n   ps auxf > /tmp/process-tree.txt\\n   ```\\n\\nSource: high-cpu-troubleshooting.md (Section 3: Investigation Steps)",
        "sources": [
            {
                "content": "### Step 1: Identify the Culprit Process\\n\\n**Linux:**\\n```bash\\ntop -o %CPU\\n```",
                "metadata": {
                    "source": "high-cpu-troubleshooting.md",
                    "loc": {"lines": {"from": 45, "to": 52}}
                }
            }
        ],
        "confidence": "high",
        "ai_available": true,
        "session_id": "incident-550e8400-e29b-41d4-a716-446655440000"
    }
    ```
    """
    try:
        # Validate incident exists if provided
        if request.incident_id:
            incident = db.query(Incident).filter(Incident.id == request.incident_id).first()
            if not incident:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Incident {request.incident_id} not found"
                )

        logger.info(f"Getting troubleshooting advice for user {current_user.email}")

        result = await flowise_service.get_troubleshooting_advice(
            query=request.query,
            incident_id=request.incident_id
        )

        return TroubleshootingResponse(**result)

    except HTTPException:
        raise
    except FlowiseServiceError as e:
        logger.error(f"Flowise service error during troubleshooting: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI troubleshooting service unavailable: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error getting troubleshooting advice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/generate-postmortem/{incident_id}")
async def generate_incident_postmortem(
    incident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered postmortem report for resolved incident.

    This endpoint analyzes the incident timeline and generates a comprehensive
    postmortem report following SRE best practices.

    **Use Case**: Automatically generate postmortem drafts after incident resolution.

    **Requirements**: Incident must be in RESOLVED or CLOSED status.

    **Example Response**:
    ```markdown
    # Incident Postmortem: Database Outage

    ## Incident Summary
    - **Incident Number**: INC-001234
    - **Severity**: P1 - Critical
    - **Duration**: 12 minutes (14:32 - 14:44 UTC)
    - **Impact**: 100% of users unable to access application

    ## Timeline
    - 14:32 - First alert: Database health check failed
    - 14:33 - On-call SRE paged, war room started
    ...

    ## Root Cause
    PostgreSQL primary ran out of memory due to...

    ## What Went Well
    ✅ Standby database was healthy...

    ## Action Items
    - [ ] Lower memory alert threshold (@sre-team, Due: 2025-02-08)
    - [ ] Upgrade PostgreSQL to 15.4 (@dba-team, Due: 2025-02-10)
    ```
    """
    try:
        # Get incident
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident {incident_id} not found"
            )

        # Check incident is resolved
        if incident.status not in ["RESOLVED", "CLOSED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Postmortem can only be generated for resolved or closed incidents"
            )

        logger.info(f"Generating postmortem for incident {incident.number}")

        # Build incident data dict
        incident_data = {
            "incident_number": incident.number,
            "title": incident.title,
            "priority": incident.priority,
            "started_at": str(incident.created_at),
            "resolved_at": str(incident.resolved_at) if incident.resolved_at else "Not resolved",
            "duration": str(incident.resolved_at - incident.created_at) if incident.resolved_at else "Unknown",
            "impact_description": incident.customer_impact or "To be documented",
            "root_cause": "To be determined during postmortem review",
            "resolution_steps": incident.resolution_notes or "To be documented",
            "timeline_events": "To be documented"
        }

        postmortem_markdown = await flowise_service.generate_postmortem(incident_data)

        return {
            "incident_id": str(incident_id),
            "incident_number": incident.number,
            "postmortem": postmortem_markdown,
            "generated_at": "2025-02-06T00:00:00Z"
        }

    except HTTPException:
        raise
    except FlowiseServiceError as e:
        logger.error(f"Flowise service error during postmortem generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI postmortem service unavailable: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error generating postmortem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/health", response_model=HealthCheckResponse)
async def check_ai_assistant_health():
    """
    Check health status of AI assistant service.

    Returns status of Flowise service and configured chatflows.

    **Example Response**:
    ```json
    {
        "status": "healthy",
        "flowise_url": "http://localhost:3000",
        "chatflows_configured": 3,
        "response_time_ms": 45
    }
    ```
    """
    try:
        health_status = await flowise_service.health_check()
        return HealthCheckResponse(**health_status)

    except Exception as e:
        logger.error(f"Error checking AI assistant health: {e}")
        return HealthCheckResponse(
            status="unhealthy",
            flowise_url=flowise_service.base_url,
            chatflows_configured=0,
            error=str(e)
        )
