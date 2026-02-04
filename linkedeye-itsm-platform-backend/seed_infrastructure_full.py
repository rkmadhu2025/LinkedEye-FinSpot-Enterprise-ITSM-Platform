import sys
import os
import uuid
import random
from datetime import datetime

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models import (
    InfrastructureHost, NetworkLayerType, ServerType, 
    NetworkConnection, ConnectionRelationshipType,
    NetworkDevice, NetworkTopology, TopologyType, TopologyStatus,
    NetworkDevice, NetworkTopology, TopologyType, TopologyStatus,
    User, UserRole, UserStatus
)
from app.core.security import get_password_hash

def seed_infrastructure():
    print("Starting infrastructure seeding...")
    db = SessionLocal()
    try:
        # 1. Create Physical Hosts (Hypervisors)
        print("Seeding Physical Hosts...")
        physical_hosts = []
        for i in range(1, 4):
            hostname = f"esx-host-0{i}"
            # Check existence
            existing = db.query(InfrastructureHost).filter(InfrastructureHost.hostname == hostname).first()
            if existing:
                physical_hosts.append(existing)
                continue

            host = InfrastructureHost(
                hostname=hostname,
                network_layer=NetworkLayerType.S_HW,
                device_category="server",
                server_type=ServerType.PHYSICAL,
                operating_system="ESXi",
                os_version="7.0",
                management_ip=f"192.168.10.{10+i}",
                total_ports=4,
                cpu_usage=random.randint(20, 80),
                memory_usage=random.randint(40, 90),
                operational_status="active",
                health_status="healthy",
                is_active=True,
                neo4j_type="Host",
                neo4j_parent=""
            )
            db.add(host)
            physical_hosts.append(host)
        
        db.flush() 
        
        # 2. Create Virtual Machines
        print("Seeding Virtual Machines...")
        vm_names = ["web-server-01", "web-server-02", "app-server-01", "db-01", "cache-01", "mq-01", "jenkins-01", "gitlab-01"]
        for i, name in enumerate(vm_names):
            existing = db.query(InfrastructureHost).filter(InfrastructureHost.hostname == name).first()
            if existing: 
                continue

            # Assign to random physical host
            phys_host = random.choice(physical_hosts)
            
            vm = InfrastructureHost(
                hostname=name,
                network_layer=NetworkLayerType.S_HW,
                device_category="virtual_machine",
                server_type=ServerType.VIRTUAL,
                operating_system="Ubuntu 22.04" if "db" not in name else "CentOS 7",
                management_ip=f"192.168.20.{10+i}",
                hypervisor_id=phys_host.id,
                physical_host_ip=phys_host.management_ip,
                cpu_usage=random.randint(5, 60),
                memory_usage=random.randint(10, 70),
                operational_status="active",
                health_status="healthy",
                is_active=True,
                neo4j_type="Host",
                neo4j_parent=""
            )
            db.add(vm)
            db.flush()
            
            # Create connection (RUNS_ON)
            conn = NetworkConnection(
                relationship_type=ConnectionRelationshipType.RUNS_ON,
                source_host_id=vm.id,
                source_entity_type="host",
                target_host_id=phys_host.id,
                target_entity_type="host",
                connection_name=f"{vm.hostname} RUNS_ON {phys_host.hostname}",
                connection_status="active",
                is_active=True
            )
            db.add(conn)

        db.commit()
        print("Infrastructure Hosts and VMs seeded.")

        # 3. Seed NetworkTopology (Legacy/Frontend usage)
        print("Seeding NetworkTopology...")
        # Check if topology exists
        if db.query(NetworkTopology).count() == 0:
            # Create Devices first
            devices_data = [
                {"name": "CORE-ROUTER-01", "type": "router", "ip": "10.0.0.1", "x": 400, "y": 100},
                {"name": "DIST-SWITCH-01", "type": "switch", "ip": "10.0.1.1", "x": 200, "y": 250},
                {"name": "DIST-SWITCH-02", "type": "switch", "ip": "10.0.1.2", "x": 600, "y": 250},
                {"name": "FW-EDGE-01", "type": "firewall", "ip": "10.0.0.254", "x": 400, "y": 50},
                {"name": "WEB-SRV-01", "type": "server", "ip": "10.0.10.1", "x": 100, "y": 400},
                {"name": "APP-SRV-01", "type": "server", "ip": "10.0.20.1", "x": 300, "y": 400},
                {"name": "DB-SRV-01", "type": "server", "ip": "10.0.30.1", "x": 700, "y": 400},
            ]
            
            created_devs = {}
            nodes = []
            
            # Internet Node
            internet_id = "internet"
            nodes.append({"id": internet_id, "name": "Internet", "type": "gateway", "status": "healthy", "x": 400, "y": 0, "connections": []})

            for d in devices_data:
                dev = NetworkDevice(
                    hostname=d["name"],
                    device_type=d["type"],
                    ip_address=d["ip"],
                    status="up",
                    uptime_seconds=random.randint(1000, 99999),
                    last_seen_at=datetime.utcnow()
                )
                db.add(dev)
                db.flush()
                created_devs[d["name"]] = dev
                
                nodes.append({
                    "id": str(dev.id), 
                    "name": d["name"], 
                    "type": d["type"], 
                    "status": "healthy", 
                    "x": d["x"], 
                    "y": d["y"], 
                    "connections": [],
                    "metrics": {
                        "cpu": random.randint(10, 60),
                        "memory": random.randint(20, 80),
                        "bandwidth": random.randint(5, 50)
                    }
                })
            
            def get_id(name):
                 return str(created_devs[name].id)

            edges = [
                {"source": internet_id, "target": get_id("FW-EDGE-01")},
                {"source": get_id("FW-EDGE-01"), "target": get_id("CORE-ROUTER-01")},
                {"source": get_id("CORE-ROUTER-01"), "target": get_id("DIST-SWITCH-01")},
                {"source": get_id("CORE-ROUTER-01"), "target": get_id("DIST-SWITCH-02")},
                {"source": get_id("DIST-SWITCH-01"), "target": get_id("WEB-SRV-01")},
                {"source": get_id("DIST-SWITCH-01"), "target": get_id("APP-SRV-01")},
                {"source": get_id("DIST-SWITCH-02"), "target": get_id("DB-SRV-01")},
            ]
            
            # Get a user for created_by_id
            user = db.query(User).first()
            if not user:
                print("No user found. Creating default admin user...")
                user = User(
                    email="admin@example.com",
                    username="admin",
                    first_name="Admin",
                    last_name="User",
                    password_hash=get_password_hash("password"),
                    role=UserRole.ADMIN,
                    status=UserStatus.ACTIVE,
                    is_email_verified=True,
                    preferences={},
                    notification_settings={}
                )
                db.add(user)
                db.commit() # Commit to get ID
                db.refresh(user)

            topo = NetworkTopology(
                created_by_id=user.id,
                name="Main Network",
                topology_type=TopologyType.LOGICAL,
                status=TopologyStatus.ACTIVE,
                nodes=nodes,
                edges=edges,
                is_active=True
            )
            db.add(topo)
            db.commit()
            print("NetworkTopology seeded.")
        else:
            print("NetworkTopology already exists, skipping.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_infrastructure()
