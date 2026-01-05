"""
Network Topology model for network visualization and mapping.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class TopologyType(str, enum.Enum):
    """Topology visualization types."""
    PHYSICAL = "physical"
    LOGICAL = "logical"
    LAYER2 = "layer2"
    LAYER3 = "layer3"
    APPLICATION = "application"


class TopologyStatus(str, enum.Enum):
    """Topology status."""
    ACTIVE = "active"
    DRAFT = "draft"
    ARCHIVED = "archived"


class NetworkTopology(BaseModel):
    """Network Topology model for network visualization."""
    __tablename__ = "network_topologies"
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    topology_type = Column(SQLEnum(TopologyType), default=TopologyType.LOGICAL, nullable=False)
    status = Column(SQLEnum(TopologyStatus), default=TopologyStatus.ACTIVE, nullable=False)
    
    # Visualization Data
    nodes = Column(JSONB, default=list, nullable=False)  # List of device nodes with positions
    edges = Column(JSONB, default=list, nullable=False)  # List of connections between nodes
    layout_config = Column(JSONB, default=dict, nullable=False)  # Layout configuration
    
    # Scope
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    scope = Column(String(100), nullable=True)  # e.g., "datacenter", "office", "cloud"
    
    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    notes = Column(Text, nullable=True)
    
    @property
    def node_count(self) -> int:
        """Get number of nodes in topology."""
        return len(self.nodes) if self.nodes else 0
    
    @property
    def edge_count(self) -> int:
        """Get number of edges/connections in topology."""
        return len(self.edges) if self.edges else 0
