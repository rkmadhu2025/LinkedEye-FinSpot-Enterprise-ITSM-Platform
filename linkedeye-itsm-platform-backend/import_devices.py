"""
Device Import Script for LinkedEye ITSM Platform

Imports network devices from Excel file into infrastructure_hosts table.
Maps Physical servers, VMs, and network devices to the proper layer structure.

Usage:
    python import_devices.py [--client-code CLIENT_CODE] [--excel-file EXCEL_FILE]

Examples:
    python import_devices.py --client-code fs-le-dev-finspot
    python import_devices.py --client-code fs-le-dev-finspot --excel-file fs-le-dev_Restore_Devices.xlsx
"""

import sys
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.network_layer import (
    InfrastructureHost,
    NetworkLayerType,
    DeviceVendor,
    ServerType
)


class DeviceImporter:
    """Imports devices from Excel into infrastructure database."""

    def __init__(self, excel_file: str = "fs-le-dev_Restore_Devices.xlsx", client_code: Optional[str] = None):
        self.excel_file = excel_file
        self.client_code = client_code  # Specific client code to use
        self.client_id = None  # Will be set based on client_code or first available
        self.physical_hosts = {}  # Cache for physical host lookups

    def map_os_to_vendor(self, selecthost: str) -> tuple[str, str, Optional[DeviceVendor]]:
        """Map Excel selecthost to device category, model, and vendor."""
        selecthost = selecthost.lower()

        if "ubuntu" in selecthost:
            return "server", "Ubuntu Server", None
        elif "windows" in selecthost:
            return "server", "Windows Server", None
        elif "centos" in selecthost or "rhel" in selecthost:
            return "server", "CentOS/RHEL Server", None
        elif "60f" in selecthost or "fortigate" in selecthost:
            return "firewall", "FortiGate 60F", DeviceVendor.FORTIGATE
        elif "cisco" in selecthost:
            return "router", "Cisco Router", DeviceVendor.CISCO
        else:
            return "server", "Generic Server", None

    def determine_network_layer(self, device_category: str, pathhost: str) -> NetworkLayerType:
        """Determine network layer based on device type."""
        if device_category == "firewall":
            return NetworkLayerType.F_SWI
        elif device_category == "router":
            return NetworkLayerType.R_SWI
        elif device_category == "switch":
            return NetworkLayerType.E_SWI
        else:  # server
            return NetworkLayerType.S_HW

    def parse_device_row(self, row: Dict) -> Optional[Dict]:
        """Parse Excel row into device dictionary."""
        # Skip empty rows
        if not row.get("ipaddress") or not row.get("textname"):
            return None

        selecthost = row.get("selecthost", "")
        ipaddress = row.get("ipaddress", "")
        textname = row.get("textname", "")
        pathhost = row.get("pathhost", "")
        physical_ip = row.get("physical_ip", "")

        # Determine device properties
        device_category, device_model, device_vendor = self.map_os_to_vendor(selecthost)
        network_layer = self.determine_network_layer(device_category, pathhost)

        # Determine server type
        server_type = None
        if device_category == "server":
            server_type = ServerType.VIRTUAL if pathhost == "VM" else ServerType.PHYSICAL

        return {
            "hostname": textname,
            "display_name": textname.split(".")[0],  # Short name
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
            "neo4j_type": "Host",
            "neo4j_parent": "",
            "service_type": f"{device_category.title()} Service",
            "is_physical": pathhost != "VM",
            "notes": f"Imported from Excel: {selecthost} at {ipaddress}"
        }

    def get_or_create_client(self, session: Session):
        """Get client by code or first available, or create default."""
        from app.models.client import Client

        client = None

        # If client_code is specified, look for that specific client
        if self.client_code:
            result = session.execute(
                select(Client).where(Client.client_code == self.client_code)
            )
            client = result.scalar_one_or_none()

            if not client:
                print(f"Client with code '{self.client_code}' not found. Creating it...")
                client = Client(
                    name=self.client_code.replace("-", " ").title(),
                    client_code=self.client_code,
                    status="active",
                    description=f"Client created for device import: {self.client_code}"
                )
                session.add(client)
                session.flush()
        else:
            # Get first available client
            result = session.execute(select(Client).limit(1))
            client = result.scalar_one_or_none()

            if not client:
                print("No clients found. Creating default client...")
                client = Client(
                    name="FinSpot",
                    client_code="FINSPOT",
                    status="active",
                    description="Default client for device import"
                )
                session.add(client)
                session.flush()

        self.client_id = client.id
        print(f"Using client: {client.name} (Code: {client.client_code}, ID: {client.id})")
        return client

    def find_physical_host_by_ip(self, session: Session, physical_ip: str) -> Optional[InfrastructureHost]:
        """Find physical host by IP address."""
        if physical_ip in self.physical_hosts:
            return self.physical_hosts[physical_ip]

        result = session.execute(
            select(InfrastructureHost).where(
                InfrastructureHost.management_ip == physical_ip,
                InfrastructureHost.server_type == ServerType.PHYSICAL
            )
        )
        host = result.scalar_one_or_none()

        if host:
            self.physical_hosts[physical_ip] = host

        return host

    def import_devices(self):
        """Main import function."""
        print(f"Starting device import from {self.excel_file}...")
        print("=" * 80)

        # Read Excel file
        try:
            df = pd.read_excel(self.excel_file)
            df = df.fillna("")
        except Exception as e:
            print(f"Error reading Excel file: {e}")
            return

        # Parse devices
        devices_to_import = []
        for idx, row in df.iterrows():
            device_dict = self.parse_device_row(row.to_dict())
            if device_dict:
                devices_to_import.append(device_dict)

        print(f"Found {len(devices_to_import)} devices to import\n")

        # Import into database
        session = SessionLocal()
        try:
            # Get client
            self.get_or_create_client(session)

            # First pass: Create all physical devices
            print("Pass 1: Creating physical devices...")
            physical_count = 0
            for device_data in devices_to_import:
                if device_data["is_physical"]:
                    self.create_host(session, device_data)
                    physical_count += 1

            session.flush()
            print(f"Created {physical_count} physical devices\n")

            # Second pass: Create VMs and link to physical hosts
            print("Pass 2: Creating virtual machines...")
            vm_count = 0
            for device_data in devices_to_import:
                if not device_data["is_physical"]:
                    # Find hypervisor
                    hypervisor = None
                    if device_data["physical_host_ip"]:
                        hypervisor = self.find_physical_host_by_ip(
                            session,
                            device_data["physical_host_ip"]
                        )

                    self.create_host(session, device_data, hypervisor)
                    vm_count += 1

            session.commit()
            print(f"Created {vm_count} virtual machines\n")

            print("=" * 80)
            print(f"Import complete! Total devices: {physical_count + vm_count}")
            print(f"  Physical devices: {physical_count}")
            print(f"  Virtual machines: {vm_count}")

        except Exception as e:
            session.rollback()
            print(f"Error during import: {e}")
            raise
        finally:
            session.close()

    def create_host(
        self,
        session: Session,
        device_data: Dict,
        hypervisor: Optional[InfrastructureHost] = None
    ):
        """Create infrastructure host from device data."""
        # Check if already exists
        result = session.execute(
            select(InfrastructureHost).where(
                InfrastructureHost.hostname == device_data["hostname"],
                InfrastructureHost.client_id == self.client_id
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  ⏭️  {device_data['hostname']} already exists, skipping")
            return existing

        # Create new host
        host = InfrastructureHost(
            client_id=self.client_id,
            hostname=device_data["hostname"],
            display_name=device_data["display_name"],
            network_layer=device_data["network_layer"],
            device_category=device_data["device_category"],
            device_vendor=device_data["device_vendor"],
            device_model=device_data["device_model"],
            server_type=device_data["server_type"],
            management_ip=device_data["management_ip"],
            physical_host_ip=device_data["physical_host_ip"],
            operating_system=device_data["operating_system"],
            operational_status=device_data["operational_status"],
            health_status=device_data["health_status"],
            neo4j_type=device_data["neo4j_type"],
            neo4j_parent=device_data["neo4j_parent"],
            service_type=device_data["service_type"],
            notes=device_data["notes"],
            hypervisor_id=hypervisor.id if hypervisor else None
        )

        session.add(host)

        icon = "🖥️" if device_data["server_type"] == ServerType.PHYSICAL else "💻"
        if device_data["device_category"] == "firewall":
            icon = "🛡️"
        elif device_data["device_category"] == "router":
            icon = "🔀"

        hypervisor_info = f" (on {hypervisor.hostname})" if hypervisor else ""
        print(f"  {icon} Created: {device_data['hostname']} ({device_data['management_ip']}){hypervisor_info}")

        return host


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Import network devices from Excel file into LinkedEye ITSM Platform"
    )
    parser.add_argument(
        "--client-code",
        type=str,
        default=None,
        help="Client code to import devices for (e.g., fs-le-dev-finspot)"
    )
    parser.add_argument(
        "--excel-file",
        type=str,
        default="fs-le-dev_Restore_Devices.xlsx",
        help="Path to Excel file containing device data"
    )

    args = parser.parse_args()

    importer = DeviceImporter(
        excel_file=args.excel_file,
        client_code=args.client_code
    )
    importer.import_devices()


if __name__ == "__main__":
    main()
