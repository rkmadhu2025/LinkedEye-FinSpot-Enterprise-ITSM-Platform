# Database Outage Recovery Runbook

**Severity:** P1 - Critical
**Category:** Infrastructure, Data
**MTTR Target:** 15 minutes
**Last Updated:** 2025-02-06

---

## Overview

Complete database outage results in total application failure. This runbook provides step-by-step recovery procedures for PostgreSQL cluster failures.

## Symptoms

- All database connections failing
- Error: "Connection refused" or "Connection timeout"
- Application returning 500/503 errors
- Health checks failing across all services
- No read or write operations succeeding

## Immediate Impact

- **User Impact:** 100% of users unable to access application
- **Revenue Impact:** All transactions halted
- **Data Risk:** Potential data loss if not handled correctly
- **SLA:** Critical SLA breach after 5 minutes

---

## Emergency Response - First 5 Minutes

### 1. Confirm Database is Actually Down

**Don't assume - verify:**

```bash
# Test database connectivity
psql -h db-primary.production -U postgres -d linkedeye_itsm_prod -c "SELECT 1;"

# Check database service status
systemctl status postgresql

# Kubernetes: Check pod status
kubectl get pods -n fs-linkedeye -l app=postgresql

# Expected if down:
# Error: could not connect to server
# OR: No route to host
# OR: Pod status: CrashLoopBackOff
```

### 2. Check Database Server Resources

```bash
# Is the server even up?
ping db-primary.production

# Can you SSH into it?
ssh db-primary.production

# If SSH works, check basic resources
df -h /var/lib/postgresql  # Disk space
free -h                     # Memory
uptime                      # Load average
```

