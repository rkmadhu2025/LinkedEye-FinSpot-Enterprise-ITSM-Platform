# High CPU Troubleshooting Runbook

**Severity:** P2 - High
**Category:** Infrastructure, Performance
**Last Updated:** 2025-02-06

---

## Overview

High CPU usage (>90% sustained for 5+ minutes) can indicate runaway processes, memory leaks, or legitimate load spikes requiring immediate investigation.

## Symptoms

- CPU usage consistently above 90%
- Server slow to respond to SSH/RDP connections
- Application response times degraded
- Timeouts on API endpoints
- Load average significantly above CPU count

## Impact Assessment

| CPU Usage | Impact Level | Action Required |
|-----------|--------------|-----------------|
| 70-80% | Warning | Monitor closely |
| 80-90% | Medium | Investigate within 30 min |
| 90-95% | High | Investigate immediately |
| >95% | Critical | Emergency response |

---

## Immediate Actions (First 5 Minutes)

### 1. Identify the Culprit Process

**Linux:**
```bash
# Real-time top consumers
top -o %CPU

# Or use htop for better visualization
htop

# Get process details
ps aux | sort -nrk 3 | head -10
```

**Windows:**
```powershell
# Task Manager or PowerShell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
```

**Expected Output:**
```
PID    USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
12345  appuser   20   0  2.5g    1.2g   10m  R  95.3   8.2   120:45 payment-service
23456  postgres  20   0  1.8g    800m   50m  S  12.1   5.5    45:30 postgres
```

### 2. Determine If Legitimate Load

Check if the high CPU is due to legitimate traffic:

```bash
# Check current connections
netstat -an | grep ESTABLISHED | wc -l

# Review web server logs (last 5 minutes)
tail -n 1000 /var/log/nginx/access.log | grep "$(date +%d/%b/%Y:%H:%M)" | wc -l

# Check application metrics in Grafana
# Navigate to: http://grafana/d/app-metrics/application-dashboard
```

**Indicators of Legitimate Load:**
- Traffic spike in Grafana
- Scheduled batch job running
- Recent marketing campaign launched
- Known high-traffic period (Black Friday, etc.)

**Indicators of Problem:**
- No corresponding traffic increase
- Process consuming CPU but not making progress
- Repeated error messages in logs
- CPU spike started after recent deployment

### 3. Collect Diagnostic Data

Before taking action, capture evidence:

```bash
# CPU statistics (5 samples, 1 second apart)
mpstat -P ALL 1 5 > /tmp/cpu-stats.txt

# Process tree with resource usage
ps auxf > /tmp/process-tree.txt

# System load average
uptime >> /tmp/cpu-stats.txt

# Top 20 processes by CPU
top -b -n 1 | head -30 >> /tmp/cpu-stats.txt

# If Java application, get thread dump
jstack <PID> > /tmp/thread-dump-$(date +%Y%m%d-%H%M%S).txt
```

**Attach to Incident:**
Upload `/tmp/cpu-stats.txt` and thread dumps to incident ticket.

---

## Investigation Steps

### Step 1: Analyze the Process

**Check process details:**
```bash
# Full command line
ps -fp <PID>

# Open files and connections
lsof -p <PID> | head -50

# System calls (be careful, this adds overhead)
strace -c -p <PID>

# For Java processes - memory and GC
jstat -gcutil <PID> 1000 10
```

### Step 2: Check Recent Changes

**Deployment history:**
```bash
# Check recent deployments (last 24 hours)
kubectl rollout history deployment/<app-name> -n production

# Review recent Git commits
git log --since="24 hours ago" --oneline

# Check configuration changes
diff /etc/app/config.yml /etc/app/config.yml.backup
```

**Common culprits after deployment:**
- New code with inefficient algorithm (O(n²) instead of O(n))
- Memory leak causing excessive garbage collection
- Infinite loop or recursion
- Blocking I/O operations
- Missing database indexes causing full table scans

### Step 3: Review Application Logs

```bash
# Check for errors in last 30 minutes
journalctl -u <service-name> --since "30 minutes ago" | grep -i error

# Application-specific logs
tail -f /var/log/application/app.log | grep -E "ERROR|WARN|Exception"

# Look for slow query warnings
grep "slow query" /var/log/postgresql/postgresql.log
```

**Warning signs:**
- Repeated exceptions in tight loop
- "OutOfMemoryError" or GC thrashing
- Connection timeout errors
- Database deadlock messages

### Step 4: Database Query Analysis

If database process is high CPU:

```sql
-- PostgreSQL: Find slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;

-- MySQL: Show processlist
SHOW FULL PROCESSLIST;

-- Check for missing indexes
EXPLAIN ANALYZE <slow-query>;
```

---

## Resolution Strategies

### Strategy A: Runaway Process (Immediate)

**When to use:** Process consuming >90% CPU and not making useful progress.

```bash
# 1. Try graceful shutdown first
systemctl stop <service-name>

# 2. Wait 30 seconds for cleanup
sleep 30

# 3. If still running, force kill
if ps -p <PID> > /dev/null; then
    kill -9 <PID>
    echo "Process force-killed"
fi

# 4. Restart service
systemctl start <service-name>

# 5. Verify it's stable
sleep 10
systemctl status <service-name>
```

**Post-restart monitoring:**
- Watch CPU for next 15 minutes
- Check error logs immediately after restart
- Verify application functionality (smoke test)

