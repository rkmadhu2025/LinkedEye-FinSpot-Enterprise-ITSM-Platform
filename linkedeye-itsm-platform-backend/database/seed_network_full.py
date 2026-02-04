import sys
import os
import json
from datetime import datetime
import uuid
import random

# Add app to path
try:
    sys.path.append('/app')
    from app.core.database import SessionLocal
    from app.models.network_device import NetworkDevice, DeviceType, DeviceStatus
    from app.models.network_topology import NetworkTopology, TopologyType, TopologyStatus
    from app.models.user import User
except ImportError:
    # Local dev fallback
    sys.path.append(os.getcwd())
    from app.core.database import SessionLocal
    from app.models.network_device import NetworkDevice, DeviceType, DeviceStatus
    from app.models.network_topology import NetworkTopology, TopologyType, TopologyStatus
    from app.models.user import User

def seed_network_full():
    print("Starting full network seeding (Devices + Topology)...")
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    # Get admin user
    admin_user = db.query(User).filter(User.email == 'admin@finspot.com').first()
    if not admin_user:
        admin_user = db.query(User).first()
    
    if not admin_user:
        print("No users found. Skipping.")
        return

    # 1. Clear existing data (optional, but good for clean state)
    # Be careful in prod, but this is a fix script
    print("Cleaning up old network data...")
    db.query(NetworkTopology).delete()
    db.query(NetworkDevice).delete()
    db.commit()

    # 2. Create Network Devices
    print("Creating network devices...")
    
    devices_data = [
        {
            "name": "FW-EDGE-01",
            "type": "firewall", 
            "ip": "10.0.0.1",
            "location": "Datacenter A - Rack 1",
            "model": "Cisco Firepower 2100",
            "status": "healthy",
            "x": 400, "y": 130
        },
        {
            "name": "RT-CORE-01",
            "type": "router",
            "ip": "10.0.1.1",
            "location": "Datacenter A - Rack 1",
            "model": "Cisco ASR 1000",
            "status": "healthy",
             "x": 400, "y": 210
        },
        {
            "name": "SW-DIST-01",
            "type": "switch",
            "ip": "10.0.2.1",
            "location": "Datacenter A - Rack 2",
            "model": "Cisco Catalyst 9300",
            "status": "healthy",
             "x": 250, "y": 300
        },
        {
            "name": "SW-DIST-02",
            "type": "switch",
            "ip": "10.0.2.2",
            "location": "Datacenter A - Rack 2",
            "model": "Cisco Catalyst 9300",
            "status": "warning",
            "x": 550, "y": 300
        },
        {
            "name": "WEB-01",
            "type": "server",
            "ip": "10.0.10.11",
            "location": "Datacenter A - Rack 3",
            "model": "Dell PowerEdge R740",
            "status": "healthy",
             "x": 150, "y": 400
        },
        {
            "name": "WEB-02",
            "type": "server",
            "ip": "10.0.10.12",
            "location": "Datacenter A - Rack 3",
            "model": "Dell PowerEdge R740",
            "status": "healthy",
             "x": 350, "y": 400
        },
        {
            "name": "APP-01",
            "type": "server",
            "ip": "10.0.20.11",
            "location": "Datacenter A - Rack 4",
            "model": "Dell PowerEdge R640",
            "status": "critical",
             "x": 450, "y": 400
        },
        {
            "name": "DB-PRIMARY",
            "type": "server", # Database usually runs on a server
            "ip": "10.0.30.10",
            "location": "Datacenter A - Rack 5",
            "model": "Dell PowerEdge R940",
            "status": "healthy",
             "x": 650, "y": 400
        }
    ]

    created_devices = {}
    
    for d in devices_data:
        # Determine network layer
        net_layer = None
        if d['type'] == 'firewall': net_layer = 'f_swi'
        elif d['type'] == 'router': net_layer = 'r_swi'
        elif d['type'] == 'switch': net_layer = 'e_swi'
        elif d['type'] == 'server': net_layer = 's_hw'

        device = NetworkDevice(
            hostname=d["name"],
            device_type=d["type"],
            network_layer=net_layer,
            ip_address=d["ip"],
            location=d["location"],
            manufacturer=d["model"].split(' ')[0],
            model=' '.join(d["model"].split(' ')[1:]),
            status=d["status"], # mapped in frontend usually, backend might store 'up'/'down'
            mac_address=f"00:50:56:{random.randint(10,99)}:{random.randint(10,99)}:{random.randint(10,99)}",
            uptime_seconds=random.randint(10000, 5000000),
            last_seen_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            # Mock metrics
            cpu_usage=random.randint(10, 95),
            memory_usage=random.randint(20, 90),
            disk_usage=random.randint(30, 80),
            total_ports=24 if 'switch' in d['type'] else 4,
            used_ports=random.randint(1, 20) if 'switch' in d['type'] else 2,
        )
        
        # Adjust status for backend enums if strictly enforced
        if d['status'] == 'healthy': device.status = 'up'
        elif d['status'] == 'critical': device.status = 'down'
        elif d['status'] == 'warning': device.status = 'warning'
        
        db.add(device)
        db.flush() # get ID
        created_devices[d["name"]] = device
        print(f"Created device: {device.hostname} ({device.id})")

    db.commit()

    # 3. Create Topology
    print("Creating topology linked to devices...")

    # Internet node (virtual)
    nodes = [
        {"id": "internet", "name": "Internet", "type": "cloud", "status": "healthy", "x": 400, "y": 50, "metrics": {}}
    ]
    
    # Map created devices to topology nodes
    # Using the device ID as the node ID for linking
    for name, device in created_devices.items():
        node_data = next(item for item in devices_data if item["name"] == name)
        nodes.append({
            "id": str(device.id), # Key step: use UUID
            "name": device.hostname,
            "type": node_data["type"] if node_data["type"] != "server" else ("database" if "DB" in name else "server"),
            "status": node_data["status"],
            "x": node_data["x"],
            "y": node_data["y"],
            "metrics": {
                "cpu": device.cpu_usage,
                "memory": device.memory_usage,
                "bandwidth": random.randint(10, 100)
            }
        })

    # Edges using names to lookup UUIDs
    def get_id(name):
        if name == "internet": return "internet"
        return str(created_devices[name].id)

    edges = [
        {"source": "internet", "target": get_id("FW-EDGE-01")},
        {"source": get_id("FW-EDGE-01"), "target": get_id("RT-CORE-01")},
        {"source": get_id("RT-CORE-01"), "target": get_id("SW-DIST-01")},
        {"source": get_id("RT-CORE-01"), "target": get_id("SW-DIST-02")},
        {"source": get_id("SW-DIST-01"), "target": get_id("WEB-01")},
        {"source": get_id("SW-DIST-01"), "target": get_id("WEB-02")},
        {"source": get_id("SW-DIST-02"), "target": get_id("APP-01")},
        {"source": get_id("SW-DIST-02"), "target": get_id("DB-PRIMARY")},
    ]

    topology = NetworkTopology(
        name="Main Datacenter",
        description="Core network infrastructure topology (Live)",
        topology_type=TopologyType.LOGICAL,
        status=TopologyStatus.ACTIVE,
        nodes=nodes,
        edges=edges,
        layout_config={"layout": "hierarchical", "direction": "UD"},
        created_by_id=admin_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        is_active=True
    )

    db.add(topology)
    
    try:
        db.commit()
        print("Full network seeded successfully!")
    except Exception as e:
        print(f"Error committing topology: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_network_full()