**Common immediate causes:**
- ❌ Disk full (can't write WAL logs)
- ❌ Out of memory (OOM killer killed postgres)
- ❌ Server crashed or rebooted
- ❌ Network partition
- ❌ Exceeded connection limit

### 3. Initiate War Room

**This is a P1 incident - start war room immediately:**

```bash
# Send page to on-call DBA and SRE
# Create Slack channel: #incident-db-outage-<timestamp>
# Start Zoom call
# Update status page: "We are experiencing database connectivity issues"
```

---

## Recovery Procedures

### Scenario A: Primary Database Pod/Process Crashed

**Symptoms:** Process not running, pod in CrashLoopBackOff

#### Step 1: Check Database Logs

```bash
# Kubernetes logs
kubectl logs -n fs-linkedeye postgresql-0 --tail=100

# Server logs
tail -n 200 /var/lib/postgresql/data/log/postgresql-*.log

# Look for:
# - "FATAL: out of memory"
# - "PANIC: could not write to file"
# - "FATAL: data directory is of incompatible version"
# - Segmentation fault
```

#### Step 2: Quick Restart Attempt

```bash
# Kubernetes
kubectl delete pod -n fs-linkedeye postgresql-0
# Wait for pod to restart (30-60 seconds)
kubectl get pods -n fs-linkedeye -w

# Systemd
systemctl restart postgresql
systemctl status postgresql
```

#### Step 3: Verify Recovery

```bash
# Test connection
psql -h db-primary.production -U postgres -c "SELECT now();"

# Check replication lag (should be 0 or very low)
psql -h db-primary.production -U postgres -c \
  "SELECT client_addr, state, sync_state,
   pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS lag_bytes
   FROM pg_stat_replication;"

# Run quick data integrity check
psql -h db-primary.production -U postgres -d linkedeye_itsm_prod -c \
  "SELECT count(*) FROM incidents WHERE created_at > now() - interval '1 hour';"
```

**If restart succeeds:** Monitor for 15 minutes before resolving incident.

**If restart fails:** Proceed to Scenario B (Failover).

---

### Scenario B: Failover to Standby Database

**When to use:**
- Primary won't start after 2 restart attempts
- Data corruption detected on primary
- Primary server hardware failure
- Unrecoverable disk failure

#### Step 1: Verify Standby is Healthy

```bash
# Check standby status
ssh db-standby.production

# Kubernetes
kubectl exec -n fs-linkedeye postgresql-standby-0 -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"

# Should return: true (standby is in recovery/replica mode)

# Check replication lag
kubectl exec -n fs-linkedeye postgresql-standby-0 -- \
  psql -U postgres -c \
  "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"

# If lag is large (>100MB), wait for catch-up before promoting
```

#### Step 2: Promote Standby to Primary

**⚠️ CRITICAL: This is a one-way operation. Cannot easily reverse.**

```bash
# Method 1: Kubernetes (recommended)
kubectl patch statefulset postgresql-standby -n fs-linkedeye \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/env/0/value", "value":"primary"}]'

# Method 2: Direct PostgreSQL command
kubectl exec -n fs-linkedeye postgresql-standby-0 -- \
  pg_ctl promote -D /var/lib/postgresql/data

# Verify promotion (should now return false)
kubectl exec -n fs-linkedeye postgresql-standby-0 -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"
```

#### Step 3: Update Application Connection Strings

**Kubernetes Service Failover:**

```bash
# Update service to point to new primary
kubectl patch service postgresql-svc -n fs-linkedeye \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/selector/statefulset.kubernetes.io~1pod-name", "value":"postgresql-standby-0"}]'

# Verify service endpoints
kubectl get endpoints postgresql-svc -n fs-linkedeye

# Restart application pods to pick up new connection
kubectl rollout restart deployment linkedeye-backend -n incident-linkedeye-itsm
kubectl rollout restart deployment linkedeye-frontend -n incident-linkedeye-itsm
```

**DNS Failover (if using):**

```bash
# Update DNS A record to point to standby IP
# This depends on your DNS provider (CloudFlare, Route53, etc.)

# Flush DNS cache on application servers
systemd-resolve --flush-caches
```

#### Step 4: Verify Application Recovery

```bash
# Test application endpoint
curl -I https://itsm.finspot.in/health

# Check incident creation (smoke test)
curl -X POST https://itsm.finspot.in/api/v1/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test incident - DB failover verification",
    "description": "Verifying database connectivity after failover",
    "priority": "P4"
  }'

# Monitor error rates in Grafana
# Should see errors drop to near-zero within 2-3 minutes
```

---

### Scenario C: Disk Full - Emergency Cleanup

**Symptoms:** "No space left on device" errors

#### Step 1: Identify Space Hogs

```bash
# Check disk usage
df -h /var/lib/postgresql

# Find largest files
du -h /var/lib/postgresql/data | sort -hr | head -20

# Check WAL archive size
du -sh /var/lib/postgresql/data/pg_wal/
```

#### Step 2: Emergency Cleanup

**⚠️ Only do this during emergency - may cause performance issues**

```bash
# 1. Remove old WAL files (if archiving is enabled and working)
# This is SAFE - these are already archived
find /var/lib/postgresql/data/pg_wal/archive_status -name "*.done" | \
  xargs -n 1 basename | sed 's/.done$//' | \
  xargs -I {} rm /var/lib/postgresql/data/pg_wal/{}

# 2. Vacuum old data (if time permits - takes 5-30 minutes)
psql -U postgres -d linkedeye_itsm_prod -c "VACUUM FULL;"

# 3. Remove old log files
find /var/lib/postgresql/data/log -name "*.log" -mtime +7 -delete

# 4. Last resort: Increase disk size (cloud)
# AWS: Modify RDS instance storage
# GCP: gcloud compute disks resize
# Azure: az disk update
```

#### Step 3: Restart Database

```bash
systemctl restart postgresql
# or
kubectl delete pod -n fs-linkedeye postgresql-0
```

---

### Scenario D: Corrupted Data Directory

**Symptoms:** "data directory has invalid permissions" or "control file is corrupted"

#### Step 1: Assess Corruption

```bash
# Check PostgreSQL control file
pg_controldata /var/lib/postgresql/data

# If this fails with "invalid" or "corrupted", data directory is damaged
```

#### Step 2: Restore from Backup

**⚠️ This will lose all data since last backup**

```bash
# 1. Stop PostgreSQL
systemctl stop postgresql

# 2. Backup corrupted directory (just in case)
mv /var/lib/postgresql/data /var/lib/postgresql/data.corrupted

# 3. Restore from most recent backup
# Using pgBackRest:
pgbackrest restore --stanza=main --delta

# Using WAL-E:
wal-e backup-fetch /var/lib/postgresql/data LATEST

# Using manual backup:
tar -xzf /backups/postgresql-backup-latest.tar.gz -C /var/lib/postgresql/

# 4. Fix permissions
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data

# 5. Start PostgreSQL
systemctl start postgresql
```

#### Step 3: Point-in-Time Recovery (PITR)

If you need to recover to specific time:

```bash
# 1. Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'pgbackrest archive-get %f %p'
recovery_target_time = '2025-02-06 14:30:00'
recovery_target_action = 'promote'
EOF

# 2. Start PostgreSQL
systemctl start postgresql

# Database will replay WAL logs up to specified time
# Monitor: tail -f /var/lib/postgresql/data/log/postgresql-*.log

# 3. When recovery complete, database will promote to primary
```

---

## Data Validation After Recovery

**Critical: Verify data integrity before declaring incident resolved**

### 1. Check Recent Transactions

```sql
-- Check incidents created in last hour
SELECT count(*) FROM incidents
WHERE created_at > now() - interval '1 hour';

-- Check users logged in recently
SELECT count(DISTINCT user_id) FROM user_sessions
WHERE last_active > now() - interval '1 hour';

-- Verify no orphaned records
SELECT count(*) FROM incidents WHERE assigned_to_id NOT IN (SELECT id FROM users);
```

### 2. Run Database Consistency Checks

```sql
-- Check for corrupt indexes
REINDEX DATABASE linkedeye_itsm_prod;

-- Analyze tables for query planner
ANALYZE;

-- Check foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid = confrelid
);
```

### 3. Application Smoke Tests

```bash
# Run automated test suite
cd /app/tests
pytest tests/integration/test_database.py -v

# Manual verification
# - Create test incident
# - Assign to user
# - Add comment
# - Resolve incident
# - Query recent incidents
```

---

## Post-Recovery Monitoring

**Monitor closely for next 4 hours:**

### Key Metrics to Watch

```
1. Connection Pool Usage
   - Normal: 50-70% utilized
   - Alert if: >90% for 5 minutes

2. Query Latency
   - Normal: P95 < 100ms
   - Alert if: P95 > 500ms

3. Replication Lag (if standby restored)
   - Normal: < 1 second
   - Alert if: > 10 seconds

4. Disk Space
   - Normal: < 70% used
   - Alert if: > 85% used

5. Error Rate
   - Normal: < 0.1% of queries
   - Alert if: > 1% of queries
```

### Grafana Dashboards

Monitor these dashboards:
- PostgreSQL Overview
- Database Connections
- Query Performance
- Replication Status

---

## Prevention Measures

### 1. Automated Backups

**Ensure backups are running:**

```bash
# Verify backup schedule
crontab -l | grep pgbackrest

# Test backup restoration monthly
# Add to SRE team calendar

# Backup retention policy:
# - Daily backups: Keep 7 days
# - Weekly backups: Keep 4 weeks
# - Monthly backups: Keep 12 months
```

### 2. Monitoring Alerts

**Required alerts:**

```yaml
# Prometheus AlertManager
groups:
- name: postgresql_alerts
  rules:
  - alert: PostgreSQLDown
    expr: pg_up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "PostgreSQL is down on {{ $labels.instance }}"

  - alert: PostgreSQLReplicationLag
    expr: pg_replication_lag_bytes > 100000000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Replication lag is {{ $value }} bytes"

  - alert: PostgreSQLDiskSpaceHigh
    expr: node_filesystem_avail_bytes{mountpoint="/var/lib/postgresql"} / node_filesystem_size_bytes < 0.15
    for: 10m
    labels:
      severity: critical
```

### 3. Regular DR Drills

**Schedule quarterly disaster recovery drills:**

- [ ] Test failover to standby (non-production hours)
- [ ] Test backup restoration
- [ ] Measure actual MTTR
- [ ] Update runbook based on findings
- [ ] Train new team members

### 4. Connection Pooling

**Prevent connection exhaustion:**

```python
# Application configuration (FastAPI)
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,        # Max connections per instance
    max_overflow=10,     # Extra connections if needed
    pool_timeout=30,     # Wait time for connection
    pool_recycle=3600,   # Recycle connections after 1 hour
)
```

---

## Escalation Matrix

| Time Since Outage | Action |
|-------------------|--------|
| 0-5 minutes | Page on-call DBA + SRE |
| 5-15 minutes | Escalate to Senior SRE, start failover |
| 15-30 minutes | Involve VP Engineering, customer communication |
| 30+ minutes | Executive team notification, all-hands response |

---

## Communication Templates

### Initial Alert (Within 2 minutes)

**Status Page Update:**
```
We are currently experiencing database connectivity issues affecting all users.
Our team is actively investigating and working on a resolution.

Started: 14:32 UTC
Next Update: 14:42 UTC
```

**Internal Slack:**
```
🚨 P1 INCIDENT: Database Outage
Status: INVESTIGATING
Impact: 100% of users
War Room: #incident-db-2025-02-06
Zoom: https://zoom.us/j/xxxxx

Current Actions:
- ✅ Confirmed primary database is down
- 🔄 Attempting restart
- 🔄 Preparing for failover if restart fails

DRI: @on-call-sre
```

### Resolution (After recovery)

**Status Page:**
```
✅ RESOLVED: Database connectivity has been fully restored.

Impact Duration: 12 minutes (14:32 - 14:44 UTC)
Root Cause: Primary database process crash due to OOM
Resolution: Failover to standby database cluster

We apologize for the disruption. A detailed postmortem will be published within 48 hours.
```

---

## Postmortem Template

After incident is resolved, create postmortem:

```markdown
# Database Outage Postmortem - 2025-02-06

## Incident Summary
- **Date:** 2025-02-06
- **Duration:** 12 minutes (14:32 - 14:44 UTC)
- **Severity:** P1 - Critical
- **Impact:** 100% of users unable to access application
- **Revenue Impact:** Estimated $XXX lost transactions

## Timeline
- 14:32 - First alert: Database health check failed
- 14:33 - On-call SRE paged, war room started
- 14:35 - Confirmed primary database crashed (OOM)
- 14:37 - Restart attempt failed
- 14:39 - Decision to failover to standby
- 14:41 - Standby promoted to primary
- 14:42 - Application connection strings updated
- 14:44 - All services recovered, incident resolved

## Root Cause
PostgreSQL primary ran out of memory due to memory leak in PostgreSQL 15.3.
Specific query pattern triggered bug in query planner causing unbounded memory allocation.

## What Went Well
✅ Standby database was healthy and up-to-date (< 1s lag)
✅ Failover process executed smoothly
✅ Team responded within SLA (< 2 minutes)
✅ Clear communication to customers

## What Went Wrong
❌ No early warning before OOM (memory alerts threshold too high)
❌ First restart attempt wasted 4 minutes
❌ Postmortem runbook recovery time was underestimated

## Action Items
- [ ] Lower memory alert threshold from 90% to 75% (@sre-team, Due: 2025-02-08)
- [ ] Upgrade PostgreSQL to 15.4 (fixes memory leak) (@dba-team, Due: 2025-02-10)
- [ ] Add automated failover logic to reduce MTTR (@platform-team, Due: 2025-02-15)
- [ ] Update runbook with actual MTTR (12 min) (@sre-team, Due: 2025-02-07)
```

---

## Related Runbooks

- [High Memory Troubleshooting](./high-memory-troubleshooting.md)
- [Database Performance Tuning](./database-performance-tuning.md)
- [Network Connectivity Issues](./network-troubleshooting.md)
- [Incident War Room Procedures](./incident-war-room.md)

---

**Document Owner:** DBA Team
**Review Frequency:** Monthly
**Next Review:** 2025-03-06
**Last Tested:** 2025-01-20 (DR Drill - 14 minute MTTR)
