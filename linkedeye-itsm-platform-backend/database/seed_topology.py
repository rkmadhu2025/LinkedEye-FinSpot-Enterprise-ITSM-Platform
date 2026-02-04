import sys
import os
import json
from datetime import datetime
import uuid

# Add app to path
try:
    sys.path.append('/app')
    from app.core.database import SessionLocal
    from app.models.network_topology import NetworkTopology, TopologyType, TopologyStatus
    from app.models.user import User
except ImportError:
    # Local dev fallback
    sys.path.append(os.getcwd())
    from app.core.database import SessionLocal
    from app.models.network_topology import NetworkTopology, TopologyType, TopologyStatus
    from app.models.user import User

def seed_topology():
    print("Starting network topology seeding...")
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    # Check if topology already exists
    if db.query(NetworkTopology).count() > 0:
        print("Network topology already exists. Skipping.")
        return

    # Get a user for created_by_id (usually the first admin user)
    admin_user = db.query(User).filter(User.email == 'admin@finspot.com').first()
    if not admin_user:
        # Fallback to any user
        admin_user = db.query(User).first()
    
    if not admin_user:
        print("No users found to assign as creator. Skipping.")
        return
        
    print(f"Assigning topology to user: {admin_user.email}")

    # Define nodes
    nodes = [
        {"id": "internet", "name": "Internet", "type": "cloud", "status": "healthy", "x": 400, "y": 50, "metrics": {}},
        {"id": "fw-01", "name": "FW-EDGE-01", "type": "firewall", "status": "healthy", "x": 400, "y": 130, "metrics": {"cpu": 45, "bandwidth": 78}},
        {"id": "rt-core-01", "name": "RT-CORE-01", "type": "router", "status": "healthy", "x": 400, "y": 210, "metrics": {"cpu": 32, "bandwidth": 65}},
        {"id": "sw-dist-01", "name": "SW-DIST-01", "type": "switch", "status": "healthy", "x": 250, "y": 300, "metrics": {"bandwidth": 82}},
        {"id": "sw-dist-02", "name": "SW-DIST-02", "type": "switch", "status": "warning", "x": 550, "y": 300, "metrics": {"bandwidth": 91}},
        {"id": "srv-web-01", "name": "WEB-01", "type": "server", "status": "healthy", "x": 150, "y": 400, "metrics": {"cpu": 55, "memory": 62}},
        {"id": "srv-web-02", "name": "WEB-02", "type": "server", "status": "healthy", "x": 350, "y": 400, "metrics": {"cpu": 48, "memory": 58}},
        {"id": "srv-app-01", "name": "APP-01", "type": "server", "status": "critical", "x": 450, "y": 400, "metrics": {"cpu": 92, "memory": 88}},
        {"id": "db-primary", "name": "DB-PRIMARY", "type": "database", "status": "healthy", "x": 650, "y": 400, "metrics": {"cpu": 38, "memory": 72}},
    ]

    # Define edges (adjacency list or connection pairs)
    # The frontend expects 'connections' property on nodes, but the backend model expects an 'edges' list
    # Let's align with the backend model structure which usually separates nodes and edges for flexibility
    edges = [
        {"source": "internet", "target": "fw-01"},
        {"source": "fw-01", "target": "rt-core-01"},
        {"source": "rt-core-01", "target": "sw-dist-01"},
        {"source": "rt-core-01", "target": "sw-dist-02"},
        {"source": "sw-dist-01", "target": "srv-web-01"},
        {"source": "sw-dist-01", "target": "srv-web-02"},
        {"source": "sw-dist-02", "target": "srv-app-01"},
        {"source": "sw-dist-02", "target": "db-primary"},
    ]

    topology = NetworkTopology(
        name="Main Datacenter",
        description="Core network infrastructure topology",
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
        print("Network topology seeded successfully!")
    except Exception as e:
        print(f"Error committing topology: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_topology()
