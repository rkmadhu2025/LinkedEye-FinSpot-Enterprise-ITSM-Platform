"""
Analytics model for AI/ML analytics, recommendations, and insights.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class ModelType(str, enum.Enum):
    """ML model types."""
    LSTM = "lstm"
    ISOLATION_FOREST = "isolation_forest"
    BERT = "bert"
    GRAPH_NEURAL_NETWORK = "graph_neural_network"
    RANDOM_FOREST = "random_forest"
    LINEAR_REGRESSION = "linear_regression"
    OTHER = "other"


class RecommendationType(str, enum.Enum):
    """Recommendation types."""
    AUTO_SCALING = "auto_scaling"
    WORKFLOW_AUTOMATION = "workflow_automation"
    ALERT_THRESHOLD = "alert_threshold"
    CAPACITY_PLANNING = "capacity_planning"
    COST_OPTIMIZATION = "cost_optimization"
    PERFORMANCE = "performance"
    SECURITY = "security"
    OTHER = "other"


class RecommendationImpact(str, enum.Enum):
    """Recommendation impact levels."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AnomalySeverity(str, enum.Enum):
    """Anomaly severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class MLModel(BaseModel):
    """ML Model for analytics and predictions."""
    __tablename__ = "ml_models"
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    model_type = Column(SQLEnum(ModelType), nullable=False)
    
    # Model Metrics
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    
    # Status
    # Note: Using model_active to avoid conflict with BaseModel.is_active
    model_active = Column("model_active", String(10), default="true", nullable=False)
    version = Column(String(50), nullable=True)
    model_path = Column(String(500), nullable=True)
    
    # Training
    training_data_range = Column(JSONB, default=dict, nullable=False)
    last_trained_at = Column(DateTime(timezone=True), nullable=True)
    training_status = Column(String(50), nullable=True)
    
    # Metadata
    hyperparameters = Column(JSONB, default=dict, nullable=False)
    meta_data = Column(JSONB, default=dict, nullable=False)
    
    @property
    def is_trained(self) -> bool:
        """Check if model is trained."""
        return self.last_trained_at is not None


class Recommendation(BaseModel):
    """Recommendation model for AI-powered suggestions."""
    __tablename__ = "recommendations"
    
    # Basic Information
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    recommendation_type = Column(SQLEnum(RecommendationType), nullable=False)
    impact = Column(SQLEnum(RecommendationImpact), default=RecommendationImpact.MEDIUM, nullable=False)
    
    # Impact Metrics
    estimated_savings = Column(String(100), nullable=True)  # e.g., "12 incidents/week prevented"
    estimated_improvement = Column(String(100), nullable=True)  # e.g., "40% reduction"
    
    # Status
    status = Column(String(50), default="pending", nullable=False)  # pending, approved, rejected, implemented
    priority = Column(String(20), default="medium", nullable=False)
    
    # Context
    related_entities = Column(JSONB, default=dict, nullable=False)  # Related incidents, assets, etc.
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    
    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)


class Anomaly(BaseModel):
    """Anomaly detection model."""
    __tablename__ = "anomalies"
    
    # Basic Information
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(SQLEnum(AnomalySeverity), default=AnomalySeverity.MEDIUM, nullable=False)
    
    # Detection
    detected_at = Column(DateTime(timezone=True), nullable=False)
    anomaly_type = Column(String(100), nullable=True)  # e.g., "spike", "drop", "pattern_change"
    confidence_score = Column(Float, nullable=True)
    
    # Context
    entity_type = Column(String(50), nullable=True)  # incident, asset, metric, etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    
    # Status
    status = Column(String(50), default="open", nullable=False)  # open, investigating, resolved, false_positive
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Data
    data_points = Column(JSONB, default=list, nullable=False)
    baseline_values = Column(JSONB, default=dict, nullable=False)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
