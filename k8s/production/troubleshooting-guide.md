# ASI Chain Production Troubleshooting Guide

## Quick Diagnostic Commands

### Check Overall Status
```bash
# Check all pods in namespace
kubectl get pods -n asi-chain

# Check services
kubectl get svc -n asi-chain

# Check ingress
kubectl get ingress -n asi-chain

# Check persistent volumes
kubectl get pv,pvc -n asi-chain

# Check events
kubectl get events -n asi-chain --sort-by='.lastTimestamp'
```

### Resource Usage
```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n asi-chain

# Check cluster resources
kubectl describe nodes
```

## Common Issues and Solutions

### 1. Pods Stuck in Pending State

**Symptoms:**
- Pods show `Pending` status
- Events show `FailedScheduling`

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n asi-chain
kubectl get events -n asi-chain | grep <pod-name>
```

**Common Causes & Solutions:**

#### Insufficient Resources
```bash
# Check node capacity
kubectl describe nodes

# Solution: Scale down other services or add nodes
kubectl scale deployment <service> --replicas=1 -n asi-chain
```

#### Storage Issues
```bash
# Check PV/PVC status
kubectl get pv,pvc -n asi-chain

# Check StorageClass
kubectl get storageclass

# Solution: Ensure gp3 storage class exists
kubectl get storageclass gp3
```

#### Node Affinity Issues
```bash
# Check node labels
kubectl get nodes --show-labels

# Solution: Add required labels to nodes
kubectl label nodes <node-name> NodeType=validator
```

### 2. Database Connection Issues

**Symptoms:**
- Services can't connect to PostgreSQL
- Connection refused errors

**Diagnosis:**
```bash
# Check PostgreSQL pod
kubectl logs statefulset/postgres -n asi-chain

# Test connectivity from indexer
kubectl exec -it deployment/indexer -n asi-chain -- psql $DATABASE_URL -c "SELECT 1;"

# Check service DNS
kubectl exec -it deployment/indexer -n asi-chain -- nslookup postgres.asi-chain.svc.cluster.local
```

**Solutions:**
```bash
# Restart PostgreSQL
kubectl rollout restart statefulset/postgres -n asi-chain

# Check database credentials
kubectl get secret database-credentials -n asi-chain -o yaml

# Reset database password
kubectl delete secret database-credentials -n asi-chain
kubectl apply -f infrastructure.yaml
```

### 3. Validator Node Issues

**Symptoms:**
- Validators not syncing
- Missing blocks
- High latency

**Diagnosis:**
```bash
# Check validator logs
kubectl logs statefulset/validator-1 -n asi-chain

# Check validator metrics
kubectl port-forward svc/validator-1 9090:9090 -n asi-chain
curl http://localhost:9090/metrics

# Check peer connections
kubectl exec validator-1-0 -n asi-chain -- geth attach --exec "admin.peers"
```

**Solutions:**
```bash
# Restart specific validator
kubectl rollout restart statefulset/validator-1 -n asi-chain

# Check genesis configuration
kubectl get configmap validator-config -n asi-chain -o yaml

# Reset validator data (last resort)
kubectl delete pvc data-validator-1-0 -n asi-chain
kubectl delete pod validator-1-0 -n asi-chain
```

### 4. Service Mesh/Networking Issues

**Symptoms:**
- Services can't reach each other
- Ingress not working
- SSL/TLS issues

**Diagnosis:**
```bash
# Test internal connectivity
kubectl exec -it deployment/indexer -n asi-chain -- curl postgres:5432

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check certificates
kubectl get certificates -n asi-chain

# Check ingress events
kubectl describe ingress asi-chain-ingress -n asi-chain
```

**Solutions:**
```bash
# Restart ingress controller
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx

# Delete and recreate certificates
kubectl delete certificate asi-chain-tls -n asi-chain
kubectl apply -f ingress.yaml

# Check DNS resolution
kubectl exec -it deployment/indexer -n asi-chain -- nslookup api.testnet.asi-chain.io
```

### 5. High Resource Usage

**Symptoms:**
- Pods getting OOMKilled
- High CPU usage
- Slow response times

**Diagnosis:**
```bash
# Check resource usage
kubectl top pods -n asi-chain

# Check resource limits
kubectl describe pod <pod-name> -n asi-chain

# Check node pressure
kubectl describe nodes | grep -A5 Conditions
```

**Solutions:**
```bash
# Increase resource limits
kubectl patch deployment <deployment> -n asi-chain -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container>","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

# Scale horizontally
kubectl scale deployment <deployment> --replicas=5 -n asi-chain

# Add more nodes to cluster
```

### 6. Monitoring Issues

**Symptoms:**
- Prometheus not scraping metrics
- Grafana dashboards empty
- Alerts not firing

**Diagnosis:**
```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus 9090:9090 -n asi-chain
# Visit http://localhost:9090/targets

# Check Prometheus logs
kubectl logs deployment/prometheus -n asi-chain

# Check service monitor configuration
kubectl get servicemonitor -n asi-chain
```

**Solutions:**
```bash
# Restart monitoring stack
kubectl rollout restart deployment/prometheus -n asi-chain
kubectl rollout restart deployment/grafana -n asi-chain

# Check service annotations
kubectl get pods -n asi-chain -o yaml | grep prometheus.io

# Verify RBAC permissions
kubectl get clusterrolebinding prometheus
```

## Emergency Procedures

### Complete Service Restart
```bash
# Restart all services (preserve data)
kubectl rollout restart deployment/explorer -n asi-chain
kubectl rollout restart deployment/wallet -n asi-chain
kubectl rollout restart deployment/indexer -n asi-chain
kubectl rollout restart deployment/faucet -n asi-chain
kubectl rollout restart statefulset/validator-1 -n asi-chain
kubectl rollout restart statefulset/validator-2 -n asi-chain
```

### Scale Down Non-Critical Services
```bash
# In case of resource pressure
kubectl scale deployment/explorer --replicas=1 -n asi-chain
kubectl scale deployment/wallet --replicas=1 -n asi-chain
kubectl scale deployment/faucet --replicas=1 -n asi-chain
```

### Emergency Validator Recovery
```bash
# If validators are corrupted
kubectl delete statefulset/validator-1 -n asi-chain --cascade=false
kubectl delete statefulset/validator-2 -n asi-chain --cascade=false

# Delete PVCs (WARNING: This deletes blockchain data)
kubectl delete pvc data-validator-1-0 -n asi-chain
kubectl delete pvc data-validator-2-0 -n asi-chain

# Redeploy validators
kubectl apply -f validators.yaml
```

## Performance Optimization

### Database Optimization
```bash
# Check database performance
kubectl exec -it statefulset/postgres -n asi-chain -- psql -U asichain -d asichain -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname='public';"

# Vacuum and analyze
kubectl exec -it statefulset/postgres -n asi-chain -- psql -U asichain -d asichain -c "VACUUM ANALYZE;"
```

### Indexer Optimization
```bash
# Check indexing status
kubectl logs deployment/indexer -n asi-chain | grep "Block processed"

# Adjust batch size
kubectl patch deployment indexer -n asi-chain -p '{"spec":{"template":{"spec":{"containers":[{"name":"indexer","env":[{"name":"BATCH_SIZE","value":"50"}]}]}}}}'
```

### Cache Optimization
```bash
# Check Redis memory usage
kubectl exec -it deployment/redis -n asi-chain -- redis-cli info memory

# Clear cache if needed
kubectl exec -it deployment/redis -n asi-chain -- redis-cli flushdb
```

## Log Analysis

### Centralized Logging
```bash
# Get logs from all services
kubectl logs -l app=validator -n asi-chain --tail=100
kubectl logs -l app=indexer -n asi-chain --tail=100
kubectl logs -l app=explorer -n asi-chain --tail=100

# Follow logs in real-time
kubectl logs -f deployment/indexer -n asi-chain
```

### Error Pattern Detection
```bash
# Search for errors
kubectl logs deployment/indexer -n asi-chain | grep -i error

# Search for specific patterns
kubectl logs deployment/explorer -n asi-chain | grep "failed to connect"

# Export logs for analysis
kubectl logs deployment/indexer -n asi-chain > indexer.log
```

## Security Incident Response

### Suspicious Activity Detection
```bash
# Check for unusual pod activity
kubectl get events -n asi-chain | grep -i "failed\|error\|warning"

# Check resource usage spikes
kubectl top pods -n asi-chain --sort-by=cpu
kubectl top pods -n asi-chain --sort-by=memory

# Check network connections
kubectl exec -it deployment/indexer -n asi-chain -- netstat -tulpn
```

### Immediate Security Actions
```bash
# Isolate affected pods
kubectl label pod <pod-name> -n asi-chain quarantine=true

# Scale down affected services
kubectl scale deployment <compromised-service> --replicas=0 -n asi-chain

# Check secrets
kubectl get secrets -n asi-chain
kubectl describe secret <secret-name> -n asi-chain
```

## Recovery Procedures

### From Backup
```bash
# Stop all services
kubectl scale deployment/indexer --replicas=0 -n asi-chain
kubectl scale deployment/explorer --replicas=0 -n asi-chain

# Restore database from backup
kubectl exec -it statefulset/postgres -n asi-chain -- pg_restore -U asichain -d asichain /backup/database.sql

# Restart services
kubectl scale deployment/indexer --replicas=2 -n asi-chain
kubectl scale deployment/explorer --replicas=3 -n asi-chain
```

### State Reconstruction
```bash
# If indexer state is corrupted
kubectl exec -it deployment/indexer -n asi-chain -- python -c "
import os
from src.indexer import reindex_from_block
reindex_from_block(0)  # Reindex from genesis
"
```

## Monitoring and Alerting

### Key Metrics to Monitor
- Pod CPU/Memory usage
- Database connections
- Blockchain sync status
- Transaction throughput
- API response times

### Alert Thresholds
- Pod restart > 5 times in 10 minutes
- Memory usage > 90%
- Database connections > 80% of max
- API latency > 5 seconds
- Validator out of sync > 10 minutes

### Health Check Endpoints
- Explorer: `http://pod-ip:3000/health`
- Wallet: `http://pod-ip:3000/health`
- Indexer: `http://pod-ip:4000/health`
- Faucet: `http://pod-ip:3000/health`
- Validators: `http://pod-ip:8545` (RPC check)

## Contact Information

### Escalation Path
1. **Level 1**: DevOps Engineer
2. **Level 2**: Platform Engineer
3. **Level 3**: Senior Engineering Manager
4. **Critical**: CTO/Engineering Director

### Communication Channels
- **Slack**: #asi-chain-alerts
- **PagerDuty**: ASI Chain Production
- **Email**: oncall@asi-chain.io
- **Phone**: Emergency hotline (24/7)

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [ASI Chain Architecture](../docs/ARCHITECTURE_OVERVIEW.MD)
- [Runbook](../docs/operations/RUNBOOK.MD)