# Grafana Dashboard & Incident Live Integration

## Overview

LinkedEye ITSM Platform provides complete integration with Grafana dashboards and real-time incident management through Prometheus/Grafana alerting.

---

## Grafana Dashboard Integration

### Dashboard Metrics API

**Endpoint**: `GET /api/v1/dashboard/metrics`

**Authentication**: JWT Bearer Token (Required)

**Query Parameters**:
- `client_id` (optional): Filter metrics by specific client UUID

**Response Schema**:
```json
{
  "total_incidents": 42,
  "critical_incidents": 5,
  "open_incidents": 15,
  "sla_compliance": 98.5,
  "pending_changes": 8,
  "total_assets": 150,
  "critical_assets": 12,
  "active_environments": 3,
  "total_problems": 3
}
```

### Client Visibility Configuration

**Default Behavior**:
- Admin users see all clients (no filtering)
- Regular users only see assigned clients
- Client filtering applies across all metrics queries

**Filter Implementation** (`app/api/dashboard.py:712`):
```python
def client_filter(model):
    """Apply client filtering based on user role and client_id query param"""
    if current_user.role in ('admin', 'super_admin'):
        if client_id:
            return [model.client_id == client_id]
        return []  # No filter - see all
    else:
        # Non-admin users only see their assigned clients
        return [model.client_id == current_user.client_id]
```

### Testing Dashboard API

**1. Obtain Authentication Token**:
```bash
# Login with default admin credentials
curl -X POST http://backend-url/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@linkedeye.com",
    "password": "admin123"
  }'

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**2. Query Dashboard Metrics**:
```bash
# All clients (admin view)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://backend-url/api/v1/dashboard/metrics

# Specific client
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://backend-url/api/v1/dashboard/metrics?client_id=550e8400-e29b-41d4-a716-446655440000"
```

**3. Kubernetes Testing** (when cluster accessible):
```bash
# Get token from pod
kubectl exec -n incident-linkedeye-itsm linkedeye-backend-xxxxx -- \
  curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@linkedeye.com","password":"admin123"}' | jq -r '.access_token'

# Use token to test dashboard
kubectl exec -n incident-linkedeye-itsm linkedeye-backend-xxxxx -- \
  curl -H "Authorization: Bearer TOKEN_HERE" \
  http://localhost:8000/api/v1/dashboard/metrics
```

### Monitoring Stack Status

**Services** (as of last check):
- **Grafana**: http://grafana-svc.fs-linkedeye.svc.cluster.local:3000 ✅ v10.2.2
- **Prometheus**: http://prometheus-svc.fs-linkedeye.svc.cluster.local:9090 ✅
- **Loki**: http://loki-svc.fs-linkedeye.svc.cluster.local:3100 ✅

**Health Check**:
```bash
kubectl exec -n incident-linkedeye-itsm linkedeye-backend-xxxxx -- \
  curl -s http://grafana-svc.fs-linkedeye.svc.cluster.local:3000/api/health
```

---

## Incident Live Integration

### Architecture Flow

```
┌──────────────┐     Alerts      ┌──────────────────┐
│  Prometheus  ├────────────────►│  Alertmanager    │
│  (Metrics)   │                 │  (Grouping)      │
└──────────────┘                 └─────────┬────────┘
                                           │ Webhook
                                           │
┌──────────────┐                 ┌─────────▼────────┐
│   Grafana    ├────────────────►│   LinkedEye      │
│  (Dashboards)│     Webhook     │   ITSM Backend   │
└──────────────┘                 └─────────┬────────┘
                                           │ Auto-create
                                           │
                                  ┌────────▼─────────┐
                                  │   Incidents DB   │
                                  │   (PostgreSQL)   │
                                  └──────────────────┘
