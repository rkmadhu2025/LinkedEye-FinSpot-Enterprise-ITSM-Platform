"""
Network Device management API endpoints.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.network_device import NetworkDevice, DeviceType, DeviceStatus
from app.api.dependencies import get_current_user, require_agent, require_admin
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/network-devices", tags=["network-devices"])


# Pydantic models
class NetworkDeviceCreate(BaseModel):
    hostname: str = Field(..., min_length=1)
    device_type: DeviceType
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    environment_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    tags: List[str] = Field(default_factory=list)


class NetworkDeviceUpdate(BaseModel):
    hostname: Optional[str] = None
    device_type: Optional[DeviceType] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    ip_address: Optional[str] = None
    status: Optional[DeviceStatus] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    uptime_seconds: Optional[int] = None
    tags: Optional[List[str]] = None


class NetworkDeviceResponse(BaseModel):
    id: UUID
    hostname: str
    device_type: DeviceType
    manufacturer: Optional[str]
    model: Optional[str]
    ip_address: Optional[str]
    status: DeviceStatus
    cpu_usage: Optional[float]
    memory_usage: Optional[float]
    disk_usage: Optional[float]
    uptime_seconds: Optional[int]
    total_ports: Optional[int]
    used_ports: Optional[int]
    port_status: Optional[dict] = None  # JSONB field - can be dict or list
    last_seen_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    location: Optional[str]
    serial_number: Optional[str]
    firmware_version: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


@router.post("", response_model=NetworkDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_network_device(
    device_data: NetworkDeviceCreate,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create a new network device."""
    try:
        new_device = NetworkDevice(
            hostname=device_data.hostname,
            device_type=device_data.device_type,
            manufacturer=device_data.manufacturer,
            model=device_data.model,
            serial_number=device_data.serial_number,
            ip_address=device_data.ip_address,
            location=device_data.location,
            environment_id=device_data.environment_id,
            owner_id=device_data.owner_id or current_user.id,
            tags=device_data.tags,
            created_by_id=current_user.id
        )
        
        db.add(new_device)
        db.commit()
        db.refresh(new_device)
        
        logger.info(f"Network device created: {new_device.id}")
        return new_device
    
    except Exception as e:
        logger.error(f"Error creating network device: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create network device"
        )


