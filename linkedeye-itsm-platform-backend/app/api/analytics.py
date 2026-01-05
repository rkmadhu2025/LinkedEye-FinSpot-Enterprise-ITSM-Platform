"""
Analytics API endpoints for ML models, recommendations, and anomalies.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.analytics import (
    MLModel, Recommendation, Anomaly,
    ModelType, RecommendationType, RecommendationImpact, AnomalySeverity
)
from app.api.dependencies import get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


# ML Models
class MLModelResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    model_type: ModelType
    accuracy: Optional[float]
    is_active: str
    version: Optional[str]
    last_trained_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()  # Allow model_ prefix fields


@router.get("/models", response_model=List[MLModelResponse])
async def get_ml_models(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of ML models."""
    try:
        models = db.query(MLModel).filter(MLModel.is_active == "true").order_by(MLModel.name).all()
        return models
    except Exception as e:
        logger.error(f"Error fetching ML models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch ML models"
        )


# Recommendations
class RecommendationResponse(BaseModel):
    id: UUID
    title: str
    description: str
    recommendation_type: RecommendationType
    impact: RecommendationImpact
    estimated_savings: Optional[str]
    estimated_improvement: Optional[str]
    status: str
    priority: str
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/recommendations", response_model=List[RecommendationResponse])
async def get_recommendations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    impact: Optional[RecommendationImpact] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of recommendations."""
    try:
        query = db.query(Recommendation)
        
        if impact:
            query = query.filter(Recommendation.impact == impact)
        
        query = query.filter(Recommendation.is_active == True)
        query = query.order_by(Recommendation.created_at.desc())
        
        recommendations = query.offset(skip).limit(limit).all()
        return recommendations
    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recommendations"
        )


# Anomalies
class AnomalyResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    severity: AnomalySeverity
    detected_at: datetime
    anomaly_type: Optional[str]
    confidence_score: Optional[float]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/anomalies", response_model=List[AnomalyResponse])
async def get_anomalies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    severity: Optional[AnomalySeverity] = Query(None),
    status: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of anomalies."""
    try:
        query = db.query(Anomaly)
        
        if severity:
            query = query.filter(Anomaly.severity == severity)
        
        if status:
            query = query.filter(Anomaly.status == status)
        
        query = query.filter(Anomaly.is_active == True)
        query = query.order_by(Anomaly.detected_at.desc())
        
        anomalies = query.offset(skip).limit(limit).all()
        return anomalies
    except Exception as e:
        logger.error(f"Error fetching anomalies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch anomalies"
        )
