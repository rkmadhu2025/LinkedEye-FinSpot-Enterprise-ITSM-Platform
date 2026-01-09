"""
Infrastructure API endpoints for Network Flow Architecture.

Provides endpoints for:
- Infrastructure Hosts (devices across all network layers)
- Port/Interface management
- Network Connections (Neo4j-style relationships)
- Microservices
- Device Templates (catalog)
- Topology management with client filtering
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models import (
    User,
    Client,
    InfrastructureHost,
    HostPort,
    NetworkConnection,
    HostMicroservice,
    DeviceTemplate,
    InfrastructureTopology,
    NetworkLayerType,
    SwitchNetworkType,
    DeviceVendor,
    ServerType,
    ConnectionRelationshipType,
    PortStatus,
    PortType,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/infrastructure", tags=["Infrastructure"])


# Helper function to safely get Enum value
def get_enum_value(enum_or_str):
    """Safely extract value from Enum or return string as-is."""
    if enum_or_str is None:
        return None
    if hasattr(enum_or_str, 'value'):
        return enum_or_str.value
    return enum_or_str


# =====================================
# Pydantic Schemas
# =====================================

# Infrastructure Host Schemas
class InfrastructureHostCreate(BaseModel):
    hostname: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    network_layer: NetworkLayerType
    device_category: str
    device_vendor: Optional[DeviceVendor] = None
    device_model: Optional[str] = None
    device_series: Optional[str] = None
    switch_network_type: Optional[SwitchNetworkType] = None
    is_stacked: bool = False
    stack_position: Optional[int] = None
    stack_master_id: Optional[UUID] = None
    server_type: Optional[ServerType] = None
    operating_system: Optional[str] = None
    os_version: Optional[str] = None
    hypervisor_id: Optional[UUID] = None
    physical_host_ip: Optional[str] = None
    management_ip: Optional[str] = None
    management_mac: Optional[str] = None
    management_vlan: Optional[int] = None
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    firmware_version: Optional[str] = None
    hardware_specs: Optional[dict] = None
    total_ports: Optional[int] = None
    data_center: Optional[str] = None
    location: Optional[str] = None
    rack_id: Optional[str] = None
    rack_unit: Optional[str] = None
    service_type: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None
    notes: Optional[str] = None


class InfrastructureHostUpdate(BaseModel):
    hostname: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    device_vendor: Optional[DeviceVendor] = None
    device_model: Optional[str] = None
    device_series: Optional[str] = None
    switch_network_type: Optional[SwitchNetworkType] = None
    is_stacked: Optional[bool] = None
    stack_position: Optional[int] = None
    stack_master_id: Optional[UUID] = None
    server_type: Optional[ServerType] = None
    operating_system: Optional[str] = None
    os_version: Optional[str] = None
    hypervisor_id: Optional[UUID] = None
    physical_host_ip: Optional[str] = None
    management_ip: Optional[str] = None
    management_mac: Optional[str] = None
    management_vlan: Optional[int] = None
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    firmware_version: Optional[str] = None
    hardware_specs: Optional[dict] = None
    total_ports: Optional[int] = None
    data_center: Optional[str] = None
    location: Optional[str] = None
    rack_id: Optional[str] = None
    rack_unit: Optional[str] = None
    operational_status: Optional[str] = None
    health_status: Optional[str] = None
    service_type: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None
    notes: Optional[str] = None


class InfrastructureHostResponse(BaseModel):
    id: UUID
    client_id: Optional[UUID]
    hostname: str
    display_name: Optional[str]
    description: Optional[str]
    neo4j_type: str
    network_layer: str
    neo4j_parent: str
    service_type: Optional[str]
    device_category: str
    device_vendor: Optional[str]
    device_model: Optional[str]
    device_series: Optional[str]
    switch_network_type: Optional[str]
    is_stacked: bool
    stack_position: Optional[int]
    server_type: Optional[str]
    operating_system: Optional[str]
    os_version: Optional[str]
    management_ip: Optional[str]
    serial_number: Optional[str]
    firmware_version: Optional[str]
    total_ports: Optional[int]
    data_center: Optional[str]
    location: Optional[str]
    rack_id: Optional[str]
    rack_unit: Optional[str]
    operational_status: str
    health_status: str
    cpu_usage: Optional[float]
    memory_usage: Optional[float]
    uptime_seconds: Optional[int]
    tags: Optional[List[str]]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Host Port Schemas
class HostPortCreate(BaseModel):
    port_name: str
    port_display_name: Optional[str] = None
    port_description: Optional[str] = None
    port_type: Optional[PortType] = PortType.GIGABIT
    port_number: Optional[int] = None
    slot_number: Optional[int] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    vlan_id: Optional[int] = None
    vlan_mode: Optional[str] = None
    speed_mbps: Optional[int] = None
    admin_status: Optional[str] = "up"
    tags: Optional[List[str]] = None


class HostPortResponse(BaseModel):
    id: UUID
    host_id: UUID
    port_name: str
    port_display_name: Optional[str]
    neo4j_type: str
    neo4j_parent: str
    port_type: Optional[str]
    ip_address: Optional[str]
    mac_address: Optional[str]
    vlan_id: Optional[int]
    speed_mbps: Optional[int]
    admin_status: str
    operational_status: str
    rx_bytes: int
    tx_bytes: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Network Connection Schemas
class NetworkConnectionCreate(BaseModel):
    relationship_type: ConnectionRelationshipType
    source_host_id: Optional[UUID] = None
    source_port_id: Optional[UUID] = None
    source_entity_type: str
    target_host_id: Optional[UUID] = None
    target_port_id: Optional[UUID] = None
    target_entity_type: str
    connection_name: Optional[str] = None
    description: Optional[str] = None
    cable_type: Optional[str] = None
    bandwidth_mbps: Optional[int] = None
    properties: Optional[dict] = None
    tags: Optional[List[str]] = None


class NetworkConnectionResponse(BaseModel):
    id: UUID
    client_id: Optional[UUID]
    relationship_type: str
    source_host_id: Optional[UUID]
    source_port_id: Optional[UUID]
    source_entity_type: str
    target_host_id: Optional[UUID]
    target_port_id: Optional[UUID]
    target_entity_type: str
    connection_name: Optional[str]
    connection_status: str
    bandwidth_mbps: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Device Template Schemas
class DeviceTemplateCreate(BaseModel):
    template_name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    network_layer: NetworkLayerType
    device_category: str
    device_vendor: Optional[DeviceVendor] = None
    device_model: Optional[str] = None
    device_series: Optional[str] = None
    switch_network_type: Optional[SwitchNetworkType] = None
    is_stack_template: bool = False
    default_ports: Optional[int] = None
    port_template: Optional[List[dict]] = None
    service_type_template: Optional[str] = None
    default_config: Optional[dict] = None
    default_specs: Optional[dict] = None
    template_file_name: Optional[str] = None


class DeviceTemplateResponse(BaseModel):
    id: UUID
    template_name: str
    display_name: Optional[str]
    description: Optional[str]
    network_layer: str
    device_category: str
    device_vendor: Optional[str]
    device_model: Optional[str]
    device_series: Optional[str]
    switch_network_type: Optional[str]
    is_stack_template: bool
    default_ports: Optional[int]
    port_template: Optional[List[dict]]
    service_type_template: Optional[str]
    default_config: Optional[dict]
    default_specs: Optional[dict]
    template_file_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Topology Schemas
class InfrastructureTopologyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    topology_type: Optional[str] = "network_flow"
    scope: Optional[str] = None
    data_center: Optional[str] = None
    layout_type: Optional[str] = "hierarchical"
    layout_config: Optional[dict] = None
    included_layers: Optional[List[str]] = None
    show_connections: bool = True
    show_ports: bool = False
    show_metrics: bool = True
    show_status_colors: bool = True
    is_default: bool = False
    tags: Optional[List[str]] = None


class InfrastructureTopologyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout_type: Optional[str] = None
    layout_config: Optional[dict] = None
    node_positions: Optional[dict] = None
    included_layers: Optional[List[str]] = None
    included_hosts: Optional[List[str]] = None
    excluded_hosts: Optional[List[str]] = None
    show_connections: Optional[bool] = None
    show_ports: Optional[bool] = None
    show_metrics: Optional[bool] = None
    show_status_colors: Optional[bool] = None
    status: Optional[str] = None
    is_default: Optional[bool] = None
    tags: Optional[List[str]] = None


class InfrastructureTopologyResponse(BaseModel):
    id: UUID
    client_id: UUID
    name: str
    description: Optional[str]
    topology_type: str
    scope: Optional[str]
    data_center: Optional[str]
    layout_type: str
    layout_config: Optional[dict]
    node_positions: Optional[dict]
    included_layers: Optional[List[str]]
    show_connections: bool
    show_ports: bool
    show_metrics: bool
    show_status_colors: bool
    status: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Statistics Schemas
class LayerStats(BaseModel):
    layer: str
    layer_display_name: str
    total_devices: int
    healthy_devices: int
    warning_devices: int
    critical_devices: int
    devices_by_vendor: dict
    devices_by_type: dict


class InfrastructureStats(BaseModel):
    total_hosts: int
    total_ports: int
    total_connections: int
    layers: List[LayerStats]
    network_zones: dict
    vm_physical_ratio: dict
    health_summary: dict


# Topology Visualization Data
class TopologyNode(BaseModel):
    id: str
    hostname: str
    display_name: Optional[str]
    layer: str
    device_category: str
    device_vendor: Optional[str]
    device_model: Optional[str]
    operational_status: str
    health_status: str
    position: Optional[dict] = None
    metrics: Optional[dict] = None
    port_count: Optional[int] = None


class TopologyEdge(BaseModel):
    id: str
    source: str
    target: str
    source_port: Optional[str]
    target_port: Optional[str]
    relationship_type: str
    status: str
    bandwidth_mbps: Optional[int] = None


class TopologyData(BaseModel):
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]
    layer_groups: dict
    statistics: dict


# =====================================
# Helper Functions
# =====================================

def get_client_id_for_user(db: Session, user: User) -> Optional[UUID]:
    """Get the client ID for the current user."""
    if user.role == "admin":
        # Admins can see all or filter by selected client
        return None
    return user.client_id


def filter_by_client(query, model, user: User, db: Session):
    """Apply client filtering to a query."""
    if user.role != "admin":
        if user.client_id:
            return query.filter(model.client_id == user.client_id)
    return query


# =====================================
# Infrastructure Host Endpoints
# =====================================

@router.get("/hosts", response_model=List[InfrastructureHostResponse])
async def list_infrastructure_hosts(
    network_layer: Optional[str] = None,
    device_category: Optional[str] = None,
    device_vendor: Optional[str] = None,
    switch_network_type: Optional[str] = None,
    server_type: Optional[str] = None,
    operational_status: Optional[str] = None,
    health_status: Optional[str] = None,
    data_center: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all infrastructure hosts with filtering."""
    query = db.query(InfrastructureHost).filter(InfrastructureHost.is_active == True)
    query = filter_by_client(query, InfrastructureHost, current_user, db)

    # Handle case-insensitive enum matching
    if network_layer:
        try:
            layer_enum = NetworkLayerType(network_layer.lower())
            query = query.filter(InfrastructureHost.network_layer == layer_enum)
        except ValueError:
            pass  # Invalid layer, ignore filter
    if device_category:
        query = query.filter(InfrastructureHost.device_category == device_category)
    if device_vendor:
        try:
            vendor_enum = DeviceVendor(device_vendor.upper())
            query = query.filter(InfrastructureHost.device_vendor == vendor_enum)
        except ValueError:
            query = query.filter(InfrastructureHost.device_vendor == device_vendor)
    if switch_network_type:
        try:
            switch_enum = SwitchNetworkType(switch_network_type.lower())
            query = query.filter(InfrastructureHost.switch_network_type == switch_enum)
        except ValueError:
            pass
    if server_type:
        try:
            server_enum = ServerType(server_type.lower())
            query = query.filter(InfrastructureHost.server_type == server_enum)
        except ValueError:
            pass
    if operational_status:
        query = query.filter(InfrastructureHost.operational_status == operational_status)
    if health_status:
        query = query.filter(InfrastructureHost.health_status == health_status)
    if data_center:
        query = query.filter(InfrastructureHost.data_center == data_center)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            InfrastructureHost.hostname.ilike(search_filter),
            InfrastructureHost.display_name.ilike(search_filter),
            InfrastructureHost.device_model.ilike(search_filter),
            InfrastructureHost.serial_number.ilike(search_filter),
        ))

    total = query.count()
    hosts = query.order_by(InfrastructureHost.network_layer, InfrastructureHost.hostname)\
                 .offset((page - 1) * limit)\
                 .limit(limit)\
                 .all()

    return hosts