### Strategy B: Legitimate High Load (Scale)

**When to use:** CPU high due to genuine traffic increase.

**Horizontal Scaling (Kubernetes):**
```bash
# Scale deployment
kubectl scale deployment <app-name> --replicas=5 -n production

# Verify new pods are running
kubectl get pods -n production -l app=<app-name>

# Check load distribution
kubectl top pods -n production -l app=<app-name>
```

**Vertical Scaling (Increase resources):**
```bash
# Update resource limits
kubectl set resources deployment <app-name> \
  --limits=cpu=2000m,memory=4Gi \
  --requests=cpu=1000m,memory=2Gi \
  -n production
```

**Load Balancer Check:**
```bash
# Verify all backends are healthy
curl -s http://load-balancer/health | jq .
```

### Strategy C: Code Optimization (Long-term)

**When to use:** Recurring high CPU with same operation.

**Profiling:**
```bash
# Python: py-spy
py-spy top --pid <PID>
py-spy record -o profile.svg --pid <PID> --duration 60

# Java: Async-profiler
./profiler.sh -d 60 -f /tmp/flamegraph.html <PID>

# Node.js: Clinic.js
clinic doctor -- node app.js
```

**Common fixes:**
- Add caching layer (Redis)
- Optimize database queries (add indexes)
- Implement connection pooling
- Use async I/O instead of blocking calls
- Reduce logging verbosity in hot path

---

## Root Cause Analysis

### Common Causes by Category

#### Memory Leak → GC Thrashing
**Symptoms:** CPU high, memory high, frequent GC pauses
**Detection:** `jstat -gcutil` shows >50% time in GC
**Fix:** Find and fix memory leak, increase heap size temporarily

#### Infinite Loop
**Symptoms:** Single thread consuming 100% of one core
**Detection:** Thread dump shows same stack trace repeatedly
**Fix:** Fix code bug, add loop exit condition

#### Database Query Without Index
**Symptoms:** Database process high CPU, slow query logs
**Detection:** `EXPLAIN ANALYZE` shows seq scan on large table
**Fix:** Add appropriate index

#### External API Timeout
**Symptoms:** Many threads blocked on I/O
**Detection:** Thread dump shows threads waiting on socket.read
**Fix:** Reduce timeout, implement circuit breaker, add retry logic

#### Cryptocurrency Miner (Security)
**Symptoms:** Unknown process consuming CPU, connecting to mining pools
**Detection:** `netstat` shows connections to known mining pools
**Fix:** Kill process, investigate compromise, run security scan

---

## Prevention Measures

### 1. Set Up Monitoring Alerts

**Prometheus AlertManager rule:**
```yaml
groups:
- name: cpu_alerts
  rules:
  - alert: HighCPUUsage
    expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage on {{ $labels.instance }}"
      description: "CPU usage is {{ $value }}% for 5 minutes"

  - alert: CriticalCPUUsage
    expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "CRITICAL: CPU usage on {{ $labels.instance }}"
```

### 2. Performance Testing

**Load testing before deployment:**
```bash
# Apache Bench
ab -n 10000 -c 100 http://api.example.com/endpoint

# k6 load testing
k6 run --vus 100 --duration 5m load-test.js

# Verify CPU stays below 70% during test
```

### 3. Code Review Checklist

Before merging performance-critical code:
- [ ] Profiled in staging environment
- [ ] No O(n²) or worse algorithms on large datasets
- [ ] Database queries have appropriate indexes
- [ ] Caching implemented for expensive operations
- [ ] Resource cleanup (close connections, files)
- [ ] No unbounded loops or recursion

### 4. Auto-Scaling Configuration

**HPA (Horizontal Pod Autoscaler):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Escalation

### When to Escalate

Escalate to senior SRE if:
- CPU stays >95% after initial mitigation
- Root cause unclear after 30 minutes
- Multiple servers affected simultaneously
- Production revenue impact >$1000/hour
- Security compromise suspected

### Escalation Contacts

- **On-Call SRE:** Page via PagerDuty (P2 or higher)
- **Database Team:** For DB-specific issues
- **Security Team:** If crypto-miner or compromise suspected
- **Development Team:** For code-specific issues

### War Room Protocol

For P1 incidents (production down):
1. Start Zoom war room immediately
2. Assign incident commander
3. Set up Slack channel: `#incident-<number>`
4. Update status page every 15 minutes
5. Take detailed notes for postmortem

---

## Postmortem Checklist

After resolving high CPU incident:

- [ ] Document exact timeline of events
- [ ] Identify root cause (what, not who)
- [ ] List all mitigation actions taken
- [ ] Measure total impact (downtime, revenue)
- [ ] Create action items to prevent recurrence
- [ ] Schedule postmortem review meeting
- [ ] Update this runbook with lessons learned

---

## Related Runbooks

- [High Memory Troubleshooting](./high-memory-troubleshooting.md)
- [Database Performance Issues](./database-performance.md)
- [Application Crash Debug Guide](./application-crash-debug.md)
- [Security Incident Response](./security-incident-playbook.md)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-02-06 | AI Assistant | Initial creation with comprehensive diagnostics |
| 2025-01-15 | SRE Team | Added Kubernetes scaling procedures |
| 2024-12-10 | Dev Team | Added Java profiling section |

**Document Owner:** SRE Team
**Review Frequency:** Quarterly
**Next Review:** 2025-05-06
