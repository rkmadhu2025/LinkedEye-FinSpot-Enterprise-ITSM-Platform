"""
Network Device model for network infrastructure management.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET, MACADDR
from app.models.base import BaseModel
import enum


class DeviceType(str, enum.Enum):
    """Network device types."""
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    LOAD_BALANCER = "load_balancer"
    ACCESS_POINT = "access_point"
    GATEWAY = "gateway"
    SERVER = "server"
    OTHER = "other"


class DeviceStatus(str, enum.Enum):
    """Device operational status."""
    UP = "up"
    DOWN = "down"
    WARNING = "warning"
    MAINTENANCE = "maintenance"
    UNKNOWN = "unknown"


class NetworkDevice(BaseModel):
    """Network Device model for network infrastructure."""
    __tablename__ = "network_devices"

    # Client/Tenant Isolation
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Network Layer Classification (for network flow architecture)
    network_layer = Column(String(20), nullable=True)  # f_swi, r_swi, e_swi, s_hw
    switch_network_type = Column(String(20), nullable=True)  # gateway, public, exchange
    infrastructure_host_id = Column(UUID(as_uuid=True), ForeignKey("infrastructure_hosts.id"), nullable=True)

    # Basic Information
    hostname = Column(String(255), nullable=False, index=True)
    device_type = Column(SQLEnum(DeviceType), nullable=False)
    manufacturer = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True, unique=True)
    
    # Network Information
    ip_address = Column(INET, nullable=True, index=True)
    mac_address = Column(MACADDR, nullable=True)
    subnet = Column(String(50), nullable=True)
    vlan = Column(String(50), nullable=True)
    
    # Location
    location = Column(String(255), nullable=True)
    rack = Column(String(50), nullable=True)
    rack_unit = Column(String(20), nullable=True)
    data_center = Column(String(100), nullable=True)
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    
    # Status and Health
    status = Column(SQLEnum(DeviceStatus), default=DeviceStatus.UNKNOWN, nullable=False)
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    disk_usage = Column(Float, nullable=True)
    uptime_seconds = Column(Integer, nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    
    # Port Information
    total_ports = Column(Integer, nullable=True)
    used_ports = Column(Integer, nullable=True)
    port_status = Column(JSONB, default=dict, nullable=False)
    
    # Configuration
    firmware_version = Column(String(50), nullable=True)
    configuration = Column(Text, nullable=True)
    snmp_community = Column(String(100), nullable=True)
    
    # Ownership
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    notes = Column(Text, nullable=True)
    
    @property
    def is_up(self) -> bool:
        """Check if device is up."""
        return self.status == DeviceStatus.UP
    
    @property
    def needs_attention(self) -> bool:
        """Check if device needs attention."""
        return self.status in [DeviceStatus.DOWN, DeviceStatus.WARNING]
    
    @property
    def port_utilization(self) -> float:
        """Calculate port utilization percentage."""
        if self.total_ports and self.used_ports:
            return (self.used_ports / self.total_ports) * 100
        return 0.0