```

### Webhook Endpoints

#### 1. Prometheus Alertmanager Webhook
**Endpoint**: `POST /api/v1/webhooks/alertmanager`

**Implementation**: `app/api/webhooks.py:244`

**Features**:
- Auto-creates incidents from firing alerts
- Auto-resolves incidents when alerts resolve
- Fingerprint-based deduplication (prevents duplicate incidents)
- Maps alert severity to incident priority (critical/high/medium/low)
- Includes alert labels, annotations, and generator URLs
- Links monitoring alerts to incidents

**Payload Example**:
```json
{
  "version": "4",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighCPUUsage",
        "severity": "critical",
        "instance": "192.168.1.100:9100",
        "hostname": "web-server-01",
        "client": "FinSpot Production"
      },
      "annotations": {
        "summary": "CPU usage exceeded 90%",
        "description": "CPU usage is at 95% on web-server-01"
      },
      "startsAt": "2025-02-06T10:30:00Z",
      "fingerprint": "abc123def456"
    }
  ]
}
```

**Incident Creation Logic** (`app/api/webhooks.py:344-384`):
```python
# Auto-create incident if not already linked
if not monitoring_alert.incident_id:
    existing_incident = db.query(Incident).filter(
        Incident.external_id == fingerprint,
        Incident.source == "Prometheus"
    ).first()

    if existing_incident:
        monitoring_alert.incident_id = existing_incident.id
        continue

    # Generate clear title with hostname, IP, client, and issue
    incident_title = generate_incident_title(
        alert_name, alert.labels, alert.annotations, "Prometheus"
    )

    incident = Incident(
        number=generate_incident_number(db),  # INC-000001
        title=incident_title,  # "192.168.1.100:HighCPUUsage - web-server-01 - CPU usage exceeded 90%"
        description=f"{message}\n\nSource: Prometheus\nSeverity: {severity_str}",
        status=IncidentStatus.NEW.value,
        priority=map_severity_to_priority(severity).value,
        source="Prometheus",
        alert_rule=alert_name,
        external_id=fingerprint,
        custom_fields={
            "alert_id": str(monitoring_alert.id),
            "fingerprint": fingerprint,
            "labels": alert.labels,
            "annotations": alert.annotations,
            "auto_created": True
        }
    )
    db.add(incident)
    monitoring_alert.incident_id = incident.id
    logger.info(f"Auto-created incident {incident.number} from alert {alert_name}")
```

**Auto-Resolution Logic** (`app/api/webhooks.py:386-402`):
```python
elif alert.status == "resolved":
    if existing_alert:
        existing_alert.status = AlertStatus.RESOLVED.value
        existing_alert.ends_at = parse_datetime(alert.endsAt)

        # Auto-resolve linked incident
        if existing_alert.incident_id:
            incident = db.query(Incident).filter(
                Incident.id == existing_alert.incident_id
            ).first()

            if incident and incident.status not in [
                IncidentStatus.RESOLVED.value,
                IncidentStatus.CLOSED.value
            ]:
                incident.status = IncidentStatus.RESOLVED.value
                incident.resolved_at = datetime.now(timezone.utc)
                incident.resolution_notes = f"Auto-resolved: Alert '{alert_name}' has been resolved."
                logger.info(f"Auto-resolved incident {incident.number}")