@router.get("", response_model=List[NetworkDeviceResponse])
async def get_network_devices(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    device_type: Optional[DeviceType] = Query(None),
    status_filter: Optional[DeviceStatus] = Query(None, alias="status"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of network devices."""
    try:
        query = db.query(NetworkDevice).filter(NetworkDevice.is_active == True)

        if search:
            query = query.filter(
                or_(
                    NetworkDevice.hostname.ilike(f"%{search}%"),
                    NetworkDevice.ip_address.ilike(f"%{search}%")
                )
            )

        if device_type:
            query = query.filter(NetworkDevice.device_type == device_type)

        if status_filter:
            query = query.filter(NetworkDevice.status == status_filter)

        # Get total count before pagination
        total = query.count()

        query = query.order_by(NetworkDevice.hostname)
        devices = query.offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return devices

    except Exception as e:
        logger.error(f"Error fetching network devices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch network devices"
        )


@router.get("/{device_id}", response_model=NetworkDeviceResponse)
async def get_network_device(
    device_id: UUID,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get network device by ID."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )
        return device
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching network device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch network device"
        )


@router.put("/{device_id}", response_model=NetworkDeviceResponse)
async def update_network_device(
    device_id: UUID,
    device_data: NetworkDeviceUpdate,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update network device."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )
        
        update_data = device_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(device, field, value)
        
        device.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(device)
        
        logger.info(f"Network device updated: {device.id}")
        return device
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating network device: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update network device"
        )


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_network_device(
    device_id: UUID,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete network device (soft delete)."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )

        device.is_active = False
        device.updated_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(f"Network device deleted: {device_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting network device: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete network device"
        )


# =============================================================================
# METRICS ENDPOINTS
# =============================================================================

class MetricsHistoryResponse(BaseModel):
    timestamp: datetime
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    temperature: Optional[float] = None
    fan_status: Optional[str] = None
    network_in: Optional[float] = None
    network_out: Optional[float] = None


class DeviceMetricsResponse(BaseModel):
    device_id: UUID
    current: dict
    history: List[MetricsHistoryResponse]
    interfaces: List[dict]
    alerts: List[dict]


@router.get("/{device_id}/metrics", response_model=DeviceMetricsResponse)
async def get_device_metrics(
    device_id: UUID,
    hours: int = Query(6, ge=1, le=168, description="Hours of history to fetch"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get device metrics including historical data for graphs."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )

        # Current metrics
        current_metrics = {
            "cpu_usage": device.cpu_usage or 0,
            "memory_usage": device.memory_usage or 0,
            "disk_usage": device.disk_usage or 0,
            "uptime_seconds": device.uptime_seconds or 0,
            "uptime_formatted": f"{(device.uptime_seconds or 0) // 86400}d {((device.uptime_seconds or 0) % 86400) // 3600}h",
            "temperature": 45.2,  # Simulated - would come from SNMP/monitoring
            "fan_status": "normal",  # Simulated
            "fan_rpm": 2400,  # Simulated
            "total_ports": device.total_ports or 0,
            "used_ports": device.used_ports or 0,
            "port_utilization": device.port_utilization,
            "status": device.status.value,
            "last_seen": device.last_seen_at.isoformat() if device.last_seen_at else None,
        }

        # Generate simulated historical data for graphs (in production, fetch from time-series DB)
        import random
        from datetime import timedelta

        history = []
        now = datetime.now(timezone.utc)
        base_cpu = device.cpu_usage or 35
        base_memory = device.memory_usage or 50
        base_temp = 45

        for i in range(hours * 6):  # 10-minute intervals
            timestamp = now - timedelta(minutes=i * 10)
            # Add some variation to simulate real data
            cpu_var = random.uniform(-15, 15)
            mem_var = random.uniform(-10, 10)
            temp_var = random.uniform(-3, 3)

            history.append(MetricsHistoryResponse(
                timestamp=timestamp,
                cpu_usage=max(0, min(100, base_cpu + cpu_var)),
                memory_usage=max(0, min(100, base_memory + mem_var)),
                disk_usage=device.disk_usage or 30,
                temperature=max(30, min(80, base_temp + temp_var)),
                fan_status="normal" if base_temp + temp_var < 70 else "high",
                network_in=random.uniform(10, 500),  # MB/s
                network_out=random.uniform(5, 200),  # MB/s
            ))

        # Reverse to have oldest first (for graph display)
        history.reverse()

        # Interface details with metrics
        interfaces = []
        port_status = device.port_status or []
        if isinstance(port_status, list):
            for idx, port in enumerate(port_status):
                interfaces.append({
                    "id": f"eth{idx}",
                    "name": port.get("name", f"eth{idx}"),
                    "type": port.get("type", "ethernet"),
                    "status": port.get("status", "up"),
                    "speed": port.get("speed", "1 Gbps"),
                    "mac_address": port.get("mac_address", f"00:11:22:33:44:{idx:02x}"),
                    "mtu": port.get("mtu", 1500),
                    "duplex": port.get("duplex", "full"),
                    "rx_bytes": port.get("rx_bytes", random.randint(1000000, 100000000)),
                    "tx_bytes": port.get("tx_bytes", random.randint(1000000, 100000000)),
                    "rx_errors": port.get("rx_errors", 0),
                    "tx_errors": port.get("tx_errors", 0),
                    "rx_packets": port.get("rx_packets", random.randint(10000, 1000000)),
                    "tx_packets": port.get("tx_packets", random.randint(10000, 1000000)),
                    "admin_status": port.get("admin_status", "enabled"),
                    "oper_status": port.get("status", "up"),
                    "last_change": (now - timedelta(hours=random.randint(1, 100))).isoformat(),
                })

        # If no port_status, generate sample interfaces
        if not interfaces:
            for i in range(4):
                status_val = "up" if random.random() > 0.2 else "down"
                interfaces.append({
                    "id": f"eth{i}",
                    "name": f"GigabitEthernet0/{i}",
                    "type": "ethernet",
                    "status": status_val,
                    "speed": "1 Gbps",
                    "mac_address": f"00:11:22:33:44:{i:02x}",
                    "mtu": 1500,
                    "duplex": "full",
                    "rx_bytes": random.randint(1000000, 100000000),
                    "tx_bytes": random.randint(1000000, 100000000),
                    "rx_errors": 0,
                    "tx_errors": 0,
                    "rx_packets": random.randint(10000, 1000000),
                    "tx_packets": random.randint(10000, 1000000),
                    "admin_status": "enabled",
                    "oper_status": status_val,
                    "last_change": (now - timedelta(hours=random.randint(1, 100))).isoformat(),
                })

        # Active alerts for this device (simulated)
        alerts = [
            {
                "id": "alert-1",
                "name": "High CPU Usage",
                "severity": "warning",
                "status": "active" if (device.cpu_usage or 0) > 80 else "resolved",
                "threshold": 80,
                "current_value": device.cpu_usage or 0,
                "message": f"CPU usage is above 80% (current: {device.cpu_usage or 0}%)",
                "created_at": (now - timedelta(hours=2)).isoformat(),
            },
            {
                "id": "alert-2",
                "name": "High Memory Usage",
                "severity": "warning",
                "status": "active" if (device.memory_usage or 0) > 85 else "resolved",
                "threshold": 85,
                "current_value": device.memory_usage or 0,
                "message": f"Memory usage is above 85% (current: {device.memory_usage or 0}%)",
                "created_at": (now - timedelta(hours=1)).isoformat(),
            },
            {
                "id": "alert-3",
                "name": "Temperature Warning",
                "severity": "critical",
                "status": "resolved",
                "threshold": 70,
                "current_value": 45,
                "message": "Temperature is above 70°C",
                "created_at": (now - timedelta(days=1)).isoformat(),
            },
        ]

        return DeviceMetricsResponse(
            device_id=device_id,
            current=current_metrics,
            history=history,
            interfaces=interfaces,
            alerts=alerts,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching device metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch device metrics"
        )


# =============================================================================
# ALERT CONFIGURATION ENDPOINTS
# =============================================================================

class AlertConfigCreate(BaseModel):
    name: str
    metric: str = Field(..., description="Metric to monitor: cpu_usage, memory_usage, disk_usage, temperature, interface_status")
    condition: str = Field(..., description="Condition: gt, lt, eq, ne (greater than, less than, equal, not equal)")
    threshold: float
    severity: str = Field(default="warning", description="warning, critical")
    enabled: bool = True
    notification_channels: List[str] = Field(default_factory=list, description="List of notification channel IDs")


class AlertConfigUpdate(BaseModel):
    name: Optional[str] = None
    metric: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    severity: Optional[str] = None
    enabled: Optional[bool] = None
    notification_channels: Optional[List[str]] = None


class AlertConfigResponse(BaseModel):
    id: str
    device_id: UUID
    name: str
    metric: str
    condition: str
    threshold: float
    severity: str
    enabled: bool
    notification_channels: List[str]
    created_at: datetime
    updated_at: datetime


@router.get("/{device_id}/alerts", response_model=List[AlertConfigResponse])
async def get_device_alert_configs(
    device_id: UUID,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alert configurations for a network device."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )

        # Get alerts from custom_fields (stored in JSONB)
        alert_configs = device.custom_fields.get("alert_configs", []) if device.custom_fields else []

        # Return default alerts if none configured
        if not alert_configs:
            now = datetime.now(timezone.utc)
            alert_configs = [
                {
                    "id": "default-cpu",
                    "name": "High CPU Usage",
                    "metric": "cpu_usage",
                    "condition": "gt",
                    "threshold": 80,
                    "severity": "warning",
                    "enabled": True,
                    "notification_channels": [],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
                {
                    "id": "default-memory",
                    "name": "High Memory Usage",
                    "metric": "memory_usage",
                    "condition": "gt",
                    "threshold": 85,
                    "severity": "warning",
                    "enabled": True,
                    "notification_channels": [],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
                {
                    "id": "default-temp",
                    "name": "High Temperature",
                    "metric": "temperature",
                    "condition": "gt",
                    "threshold": 70,
                    "severity": "critical",
                    "enabled": True,
                    "notification_channels": [],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
                {
                    "id": "default-interface",
                    "name": "Interface Down",
                    "metric": "interface_status",
                    "condition": "eq",
                    "threshold": 0,
                    "severity": "critical",
                    "enabled": True,
                    "notification_channels": [],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
            ]

        return [AlertConfigResponse(**config, device_id=device_id) for config in alert_configs]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching alert configs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch alert configurations"
        )


@router.post("/{device_id}/alerts", response_model=AlertConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_device_alert_config(
    device_id: UUID,
    alert_data: AlertConfigCreate,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create a new alert configuration for a network device."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )

        import uuid as uuid_lib
        now = datetime.now(timezone.utc)

        new_alert = {
            "id": str(uuid_lib.uuid4()),
            "name": alert_data.name,
            "metric": alert_data.metric,
            "condition": alert_data.condition,
            "threshold": alert_data.threshold,
            "severity": alert_data.severity,
            "enabled": alert_data.enabled,
            "notification_channels": alert_data.notification_channels,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        # Store in custom_fields
        if not device.custom_fields:
            device.custom_fields = {}
        if "alert_configs" not in device.custom_fields:
            device.custom_fields["alert_configs"] = []

        device.custom_fields["alert_configs"].append(new_alert)

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(device, "custom_fields")

        db.commit()
        db.refresh(device)

        logger.info(f"Alert config created for device {device_id}: {new_alert['id']}")

        return AlertConfigResponse(**new_alert, device_id=device_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating alert config: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert configuration"
        )


@router.put("/{device_id}/alerts/{alert_id}", response_model=AlertConfigResponse)
async def update_device_alert_config(
    device_id: UUID,
    alert_id: str,
    alert_data: AlertConfigUpdate,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update an alert configuration for a network device."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )

        alert_configs = device.custom_fields.get("alert_configs", []) if device.custom_fields else []

        # Find and update the alert
        alert_found = False
        for i, config in enumerate(alert_configs):
            if config.get("id") == alert_id:
                update_data = alert_data.dict(exclude_unset=True)
                for field, value in update_data.items():
                    config[field] = value
                config["updated_at"] = datetime.now(timezone.utc).isoformat()
                alert_configs[i] = config
                alert_found = True
                break

        if not alert_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert configuration not found"
            )

        device.custom_fields["alert_configs"] = alert_configs

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(device, "custom_fields")

        db.commit()
        db.refresh(device)

        logger.info(f"Alert config updated for device {device_id}: {alert_id}")

        updated_config = next(c for c in alert_configs if c.get("id") == alert_id)
        return AlertConfigResponse(**updated_config, device_id=device_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating alert config: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update alert configuration"
        )


@router.delete("/{device_id}/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device_alert_config(
    device_id: UUID,
    alert_id: str,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete an alert configuration for a network device."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )

        alert_configs = device.custom_fields.get("alert_configs", []) if device.custom_fields else []

        # Find and remove the alert
        original_len = len(alert_configs)
        alert_configs = [c for c in alert_configs if c.get("id") != alert_id]

        if len(alert_configs) == original_len:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert configuration not found"
            )

        device.custom_fields["alert_configs"] = alert_configs

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(device, "custom_fields")

        db.commit()

        logger.info(f"Alert config deleted for device {device_id}: {alert_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting alert config: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert configuration"
        )
