# Network Outage Response Runbook

**Severity:** P1 - Critical
**Category:** Infrastructure, Network
**MTTR Target:** 20 minutes
**Last Updated:** 2025-02-06

---

## Overview

Network outages result in inability to reach servers, services, or entire data centers. This runbook covers diagnosis and recovery procedures for network connectivity failures.

## Common Symptoms

- Ping timeouts to servers/services
- SSH/RDP connection failures
- Application "Connection refused" or "No route to host" errors
- DNS resolution failures
- Intermittent packet loss (>5%)
- High latency (>100ms for local, >500ms for internet)

---

## Quick Diagnosis Steps

### 1. Scope the Outage

**Determine what's affected:**

```bash
# Test basic connectivity
ping 8.8.8.8              # Internet connectivity
ping internal-server.local # Internal network
ping gateway-ip           # Default gateway

# Test DNS
nslookup google.com
nslookup internal-service.local

# Test specific services
curl -I https://api.example.com
nc -zv db-server.local 5432

# Check routing
traceroute -n api.example.com
mtr --report api.example.com
```

### 2. Identify Network Layer

| Layer | Symptom | Test |
|-------|---------|------|
| **Physical (L1)** | No link light | Check cable, NIC status |
| **Data Link (L2)** | MAC issues | `arp -a`, switch port status |
| **Network (L3)** | No routing | `ip route`, ping gateway |
| **Transport (L4)** | Port blocked | `telnet host port`, `nc -zv` |
| **Application (L7)** | Service down | `curl`, `wget`, service logs |

### 3. Check Network Infrastructure

```bash
# Network interface status
ip link show
ip addr show

# Check for errors
ifconfig eth0 | grep errors
ethtool -S eth0 | grep -i error

# Routing table
ip route show
ip route get 8.8.8.8

# Firewall rules
iptables -L -n -v
ufw status verbose

# Network statistics
netstat -s | grep -i error
ss -s
```

---

## Resolution Scenarios

### Scenario A: Complete Internet Outage

**Symptoms:** Cannot reach any external IP, DNS fails

**Step 1: Verify ISP connection**

```bash
# Check physical connection
ethtool eth0 | grep "Link detected"

# Check DHCP lease
dhclient -v eth0

# Test gateway
ping $(ip route | grep default | awk '{print $3}')

# Test upstream DNS
ping 8.8.8.8
ping 1.1.1.1
```

**Step 2: Check with ISP**

```bash
# ISP status page
curl https://status.isp.com

# Or call ISP support
# Have ready: Account number, public IP, circuit ID
```

**Step 3: Failover to backup ISP**

```bash
# BGP failover (if configured)
vtysh -c "conf t" -c "router bgp 65001" -c "neighbor ISP-PRIMARY shutdown"

# Manual route change
ip route del default via PRIMARY_GATEWAY
ip route add default via BACKUP_GATEWAY

# Update DNS to use backup
echo "nameserver 8.8.8.8" > /etc/resolv.conf
```

### Scenario B: DNS Resolution Failure

**Symptoms:** `nslookup` fails, but ping by IP works

**Step 1: Test DNS servers**

```bash
# Test configured DNS
nslookup google.com
dig google.com

# Test alternative DNS
nslookup google.com 8.8.8.8
nslookup google.com 1.1.1.1

# Check /etc/resolv.conf
cat /etc/resolv.conf
```

**Step 2: Fix DNS configuration**

```bash
# Temporary fix
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf

# Permanent fix (systemd-resolved)
cat > /etc/systemd/resolved.conf << EOF
[Resolve]
DNS=8.8.8.8 1.1.1.1
FallbackDNS=8.8.4.4 1.0.0.1
EOF

systemctl restart systemd-resolved
```

**Step 3: Flush DNS cache**

```bash
# Linux
systemd-resolve --flush-caches
resolvectl flush-caches

# Application level
service nginx restart
service apache2 restart
```

### Scenario C: Kubernetes Cluster Network Issues

**Symptoms:** Pods can't communicate, services unreachable

**Step 1: Check pod network**

```bash
# Check CNI plugin status (Calico/Flannel/Weave)
kubectl get pods -n kube-system | grep -E "calico|flannel|weave"

# Check pod IP assignment
kubectl get pods -o wide

# Test pod-to-pod connectivity
kubectl exec -it pod1 -- ping <pod2-ip>

# Check service endpoints
kubectl get endpoints
```

**Step 2: Verify network policies**

```bash
# List network policies
kubectl get networkpolicies --all-namespaces

# Check if policy is blocking
kubectl describe networkpolicy <policy-name> -n <namespace>

# Temporarily delete restrictive policy (emergency only)
kubectl delete networkpolicy <policy-name> -n <namespace>
```

**Step 3: Restart CNI**

```bash
# Calico
kubectl delete pod -n kube-system -l k8s-app=calico-node

# Flannel
kubectl delete pod -n kube-system -l app=flannel

# CoreDNS (if DNS issues)
kubectl delete pod -n kube-system -l k8s-app=kube-dns
```

### Scenario D: High Packet Loss

**Symptoms:** 5-50% packet loss, intermittent connectivity

**Step 1: Measure packet loss**

```bash
# Ping test (100 packets)
ping -c 100 target-host

# MTR for detailed path analysis
mtr --report --report-cycles 100 target-host

# Look for specific hop with loss
```

**Step 2: Check for network saturation**

```bash
# Interface statistics
iftop -i eth0
nethogs eth0

# Bandwidth usage
vnstat -l -i eth0

# Check for broadcast storms
tcpdump -i eth0 -n broadcast | head -100
```

**Step 3: Adjust network parameters**

```bash
# Increase buffer sizes (temporary)
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216

# Disable offloading if causing issues
ethtool -K eth0 gso off gro off tso off

# Set MTU (if path MTU discovery issues)
ip link set eth0 mtu 1400
```

---

## Monitoring & Alerts

**Set up alerts for:**

```yaml
# Prometheus AlertManager
groups:
- name: network_alerts
  rules:
  - alert: HostDown
    expr: up{job="node-exporter"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Host {{ $labels.instance }} is down"

  - alert: HighPacketLoss
    expr: node_network_transmit_errs_total + node_network_receive_errs_total > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High packet loss on {{ $labels.device }}"

  - alert: HighNetworkLatency
    expr: probe_duration_seconds{job="blackbox"} > 0.5
    for: 5m
    labels:
      severity: warning
```

---

## Prevention

1. **Redundant network paths** - Multiple ISPs, BGP failover
2. **Monitoring** - Continuous latency and packet loss monitoring
3. **Capacity planning** - Monitor bandwidth usage trends
4. **Regular testing** - Quarterly DR drills for network failover
5. **Documentation** - Keep network diagrams up to date

---

**Document Owner:** Network Team
**Last Tested:** 2025-01-28