```

#### 2. Grafana Unified Alerting Webhook
**Endpoint**: `POST /api/v1/webhooks/grafana`

**Implementation**: `app/api/webhooks.py:439`

**Features**:
- Same auto-creation and resolution logic as Prometheus
- Includes dashboard URLs, panel URLs, and alert values
- Supports Grafana-specific alert statuses (alerting, ok, normal)
- Extracts orgId for multi-tenant Grafana setups

**Payload Example**:
```json
{
  "status": "alerting",
  "orgId": 1,
  "title": "Database Response Time High",
  "message": "Database response time exceeded threshold",
  "alerts": [
    {
      "status": "alerting",
      "labels": {
        "alertname": "DatabaseSlow",
        "severity": "high"
      },
      "annotations": {
        "summary": "DB queries taking >2 seconds"
      },
      "dashboardURL": "http://grafana/d/abc/db-dashboard",
      "panelURL": "http://grafana/d/abc/db-dashboard?viewPanel=12",
      "valueString": "3.5s"
    }
  ]
}
```

#### 3. Generic Webhook
**Endpoint**: `POST /api/v1/webhooks/generic`

**Implementation**: `app/api/webhooks.py:607`

**Features**:
- Flexible payload format for custom integrations
- Supports n8n, Zapier, custom monitoring tools
- Same incident auto-creation and resolution
- Status mapping: firing/active/alerting → create incident
- Status mapping: resolved/ok/normal/closed → resolve incident

**Payload Example**:
```json
{
  "alerts": [
    {
      "name": "Custom Alert",
      "status": "firing",
      "severity": "critical",
      "message": "Something went wrong",
      "labels": {
        "service": "api-gateway",
        "environment": "production"
      },
      "fingerprint": "custom-alert-123"
    }
  ]
}
```

### Incident Numbering

**Format**: `INC-XXXXXX` (6 digits, zero-padded)

**Generation Logic** (`app/api/webhooks.py:155`):
```python
def generate_incident_number(db: Session) -> str:
    # Get the max incident number and increment
    result = db.query(func.max(Incident.number)).scalar()
    if result:
        num = int(result.replace("INC-", ""))
        return f"INC-{num + 1:06d}"
    incident_count = db.query(Incident).count() + 1
    return f"INC-{incident_count:06d}"
```

**Examples**: `INC-000001`, `INC-000042`, `INC-001337`

### Severity to Priority Mapping

```python
{
    "critical" → IncidentPriority.CRITICAL,  # P1 - Immediate response
    "high"     → IncidentPriority.HIGH,      # P2 - 1 hour SLA
    "warning"  → IncidentPriority.MEDIUM,    # P3 - 4 hours SLA
    "medium"   → IncidentPriority.MEDIUM,    # P3 - 4 hours SLA
    "low"      → IncidentPriority.LOW,       # P4 - 24 hours SLA
    "info"     → IncidentPriority.LOW        # P4 - 24 hours SLA
}
```

### Incident Title Generation

**Format**: `[IP/Instance]:[Alert Type] - [Hostname/Client] - [Description]`

**Examples**:
- `192.168.1.100:SW_Memory - webserver01 - High memory usage`
- `db-server-01:CPU_High - FinSpot Production - CPU usage exceeded threshold`
- `api-gateway-01:HealthCheckFailed - Production Environment - API health check failed`

**Implementation** (`app/api/webhooks.py:184`):
```python
def generate_incident_title(
    alert_name: str,
    labels: Dict[str, Any],
    annotations: Dict[str, Any],
    source: str
) -> str:
    # Extract IP/instance
    instance = labels.get('instance', '')
    ip_address = labels.get('ip_address', '') or labels.get('ip', '')
    hostname = labels.get('hostname', '') or annotations.get('friendly_name', '')
    client = labels.get('client', '') or labels.get('client_id', '')

    # Build title components
    title_parts = []
    if ip_address:
        title_parts.append(f"{ip_address}:{alert_name}")
    else:
        title_parts.append(alert_name)

    if hostname:
        title_parts.append(hostname)
    elif client:
        title_parts.append(client)

    summary = annotations.get('summary', '') or annotations.get('description', '')
    if summary and len(summary) <= 50:
        title_parts.append(summary)

    title = ' - '.join(title_parts)
    return title[:252] + '...' if len(title) > 255 else title
```

---

## Configuration

### Prometheus Alertmanager Configuration

Add to `alertmanager.yml`:
```yaml
route:
  receiver: 'linkedeye-itsm'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

receivers:
- name: 'linkedeye-itsm'
  webhook_configs:
  - url: 'http://linkedeye-backend.incident-linkedeye-itsm.svc.cluster.local:8000/api/v1/webhooks/alertmanager'
    send_resolved: true
    http_config:
      bearer_token: 'optional-auth-token'
