"""
Network Layer and Infrastructure models for Network Flow Architecture.

Implements the 4-layer network architecture:
- f_swi: Firewall Switch Layer (Perimeter Security)
- r_swi: Router Switch Layer (Network Routing)
- e_swi: Exchange Switch Layer (Core/Distribution)
- s_hw: Server Hardware Layer (Compute Layer)

Supports Neo4j-style relationships:
- CONNECTS_TO: Port-to-Port connections
- HAS_MICROSERVICE: Host to Service relationship
- RUNS_ON: VM to Physical server relationship
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import enum
import uuid

from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Integer, Float,
    Enum as SQLEnum, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, INET, MACADDR
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


# =====================================
# Network Layer Enums
# =====================================

class NetworkLayerType(str, enum.Enum):
    """Network layer classification based on network flow architecture."""
    F_SWI = "f_swi"       # Firewall Switch Layer - Perimeter Security
    R_SWI = "r_swi"       # Router Switch Layer - Network Routing
    E_SWI = "e_swi"       # Exchange Switch Layer - Core/Distribution
    S_HW = "s_hw"         # Server Hardware Layer - Compute Layer


class SwitchNetworkType(str, enum.Enum):
    """Switch network zone types (3 zones)."""
    GATEWAY = "gateway"     # WAN/Internet facing - connects to firewall uplink
    PUBLIC = "public"       # DMZ/Public services - Semi-trusted zone
    EXCHANGE = "exchange"   # Internal/Core network - Server farm connectivity


class DeviceVendor(str, enum.Enum):
    """Network device vendors."""
    FORTIGATE = "fortigate"
    CISCO = "cisco"
    HUAWEI = "huawei"
    ARISTA = "arista"
    ARUBA = "aruba"
    DELL = "dell"
    JUNIPER = "juniper"
    OTHER = "other"


class ServerType(str, enum.Enum):
    """Server type classification."""
    PHYSICAL = "physical"
    VIRTUAL = "virtual"


class ConnectionRelationshipType(str, enum.Enum):
    """Neo4j-style relationship types for network connections."""
    CONNECTS_TO = "CONNECTS_TO"           # Port-to-Port physical/logical connection
    HAS_MICROSERVICE = "HAS_MICROSERVICE" # Host to Service relationship
    RUNS_ON = "RUNS_ON"                   # VM to Physical server relationship
    LINKS_TO = "LINKS_TO"                 # Virtual NIC to Physical NIC
    MANAGES = "MANAGES"                   # Management relationship
    DEPENDS_ON = "DEPENDS_ON"             # Dependency relationship
    BACKUP_OF = "BACKUP_OF"               # Redundancy relationship


class PortStatus(str, enum.Enum):
    """Port operational status."""
    UP = "up"
    DOWN = "down"
    ADMIN_DOWN = "admin_down"
    ERROR = "error"
    NOT_CONNECTED = "not_connected"


class PortType(str, enum.Enum):
    """Port interface types."""
    ETHERNET = "ethernet"
    GIGABIT = "gigabit"
    TEN_GIGABIT = "ten_gigabit"
    FORTY_GIGABIT = "forty_gigabit"
    HUNDRED_GIGABIT = "hundred_gigabit"
    SFP = "sfp"
    SFP_PLUS = "sfp_plus"
    QSFP = "qsfp"
    FIBER = "fiber"
    SERIAL = "serial"
    VIRTUAL = "virtual"


# =====================================
# Infrastructure Host Model
# =====================================

class InfrastructureHost(BaseModel):
    """
    Infrastructure Host model representing network devices and servers.

    This is the main entity for the network flow architecture.
    Maps to Neo4j node type: Host

    Attributes:
        _NEO4j_type: Host
        _NEO4j_layer: Network layer classification
        _NEO4j_parent: Parent hostname (empty for root level)
        _NEO4j_sertype: Device service type
    """
    __tablename__ = "infrastructure_hosts"

    # Client/Tenant Isolation
    client_id = Column(PGUUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Basic Identification
    hostname = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    # Network Layer Classification (Neo4j-style)
    neo4j_type = Column(String(50), default="Host", nullable=False)  # Always "Host" for devices
    network_layer = Column(SQLEnum(NetworkLayerType), nullable=False, index=True)
    neo4j_parent = Column(String(255), default="", nullable=False)  # Empty for root level
    service_type = Column(String(100), nullable=True)  # Device Service Type

    # Device Classification
    device_category = Column(String(50), nullable=False)  # firewall, router, switch, server
    device_vendor = Column(SQLEnum(DeviceVendor), nullable=True)
    device_model = Column(String(100), nullable=True)
    device_series = Column(String(50), nullable=True)  # e.g., FortiGate 50E, 60F, 200F

    # For Switches - Network Zone Type
    switch_network_type = Column(SQLEnum(SwitchNetworkType), nullable=True)
    is_stacked = Column(Boolean, default=False)  # Stack vs Standalone
    stack_position = Column(Integer, nullable=True)
    stack_master_id = Column(PGUUID(as_uuid=True), ForeignKey("infrastructure_hosts.id"), nullable=True)

    # For Servers
    server_type = Column(SQLEnum(ServerType), nullable=True)
    operating_system = Column(String(100), nullable=True)
    os_version = Column(String(50), nullable=True)
    hypervisor_id = Column(PGUUID(as_uuid=True), ForeignKey("infrastructure_hosts.id"), nullable=True)
    physical_host_ip = Column(INET, nullable=True)  # _NEO4j_PhysicalIp for VMs

    # Network Configuration
    management_ip = Column(INET, nullable=True, index=True)
    management_mac = Column(MACADDR, nullable=True)
    management_vlan = Column(Integer, nullable=True)

    # Hardware Information
    serial_number = Column(String(100), nullable=True, unique=True)
    asset_tag = Column(String(100), nullable=True)
    firmware_version = Column(String(50), nullable=True)
    hardware_specs = Column(JSONB, default=dict)  # CPU, RAM, Storage, etc.

    # Port/Interface Configuration
    total_ports = Column(Integer, nullable=True)
    port_configuration = Column(JSONB, default=dict)  # Detailed port config

    # Location
    data_center = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    rack_id = Column(String(50), nullable=True)
    rack_unit = Column(String(20), nullable=True)

    # Status and Health
    operational_status = Column(String(20), default="unknown", nullable=False)
    health_status = Column(String(20), default="unknown", nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    uptime_seconds = Column(Integer, nullable=True)

    # Metrics (real-time)
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    disk_usage = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)

    # Ownership
    owner_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_group_id = Column(PGUUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)

    # Metadata
    tags = Column(JSONB, default=list)
    custom_fields = Column(JSONB, default=dict)
    notes = Column(Text, nullable=True)

    # Relationships
    client = relationship("Client", backref="infrastructure_hosts")
    stack_master = relationship("InfrastructureHost", remote_side="InfrastructureHost.id",
                               foreign_keys=[stack_master_id])
    hypervisor = relationship("InfrastructureHost", remote_side="InfrastructureHost.id",
                             foreign_keys=[hypervisor_id])

    # Indexes
    __table_args__ = (
        Index("idx_infra_host_client_layer", "client_id", "network_layer"),
        Index("idx_infra_host_layer_vendor", "network_layer", "device_vendor"),
        Index("idx_infra_host_status", "operational_status", "health_status"),
        UniqueConstraint("client_id", "hostname", name="uq_infra_host_client_hostname"),
    )

    def __repr__(self):
        return f"<InfrastructureHost {self.hostname} ({self.network_layer.value})>"

    @property
    def is_vm(self) -> bool:
        """Check if this is a virtual machine."""
        return self.server_type == ServerType.VIRTUAL

    @property
    def is_physical(self) -> bool:
        """Check if this is a physical device."""
        return self.server_type == ServerType.PHYSICAL or self.network_layer != NetworkLayerType.S_HW

    @property
    def layer_display_name(self) -> str:
        """Get human-readable layer name."""
        layer_names = {
            NetworkLayerType.F_SWI: "Firewall Layer",
            NetworkLayerType.R_SWI: "Router Layer",
            NetworkLayerType.E_SWI: "Exchange Switch Layer",
            NetworkLayerType.S_HW: "Server Hardware Layer"
        }
        return layer_names.get(self.network_layer, "Unknown Layer")

    def to_neo4j_dict(self) -> Dict[str, Any]:
        """Convert to Neo4j-compatible dictionary format."""
        return {
            "id": str(self.id),
            "_NEO4j_type": self.neo4j_type,
            "_NEO4j_layer": self.network_layer.value,
            "_NEO4j_parent": self.neo4j_parent,
            "_NEO4j_sertype": self.service_type,
            "hostname": self.hostname,
            "display_name": self.display_name,
            "device_category": self.device_category,
            "device_vendor": self.device_vendor.value if self.device_vendor else None,
            "device_model": self.device_model,
            "management_ip": str(self.management_ip) if self.management_ip else None,
            "operational_status": self.operational_status,
            "health_status": self.health_status,
        }


# =====================================
# Port/Interface Model
# =====================================

class HostPort(BaseModel):
    """
    Port/Interface model for network device ports.

    Maps to Neo4j service type: HostMS (Host Micro-Service)
    Represents physical or virtual interfaces on infrastructure hosts.
    """
    __tablename__ = "host_ports"

    # Parent Host
    host_id = Column(PGUUID(as_uuid=True), ForeignKey("infrastructure_hosts.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(PGUUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Port Identification
    port_name = Column(String(100), nullable=False)  # e.g., Gi1/0/1, eth0, wan1
    port_display_name = Column(String(255), nullable=True)
    port_description = Column(Text, nullable=True)

    # Neo4j Properties
    neo4j_type = Column(String(50), default="HostMS", nullable=False)  # HostMS or ServiceMS
    neo4j_parent = Column(String(255), nullable=False)  # HOSTNAME
    relationship_required = Column(Boolean, default=False)  # _NEO4J_RELATIONSHIP_RQD

    # Port Configuration
    port_type = Column(SQLEnum(PortType), default=PortType.GIGABIT)
    port_number = Column(Integer, nullable=True)
    slot_number = Column(Integer, nullable=True)
    module_number = Column(Integer, nullable=True)

    # Network Configuration
    ip_address = Column(INET, nullable=True)
    mac_address = Column(MACADDR, nullable=True)
    subnet_mask = Column(String(20), nullable=True)
    vlan_id = Column(Integer, nullable=True)
    vlan_mode = Column(String(20), nullable=True)  # access, trunk, hybrid
    native_vlan = Column(Integer, nullable=True)
    allowed_vlans = Column(JSONB, default=list)  # For trunk ports

    # Speed and Duplex
    speed_mbps = Column(Integer, nullable=True)
    negotiated_speed_mbps = Column(Integer, nullable=True)
    duplex = Column(String(20), nullable=True)  # full, half, auto

    # Status
    admin_status = Column(String(20), default="up")  # up, down
    operational_status = Column(SQLEnum(PortStatus), default=PortStatus.NOT_CONNECTED)
    last_status_change = Column(DateTime(timezone=True), nullable=True)

    # Counters/Metrics
    rx_bytes = Column(Integer, default=0)
    tx_bytes = Column(Integer, default=0)
    rx_packets = Column(Integer, default=0)
    tx_packets = Column(Integer, default=0)
    rx_errors = Column(Integer, default=0)
    tx_errors = Column(Integer, default=0)
    rx_drops = Column(Integer, default=0)
    tx_drops = Column(Integer, default=0)

    # Physical NIC Link (for VMs)
    physical_nic_link = Column(String(255), nullable=True)  # _NEO4j_PhysicalNICLink

    # Metadata
    tags = Column(JSONB, default=list)
    custom_fields = Column(JSONB, default=dict)

    # Relationships
    host = relationship("InfrastructureHost", backref="ports")

    # Indexes
    __table_args__ = (
        Index("idx_host_port_host", "host_id"),
        Index("idx_host_port_status", "operational_status"),
        UniqueConstraint("host_id", "port_name", name="uq_host_port_name"),
    )

    def __repr__(self):
        return f"<HostPort {self.neo4j_parent}:{self.port_name}>"

    @property
    def full_port_name(self) -> str:
        """Get full port identifier including hostname."""
        return f"{self.neo4j_parent}:{self.port_name}"

    def to_neo4j_dict(self) -> Dict[str, Any]:
        """Convert to Neo4j-compatible dictionary format."""
        return {
            "id": str(self.id),
            "_NEO4j_type": self.neo4j_type,
            "_NEO4j_parent": self.neo4j_parent,
            "_NEO4J_RELATIONSHIP_RQD": "Yes" if self.relationship_required else "No",
            "port_name": self.port_name,
            "ip_address": str(self.ip_address) if self.ip_address else None,
            "mac_address": str(self.mac_address) if self.mac_address else None,
            "operational_status": self.operational_status.value if self.operational_status else None,
        }


# =====================================
# Connection Relationship Model
# =====================================

class NetworkConnection(BaseModel):
    """
    Network Connection model for Neo4j-style relationships.

    Supports relationships:
    - CONNECTS_TO: Port-to-Port connections
    - HAS_MICROSERVICE: Host to Service
    - RUNS_ON: VM to Physical
    - LINKS_TO: vNIC to Physical NIC
    """
    __tablename__ = "network_connections"

    # Client/Tenant Isolation
    client_id = Column(PGUUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Relationship Type
    relationship_type = Column(SQLEnum(ConnectionRelationshipType), nullable=False, index=True)

    # Source Entity
    source_host_id = Column(PGUUID(as_uuid=True), ForeignKey("infrastructure_hosts.id", ondelete="CASCADE"), nullable=True)
    source_port_id = Column(PGUUID(as_uuid=True), ForeignKey("host_ports.id", ondelete="CASCADE"), nullable=True)
    source_entity_type = Column(String(50), nullable=False)  # host, port, service

    # Target Entity
    target_host_id = Column(PGUUID(as_uuid=True), ForeignKey("infrastructure_hosts.id", ondelete="CASCADE"), nullable=True)
    target_port_id = Column(PGUUID(as_uuid=True), ForeignKey("host_ports.id", ondelete="CASCADE"), nullable=True)
    target_entity_type = Column(String(50), nullable=False)  # host, port, service

    # Connection Details
    connection_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    # Physical Connection Info
    cable_type = Column(String(50), nullable=True)  # fiber, cat6, etc.
    cable_length = Column(String(20), nullable=True)
    cable_label = Column(String(100), nullable=True)

    # Logical Connection Info
    bandwidth_mbps = Column(Integer, nullable=True)
    latency_ms = Column(Float, nullable=True)

    # Status
    connection_status = Column(String(20), default="active")  # active, inactive, failed
    last_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    properties = Column(JSONB, default=dict)  # Additional relationship properties
    tags = Column(JSONB, default=list)

    # Relationships
    source_host = relationship("InfrastructureHost", foreign_keys=[source_host_id],
                               backref="outgoing_connections")
    source_port = relationship("HostPort", foreign_keys=[source_port_id],
                               backref="outgoing_connections")
    target_host = relationship("InfrastructureHost", foreign_keys=[target_host_id],
                               backref="incoming_connections")
    target_port = relationship("HostPort", foreign_keys=[target_port_id],
                               backref="incoming_connections")

    # Indexes
    __table_args__ = (
        Index("idx_net_conn_client_type", "client_id", "relationship_type"),
        Index("idx_net_conn_source_host", "source_host_id"),
        Index("idx_net_conn_target_host", "target_host_id"),
        Index("idx_net_conn_source_port", "source_port_id"),
        Index("idx_net_conn_target_port", "target_port_id"),
    )

    def __repr__(self):
        return f"<NetworkConnection {self.relationship_type.value}: {self.source_entity_type}->{self.target_entity_type}>"

    def to_neo4j_dict(self) -> Dict[str, Any]:
        """Convert to Neo4j-compatible relationship format."""
        return {
            "id": str(self.id),
            "type": self.relationship_type.value,
            "source": {
                "entity_type": self.source_entity_type,
                "host_id": str(self.source_host_id) if self.source_host_id else None,
                "port_id": str(self.source_port_id) if self.source_port_id else None,
            },
            "target": {
                "entity_type": self.target_entity_type,
                "host_id": str(self.target_host_id) if self.target_host_id else None,
                "port_id": str(self.target_port_id) if self.target_port_id else None,
            },
            "properties": self.properties,
            "status": self.connection_status,
        }


# =====================================
# Microservice Model
# =====================================

class HostMicroservice(BaseModel):
    """
    Microservice running on infrastructure hosts.

    Maps to Neo4j type: ServiceMS
    Examples: Web servers, databases, monitoring agents, etc.
    """
    __tablename__ = "host_microservices"

    # Parent Host
    host_id = Column(PGUUID(as_uuid=True), ForeignKey("infrastructure_hosts.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(PGUUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Service Identification
    service_name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    # Neo4j Properties
    neo4j_type = Column(String(50), default="ServiceMS", nullable=False)
    neo4j_parent = Column(String(255), nullable=False)  # HOSTNAME
    relationship_required = Column(Boolean, default=True)

    # Service Configuration
    service_type = Column(String(100), nullable=True)  # web, database, cache, etc.
    port_number = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=True)  # tcp, udp, http, https

    # Status
    service_status = Column(String(20), default="unknown")  # running, stopped, error
    health_check_url = Column(String(500), nullable=True)
    last_health_check = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    version = Column(String(50), nullable=True)
    configuration = Column(JSONB, default=dict)
    tags = Column(JSONB, default=list)

    # Relationships
    host = relationship("InfrastructureHost", backref="microservices")

    __table_args__ = (
        Index("idx_host_ms_host", "host_id"),
        UniqueConstraint("host_id", "service_name", "port_number", name="uq_host_microservice"),
    )

    def __repr__(self):
        return f"<HostMicroservice {self.neo4j_parent}:{self.service_name}>"


# =====================================
# Device Template/Catalog Model
# =====================================

class DeviceTemplate(BaseModel):
    """
    Device template catalog for standard device configurations.

    Maps the device models mentioned in the architecture:
    - FortiGate 50E-200F
    - Cisco 2911/2921/3945, ISR 1000, Router-4321
    - Cisco, Huawei, Arista, Aruba switches
    - Server templates (CentOS, RHEL, Ubuntu, Windows)
    """
    __tablename__ = "device_templates"

    # Template Identification
    template_name = Column(String(255), nullable=False, unique=True)
    display_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    # Device Classification
    network_layer = Column(SQLEnum(NetworkLayerType), nullable=False, index=True)
    device_category = Column(String(50), nullable=False)  # firewall, router, switch, server
    device_vendor = Column(SQLEnum(DeviceVendor), nullable=True)
    device_model = Column(String(100), nullable=True)
    device_series = Column(String(50), nullable=True)

    # For Switch Templates
    switch_network_type = Column(SQLEnum(SwitchNetworkType), nullable=True)
    is_stack_template = Column(Boolean, default=False)

    # Port Configuration Template
    default_ports = Column(Integer, nullable=True)
    port_template = Column(JSONB, default=list)  # Standard port configuration

    # Service Type Template
    service_type_template = Column(String(100), nullable=True)

    # Default Configuration
    default_config = Column(JSONB, default=dict)
    default_specs = Column(JSONB, default=dict)

    # Template File Reference (YAML)
    template_file_name = Column(String(255), nullable=True)  # e.g., FortiGate-60F-Gateway.yaml

    # Status
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index("idx_device_template_layer", "network_layer"),
        Index("idx_device_template_vendor", "device_vendor"),
    )

    def __repr__(self):
        return f"<DeviceTemplate {self.template_name}>"

    @property
    def full_template_name(self) -> str:
        """Get full template name with zone suffix."""
        if self.switch_network_type:
            stack_suffix = " stack" if self.is_stack_template else ""
            return f"{self.device_model}-{self.switch_network_type.value.title()}{stack_suffix}"
        return self.template_name


# =====================================
# Topology View Model
# =====================================

class InfrastructureTopology(BaseModel):
    """
    Infrastructure Topology model for client-specific network views.

    Stores the visual layout and grouping for network topology visualization.
    """
    __tablename__ = "infrastructure_topologies"

    # Client Isolation
    client_id = Column(PGUUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)

    # Topology Identification
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    topology_type = Column(String(50), default="network_flow")  # network_flow, physical, logical

    # Scope
    scope = Column(String(100), nullable=True)  # datacenter, building, floor
    data_center = Column(String(100), nullable=True)

    # Visualization Configuration
    layout_type = Column(String(50), default="hierarchical")  # hierarchical, force-directed, grid
    layout_config = Column(JSONB, default=dict)  # Layout parameters

    # Node Positions (stored for persistence)
    node_positions = Column(JSONB, default=dict)  # {node_id: {x, y}}

    # Grouping Configuration
    layer_groups = Column(JSONB, default=dict)  # Layer-based grouping
    custom_groups = Column(JSONB, default=list)  # Custom device groups

    # Filters
    included_layers = Column(JSONB, default=list)  # Which layers to show
    included_hosts = Column(JSONB, default=list)  # Specific hosts to include
    excluded_hosts = Column(JSONB, default=list)  # Hosts to exclude

    # Display Options
    show_connections = Column(Boolean, default=True)
    show_ports = Column(Boolean, default=False)
    show_metrics = Column(Boolean, default=True)
    show_status_colors = Column(Boolean, default=True)

    # Status
    status = Column(String(20), default="active")  # active, draft, archived
    is_default = Column(Boolean, default=False)

    # Ownership
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    last_modified_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Metadata
    tags = Column(JSONB, default=list)
    custom_fields = Column(JSONB, default=dict)

    # Relationships
    client = relationship("Client", backref="topologies")

    __table_args__ = (
        Index("idx_infra_topo_client", "client_id"),
        UniqueConstraint("client_id", "name", name="uq_infra_topo_client_name"),
    )

    def __repr__(self):
        return f"<InfrastructureTopology {self.name}>"
