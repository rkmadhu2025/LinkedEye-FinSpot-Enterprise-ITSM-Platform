"""
Network Topology management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.network_topology import NetworkTopology, TopologyType, TopologyStatus
from app.api.dependencies import get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/network-topology", tags=["network-topology"])


# Pydantic models
class NetworkTopologyCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    topology_type: TopologyType = TopologyType.LOGICAL
    environment_id: Optional[UUID] = None
    nodes: List[dict] = Field(default_factory=list)
    edges: List[dict] = Field(default_factory=list)
    layout_config: dict = Field(default_factory=dict)


class NetworkTopologyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TopologyStatus] = None
    nodes: Optional[List[dict]] = None
    edges: Optional[List[dict]] = None
    layout_config: Optional[dict] = None


class NetworkTopologyResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    topology_type: TopologyType
    status: TopologyStatus
    nodes: List[dict]
    edges: List[dict]
    layout_config: dict
    node_count: int
    edge_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=NetworkTopologyResponse, status_code=status.HTTP_201_CREATED)
async def create_topology(
    topology_data: NetworkTopologyCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new network topology."""
    try:
        new_topology = NetworkTopology(
            name=topology_data.name,
            description=topology_data.description,
            topology_type=topology_data.topology_type,
            environment_id=topology_data.environment_id,
            nodes=topology_data.nodes,
            edges=topology_data.edges,
            layout_config=topology_data.layout_config,
            created_by_id=current_user.id
        )
        
        db.add(new_topology)
        db.commit()
        db.refresh(new_topology)
        
        logger.info(f"Network topology created: {new_topology.id}")
        return new_topology
    
    except Exception as e:
        logger.error(f"Error creating network topology: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create network topology"
        )


@router.get("", response_model=List[NetworkTopologyResponse])
async def get_topologies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    topology_type: Optional[TopologyType] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of network topologies."""
    try:
        query = db.query(NetworkTopology)
        
        if search:
            query = query.filter(
                or_(
                    NetworkTopology.name.ilike(f"%{search}%"),
                    NetworkTopology.description.ilike(f"%{search}%")
                )
            )
        
        if topology_type:
            query = query.filter(NetworkTopology.topology_type == topology_type)
        
        query = query.filter(NetworkTopology.is_active == True)
        query = query.order_by(NetworkTopology.name)
        
        topologies = query.offset(skip).limit(limit).all()
        return topologies
    
    except Exception as e:
        logger.error(f"Error fetching topologies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch topologies"
        )


@router.get("/{topology_id}", response_model=NetworkTopologyResponse)
async def get_topology(
    topology_id: UUID,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get network topology by ID."""
    try:
        topology = db.query(NetworkTopology).filter(NetworkTopology.id == topology_id).first()
        if not topology or not topology.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network topology not found"
            )
        return topology
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching topology: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch topology"
        )


@router.put("/{topology_id}", response_model=NetworkTopologyResponse)
async def update_topology(
    topology_id: UUID,
    topology_data: NetworkTopologyUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update network topology."""
    try:
        topology = db.query(NetworkTopology).filter(NetworkTopology.id == topology_id).first()
        if not topology or not topology.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network topology not found"
            )
        
        update_data = topology_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(topology, field, value)
        
        topology.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(topology)
        
        logger.info(f"Network topology updated: {topology.id}")
        return topology
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating topology: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update topology"
        )


@router.delete("/{topology_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topology(
    topology_id: UUID,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete network topology (soft delete)."""
    try:
        topology = db.query(NetworkTopology).filter(NetworkTopology.id == topology_id).first()
        if not topology:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network topology not found"
            )
        
        topology.is_active = False
        topology.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Network topology deleted: {topology_id}")
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting topology: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete topology"
        )