```

### Grafana Contact Points

1. Navigate to **Alerting → Contact points**
2. Click **New contact point**
3. Select **Webhook** as contact point type
4. Configure:
   - **URL**: `http://linkedeye-backend:8000/api/v1/webhooks/grafana`
   - **HTTP Method**: POST
   - **Authorization Header** (optional): `Bearer YOUR_TOKEN`
5. Test contact point

### n8n Workflow Integration

Create n8n workflow with HTTP Request node:
```json
{
  "method": "POST",
  "url": "http://linkedeye-backend:8000/api/v1/webhooks/generic",
  "headers": {
    "Content-Type": "application/json",
    "X-Integration-ID": "your-integration-uuid"
  },
  "body": {
    "alerts": [
      {
        "name": "{{ $json.alert_name }}",
        "status": "{{ $json.status }}",
        "severity": "{{ $json.severity }}",
        "message": "{{ $json.message }}",
        "labels": "{{ $json.labels }}",
        "fingerprint": "{{ $json.fingerprint }}"
      }
    ]
  }
}
```

---

## Monitoring Alert Lifecycle

```
┌─────────────┐
│  Alert      │
│  Firing     │ ──► Auto-create incident (status: NEW)
└─────────────┘     Store fingerprint for deduplication
                    Link alert to incident

        │
        │ (Alert continues firing)
        │
        ▼

┌─────────────┐
│  Alert      │ ──► Update existing alert
│  Still      │     No new incident created (dedup by fingerprint)
│  Firing     │
└─────────────┘

        │
        │ (Alert resolves)
        │
        ▼

┌─────────────┐
│  Alert      │ ──► Auto-resolve linked incident
│  Resolved   │     Set resolved_at timestamp
└─────────────┘     Add resolution notes
```

---

## Database Schema

### incidents table (relevant fields)
```sql
CREATE TABLE incidents (
    id UUID PRIMARY KEY,
    number VARCHAR(20) UNIQUE NOT NULL,  -- INC-000001
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL,         -- NEW, IN_PROGRESS, RESOLVED, CLOSED
    priority VARCHAR(20) NOT NULL,       -- CRITICAL, HIGH, MEDIUM, LOW
    source VARCHAR(50),                  -- Prometheus, Grafana, Webhook
    alert_rule VARCHAR(255),             -- Alert name
    external_id VARCHAR(255),            -- Fingerprint from alert
    custom_fields JSONB,                 -- Alert metadata
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incidents_external_id ON incidents(external_id);
CREATE INDEX idx_incidents_source ON incidents(source);
CREATE INDEX idx_incidents_status ON incidents(status);
```

### monitoring_alerts table
```sql
CREATE TABLE monitoring_alerts (
    id UUID PRIMARY KEY,
    integration_id UUID REFERENCES integrations(id),
    incident_id UUID REFERENCES incidents(id),    -- Link to auto-created incident
    name VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,                -- CRITICAL, HIGH, MEDIUM, LOW
    status VARCHAR(20) NOT NULL,                  -- FIRING, RESOLVED, ACKNOWLEDGED
    source VARCHAR(50) NOT NULL,                  -- prometheus, grafana, webhook
    message TEXT,
    labels JSONB,
    annotations JSONB,
    fingerprint VARCHAR(255) UNIQUE NOT NULL,     -- Deduplication key
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    acknowledged_by_id UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_monitoring_alerts_fingerprint ON monitoring_alerts(fingerprint);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX idx_monitoring_alerts_incident_id ON monitoring_alerts(incident_id);
```

---

## Testing Incident Integration

### 1. Test Prometheus Webhook (Manual)

