"""
Device Import API for bulk importing network devices.

Supports:
- Excel file upload (.xlsx)
- JSON import
- Bulk device creation
- VM to Physical host mapping
- Import validation
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional, Dict
from datetime import datetime
import pandas as pd
import io
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.client import Client
from app.models.network_layer import (
    InfrastructureHost,
    NetworkLayerType,
    DeviceVendor,
    ServerType
)
from app.api.dependencies import get_current_user
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/device-import", tags=["Device Import"])


# =====================================
# Request/Response Models
# =====================================

class DeviceImportRequest(BaseModel):
    """Device import request model."""
    devices: List[Dict]
    client_id: Optional[str] = None
    validate_only: bool = False


class DeviceImportResult(BaseModel):
    """Device import result model."""
    success: bool
    total_devices: int
    created: int
    updated: int
    skipped: int
    errors: List[Dict]
    imported_devices: List[Dict]


class DeviceImportValidation(BaseModel):
    """Device import validation result."""
    valid: bool
    total_devices: int
    validation_errors: List[Dict]
    warnings: List[Dict]


# =====================================
# Device Import Service
# =====================================

class DeviceImportService:
    """Service for importing devices."""

    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.physical_hosts = {}  # Cache for physical host lookups

    def parse_excel(self, file_content: bytes) -> List[Dict]:
        """Parse Excel file and extract device data."""
        try:
            df = pd.read_excel(io.BytesIO(file_content))
            df = df.fillna("")

            devices = []
            for idx, row in df.iterrows():
                device = self._parse_device_row(row.to_dict())
                if device:
                    devices.append(device)

            return devices

        except Exception as e:
            logger.error(f"Excel parsing error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse Excel file: {str(e)}"
            )

    def _parse_device_row(self, row: Dict) -> Optional[Dict]:
        """Parse a single device row from Excel."""
        # Skip empty rows
        if not row.get("ipaddress") or not row.get("textname"):
            return None

        selecthost = row.get("selecthost", "")
        ipaddress = row.get("ipaddress", "")
        textname = row.get("textname", "")
        pathhost = row.get("pathhost", "")
        physical_ip = row.get("physical_ip", "")

        # Determine device properties
        device_category, device_model, device_vendor = self._map_os_to_vendor(selecthost)
        network_layer = self._determine_network_layer(device_category)

        # Determine server type
        server_type = None
        if device_category == "server":
            server_type = "virtual" if pathhost == "VM" else "physical"

        return {
            "hostname": textname,
            "display_name": textname.split(".")[0],
            "network_layer": network_layer,
            "device_category": device_category,
            "device_vendor": device_vendor,
            "device_model": device_model,
            "server_type": server_type,
            "management_ip": ipaddress,
            "physical_host_ip": physical_ip if physical_ip and pathhost == "VM" else None,
            "operating_system": selecthost,
            "operational_status": "up",
            "health_status": "healthy",
        }

    def _map_os_to_vendor(self, selecthost: str) -> tuple:
        """Map OS/device type to vendor."""
        selecthost_lower = selecthost.lower()

        if "ubuntu" in selecthost_lower:
            return "server", "Ubuntu Server", None
        elif "windows" in selecthost_lower:
            return "server", "Windows Server", None
        elif "centos" in selecthost_lower or "rhel" in selecthost_lower:
            return "server", "CentOS/RHEL Server", None
        elif "60f" in selecthost_lower or "fortigate" in selecthost_lower:
            return "firewall", "FortiGate 60F", "fortigate"
        elif "cisco" in selecthost_lower:
            return "router", "Cisco Router", "cisco"
        else:
            return "server", "Generic Server", None

    def _determine_network_layer(self, device_category: str) -> str:
        """Determine network layer based on device type."""
        layer_map = {
            "firewall": "f_swi",
            "router": "r_swi",
            "switch": "e_swi",
            "server": "s_hw"
        }
        return layer_map.get(device_category, "s_hw")

    def validate_devices(self, devices: List[Dict]) -> DeviceImportValidation:
        """Validate device data before import."""
        validation_errors = []
        warnings = []

        for idx, device in enumerate(devices):
            # Required fields
            if not device.get("hostname"):
                validation_errors.append({
                    "row": idx + 1,
                    "field": "hostname",
                    "error": "Hostname is required"
                })

            if not device.get("management_ip"):
                validation_errors.append({
                    "row": idx + 1,
                    "field": "management_ip",
                    "error": "IP address is required"
                })

            # Check for duplicates in DB
            existing = self.db.execute(
                select(InfrastructureHost).where(
                    InfrastructureHost.hostname == device.get("hostname")
                )
            ).scalar_one_or_none()

            if existing:
                warnings.append({
                    "row": idx + 1,
                    "field": "hostname",
                    "warning": f"Device '{device.get('hostname')}' already exists and will be skipped"
                })

        return DeviceImportValidation(
            valid=len(validation_errors) == 0,
            total_devices=len(devices),
            validation_errors=validation_errors,
            warnings=warnings
        )

    def import_devices(
        self,
        devices: List[Dict],
        client_id: Optional[str] = None
    ) -> DeviceImportResult:
        """Import devices into database."""
        created = 0
        updated = 0
        skipped = 0
        errors = []
        imported_devices = []

        # Get client
        if not client_id:
            client = self._get_default_client()
        else:
            client = self.db.query(Client).filter(Client.id == client_id).first()
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Client not found"
                )

        # First pass: Create physical devices
        for device_data in devices:
            if device_data.get("server_type") != "virtual":
                try:
                    result = self._create_or_update_host(device_data, client.id)
                    if result["created"]:
                        created += 1
                        imported_devices.append(result["device"])
                    elif result["updated"]:
                        updated += 1
                        imported_devices.append(result["device"])
                    else:
                        skipped += 1
                except Exception as e:
                    errors.append({
                        "hostname": device_data.get("hostname"),
                        "error": str(e)
                    })

        self.db.flush()

        # Second pass: Create VMs and link to physical hosts
        for device_data in devices:
            if device_data.get("server_type") == "virtual":
                try:
                    # Find hypervisor
                    hypervisor = None
                    if device_data.get("physical_host_ip"):
                        hypervisor = self._find_physical_host_by_ip(
                            device_data["physical_host_ip"]
                        )

                    result = self._create_or_update_host(
                        device_data,
                        client.id,
                        hypervisor
                    )

                    if result["created"]:
                        created += 1
                        imported_devices.append(result["device"])
                    elif result["updated"]:
                        updated += 1
                        imported_devices.append(result["device"])
                    else:
                        skipped += 1

                except Exception as e:
                    errors.append({
                        "hostname": device_data.get("hostname"),
                        "error": str(e)
                    })

        self.db.commit()

        return DeviceImportResult(
            success=len(errors) == 0,
            total_devices=len(devices),
            created=created,
            updated=updated,
            skipped=skipped,
            errors=errors,
            imported_devices=imported_devices
        )

    def _create_or_update_host(
        self,
        device_data: Dict,
        client_id: str,
        hypervisor: Optional[InfrastructureHost] = None
    ) -> Dict:
        """Create or update infrastructure host."""
        # Check if exists
        existing = self.db.execute(
            select(InfrastructureHost).where(
                InfrastructureHost.hostname == device_data["hostname"],
                InfrastructureHost.client_id == client_id
            )
        ).scalar_one_or_none()

        if existing:
            return {"created": False, "updated": False, "device": None}

        # Map network layer enum
        layer_map = {
            "f_swi": NetworkLayerType.F_SWI,
            "r_swi": NetworkLayerType.R_SWI,
            "e_swi": NetworkLayerType.E_SWI,
            "s_hw": NetworkLayerType.S_HW
        }

        # Map vendor enum
        vendor_map = {
            "fortigate": DeviceVendor.FORTIGATE,
            "cisco": DeviceVendor.CISCO,
            "huawei": DeviceVendor.HUAWEI
        }

        # Map server type enum
        server_type_map = {
            "physical": ServerType.PHYSICAL,
            "virtual": ServerType.VIRTUAL
        }

        # Create host
        host = InfrastructureHost(
            client_id=client_id,
            hostname=device_data["hostname"],
            display_name=device_data.get("display_name"),
            network_layer=layer_map.get(device_data["network_layer"], NetworkLayerType.S_HW),
            device_category=device_data.get("device_category", "server"),
            device_vendor=vendor_map.get(device_data.get("device_vendor")) if device_data.get("device_vendor") else None,
            device_model=device_data.get("device_model"),
            server_type=server_type_map.get(device_data.get("server_type")) if device_data.get("server_type") else None,
            management_ip=device_data.get("management_ip"),
            physical_host_ip=device_data.get("physical_host_ip"),
            operating_system=device_data.get("operating_system"),
            operational_status=device_data.get("operational_status", "unknown"),
            health_status=device_data.get("health_status", "unknown"),
            neo4j_type="Host",
            neo4j_parent="",
            service_type=f"{device_data.get('device_category', 'Device').title()} Service",
            hypervisor_id=hypervisor.id if hypervisor else None
        )

        self.db.add(host)

        return {
            "created": True,
            "updated": False,
            "device": {
                "hostname": host.hostname,
                "ip": host.management_ip,
                "type": host.device_category
            }
        }

    def _find_physical_host_by_ip(self, physical_ip: str) -> Optional[InfrastructureHost]:
        """Find physical host by IP address."""
        if physical_ip in self.physical_hosts:
            return self.physical_hosts[physical_ip]

        host = self.db.execute(
            select(InfrastructureHost).where(
                InfrastructureHost.management_ip == physical_ip,
                InfrastructureHost.server_type == ServerType.PHYSICAL
            )
        ).scalar_one_or_none()

        if host:
            self.physical_hosts[physical_ip] = host

        return host

    def _get_default_client(self) -> Client:
        """Get or create default client."""
        client = self.db.execute(select(Client).limit(1)).scalar_one_or_none()

        if not client:
            client = Client(
                name="Default Client",
                code="DEFAULT",
                status="active",
                description="Default client for device import"
            )
            self.db.add(client)
            self.db.flush()

        return client


# =====================================
# API Endpoints
# =====================================

@router.post("/upload-excel", response_model=DeviceImportResult)
async def upload_excel(
    file: UploadFile = File(...),
    client_id: Optional[str] = None,
    validate_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload Excel file for device import.

    Args:
        file: Excel file (.xlsx or .xls) containing device data
        client_id: Optional client ID to import devices for. If not provided, uses default client.
        validate_only: If True, only validate the file without importing
    """

    # Check user permissions
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    # Read file
    content = await file.read()

    # Parse Excel
    service = DeviceImportService(db, current_user)
    devices = service.parse_excel(content)

    # Validate
    validation = service.validate_devices(devices)

    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Validation failed",
                "errors": validation.validation_errors,
                "warnings": validation.warnings
            }
        )

    if validate_only:
        return DeviceImportResult(
            success=True,
            total_devices=len(devices),
            created=0,
            updated=0,
            skipped=0,
            errors=[],
            imported_devices=[]
        )

    # Import devices with specified client_id
    result = service.import_devices(devices, client_id)
    return result


