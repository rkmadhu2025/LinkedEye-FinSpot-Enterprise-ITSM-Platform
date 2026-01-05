"""
Background tasks for report generation.
"""
from app.core.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="app.tasks.report_tasks.generate_report")
def generate_report(report_id: str, format: str = "pdf"):
    """Generate report in background."""
    try:
        # Report generation logic would go here
        logger.info(f"Generating report {report_id} in {format} format")
        return {"report_id": report_id, "format": format, "status": "completed"}
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise
