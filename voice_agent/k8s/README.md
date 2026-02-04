# Voice Agent Kubernetes Deployment

Production-ready Kubernetes manifests for deploying the voice-agent application to a self-hosted Ubuntu cluster.

## 🚀 Quick Start

### Prerequisites

1. **Kubernetes Cluster**: Self-hosted on Ubuntu
2. **NGINX Ingress Controller**: Installed and configured
3. **Cert-Manager**: Installed with ClusterIssuer configured
4. **Storage Class**: Available (e.g., `local-path`, `nfs`, `hostpath`)
5. **GitLab Access Token**: With `read_registry` permissions

### Setup Steps

1. **Create GitLab Registry Secret**:
```bash
kubectl create secret docker-registry gitlab-registry-secret \
  --docker-server=registry.gitlab.com \
  --docker-username=<gitlab-username> \
  --docker-password=<gitlab-access-token> \
  --namespace=voice-agent
```

2. **Update Application Secrets**:
Edit `02-secrets.yaml` and replace base64 values with actual encoded secrets:
```bash
echo -n "your-openai-key" | base64
echo -n "your-deepgram-key" | base64
echo -n "your-daily-key" | base64
echo -n "https://your-daily-domain.daily.co/your-room" | base64
```

3. **Update Storage Class**:
Edit `04-pvc.yaml` and set the correct `storageClassName` for your cluster.

4. **Update ClusterIssuer**:
Edit `07-ingress.yaml` and replace `letsencrypt-prod` with your actual ClusterIssuer name.

5. **Deploy All Resources**:
```bash
# Apply all manifests in order
kubectl apply -f 01-namespace.yaml
kubectl apply -f 02-secrets.yaml
kubectl apply -f 03-configmap.yaml
kubectl apply -f 04-pvc.yaml
kubectl apply -f 05-deployment.yaml
kubectl apply -f 06-service.yaml
kubectl apply -f 07-ingress.yaml
kubectl apply -f 08-monitoring.yaml
```

Or apply all at once:
```bash
kubectl apply -f .
```

## 📋 Manifest Files

| File | Resource | Purpose |
|------|----------|---------|
| `01-namespace.yaml` | Namespace | Isolated environment |
| `02-secrets.yaml` | Secrets | GitLab auth & app secrets |
| `03-configmap.yaml` | ConfigMap | App configuration |
| `04-pvc.yaml` | PersistentVolumeClaim | Storage for data/logs |
| `05-deployment.yaml` | Deployment | Application pods |
| `06-service.yaml` | Service | Internal networking |
| `07-ingress.yaml` | Ingress | External access & TLS |
| `08-monitoring.yaml` | Monitoring | Metrics & autoscaling |

## 🔧 Configuration

### Environment Variables

The application uses these environment variables (from ConfigMap and Secrets):

**Required Secrets:**
- `OPENAI_API_KEY`: OpenAI API key
- `DEEPGRAM_API_KEY`: Deepgram API key  
- `DAILY_API_KEY`: Daily.co API key
- `DAILY_SAMPLE_ROOM_URL`: Daily room URL

**Optional ConfigMap Variables:**
- `LOG_LEVEL`: Logging level (default: INFO)
- `ENVIRONMENT`: Environment (production)
- `MAX_CONCURRENT_SESSIONS`: Concurrent session limit
- `CONNECTION_TIMEOUT`: Connection timeout in seconds

### Resource Limits

- **CPU**: 500m request, 1000m limit
- **Memory**: 512Mi request, 1Gi limit
- **Storage**: 20Gi persistent volume
- **Replicas**: 2 (with HPA up to 10)

## 🌐 Access

After deployment, the application will be available at:
- **URL**: https://voice.madhu.in
- **Health Check**: https://voice.madhu.in/health
- **Metrics**: https://voice.madhu.in/metrics (for Prometheus)

## 🔍 Monitoring

### Health Checks

```bash
# Check pod status
kubectl get pods -n voice-agent

# Check services
kubectl get svc -n voice-agent

# Check ingress
kubectl get ingress -n voice-agent

# Check PVC
kubectl get pvc -n voice-agent
```

### Logs

```bash
# View application logs
kubectl logs -f deployment/voice-agent -n voice-agent

# View previous logs
kubectl logs -p deployment/voice-agent -n voice-agent

# View specific pod logs
kubectl logs -f <pod-name> -n voice-agent
```

### Metrics

The application exposes metrics on port 8080 at `/metrics` for Prometheus monitoring.

## 🚨 Common Production Mistakes to Avoid

### 1. **Incorrect Storage Class**
- **Problem**: PVC remains in `Pending` state
- **Solution**: Verify available storage classes with `kubectl get storageclass`
- **Fix**: Update `storageClassName` in `04-pvc.yaml`

### 2. **GitLab Registry Authentication**
- **Problem**: Image pull errors (`ImagePullBackOff`)
- **Solution**: Ensure GitLab token has `read_registry` permissions
- **Fix**: Recreate secret with correct credentials

### 3. **Missing ClusterIssuer**
- **Problem**: TLS certificate not issued
- **Solution**: Verify ClusterIssuer exists: `kubectl get clusterissuer`
- **Fix**: Update `cert-manager.io/cluster-issuer` annotation in ingress

### 4. **Incorrect DNS Configuration**
- **Problem**: Domain doesn't resolve to cluster
- **Solution**: Point `voice.madhu.in` to your cluster's external IP
- **Fix**: Use `kubectl get ingress -n voice-agent` to get external IP

### 5. **Resource Limits Too Low**
- **Problem**: Pods get OOMKilled or CPU throttled
- **Solution**: Monitor resource usage and adjust limits
- **Fix**: Update `resources` in deployment

### 6. **Missing Health Checks**
- **Problem**: Unhealthy pods not restarted
- **Solution**: Ensure health endpoint returns 200 OK
- **Fix**: Check health probe configuration

### 7. **WebSocket Issues**
- **Problem**: Voice/WebSocket connections fail
- **Solution**: Verify ingress annotations for WebSocket support
- **Fix**: Check `nginx.ingress.kubernetes.io/proxy-*` annotations

### 8. **Security Misconfigurations**
- **Problem**: Running as root or with excessive permissions
- **Solution**: Use non-root user and minimal capabilities
- **Fix**: Review security context in deployment

## 🔄 Scaling

### Manual Scaling
```bash
# Scale to 3 replicas
kubectl scale deployment voice-agent --replicas=3 -n voice-agent

# Scale back to 2
kubectl scale deployment voice-agent --replicas=2 -n voice-agent
```

### Auto Scaling
The HPA is configured to automatically scale between 2-10 replicas based on:
- CPU utilization > 70%
- Memory utilization > 80%

### Scaling Storage
```bash
# Expand PVC (if storage class supports it)
kubectl patch pvc voice-agent-pvc -n voice-agent -p '{"spec":{"resources":{"requests":{"storage":"30Gi"}}}}'
```

## 🛠️ Troubleshooting

### Common Issues

1. **Pod Stuck in ImagePullBackOff**
   ```bash
   kubectl describe pod <pod-name> -n voice-agent
   kubectl get secret gitlab-registry-secret -n voice-agent -o yaml
   ```

2. **PVC Pending**
   ```bash
   kubectl get pvc -n voice-agent
   kubectl get storageclass
   kubectl describe pvc voice-agent-pvc -n voice-agent
   ```

3. **Ingress Not Working**
   ```bash
   kubectl get ingress -n voice-agent
   kubectl describe ingress voice-agent-ingress -n voice-agent
   kubectl logs -n ingress-nginx <ingress-controller-pod>
   ```

4. **Certificate Issues**
   ```bash
   kubectl get certificate -n voice-agent
   kubectl describe certificate voice-agent-tls -n voice-agent
   kubectl logs -n cert-manager <cert-manager-pod>
   ```

### Cleanup

```bash
# Delete all resources
kubectl delete -f .

# Or delete namespace (removes everything)
kubectl delete namespace voice-agent
```

## 📝 Notes

- The application runs as non-root user (UID 1000)
- Root filesystem is read-mounted for security
- Health checks ensure application availability
- TLS is automatically managed by Cert-Manager
- Monitoring is configured for Prometheus
- Autoscaling ensures optimal resource usage