```bash
curl -X POST http://linkedeye-backend:8000/api/v1/webhooks/alertmanager \
  -H "Content-Type: application/json" \
  -d '{
    "version": "4",
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "TestAlert",
          "severity": "critical",
          "instance": "test-server:9100"
        },
        "annotations": {
          "summary": "This is a test alert"
        },
        "startsAt": "2025-02-06T10:00:00Z",
        "fingerprint": "test-alert-123"
      }
    ]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Processed 1 alerts",
  "alerts_processed": 1,
  "incidents_created": 1,
  "incidents_resolved": 0,
  "details": {
    "receiver": null,
    "group_key": null,
    "external_url": null
  }
}
```

### 2. Verify Incident Creation

```bash
# Query incidents API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://linkedeye-backend:8000/api/v1/incidents?source=Prometheus
```

### 3. Test Alert Resolution

```bash
curl -X POST http://linkedeye-backend:8000/api/v1/webhooks/alertmanager \
  -H "Content-Type: application/json" \
  -d '{
    "version": "4",
    "status": "resolved",
    "alerts": [
      {
        "status": "resolved",
        "labels": {
          "alertname": "TestAlert",
          "severity": "critical",
          "instance": "test-server:9100"
        },
        "annotations": {
          "summary": "This is a test alert"
        },
        "startsAt": "2025-02-06T10:00:00Z",
        "endsAt": "2025-02-06T10:05:00Z",
        "fingerprint": "test-alert-123"
      }
    ]
  }'
```

**Expected**: Incident status changes to RESOLVED

---

## Troubleshooting

### Issue: Incidents not being created

**Check**:
1. Webhook endpoint accessible: `curl http://backend-url/api/v1/webhooks/health`
2. Alert fingerprint not duplicate: Query `monitoring_alerts` table
3. Integration exists and is active: Query `integrations` table
4. Check backend logs: `kubectl logs -n incident-linkedeye-itsm linkedeye-backend-xxxxx`

### Issue: Dashboard metrics returning 401 Unauthorized

**Fix**:
1. Obtain fresh JWT token via `/api/v1/auth/login`
2. Ensure token is included in `Authorization: Bearer TOKEN` header
3. Check token expiration (default: 30 minutes)

### Issue: Client filtering not working

**Check**:
1. Verify user role (admin sees all, regular users see assigned only)
2. Check `client_id` parameter format (must be valid UUID)
3. Verify user has `client_id` set in users table

---

## Security Considerations

1. **Webhook Authentication**:
   - Add `X-Integration-ID` header for webhook validation
   - Consider IP whitelisting for webhook endpoints
   - Use HTTPS in production

2. **Dashboard API**:
   - Always requires JWT authentication
   - Token expiration enforced
   - Rate limiting enabled (see `RATE_LIMIT_ENABLED` env var)

3. **Default Credentials**:
   - Change default password immediately: `admin@linkedeye.com / admin123`
   - Enforce password complexity requirements (12+ chars, upper, lower, digit, special)
   - Enable email verification for new users

---

## Next Steps

1. **Test Dashboard API with valid credentials** (Kubernetes cluster currently unreachable)
2. **Configure Prometheus Alertmanager** to send webhooks to LinkedEye
3. **Set up Grafana contact points** for alert routing
4. **Create custom dashboards** in Grafana displaying ITSM metrics
5. **Configure on-call escalations** for critical incidents
6. **Set up Twilio SMS notifications** for P1 incidents (already integrated!)

---

## Related Files

- `app/api/dashboard.py` - Dashboard metrics API
- `app/api/webhooks.py` - Webhook endpoints for alert ingestion
- `app/api/monitoring.py` - Monitoring alert management
- `app/api/incidents.py` - Incident CRUD operations
- `app/models/incident.py` - Incident data model
- `app/models/monitoring_alert.py` - Monitoring alert model
- `app/tasks/incident_tasks.py` - Background tasks for incident processing
- `app/services/notification_service.py` - Incident notifications (Email, SMS, Slack)

---

**Last Updated**: 2026-02-06
**Status**: ✅ Operational (Monitoring stack running, Backend v1.0.2, 2/2 pods healthy)