@router.get("/hosts/by-layer/{layer}", response_model=List[InfrastructureHostResponse])
async def get_hosts_by_layer(
    layer: NetworkLayerType,
    switch_network_type: Optional[SwitchNetworkType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all hosts in a specific network layer."""
    query = db.query(InfrastructureHost).filter(
        InfrastructureHost.is_active == True,
        InfrastructureHost.network_layer == layer
    )
    query = filter_by_client(query, InfrastructureHost, current_user, db)

    if switch_network_type:
        query = query.filter(InfrastructureHost.switch_network_type == switch_network_type)

    return query.order_by(InfrastructureHost.hostname).all()


@router.get("/hosts/{host_id}", response_model=InfrastructureHostResponse)
async def get_infrastructure_host(
    host_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific infrastructure host by ID."""
    query = db.query(InfrastructureHost).filter(InfrastructureHost.id == host_id)
    query = filter_by_client(query, InfrastructureHost, current_user, db)
    host = query.first()

    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    return host


@router.post("/hosts", response_model=InfrastructureHostResponse, status_code=status.HTTP_201_CREATED)
async def create_infrastructure_host(
    host_data: InfrastructureHostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new infrastructure host."""
    # Set client_id based on user
    client_id = current_user.client_id if current_user.role != "admin" else None

    # Check for duplicate hostname within client
    existing = db.query(InfrastructureHost).filter(
        InfrastructureHost.hostname == host_data.hostname,
        InfrastructureHost.client_id == client_id,
        InfrastructureHost.is_active == True
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Host with hostname '{host_data.hostname}' already exists"
        )

    host = InfrastructureHost(
        client_id=client_id,
        neo4j_type="Host",
        neo4j_parent="",
        **host_data.model_dump(exclude_unset=True)
    )

    db.add(host)
    db.commit()
    db.refresh(host)
    return host


@router.put("/hosts/{host_id}", response_model=InfrastructureHostResponse)
async def update_infrastructure_host(
    host_id: UUID,
    host_data: InfrastructureHostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an infrastructure host."""
    query = db.query(InfrastructureHost).filter(InfrastructureHost.id == host_id)
    query = filter_by_client(query, InfrastructureHost, current_user, db)
    host = query.first()

    if not host:
        raise HTTPException(status_code=404, detail="Host not found")

    update_data = host_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(host, field, value)

    db.commit()
    db.refresh(host)
    return host


@router.delete("/hosts/{host_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_infrastructure_host(
    host_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete an infrastructure host."""
    query = db.query(InfrastructureHost).filter(InfrastructureHost.id == host_id)
    query = filter_by_client(query, InfrastructureHost, current_user, db)
    host = query.first()

    if not host:
        raise HTTPException(status_code=404, detail="Host not found")

    host.is_active = False
    db.commit()


# =====================================
# Host Port Endpoints
# =====================================

@router.get("/hosts/{host_id}/ports", response_model=List[HostPortResponse])
async def list_host_ports(
    host_id: UUID,
    operational_status: Optional[PortStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all ports for a host."""
    # Verify host access
    host_query = db.query(InfrastructureHost).filter(InfrastructureHost.id == host_id)
    host_query = filter_by_client(host_query, InfrastructureHost, current_user, db)
    host = host_query.first()

    if not host:
        raise HTTPException(status_code=404, detail="Host not found")

    query = db.query(HostPort).filter(
        HostPort.host_id == host_id,
        HostPort.is_active == True
    )

    if operational_status:
        query = query.filter(HostPort.operational_status == operational_status)

    return query.order_by(HostPort.port_name).all()


@router.post("/hosts/{host_id}/ports", response_model=HostPortResponse, status_code=status.HTTP_201_CREATED)
async def create_host_port(
    host_id: UUID,
    port_data: HostPortCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new port for a host."""
    # Verify host access
    host_query = db.query(InfrastructureHost).filter(InfrastructureHost.id == host_id)
    host_query = filter_by_client(host_query, InfrastructureHost, current_user, db)
    host = host_query.first()

    if not host:
        raise HTTPException(status_code=404, detail="Host not found")

    # Check for duplicate port name
    existing = db.query(HostPort).filter(
        HostPort.host_id == host_id,
        HostPort.port_name == port_data.port_name,
        HostPort.is_active == True
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Port '{port_data.port_name}' already exists on this host"
        )

    port = HostPort(
        host_id=host_id,
        client_id=host.client_id,
        neo4j_type="HostMS",
        neo4j_parent=host.hostname,
        **port_data.model_dump(exclude_unset=True)
    )

    db.add(port)
    db.commit()
    db.refresh(port)
    return port


@router.delete("/ports/{port_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_host_port(
    port_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a host port."""
    port = db.query(HostPort).filter(HostPort.id == port_id).first()

    if not port:
        raise HTTPException(status_code=404, detail="Port not found")

    # Verify access through host
    host_query = db.query(InfrastructureHost).filter(InfrastructureHost.id == port.host_id)
    host_query = filter_by_client(host_query, InfrastructureHost, current_user, db)
    if not host_query.first():
        raise HTTPException(status_code=404, detail="Port not found")

    port.is_active = False
    db.commit()


# =====================================
# Network Connection Endpoints
# =====================================

@router.get("/connections", response_model=List[NetworkConnectionResponse])
async def list_network_connections(
    relationship_type: Optional[ConnectionRelationshipType] = None,
    source_host_id: Optional[UUID] = None,
    target_host_id: Optional[UUID] = None,
    connection_status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List network connections."""
    query = db.query(NetworkConnection).filter(NetworkConnection.is_active == True)
    query = filter_by_client(query, NetworkConnection, current_user, db)

    if relationship_type:
        query = query.filter(NetworkConnection.relationship_type == relationship_type)
    if source_host_id:
        query = query.filter(NetworkConnection.source_host_id == source_host_id)
    if target_host_id:
        query = query.filter(NetworkConnection.target_host_id == target_host_id)
    if connection_status:
        query = query.filter(NetworkConnection.connection_status == connection_status)

    return query.offset((page - 1) * limit).limit(limit).all()


@router.get("/hosts/{host_id}/connections", response_model=List[NetworkConnectionResponse])
async def get_host_connections(
    host_id: UUID,
    direction: Optional[str] = Query(None, regex="^(incoming|outgoing|both)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all connections for a host (incoming, outgoing, or both)."""
    # Verify host access
    host_query = db.query(InfrastructureHost).filter(InfrastructureHost.id == host_id)
    host_query = filter_by_client(host_query, InfrastructureHost, current_user, db)
    if not host_query.first():
        raise HTTPException(status_code=404, detail="Host not found")

    query = db.query(NetworkConnection).filter(NetworkConnection.is_active == True)

    if direction == "incoming":
        query = query.filter(NetworkConnection.target_host_id == host_id)
    elif direction == "outgoing":
        query = query.filter(NetworkConnection.source_host_id == host_id)
    else:  # both or None
        query = query.filter(or_(
            NetworkConnection.source_host_id == host_id,
            NetworkConnection.target_host_id == host_id
        ))

    return query.all()


@router.post("/connections", response_model=NetworkConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_network_connection(
    conn_data: NetworkConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new network connection."""
    # Validate source and target exist
    if conn_data.source_host_id:
        source_host = db.query(InfrastructureHost).filter(
            InfrastructureHost.id == conn_data.source_host_id
        ).first()
        if not source_host:
            raise HTTPException(status_code=400, detail="Source host not found")
        client_id = source_host.client_id
    else:
        client_id = current_user.client_id

    if conn_data.target_host_id:
        target_host = db.query(InfrastructureHost).filter(
            InfrastructureHost.id == conn_data.target_host_id
        ).first()
        if not target_host:
            raise HTTPException(status_code=400, detail="Target host not found")

    connection = NetworkConnection(
        client_id=client_id,
        **conn_data.model_dump(exclude_unset=True)
    )

    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_network_connection(
    connection_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a network connection."""
    query = db.query(NetworkConnection).filter(NetworkConnection.id == connection_id)
    query = filter_by_client(query, NetworkConnection, current_user, db)
    connection = query.first()

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    connection.is_active = False
    db.commit()


# =====================================
# Device Template Endpoints
# =====================================

@router.get("/templates", response_model=List[DeviceTemplateResponse])
async def list_device_templates(
    network_layer: Optional[NetworkLayerType] = None,
    device_category: Optional[str] = None,
    device_vendor: Optional[DeviceVendor] = None,
    switch_network_type: Optional[SwitchNetworkType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all device templates (catalog)."""
    query = db.query(DeviceTemplate).filter(DeviceTemplate.is_active == True)

    if network_layer:
        query = query.filter(DeviceTemplate.network_layer == network_layer)
    if device_category:
        query = query.filter(DeviceTemplate.device_category == device_category)
    if device_vendor:
        query = query.filter(DeviceTemplate.device_vendor == device_vendor)
    if switch_network_type:
        query = query.filter(DeviceTemplate.switch_network_type == switch_network_type)

    return query.order_by(DeviceTemplate.network_layer, DeviceTemplate.template_name).all()


@router.get("/templates/{template_id}", response_model=DeviceTemplateResponse)
async def get_device_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific device template."""
    template = db.query(DeviceTemplate).filter(
        DeviceTemplate.id == template_id,
        DeviceTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("/templates", response_model=DeviceTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_device_template(
    template_data: DeviceTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new device template (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = db.query(DeviceTemplate).filter(
        DeviceTemplate.template_name == template_data.template_name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Template '{template_data.template_name}' already exists"
        )

    template = DeviceTemplate(**template_data.model_dump(exclude_unset=True))
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


# =====================================
# Topology Endpoints
# =====================================

@router.get("/topologies")
async def list_topologies(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all topologies for the current client."""
    try:
        query = db.query(InfrastructureTopology)
        query = filter_by_client(query, InfrastructureTopology, current_user, db)

        if status:
            query = query.filter(InfrastructureTopology.status == status)

        topologies = query.order_by(InfrastructureTopology.name).all()
        return topologies
    except Exception as e:
        logger.error(f"Error listing topologies: {e}", exc_info=True)
        return []


@router.get("/topologies/{topology_id}")
async def get_topology(
    topology_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific topology."""
    try:
        query = db.query(InfrastructureTopology).filter(InfrastructureTopology.id == topology_id)
        query = filter_by_client(query, InfrastructureTopology, current_user, db)
        topology = query.first()

        if not topology:
            raise HTTPException(status_code=404, detail="Topology not found")
        return topology
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting topology: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving topology")


@router.get("/topologies/{topology_id}/data")
async def get_topology_data(
    topology_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get topology visualization data (nodes, edges, groups)."""
    try:
        query = db.query(InfrastructureTopology).filter(InfrastructureTopology.id == topology_id)
        query = filter_by_client(query, InfrastructureTopology, current_user, db)
        topology = query.first()

        if not topology:
            raise HTTPException(status_code=404, detail="Topology not found")

        # Return empty topology data for now
        return {
            "nodes": [],
            "edges": [],
            "layer_groups": {},
            "statistics": {
                "total_nodes": 0,
                "total_edges": 0,
                "healthy_nodes": 0,
                "warning_nodes": 0,
                "critical_nodes": 0,
                "by_layer": {}
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting topology data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving topology data")


@router.post("/topologies", response_model=InfrastructureTopologyResponse, status_code=status.HTTP_201_CREATED)
async def create_topology(
    topology_data: InfrastructureTopologyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new topology view."""
    client_id = current_user.client_id
    if not client_id:
        raise HTTPException(status_code=400, detail="Client context required")

    # Check for duplicate name
    existing = db.query(InfrastructureTopology).filter(
        InfrastructureTopology.client_id == client_id,
        InfrastructureTopology.name == topology_data.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Topology '{topology_data.name}' already exists"
        )

    # If setting as default, unset other defaults
    if topology_data.is_default:
        db.query(InfrastructureTopology).filter(
            InfrastructureTopology.client_id == client_id,
            InfrastructureTopology.is_default == True
        ).update({"is_default": False})

    topology = InfrastructureTopology(
        client_id=client_id,
        **topology_data.model_dump(exclude_unset=True)
    )

    db.add(topology)
    db.commit()
    db.refresh(topology)
    return topology


@router.put("/topologies/{topology_id}", response_model=InfrastructureTopologyResponse)
async def update_topology(
    topology_id: UUID,
    topology_data: InfrastructureTopologyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a topology."""
    query = db.query(InfrastructureTopology).filter(InfrastructureTopology.id == topology_id)
    query = filter_by_client(query, InfrastructureTopology, current_user, db)
    topology = query.first()

    if not topology:
        raise HTTPException(status_code=404, detail="Topology not found")

    update_data = topology_data.model_dump(exclude_unset=True)

    # Handle default flag
    if update_data.get("is_default"):
        db.query(InfrastructureTopology).filter(
            InfrastructureTopology.client_id == topology.client_id,
            InfrastructureTopology.is_default == True,
            InfrastructureTopology.id != topology_id
        ).update({"is_default": False})

    for field, value in update_data.items():
        setattr(topology, field, value)

    topology.last_modified_by_id = current_user.id
    db.commit()
    db.refresh(topology)
    return topology


@router.delete("/topologies/{topology_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topology(
    topology_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a topology."""
    query = db.query(InfrastructureTopology).filter(InfrastructureTopology.id == topology_id)
    query = filter_by_client(query, InfrastructureTopology, current_user, db)
    topology = query.first()

    if not topology:
        raise HTTPException(status_code=404, detail="Topology not found")

    db.delete(topology)
    db.commit()


# Full Topology Response Schema
class FullTopologyHostResponse(BaseModel):
    id: str
    hostname: str
    display_name: Optional[str]
    network_layer: str
    device_category: str
    device_vendor: Optional[str]
    device_model: Optional[str]
    switch_network_type: Optional[str]
    server_type: Optional[str]
    management_ip: Optional[str]
    status: str
    health_status: str
    cpu_usage: Optional[float]
    memory_usage: Optional[float]
    data_center: Optional[str]
    location: Optional[str]

    class Config:
        from_attributes = True


class FullTopologyConnectionResponse(BaseModel):
    id: str
    source_host_id: str
    target_host_id: str
    relationship_type: str
    connection_status: str
    bandwidth: Optional[str]

    class Config:
        from_attributes = True


class FullTopologyData(BaseModel):
    hosts: List[FullTopologyHostResponse]
    connections: List[FullTopologyConnectionResponse]
    layer_counts: dict
    health_summary: dict


@router.get("/topology/full", response_model=FullTopologyData)
async def get_full_topology(
    client_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full topology data with all hosts and connections.
    Optionally filter by client_id (admin only).
    """
    # Build host query with client filtering
    host_query = db.query(InfrastructureHost).filter(InfrastructureHost.is_active == True)

    # Apply client filtering
    if current_user.role != "admin":
        # Non-admin users can only see their client's data
        if current_user.client_id:
            host_query = host_query.filter(InfrastructureHost.client_id == current_user.client_id)
    elif client_id:
        # Admin with specific client filter
        host_query = host_query.filter(InfrastructureHost.client_id == client_id)

    hosts = host_query.order_by(InfrastructureHost.network_layer, InfrastructureHost.hostname).all()
    host_ids = [h.id for h in hosts]

    # Get connections between these hosts
    conn_query = db.query(NetworkConnection).filter(
        NetworkConnection.is_active == True,
        or_(
            NetworkConnection.source_host_id.in_(host_ids),
            NetworkConnection.target_host_id.in_(host_ids)
        )
    )
    connections = conn_query.all()

    # Build response hosts
    response_hosts = []
    for h in hosts:
        response_hosts.append(FullTopologyHostResponse(
            id=str(h.id),
            hostname=h.hostname,
            display_name=h.display_name,
            network_layer=get_enum_value(h.network_layer) or "unknown",
            device_category=h.device_category or "unknown",
            device_vendor=get_enum_value(h.device_vendor),
            device_model=h.device_model,
            switch_network_type=get_enum_value(h.switch_network_type),
            server_type=get_enum_value(h.server_type),
            management_ip=str(h.management_ip) if h.management_ip else None,
            status=h.operational_status or "unknown",
            health_status=h.health_status or "unknown",
            cpu_usage=h.cpu_usage,
            memory_usage=h.memory_usage,
            data_center=h.data_center,
            location=h.location
        ))

    # Build response connections (only connections where both hosts are in our list)
    response_connections = []
    host_id_set = set(host_ids)
    for c in connections:
        if c.source_host_id in host_id_set and c.target_host_id in host_id_set:
            bandwidth_str = f"{c.bandwidth_mbps} Mbps" if c.bandwidth_mbps else None
            response_connections.append(FullTopologyConnectionResponse(
                id=str(c.id),
                source_host_id=str(c.source_host_id),
                target_host_id=str(c.target_host_id),
                relationship_type=get_enum_value(c.relationship_type) or "CONNECTS_TO",
                connection_status=c.connection_status or "unknown",
                bandwidth=bandwidth_str
            ))

    # Calculate layer counts
    layer_counts = {}
    for layer in NetworkLayerType:
        # Handle both Enum and string values from database
        count = sum(1 for h in hosts if get_enum_value(h.network_layer) == layer.value)
        if count > 0:
            layer_counts[layer.value] = count

    # Calculate health summary
    health_summary = {
        "healthy": sum(1 for h in hosts if h.health_status == "healthy"),
        "warning": sum(1 for h in hosts if h.health_status == "warning"),
        "critical": sum(1 for h in hosts if h.health_status in ["critical", "down"]),
        "unknown": sum(1 for h in hosts if h.health_status == "unknown" or h.health_status is None)
    }

    return FullTopologyData(
        hosts=response_hosts,
        connections=response_connections,
        layer_counts=layer_counts,
        health_summary=health_summary
    )


# =====================================
# Statistics Endpoints
# =====================================

@router.get("/stats", response_model=InfrastructureStats)
async def get_infrastructure_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get infrastructure statistics."""
    # Base queries with client filtering
    host_query = db.query(InfrastructureHost).filter(InfrastructureHost.is_active == True)
    host_query = filter_by_client(host_query, InfrastructureHost, current_user, db)

    port_query = db.query(HostPort).filter(HostPort.is_active == True)
    if current_user.role != "admin" and current_user.client_id:
        port_query = port_query.filter(HostPort.client_id == current_user.client_id)

    conn_query = db.query(NetworkConnection).filter(NetworkConnection.is_active == True)
    conn_query = filter_by_client(conn_query, NetworkConnection, current_user, db)

    # Total counts
    total_hosts = host_query.count()
    total_ports = port_query.count()
    total_connections = conn_query.count()

    # Layer statistics
    layers = []
    for layer in NetworkLayerType:
        layer_hosts = host_query.filter(InfrastructureHost.network_layer == layer).all()
        if layer_hosts:
            # Count by health status
            healthy = sum(1 for h in layer_hosts if h.health_status == "healthy")
            warning = sum(1 for h in layer_hosts if h.health_status == "warning")
            critical = sum(1 for h in layer_hosts if h.health_status in ["critical", "down"])

            # Count by vendor
            vendors = {}
            for h in layer_hosts:
                # device_vendor is stored as a string, not an Enum
                vendor = h.device_vendor if h.device_vendor else "unknown"
                vendors[vendor] = vendors.get(vendor, 0) + 1

            # Count by device type
            types = {}
            for h in layer_hosts:
                types[h.device_category] = types.get(h.device_category, 0) + 1

            layers.append(LayerStats(
                layer=layer.value,
                layer_display_name={
                    "f_swi": "Firewall Layer",
                    "r_swi": "Router Layer",
                    "e_swi": "Exchange Switch Layer",
                    "s_hw": "Server Hardware Layer"
                }.get(layer.value, layer.value),
                total_devices=len(layer_hosts),
                healthy_devices=healthy,
                warning_devices=warning,
                critical_devices=critical,
                devices_by_vendor=vendors,
                devices_by_type=types
            ))

    # Network zones (for switches only)
    network_zones = {}
    for zone in SwitchNetworkType:
        zone_count = host_query.filter(
            InfrastructureHost.switch_network_type == zone
        ).count()
        if zone_count > 0:
            network_zones[zone.value] = zone_count

    # VM to Physical ratio
    physical_count = host_query.filter(
        InfrastructureHost.server_type == ServerType.PHYSICAL
    ).count()
    vm_count = host_query.filter(
        InfrastructureHost.server_type == ServerType.VIRTUAL
    ).count()
    vm_physical_ratio = {
        "physical": physical_count,
        "virtual": vm_count,
        "ratio": f"{vm_count}:{physical_count}" if physical_count > 0 else "N/A"
    }

    # Overall health summary
    all_hosts = host_query.all()
    health_summary = {
        "healthy": sum(1 for h in all_hosts if h.health_status == "healthy"),
        "warning": sum(1 for h in all_hosts if h.health_status == "warning"),
        "critical": sum(1 for h in all_hosts if h.health_status in ["critical", "down"]),
        "unknown": sum(1 for h in all_hosts if h.health_status == "unknown")
    }

    return InfrastructureStats(
        total_hosts=total_hosts,
        total_ports=total_ports,
        total_connections=total_connections,
        layers=layers,
        network_zones=network_zones,
        vm_physical_ratio=vm_physical_ratio,
        health_summary=health_summary
    )


@router.get("/stats/layer/{layer}", response_model=LayerStats)
async def get_layer_stats(
    layer: NetworkLayerType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a specific layer."""
    query = db.query(InfrastructureHost).filter(
        InfrastructureHost.is_active == True,
        InfrastructureHost.network_layer == layer
    )
    query = filter_by_client(query, InfrastructureHost, current_user, db)
    hosts = query.all()

    if not hosts:
        raise HTTPException(status_code=404, detail=f"No hosts found in layer {layer.value}")

    # Count by health status
    healthy = sum(1 for h in hosts if h.health_status == "healthy")
    warning = sum(1 for h in hosts if h.health_status == "warning")
    critical = sum(1 for h in hosts if h.health_status in ["critical", "down"])

    # Count by vendor
    vendors = {}
    for h in hosts:
        # device_vendor is stored as a string, not an Enum
        vendor = h.device_vendor if h.device_vendor else "unknown"
        vendors[vendor] = vendors.get(vendor, 0) + 1

    # Count by device type
    types = {}
    for h in hosts:
        types[h.device_category] = types.get(h.device_category, 0) + 1

    return LayerStats(
        layer=layer.value,
        layer_display_name={
            "f_swi": "Firewall Layer",
            "r_swi": "Router Layer",
            "e_swi": "Exchange Switch Layer",
            "s_hw": "Server Hardware Layer"
        }.get(layer.value, layer.value),
        total_devices=len(hosts),
        healthy_devices=healthy,
        warning_devices=warning,
        critical_devices=critical,
        devices_by_vendor=vendors,
        devices_by_type=types
    )


# =====================================
# VM-Physical Relationship Endpoints
# =====================================

@router.get("/vm-physical-mapping")
async def get_vm_physical_mapping(
    physical_host_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get VM to Physical server mapping."""
    query = db.query(InfrastructureHost).filter(
        InfrastructureHost.is_active == True,
        InfrastructureHost.server_type == ServerType.VIRTUAL
    )
    query = filter_by_client(query, InfrastructureHost, current_user, db)

    if physical_host_id:
        query = query.filter(InfrastructureHost.hypervisor_id == physical_host_id)

    vms = query.all()

    # Build mapping
    mapping = []
    for vm in vms:
        physical_host = None
        if vm.hypervisor_id:
            physical_host = db.query(InfrastructureHost).filter(
                InfrastructureHost.id == vm.hypervisor_id
            ).first()

        mapping.append({
            "vm": {
                "id": str(vm.id),
                "hostname": vm.hostname,
                "ip": str(vm.management_ip) if vm.management_ip else None,
                "os": vm.operating_system,
                "status": vm.operational_status
            },
            "physical_host": {
                "id": str(physical_host.id) if physical_host else None,
                "hostname": physical_host.hostname if physical_host else None,
                "ip": str(physical_host.management_ip) if physical_host and physical_host.management_ip else None,
                "model": physical_host.device_model if physical_host else None
            } if physical_host else None,
            "connection": {
                "physical_ip_link": str(vm.physical_host_ip) if vm.physical_host_ip else None
            }
        })

    return {"mappings": mapping, "total": len(mapping)}


@router.post("/vm-physical-mapping")
async def create_vm_physical_mapping(
    vm_id: UUID,
    physical_host_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a VM to Physical server mapping."""
    # Get VM
    vm_query = db.query(InfrastructureHost).filter(
        InfrastructureHost.id == vm_id,
        InfrastructureHost.server_type == ServerType.VIRTUAL
    )
    vm_query = filter_by_client(vm_query, InfrastructureHost, current_user, db)
    vm = vm_query.first()

    if not vm:
        raise HTTPException(status_code=404, detail="Virtual machine not found")

    # Get Physical Host
    physical_query = db.query(InfrastructureHost).filter(
        InfrastructureHost.id == physical_host_id,
        InfrastructureHost.server_type == ServerType.PHYSICAL
    )
    physical_query = filter_by_client(physical_query, InfrastructureHost, current_user, db)
    physical_host = physical_query.first()

    if not physical_host:
        raise HTTPException(status_code=404, detail="Physical host not found")

    # Update VM with hypervisor reference
    vm.hypervisor_id = physical_host_id
    vm.physical_host_ip = physical_host.management_ip

    # Create RUNS_ON connection
    existing_conn = db.query(NetworkConnection).filter(
        NetworkConnection.source_host_id == vm_id,
        NetworkConnection.target_host_id == physical_host_id,
        NetworkConnection.relationship_type == ConnectionRelationshipType.RUNS_ON
    ).first()

    if not existing_conn:
        connection = NetworkConnection(
            client_id=vm.client_id,
            relationship_type=ConnectionRelationshipType.RUNS_ON,
            source_host_id=vm_id,
            source_entity_type="host",
            target_host_id=physical_host_id,
            target_entity_type="host",
            connection_name=f"{vm.hostname} RUNS_ON {physical_host.hostname}",
            connection_status="active"
        )
        db.add(connection)

    db.commit()

    return {
        "success": True,
        "message": f"VM {vm.hostname} mapped to physical host {physical_host.hostname}",
        "vm_id": str(vm_id),
        "physical_host_id": str(physical_host_id)
    }
