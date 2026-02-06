"""
Flowise AI Service Integration for LinkedEye ITSM Platform.

This service provides AI-powered incident classification, troubleshooting assistance,
and automated incident analysis using Flowise chatflows.
"""

import httpx
import asyncio
from typing import Dict, Any, Optional, List
from uuid import UUID, uuid4
from datetime import datetime
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class FlowiseServiceError(Exception):
    """Custom exception for Flowise service errors."""
    pass


class FlowiseService:
    """
    Service for interacting with Flowise AI chatflows.

    Provides methods for:
    - Incident classification
    - RAG-based troubleshooting assistance
    - Automated postmortem generation
    - Similar incident search
    """

    def __init__(self):
        self.base_url = settings.flowise_url or "http://localhost:3000"
        self.api_key = settings.flowise_api_key
        self.timeout = 30.0  # 30 seconds timeout for AI operations

        # Chatflow IDs (configure these in settings or environment)
        self.chatflow_ids = {
            "incident_classifier": settings.flowise_chatflow_incident_classifier,
            "rag_troubleshooting": settings.flowise_chatflow_rag_assistant,
            "on_call_assistant": settings.flowise_chatflow_on_call_agent,
            "postmortem_generator": settings.flowise_chatflow_postmortem_gen
        }

        logger.info(f"FlowiseService initialized with base_url: {self.base_url}")

    async def _make_request(
        self,
        chatflow_id: str,
        question: str,
        override_config: Optional[Dict[str, Any]] = None,
        streaming: bool = False
    ) -> Dict[str, Any]:
        """
        Make request to Flowise chatflow API.

        Args:
            chatflow_id: ID of the chatflow to execute
            question: User query/input
            override_config: Optional configuration overrides (session_id, temperature, etc.)
            streaming: Whether to use streaming response

        Returns:
            Dict containing the AI response and metadata

        Raises:
            FlowiseServiceError: If request fails
        """
        endpoint = f"{self.base_url}/api/v1/prediction/{chatflow_id}"

        payload = {
            "question": question,
        }

        if override_config:
            payload["overrideConfig"] = override_config

        headers = {
            "Content-Type": "application/json"
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.debug(f"Calling Flowise chatflow: {chatflow_id}")
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers=headers
                )

                response.raise_for_status()
                data = response.json()

                logger.info(f"Flowise response received for chatflow: {chatflow_id}")
                return data

        except httpx.TimeoutException as e:
            logger.error(f"Flowise request timeout: {e}")
            raise FlowiseServiceError(f"AI service timeout: {str(e)}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Flowise HTTP error: {e.response.status_code} - {e.response.text}")
            raise FlowiseServiceError(f"AI service error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Unexpected error calling Flowise: {e}")
            raise FlowiseServiceError(f"AI service error: {str(e)}")

    async def classify_incident(
        self,
        title: str,
        description: str
    ) -> Dict[str, Any]:
        """
        Classify incident using AI to determine severity and category.

        Args:
            title: Incident title
            description: Detailed incident description

        Returns:
            Dict containing:
            {
                "severity": "P1|P2|P3|P4",
                "category": "Infrastructure|Application|Security|Performance|Data",
                "reasoning": "Explanation of classification",
                "suggested_actions": ["Action 1", "Action 2", ...],
                "estimated_impact": "Impact description",
                "sla_breach_risk": true|false
            }

        Example:
            >>> result = await flowise_service.classify_incident(
            ...     title="Database connection errors",
            ...     description="Users reporting 500 errors. Database logs show max connections reached."
            ... )
            >>> print(result['severity'])  # "P2"
            >>> print(result['category'])  # "Infrastructure"
        """
        chatflow_id = self.chatflow_ids.get("incident_classifier")

        if not chatflow_id:
            logger.warning("Incident classifier chatflow not configured, returning default classification")
            return {
                "severity": "P3",
                "category": "General",
                "reasoning": "AI classification not available",
                "suggested_actions": ["Manually review incident"],
                "estimated_impact": "Unknown",
                "sla_breach_risk": False,
                "ai_available": False
            }

        incident_report = f"Title: {title}\n\nDescription: {description}"

        try:
            response = await self._make_request(
                chatflow_id=chatflow_id,
                question=incident_report,
                override_config={
                    "sessionId": f"classify-{uuid4()}",
                    "temperature": 0.3  # Lower temperature for consistent classification
                }
            )

            # Parse JSON response from LLM
            result = response.get("json", response.get("text", {}))

            # Add metadata
            result["ai_available"] = True
            result["ai_confidence"] = "high" if result.get("sla_breach_risk") else "medium"
            result["classified_at"] = datetime.utcnow().isoformat()

            return result

        except Exception as e:
            logger.error(f"Error classifying incident: {e}")
            # Fallback to manual classification
            return {
                "severity": "P3",
                "category": "General",
                "reasoning": f"AI classification failed: {str(e)}",
                "suggested_actions": ["Manually review and classify incident"],
                "estimated_impact": "Unknown",
                "sla_breach_risk": False,
                "ai_available": False,
                "error": str(e)
            }

    async def get_troubleshooting_advice(
        self,
        query: str,
        incident_id: Optional[UUID] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get AI-powered troubleshooting advice from runbook knowledge base.

        Uses RAG (Retrieval Augmented Generation) to search runbooks and provide
        step-by-step troubleshooting guidance.

        Args:
            query: Troubleshooting question (e.g., "How to fix high CPU?")
            incident_id: Optional incident ID for context
            session_id: Optional session ID for conversation memory

        Returns:
            Dict containing:
            {
                "answer": "Detailed troubleshooting steps",
                "sources": [
                    {
                        "content": "Relevant runbook section",
                        "metadata": {"source": "runbook-name.md", "page": 1}
                    }
                ],
                "confidence": "high|medium|low"
            }

        Example:
            >>> advice = await flowise_service.get_troubleshooting_advice(
            ...     query="How do I troubleshoot database connection errors?",
            ...     incident_id=incident.id
            ... )
            >>> print(advice['answer'])
            "Based on database-troubleshooting.md:

            1. Check connection pool status...
            2. Verify database service is running...
            ..."
        """
        chatflow_id = self.chatflow_ids.get("rag_troubleshooting")

        if not chatflow_id:
            return {
                "answer": "AI troubleshooting assistant not available. Please consult runbook documentation manually.",
                "sources": [],
                "confidence": "none",
                "ai_available": False
            }

        # Use incident ID as session if not provided
        if not session_id and incident_id:
            session_id = f"incident-{incident_id}"
        elif not session_id:
            session_id = f"troubleshoot-{uuid4()}"

        try:
            response = await self._make_request(
                chatflow_id=chatflow_id,
                question=query,
                override_config={
                    "sessionId": session_id,
                    "returnSourceDocuments": True
                }
            )

            # Extract answer and sources
            answer = response.get("text", "")
            source_documents = response.get("sourceDocuments", [])

            # Process source documents
            sources = [
                {
                    "content": doc.get("pageContent", ""),
                    "metadata": doc.get("metadata", {})
                }
                for doc in source_documents
            ]

            # Determine confidence based on source quality
            confidence = "high" if len(sources) >= 3 else "medium" if len(sources) >= 1 else "low"

            return {
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "ai_available": True,
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting troubleshooting advice: {e}")
            return {
                "answer": f"Unable to retrieve troubleshooting advice: {str(e)}",
                "sources": [],
                "confidence": "none",
                "ai_available": False,
                "error": str(e)
            }

    async def search_similar_incidents(
        self,
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar past incidents using vector similarity.

        Args:
            query: Description of current incident
            top_k: Number of similar incidents to return

        Returns:
            List of similar incidents with:
            [
                {
                    "incident_number": "INC-001234",
                    "title": "...",
                    "description": "...",
                    "resolution": "...",
                    "similarity_score": 0.85
                }
            ]
        """
        # This requires a separate chatflow for incident similarity search
        # Or can be done via direct vector store query
        # For now, returning empty list
        logger.warning("Similar incident search not yet implemented")
        return []

    async def generate_postmortem(
        self,
        incident_data: Dict[str, Any]
    ) -> str:
        """
        Generate incident postmortem report using AI.

        Args:
            incident_data: Dict containing incident details:
            {
                "incident_number": "INC-001234",
                "title": "Database outage",
                "priority": "P1",
                "started_at": "2025-02-06T14:32:00Z",
                "resolved_at": "2025-02-06T14:44:00Z",
                "timeline_events": [...],
                "root_cause": "...",
                "resolution_steps": "..."
            }

        Returns:
            Markdown-formatted postmortem report

        Example:
            >>> postmortem = await flowise_service.generate_postmortem(incident_data)
            >>> print(postmortem)
            "# Incident Postmortem: Database Outage

            ## Incident Summary
            ...
            "
        """
        chatflow_id = self.chatflow_ids.get("postmortem_generator")

        if not chatflow_id:
            return self._generate_basic_postmortem(incident_data)

        # Format incident data for prompt
        prompt = self._format_postmortem_prompt(incident_data)

        try:
            response = await self._make_request(
                chatflow_id=chatflow_id,
                question=prompt,
                override_config={
                    "sessionId": f"postmortem-{incident_data.get('incident_number', uuid4())}",
                    "temperature": 0.5  # Balanced creativity and factual accuracy
                }
            )

            postmortem = response.get("text", "")
            return postmortem

        except Exception as e:
            logger.error(f"Error generating postmortem: {e}")
            return self._generate_basic_postmortem(incident_data)

    def _format_postmortem_prompt(self, incident_data: Dict[str, Any]) -> str:
        """Format incident data into prompt for postmortem generation."""
        return f"""Generate a comprehensive postmortem report for this incident:

Incident Number: {incident_data.get('incident_number')}
Title: {incident_data.get('title')}
Severity: {incident_data.get('priority')}
Started: {incident_data.get('started_at')}
Resolved: {incident_data.get('resolved_at')}
Duration: {incident_data.get('duration')}
Impact: {incident_data.get('impact_description', 'Not specified')}

Timeline:
{incident_data.get('timeline_events', 'No timeline provided')}

Root Cause:
{incident_data.get('root_cause', 'To be determined')}

Resolution:
{incident_data.get('resolution_steps', 'To be documented')}
"""

    def _generate_basic_postmortem(self, incident_data: Dict[str, Any]) -> str:
        """Fallback basic postmortem template when AI is not available."""
        return f"""# Incident Postmortem: {incident_data.get('title')}

## Incident Summary
- **Incident Number**: {incident_data.get('incident_number')}
- **Severity**: {incident_data.get('priority')}
- **Duration**: {incident_data.get('started_at')} to {incident_data.get('resolved_at')}
- **Impact**: {incident_data.get('impact_description', 'To be documented')}

## Timeline
{incident_data.get('timeline_events', 'To be documented')}

## Root Cause
{incident_data.get('root_cause', 'To be determined')}

## Resolution
{incident_data.get('resolution_steps', 'To be documented')}

## What Went Well
- To be filled during postmortem review

## What Could Be Improved
- To be filled during postmortem review

## Action Items
- [ ] Action item 1 (Owner: TBD, Due: TBD)

---
Generated by LinkedEye ITSM Platform on {datetime.utcnow().isoformat()}
Note: AI postmortem generation was not available. Please complete manually.
"""

    async def health_check(self) -> Dict[str, Any]:
        """
        Check if Flowise service is healthy and reachable.

        Returns:
            Dict with health status:
            {
                "status": "healthy|unhealthy",
                "flowise_url": "http://...",
                "chatflows_configured": 4,
                "response_time_ms": 123
            }
        """
        import time

        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/stats")
                response.raise_for_status()

                data = response.json()
                response_time = int((time.time() - start_time) * 1000)

                return {
                    "status": "healthy",
                    "flowise_url": self.base_url,
                    "flowise_version": data.get("version", "unknown"),
                    "total_chatflows": data.get("totalChatflows", 0),
                    "chatflows_configured": sum(1 for v in self.chatflow_ids.values() if v),
                    "response_time_ms": response_time
                }

        except Exception as e:
            return {
                "status": "unhealthy",
                "flowise_url": self.base_url,
                "error": str(e),
                "chatflows_configured": sum(1 for v in self.chatflow_ids.values() if v)
            }


# Global instance
flowise_service = FlowiseService()