@router.post("/json", response_model=DeviceImportResult)
async def import_json(
    request: DeviceImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import devices from JSON."""

    # Check user permissions
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    service = DeviceImportService(db, current_user)

    # Validate
    validation = service.validate_devices(request.devices)

    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Validation failed",
                "errors": validation.validation_errors,
                "warnings": validation.warnings
            }
        )

    if request.validate_only:
        return DeviceImportResult(
            success=True,
            total_devices=len(request.devices),
            created=0,
            updated=0,
            skipped=0,
            errors=[],
            imported_devices=[]
        )

    # Import devices
    result = service.import_devices(request.devices, request.client_id)
    return result


@router.post("/upload-excel-by-client-code", response_model=DeviceImportResult)
async def upload_excel_by_client_code(
    file: UploadFile = File(...),
    client_code: str = None,
    validate_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload Excel file for device import using client code.

    Args:
        file: Excel file (.xlsx or .xls) containing device data
        client_code: Client code to import devices for (e.g., 'fs-le-dev-finspot')
        validate_only: If True, only validate the file without importing
    """

    # Check user permissions
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    # Find client by code
    client_id = None
    if client_code:
        client = db.query(Client).filter(Client.client_code == client_code).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with code '{client_code}' not found"
            )
        client_id = str(client.id)

    # Read file
    content = await file.read()

    # Parse Excel
    service = DeviceImportService(db, current_user)
    devices = service.parse_excel(content)

    # Validate
    validation = service.validate_devices(devices)

    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Validation failed",
                "errors": validation.validation_errors,
                "warnings": validation.warnings
            }
        )

    if validate_only:
        return DeviceImportResult(
            success=True,
            total_devices=len(devices),
            created=0,
            updated=0,
            skipped=0,
            errors=[],
            imported_devices=[]
        )

    # Import devices with found client_id
    result = service.import_devices(devices, client_id)
    return result


@router.get("/clients")
async def list_clients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all available clients for device import."""
    clients = db.query(Client).filter(Client.is_active == True).all()
    return [
        {
            "id": str(c.id),
            "client_code": c.client_code,
            "name": c.name,
            "environment": c.environment.value if c.environment else None
        }
        for c in clients
    ]
