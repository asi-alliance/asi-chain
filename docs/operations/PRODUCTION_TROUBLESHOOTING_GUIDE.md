# ASI Chain Production Troubleshooting Guide

**Document Version**: 2.0  
**Last Updated**: August 14, 2025  
**Classification**: Operations Manual  

## Table of Contents

1. [Emergency Response](#emergency-response)
2. [Infrastructure Issues](#infrastructure-issues)
3. [Kubernetes Problems](#kubernetes-problems)
4. [Node & Consensus Issues](#node--consensus-issues)
5. [Network & Connectivity](#network--connectivity)
6. [Performance & Resource Issues](#performance--resource-issues)
7. [Security Incidents](#security-incidents)
8. [Monitoring & Alerting Issues](#monitoring--alerting-issues)
9. [Database & Storage Problems](#database--storage-problems)
10. [Application-Specific Issues](#application-specific-issues)
11. [Disaster Recovery Scenarios](#disaster-recovery-scenarios)
12. [Diagnostic Tools & Scripts](#diagnostic-tools--scripts)

---

## Emergency Response

### 🚨 Critical Incident Response (P1)

**Activation Criteria:**
- Complete network failure (>90% nodes down)
- Data corruption/loss
- Security breach confirmed
- RTO/RPO objectives at risk

**Immediate Actions (First 5 minutes):**

```bash
#!/bin/bash
# emergency-response.sh - Execute immediately for P1 incidents

echo "=== EMERGENCY RESPONSE ACTIVATED ==="
echo "Timestamp: $(date -u)"
echo "Response Team: Production Operations"

# 1. Capture current state
kubectl get pods -A --output=wide > /tmp/pods-emergency-$(date +%s).log
kubectl get nodes -o wide > /tmp/nodes-emergency-$(date +%s).log
kubectl get events --sort-by='.lastTimestamp' > /tmp/events-emergency-$(date +%s).log

# 2. Check cluster health
kubectl cluster-info
kubectl get componentstatuses

# 3. Immediate triage
echo "=== TRIAGE SUMMARY ==="
kubectl get pods -A | grep -E "Error|CrashLoopBackOff|Pending"
kubectl top nodes
kubectl top pods -A --sort-by=cpu

# 4. Alert escalation
if [ -n "$EMERGENCY_WEBHOOK" ]; then
    curl -X POST "$EMERGENCY_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d '{"text": "🚨 P1 INCIDENT: ASI Chain production emergency response activated", "channel": "#ops-emergency"}'
fi

echo "=== EMERGENCY ASSESSMENT COMPLETE ==="
echo "Next: Execute appropriate recovery procedure"
```

**Emergency Contact Cascade:**

| Escalation Level | Time | Contact | Method |
|-----------------|------|---------|--------|
| L1 - On-Call Engineer | 0-5 min | [PagerDuty] | Automated alert |
| L2 - DevOps Lead | 5-15 min | [Slack/Phone] | Manual escalation |
| L3 - CTO/Engineering VP | 15-30 min | [Phone] | If no progress |
| L4 - Executive Team | 30+ min | [All channels] | If business impact |

### 🔥 Emergency Recovery Procedures

#### Complete Cluster Failure

```bash
#!/bin/bash
# cluster-emergency-recovery.sh

echo "WARNING: This will attempt emergency cluster recovery"
read -p "Confirm emergency recovery (type 'EMERGENCY'): " confirm

if [ "$confirm" != "EMERGENCY" ]; then
    echo "Emergency recovery cancelled"
    exit 1
fi

# 1. Regional failover if multi-region
./region-failover-procedure.sh --emergency

# 2. If single region, attempt cluster restart
eksctl get cluster --region us-east-1
kubectl config current-context

# 3. Force node replacement
kubectl get nodes | grep NotReady | awk '{print $1}' | while read node; do
    kubectl delete node $node --force --grace-period=0
done

# 4. Scale up replacement nodes
kubectl scale deployment asi-wallet --replicas=6
kubectl scale deployment asi-validator --replicas=4

# 5. Monitor recovery
watch "kubectl get pods -A | grep -v Running"
```

#### Network Partition Recovery

```bash
#!/bin/bash
# network-partition-recovery.sh

# Detect partition
PARTITION_NODES=$(kubectl get nodes | grep NotReady | wc -l)
TOTAL_NODES=$(kubectl get nodes | wc -l)
PARTITION_PERCENT=$((PARTITION_NODES * 100 / TOTAL_NODES))

echo "Network partition detected: $PARTITION_PERCENT% nodes affected"

if [ $PARTITION_PERCENT -gt 50 ]; then
    echo "CRITICAL: Majority partition detected"
    # Force quorum reset
    kubectl patch configmap asi-consensus-config -p '{"data":{"force_quorum":"true"}}'
fi

# Restart networking components
kubectl rollout restart daemonset/aws-node -n kube-system
kubectl rollout restart daemonset/kube-proxy -n kube-system

# Monitor partition healing
watch "kubectl get nodes | grep -E 'Ready|NotReady'"
```

---

## Infrastructure Issues

### AWS EKS Cluster Problems

#### EKS Control Plane Issues

**Problem:** EKS API server unresponsive or degraded

**Symptoms:**
- `kubectl` commands timeout
- "Unable to connect to the server" errors
- High API server latency

**Diagnosis:**
```bash
# Check EKS cluster status
aws eks describe-cluster --name asi-production --region us-east-1

# Check API server metrics
kubectl get --raw /metrics | grep apiserver_request_duration

# Test API responsiveness
time kubectl get nodes
```

**Solutions:**

1. **API Server Throttling:**
```bash
# Check rate limiting
kubectl get events | grep "rate limit"

# Reduce API calls
export KUBECTL_TIMEOUT=30s
kubectl config set-context --current --cluster-timeout=30s
```

2. **Control Plane Scaling:**
```bash
# EKS automatically scales control plane, but check:
aws eks describe-cluster --name asi-production | jq '.cluster.status'

# If issues persist, contact AWS support
aws support create-case --service-code "amazon-eks" \
    --severity-code "urgent" \
    --category-code "performance"
```

#### Worker Node Issues

**Problem:** Nodes joining as NotReady or failing to schedule pods

**Diagnosis:**
```bash
# Check node status
kubectl get nodes -o wide
kubectl describe nodes | grep -A 20 "Conditions:"

# Check node resource usage
kubectl top nodes
kubectl describe node <node-name> | grep -A 10 "Allocated resources"

# Check AWS instance health
aws ec2 describe-instances \
    --filters "Name=tag:kubernetes.io/cluster/asi-production,Values=owned" \
    --query 'Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]'
```

**Solutions:**

1. **Node Resource Exhaustion:**
```bash
# Scale node groups
aws eks update-nodegroup-config \
    --cluster-name asi-production \
    --nodegroup-name asi-validators \
    --scaling-config minSize=3,maxSize=10,desiredSize=5

# Clean up unused resources
kubectl delete pods --field-selector=status.phase==Succeeded
kubectl delete pods --field-selector=status.phase==Failed
```

2. **Node Configuration Issues:**
```bash
# Update launch template
aws ec2 create-launch-template-version \
    --launch-template-id lt-asi-production \
    --version-description "Updated instance type" \
    --launch-template-data '{"InstanceType":"m5.2xlarge"}'

# Rolling update nodegroup
aws eks update-nodegroup-version \
    --cluster-name asi-production \
    --nodegroup-name asi-validators
```

### Load Balancer Problems

**Problem:** ALB returning 502/503 errors or traffic not routing

**Diagnosis:**
```bash
# Check ALB target health
aws elbv2 describe-target-health \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/asi-api/xxx

# Check ingress configuration
kubectl get ingress asi-api-ingress -o yaml
kubectl describe ingress asi-api-ingress

# Test backend connectivity
kubectl port-forward service/asi-api 8080:80
curl -v http://localhost:8080/health
```

**Solutions:**

1. **Target Group Health Issues:**
```bash
# Check backend pod health
kubectl get pods -l app=asi-api -o wide
kubectl exec -it <pod-name> -- curl http://localhost:8080/health

# Update health check configuration
aws elbv2 modify-target-group \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/asi-api/xxx \
    --health-check-path "/health" \
    --health-check-interval-seconds 15
```

2. **ALB Configuration Issues:**
```bash
# Update ALB annotations
kubectl annotate ingress asi-api-ingress \
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds=10 \
    alb.ingress.kubernetes.io/healthy-threshold-count=2
```

### RDS Database Issues

**Problem:** Database connection failures or performance degradation

**Diagnosis:**
```bash
# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier asi-production-db

# Monitor database performance
aws logs tail /aws/rds/instance/asi-production-db/postgresql --follow

# Test connectivity from cluster
kubectl run db-test --image=postgres:13 --rm -it -- \
    psql -h asi-production-db.cluster-xxx.us-east-1.rds.amazonaws.com -U asiuser -d asichain
```

**Solutions:**

1. **Connection Pool Exhaustion:**
```python
# connection-pool-monitor.py
import psycopg2
import time

def check_connections():
    conn = psycopg2.connect(
        host="asi-production-db.cluster-xxx.us-east-1.rds.amazonaws.com",
        database="asichain",
        user="asiuser",
        password="secure_password"
    )
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT count(*), state 
        FROM pg_stat_activity 
        WHERE datname = 'asichain' 
        GROUP BY state
    """)
    
    results = cursor.fetchall()
    for count, state in results:
        print(f"Connections in {state}: {count}")
    
    conn.close()

if __name__ == "__main__":
    while True:
        check_connections()
        time.sleep(30)
```

```bash
# Scale connection limits
aws rds modify-db-parameter-group \
    --db-parameter-group-name asi-production-params \
    --parameters "ParameterName=max_connections,ParameterValue=500,ApplyMethod=immediate"
```

2. **Performance Issues:**
```bash
# Check database metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name CPUUtilization \
    --dimensions Name=DBInstanceIdentifier,Value=asi-production-db \
    --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Average

# Enable performance insights
aws rds modify-db-instance \
    --db-instance-identifier asi-production-db \
    --enable-performance-insights \
    --performance-insights-retention-period 7
```

---

## Kubernetes Problems

### Pod Issues

#### CrashLoopBackOff

**Problem:** Pods repeatedly crashing and restarting

**Diagnosis:**
```bash
# Check pod status and events
kubectl get pods -A | grep -E "CrashLoopBackOff|Error"
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous

# Check resource constraints
kubectl top pod <pod-name> -n <namespace>
kubectl get events --sort-by='.lastTimestamp' | grep <pod-name>
```

**Solutions:**

1. **Application Configuration Issues:**
```bash
# Check environment variables and config maps
kubectl get configmap asi-config -o yaml
kubectl get secret asi-secrets -o yaml

# Validate configuration
kubectl exec -it <pod-name> -- printenv | grep ASI_
```

2. **Resource Constraints:**
```yaml
# Update resource limits in deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-wallet
spec:
  template:
    spec:
      containers:
      - name: asi-wallet
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

3. **Dependency Issues:**
```bash
# Check service dependencies
kubectl get services
kubectl get endpoints

# Test service connectivity
kubectl run netshoot --image=nicolaka/netshoot --rm -it -- nslookup asi-database
```

#### ImagePullBackOff

**Problem:** Unable to pull container images

**Diagnosis:**
```bash
# Check image pull events
kubectl describe pod <pod-name> | grep -A 10 "Events:"

# Verify image exists
docker pull f1r3flyindustries/asi-wallet:v2.0.0

# Check image pull secrets
kubectl get secrets | grep regcred
kubectl describe secret regcred
```

**Solutions:**

1. **Registry Authentication:**
```bash
# Update image pull secret
kubectl create secret docker-registry regcred \
    --docker-server=your-registry-server \
    --docker-username=your-name \
    --docker-password=your-password \
    --docker-email=your-email

# Update deployment to use secret
kubectl patch deployment asi-wallet -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"regcred"}]}}}}'
```

2. **Network Connectivity Issues:**
```bash
# Test registry connectivity from node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot
# Inside debug container:
nslookup your-registry-server
curl -I https://your-registry-server/v2/
```

### Service Issues

#### Service Discovery Problems

**Problem:** Services not discovering each other or external connectivity failing

**Diagnosis:**
```bash
# Check service configuration
kubectl get services -A
kubectl describe service asi-api

# Test DNS resolution
kubectl run test-dns --image=busybox --rm -it -- nslookup asi-database.default.svc.cluster.local

# Check endpoints
kubectl get endpoints asi-api
kubectl describe endpoints asi-api
```

**Solutions:**

1. **DNS Configuration:**
```bash
# Check CoreDNS status
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system deployment/coredns

# Restart CoreDNS
kubectl rollout restart deployment/coredns -n kube-system
```

2. **Service Selector Issues:**
```bash
# Verify label selectors
kubectl get pods --show-labels | grep asi-api
kubectl get service asi-api -o yaml | grep selector -A 5

# Fix selector mismatch
kubectl label pods <pod-name> app=asi-api --overwrite
```

### Network Policy Issues

**Problem:** Network policies blocking legitimate traffic

**Diagnosis:**
```bash
# Check network policies
kubectl get networkpolicies -A
kubectl describe networkpolicy asi-network-policy

# Test connectivity
kubectl run test-connectivity --image=nicolaka/netshoot --rm -it -- ping asi-database
```

**Solutions:**

1. **Policy Configuration:**
```yaml
# Allow necessary traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: asi-allow-api-to-db
spec:
  podSelector:
    matchLabels:
      app: asi-database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: asi-api
    ports:
    - protocol: TCP
      port: 5432
```

### Storage Issues

#### Persistent Volume Problems

**Problem:** PVs not binding or storage performance issues

**Diagnosis:**
```bash
# Check PV/PVC status
kubectl get pv,pvc -A
kubectl describe pvc asi-data-claim

# Check storage class
kubectl get storageclass
kubectl describe storageclass gp3
```

**Solutions:**

1. **Volume Binding Issues:**
```bash
# Check provisioner logs
kubectl logs -n kube-system deployment/aws-ebs-csi-driver

# Force PV binding
kubectl patch pvc asi-data-claim -p '{"metadata":{"finalizers":null}}'
```

2. **Performance Issues:**
```bash
# Upgrade to higher performance storage
kubectl patch storageclass gp3 -p '{"parameters":{"iops":"3000","throughput":"250"}}'
```

---

## Node & Consensus Issues

### Block Production Problems

#### No Blocks Being Produced

**Problem:** AutoPropose not creating blocks or validators not participating

**Symptoms:**
- No new blocks for >60 seconds
- Validator logs show "waiting for proposal"
- Network appears stalled

**Diagnosis:**
```bash
# Check block production
kubectl logs deployment/asi-autopropose | grep "proposed block"
kubectl exec -it <validator-pod> -- curl http://localhost:40403/status

# Monitor consensus health
kubectl exec -it <bootstrap-pod> -- \
    curl -s http://localhost:40403/api/status | jq '.lastFinalizedBlockNumber'

# Check validator synchronization
for pod in $(kubectl get pods -l app=asi-validator -o name); do
    echo "=== $pod ==="
    kubectl exec -it $pod -- curl -s http://localhost:40403/api/status | jq '.version'
done
```

**Solutions:**

1. **AutoPropose Configuration:**
```bash
# Check AutoPropose settings
kubectl get configmap autopropose-config -o yaml

# Restart AutoPropose
kubectl rollout restart deployment/asi-autopropose
kubectl logs deployment/asi-autopropose -f
```

2. **Validator Synchronization:**
```bash
# Force validator restart
kubectl delete pods -l app=asi-validator
kubectl wait --for=condition=ready pod -l app=asi-validator --timeout=300s

# Check consensus participation
kubectl exec -it <validator-pod> -- \
    curl -s http://localhost:40403/api/validators | jq '.validators[].stake'
```

#### Genesis Ceremony Failure

**Problem:** Network failed to complete genesis ceremony

**Symptoms:**
- Validators stuck in "Waiting for approval" state
- No transition to "Running" state after 10 minutes

**Diagnosis:**
```bash
# Check genesis progress
kubectl logs deployment/asi-bootstrap | grep -E "approval|ceremony|genesis"

# Verify validator connections
for pod in $(kubectl get pods -l app=asi-validator -o name); do
    kubectl logs $pod | grep "connected to bootstrap"
done
```

**Solutions:**

1. **Reset Genesis State:**
```bash
# Stop all nodes
kubectl scale deployment asi-bootstrap --replicas=0
kubectl scale deployment asi-validator --replicas=0
kubectl scale deployment asi-autopropose --replicas=0

# Clear blockchain data
kubectl delete pvc -l app=asi-blockchain

# Restart genesis
kubectl scale deployment asi-bootstrap --replicas=1
sleep 60
kubectl scale deployment asi-validator --replicas=4
sleep 60
kubectl scale deployment asi-autopropose --replicas=1
```

2. **Check Validator Keys:**
```bash
# Verify validator keys in secrets
kubectl get secret asi-validator-keys -o yaml | base64 -d

# Regenerate if corrupted
kubectl delete secret asi-validator-keys
kubectl create secret generic asi-validator-keys \
    --from-file=validator1.key=./keys/validator1.key \
    --from-file=validator2.key=./keys/validator2.key
```

### RSpace Storage Issues

#### LMDB Environment Problems

**Problem:** "LMDB environment mapsize reached" or lock issues

**Symptoms:**
- RSpace operations failing
- "Resource temporarily unavailable" errors
- Node crashes with LMDB errors

**Diagnosis:**
```bash
# Check RSpace storage usage
kubectl exec -it <node-pod> -- du -sh /var/lib/rnode/rspace/

# Check LMDB configuration
kubectl exec -it <node-pod> -- grep -r "LMDB_MAP_SIZE" /var/lib/rnode/
```

**Solutions:**

1. **Increase LMDB Map Size:**
```yaml
# Update deployment environment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-validator
spec:
  template:
    spec:
      containers:
      - name: validator
        env:
        - name: LMDB_MAP_SIZE
          value: "21474836480"  # 20GB
```

2. **Clear LMDB Locks:**
```bash
# Remove stale locks
kubectl exec -it <node-pod> -- rm -f /var/lib/rnode/rspace/lock.mdb

# Restart node
kubectl delete pod <node-pod>
```

### Peer Discovery Issues

**Problem:** Nodes not discovering or connecting to peers

**Symptoms:**
- Peer count remains at 0
- "No peers available" in logs
- Network fragmentation

**Diagnosis:**
```bash
# Check peer connectivity
kubectl exec -it <bootstrap-pod> -- \
    curl -s http://localhost:40403/api/status | jq '.peers'

# Test inter-pod connectivity
kubectl exec -it <validator1-pod> -- \
    nc -zv asi-bootstrap 40400

# Check service discovery
kubectl get services | grep asi-bootstrap
kubectl get endpoints asi-bootstrap
```

**Solutions:**

1. **Service Configuration:**
```bash
# Verify bootstrap service
kubectl describe service asi-bootstrap

# Check if ports are properly exposed
kubectl get service asi-bootstrap -o yaml | grep -A 10 ports
```

2. **Network Connectivity:**
```bash
# Test pod-to-pod communication
kubectl run network-test --image=nicolaka/netshoot --rm -it -- \
    telnet asi-bootstrap.default.svc.cluster.local 40400

# Check network policies
kubectl get networkpolicies | grep asi
```

---

## Network & Connectivity

### External API Access Issues

#### Load Balancer Not Responding

**Problem:** External clients cannot reach ASI Chain APIs

**Symptoms:**
- 502/503 errors from load balancer
- Connection timeouts
- DNS resolution failures

**Diagnosis:**
```bash
# Check ALB status
aws elbv2 describe-load-balancers \
    --names asi-production-alb \
    --query 'LoadBalancers[0].State'

# Test external connectivity
curl -v https://api.asichain.io/status
dig api.asichain.io

# Check target group health
aws elbv2 describe-target-health \
    --target-group-arn $(kubectl get targetgroupbinding -o jsonpath='{.items[0].status.targetGroupARN}')
```

**Solutions:**

1. **ALB Configuration:**
```bash
# Check ingress configuration
kubectl get ingress asi-api-ingress -o yaml

# Update health check settings
kubectl annotate ingress asi-api-ingress \
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds=10 \
    alb.ingress.kubernetes.io/healthy-threshold-count=2 \
    --overwrite
```

2. **DNS Configuration:**
```bash
# Update Route 53 record
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch file://dns-update.json
```

#### Certificate Issues

**Problem:** SSL/TLS certificate problems causing HTTPS failures

**Diagnosis:**
```bash
# Check certificate status
kubectl get certificate -A
kubectl describe certificate asi-api-cert

# Test certificate validation
openssl s_client -connect api.asichain.io:443 -servername api.asichain.io
```

**Solutions:**

1. **Certificate Renewal:**
```bash
# Force certificate renewal
kubectl delete certificate asi-api-cert
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: asi-api-cert
spec:
  secretName: asi-api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.asichain.io
EOF
```

### Internal Service Communication

#### Service Mesh Issues

**Problem:** Inter-service communication failures within cluster

**Diagnosis:**
```bash
# Check service mesh status (if using Istio)
kubectl get pods -n istio-system
kubectl get virtualservices -A
kubectl get destinationrules -A

# Test service-to-service communication
kubectl exec -it <source-pod> -- \
    curl -v http://asi-database.default.svc.cluster.local:5432
```

**Solutions:**

1. **Service Mesh Configuration:**
```yaml
# Update VirtualService
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: asi-api
spec:
  hosts:
  - asi-api
  http:
  - route:
    - destination:
        host: asi-api
        port:
          number: 8080
    timeout: 30s
    retries:
      attempts: 3
```

---

## Performance & Resource Issues

### High Memory Usage

#### Memory Leaks in Applications

**Problem:** Pods consuming excessive memory, causing OOM kills

**Symptoms:**
- Pods being killed with exit code 137
- High memory usage in metrics
- Performance degradation

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods --sort-by=memory -A
kubectl describe node | grep -A 5 "Allocated resources"

# Monitor memory trends
kubectl exec -it <pod-name> -- cat /proc/meminfo
kubectl logs <pod-name> | grep -i "out of memory\|oom"
```

**Solutions:**

1. **Increase Memory Limits:**
```yaml
# Update deployment resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-wallet
spec:
  template:
    spec:
      containers:
      - name: wallet
        resources:
          requests:
            memory: "2Gi"
          limits:
            memory: "4Gi"
```

2. **Enable Memory Profiling:**
```bash
# For Java applications, add JVM options
kubectl patch deployment asi-wallet -p '{"spec":{"template":{"spec":{"containers":[{"name":"wallet","env":[{"name":"JAVA_OPTS","value":"-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/"}]}]}}}}'

# For monitoring memory leaks
kubectl exec -it <pod-name> -- jcmd <pid> GC.run_finalization
```

### CPU Bottlenecks

#### High CPU Usage

**Problem:** Pods consuming excessive CPU, causing throttling

**Diagnosis:**
```bash
# Check CPU usage
kubectl top pods --sort-by=cpu -A
kubectl describe node | grep -E "cpu.*%" 

# Monitor CPU throttling
kubectl exec -it <pod-name> -- cat /sys/fs/cgroup/cpu/cpu.stat
```

**Solutions:**

1. **Scale Horizontally:**
```bash
# Update HPA configuration
kubectl autoscale deployment asi-wallet --cpu-percent=70 --min=3 --max=10

# Check current scaling
kubectl get hpa
```

2. **Optimize Application:**
```python
# cpu-optimization.py - Profile CPU usage
import cProfile
import pstats
from asi_wallet import main

def profile_main():
    profiler = cProfile.Profile()
    profiler.enable()
    
    main()
    
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(20)

if __name__ == "__main__":
    profile_main()
```

### Disk I/O Issues

#### Storage Performance Problems

**Problem:** High disk latency affecting application performance

**Diagnosis:**
```bash
# Check disk I/O metrics
kubectl exec -it <pod-name> -- iostat -x 1 5
kubectl top nodes --sort-by=disk

# Check storage class performance
kubectl get storageclass -o yaml | grep -A 10 parameters
```

**Solutions:**

1. **Upgrade Storage Class:**
```yaml
# Use high-performance storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "10000"
  throughput: "1000"
  fsType: ext4
```

2. **Implement Caching:**
```bash
# Add Redis cache layer
helm install redis bitnami/redis \
    --set auth.enabled=true \
    --set auth.password=secure_redis_password \
    --set master.persistence.size=50Gi
```

---

## Security Incidents

### Unauthorized Access Attempts

#### Suspicious API Activity

**Problem:** Unusual patterns in API access logs indicating potential attack

**Symptoms:**
- High rate of 401/403 responses
- Unusual IP addresses in logs
- Abnormal request patterns

**Detection:**
```bash
# Monitor API access patterns
kubectl logs deployment/asi-api | grep -E "401|403" | tail -100

# Check rate limiting metrics
curl -s http://prometheus:9090/api/v1/query?query=rate_limit_exceeded_total | jq '.data.result[].value[1]'

# Analyze IP patterns
kubectl logs deployment/asi-api | awk '{print $1}' | sort | uniq -c | sort -nr
```

**Response:**

1. **Immediate Blocking:**
```bash
# Block suspicious IPs via network policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-suspicious-ips
spec:
  podSelector:
    matchLabels:
      app: asi-api
  policyTypes:
  - Ingress
  ingress:
  - from: []
    except:
    - ipBlock:
        cidr: 192.168.1.100/32  # Suspicious IP
EOF
```

2. **Enhanced Monitoring:**
```python
# security-monitor.py
import requests
import time
import json
from collections import defaultdict

class SecurityMonitor:
    def __init__(self):
        self.ip_counts = defaultdict(int)
        self.threshold = 100  # requests per minute
    
    def analyze_logs(self):
        # Parse application logs
        with open('/var/log/asi-api/access.log', 'r') as f:
            for line in f.readlines()[-1000:]:  # Last 1000 entries
                parts = line.split()
                if len(parts) > 0:
                    ip = parts[0]
                    self.ip_counts[ip] += 1
    
    def detect_anomalies(self):
        for ip, count in self.ip_counts.items():
            if count > self.threshold:
                self.alert_security_team(ip, count)
    
    def alert_security_team(self, ip, count):
        webhook_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
        message = {
            "text": f"🚨 Security Alert: IP {ip} made {count} requests (threshold: {self.threshold})",
            "channel": "#security-alerts"
        }
        requests.post(webhook_url, json=message)

if __name__ == "__main__":
    monitor = SecurityMonitor()
    while True:
        monitor.analyze_logs()
        monitor.detect_anomalies()
        time.sleep(60)
```

### Container Security Issues

#### Malicious Container Activity

**Problem:** Containers exhibiting suspicious behavior or potential compromise

**Detection:**
```bash
# Check for unusual processes
kubectl exec -it <suspicious-pod> -- ps aux | grep -E "crypto|mine|bitcoin"

# Monitor network connections
kubectl exec -it <suspicious-pod> -- netstat -tulpn

# Check for privilege escalation
kubectl get pods <suspicious-pod> -o yaml | grep -A 10 securityContext
```

**Response:**

1. **Immediate Isolation:**
```bash
# Isolate pod immediately
kubectl label pod <suspicious-pod> quarantine=true

# Apply isolation network policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine-policy
spec:
  podSelector:
    matchLabels:
      quarantine: "true"
  policyTypes:
  - Ingress
  - Egress
  ingress: []
  egress: []
EOF
```

2. **Forensic Collection:**
```bash
# Collect forensic data
kubectl cp <suspicious-pod>:/var/log/ ./forensics/pod-logs/
kubectl describe pod <suspicious-pod> > ./forensics/pod-description.yaml
kubectl get events --field-selector involvedObject.name=<suspicious-pod> > ./forensics/pod-events.txt
```

---

## Monitoring & Alerting Issues

### Prometheus Problems

#### Prometheus Server Issues

**Problem:** Prometheus not collecting metrics or running out of storage

**Symptoms:**
- Missing metrics in Grafana dashboards
- Prometheus UI showing errors
- High memory usage by Prometheus

**Diagnosis:**
```bash
# Check Prometheus status
kubectl get pods -n monitoring | grep prometheus
kubectl logs -n monitoring prometheus-server-0

# Check metrics collection
curl http://prometheus:9090/api/v1/targets

# Check storage usage
kubectl exec -n monitoring prometheus-server-0 -- df -h /prometheus/
```

**Solutions:**

1. **Scale Prometheus Storage:**
```bash
# Increase PVC size
kubectl patch pvc prometheus-server -n monitoring -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'

# Wait for storage expansion
kubectl get pvc prometheus-server -n monitoring -w
```

2. **Optimize Retention:**
```bash
# Update Prometheus configuration
kubectl patch configmap prometheus-config -n monitoring -p '{"data":{"prometheus.yml":"global:\n  scrape_interval: 30s\n  evaluation_interval: 30s\n  external_labels:\n    cluster: asi-production\nrule_files:\n  - \"/etc/prometheus/rules/*.yml\"\nscrape_configs:\n  - job_name: kubernetes-pods\n    kubernetes_sd_configs:\n    - role: pod\n    relabel_configs:\n    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]\n      action: keep\n      regex: true\n    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]\n      action: replace\n      target_label: __metrics_path__\n      regex: (.+)\n    metric_relabel_configs:\n    - source_labels: [__name__]\n      regex: '(container_cpu_usage_seconds_total|container_memory_working_set_bytes|asi_wallet_.*|asi_validator_.*)'\n      action: keep"}}'
```

### Grafana Dashboard Issues

**Problem:** Dashboards showing no data or incorrect visualizations

**Diagnosis:**
```bash
# Check Grafana connectivity to Prometheus
kubectl logs -n monitoring deployment/grafana

# Test Prometheus data source
kubectl port-forward -n monitoring service/prometheus 9090:9090
curl "http://localhost:9090/api/v1/query?query=up"
```

**Solutions:**

1. **Update Data Source Configuration:**
```bash
# Check Grafana data source
kubectl exec -n monitoring deployment/grafana -- \
    curl -u admin:admin http://localhost:3000/api/datasources

# Update Prometheus URL if needed
kubectl patch configmap grafana-datasources -n monitoring -p '{"data":{"datasources.yaml":"apiVersion: 1\ndatasources:\n- name: Prometheus\n  type: prometheus\n  access: proxy\n  url: http://prometheus:9090\n  isDefault: true"}}'
```

### AlertManager Configuration

**Problem:** Alerts not firing or being delivered incorrectly

**Diagnosis:**
```bash
# Check AlertManager status
kubectl logs -n monitoring alertmanager-0

# Test alert rules
kubectl exec -n monitoring prometheus-server-0 -- \
    promtool query instant 'up == 0'

# Check webhook delivery
curl -X POST http://alertmanager:9093/api/v1/alerts \
    -H "Content-Type: application/json" \
    -d '[{"labels":{"alertname":"test","severity":"critical"}}]'
```

**Solutions:**

1. **Fix Alert Routing:**
```yaml
# Update AlertManager configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      slack_api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    
    route:
      group_by: ['alertname']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'web.hook'
      routes:
      - match:
          severity: critical
        receiver: 'critical-alerts'
    
    receivers:
    - name: 'web.hook'
      slack_configs:
      - channel: '#alerts'
        title: 'ASI Chain Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    
    - name: 'critical-alerts'
      slack_configs:
      - channel: '#critical-alerts'
        title: 'CRITICAL: ASI Chain Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

## Database & Storage Problems

### PostgreSQL Issues

#### Connection Pool Exhaustion

**Problem:** Database refusing connections due to pool exhaustion

**Symptoms:**
- "Too many connections" errors
- Application timeouts
- Database performance degradation

**Diagnosis:**
```bash
# Check current connections
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Monitor connection patterns
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -c "SELECT pid, usename, application_name, client_addr FROM pg_stat_activity WHERE state = 'active';"
```

**Solutions:**

1. **Scale Connection Limits:**
```bash
# Update PostgreSQL configuration
kubectl patch configmap postgres-config -p '{"data":{"postgresql.conf":"max_connections = 500\nshared_buffers = 256MB\neffective_cache_size = 1GB"}}'

# Restart PostgreSQL
kubectl rollout restart statefulset/postgres-primary
```

2. **Implement Connection Pooling:**
```yaml
# Deploy PgBouncer
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
      - name: pgbouncer
        image: pgbouncer/pgbouncer:latest
        env:
        - name: POOL_MODE
          value: "transaction"
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "25"
        ports:
        - containerPort: 5432
```

#### Database Performance Issues

**Problem:** Slow query performance affecting application response times

**Diagnosis:**
```bash
# Check slow queries
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check database locks
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -c "SELECT blocked_locks.pid AS blocked_pid, blocked_activity.usename AS blocked_user, blocking_locks.pid AS blocking_pid, blocking_activity.usename AS blocking_user, blocked_activity.query AS blocked_statement FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid AND blocking_locks.pid != blocked_locks.pid JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;"
```

**Solutions:**

1. **Query Optimization:**
```sql
-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_wallet_transactions_user_id 
ON wallet_transactions(user_id) 
WHERE status = 'completed';

-- Update table statistics
ANALYZE wallet_transactions;

-- Reindex if needed
REINDEX INDEX CONCURRENTLY idx_wallet_transactions_timestamp;
```

2. **Database Tuning:**
```bash
# Update PostgreSQL configuration for performance
kubectl patch configmap postgres-config -p '{"data":{"postgresql.conf":"# Performance tuning\nshared_buffers = 2GB\neffective_cache_size = 6GB\nwork_mem = 256MB\nmaintenance_work_mem = 1GB\ncheckpoint_completion_target = 0.9\nwal_buffers = 16MB\ndefault_statistics_target = 500\nrandom_page_cost = 1.1\neffective_io_concurrency = 200"}}'
```

### Redis Cache Issues

#### Cache Performance Problems

**Problem:** High cache miss rates or Redis performance degradation

**Diagnosis:**
```bash
# Check Redis stats
kubectl exec -it redis-master-0 -- redis-cli info stats
kubectl exec -it redis-master-0 -- redis-cli info memory

# Monitor hit/miss ratio
kubectl exec -it redis-master-0 -- redis-cli info stats | grep -E "keyspace_hits|keyspace_misses"
```

**Solutions:**

1. **Memory Optimization:**
```bash
# Configure Redis memory policy
kubectl exec -it redis-master-0 -- redis-cli config set maxmemory-policy allkeys-lru
kubectl exec -it redis-master-0 -- redis-cli config set maxmemory 4gb
```

2. **Cache Strategy Optimization:**
```python
# cache-optimization.py
import redis
import json
import time

class OptimizedCache:
    def __init__(self):
        self.redis_client = redis.Redis(host='redis-master', port=6379, db=0)
        self.cache_ttl = {
            'user_profile': 3600,     # 1 hour
            'wallet_balance': 300,    # 5 minutes  
            'transaction_history': 1800,  # 30 minutes
            'market_data': 60         # 1 minute
        }
    
    def get_with_fallback(self, key, fallback_func, cache_type='default'):
        try:
            cached_value = self.redis_client.get(key)
            if cached_value:
                return json.loads(cached_value)
        except redis.RedisError:
            pass
        
        # Cache miss or error, fetch from source
        value = fallback_func()
        
        # Cache the result
        try:
            ttl = self.cache_ttl.get(cache_type, 600)
            self.redis_client.setex(key, ttl, json.dumps(value))
        except redis.RedisError:
            pass  # Continue without caching
        
        return value
    
    def invalidate_pattern(self, pattern):
        """Invalidate all keys matching pattern"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
        except redis.RedisError:
            pass
```

---

## Application-Specific Issues

### ASI Wallet Problems

#### Transaction Processing Failures

**Problem:** Wallet transactions failing to process or taking too long

**Symptoms:**
- Transaction stuck in "pending" state
- Users reporting failed transfers
- High transaction processing latency

**Diagnosis:**
```bash
# Check wallet service logs
kubectl logs deployment/asi-wallet | grep -E "transaction|error"

# Monitor transaction queue
kubectl exec -it deployment/asi-wallet -- \
    curl -s http://localhost:8080/admin/queue-status | jq '.'

# Check database transaction status
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -d asichain -c "SELECT status, count(*) FROM transactions WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status;"
```

**Solutions:**

1. **Scale Transaction Processing:**
```bash
# Increase wallet service replicas
kubectl scale deployment asi-wallet --replicas=6

# Tune transaction processing workers
kubectl set env deployment/asi-wallet MAX_WORKERS=20 QUEUE_WORKERS=10
```

2. **Database Optimization:**
```sql
-- Add index for transaction processing
CREATE INDEX CONCURRENTLY idx_transactions_status_created 
ON transactions(status, created_at) 
WHERE status IN ('pending', 'processing');

-- Optimize transaction lookup
CREATE INDEX CONCURRENTLY idx_transactions_user_status 
ON transactions(user_id, status) 
WHERE status != 'completed';
```

#### API Rate Limiting Issues

**Problem:** Legitimate users hitting rate limits

**Diagnosis:**
```bash
# Check rate limiting metrics
kubectl logs deployment/asi-wallet | grep "rate limit exceeded"

# Monitor API usage patterns
kubectl exec -it deployment/asi-wallet -- \
    curl -s http://localhost:8080/admin/rate-limit-stats | jq '.'
```

**Solutions:**

1. **Adjust Rate Limits:**
```yaml
# Update rate limiting configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: asi-wallet-config
data:
  rate-limits.yaml: |
    rate_limits:
      default:
        requests_per_minute: 1000
        burst_size: 100
      authenticated:
        requests_per_minute: 5000
        burst_size: 500
      premium:
        requests_per_minute: 10000
        burst_size: 1000
```

### Validator Node Issues

#### Stake Management Problems

**Problem:** Validators not properly managing stake or showing incorrect balances

**Diagnosis:**
```bash
# Check validator stake status
kubectl logs deployment/asi-validator | grep -E "stake|bond"

# Query validator information
kubectl exec -it deployment/asi-validator -- \
    curl -s http://localhost:40403/api/validators | jq '.validators[] | {id: .validatorPublicKey, stake: .stake}'
```

**Solutions:**

1. **Stake Reconciliation:**
```bash
# Force stake update
kubectl exec -it deployment/asi-validator -- \
    curl -X POST http://localhost:40403/api/admin/refresh-stake

# Check consensus participation
kubectl logs deployment/asi-validator | grep "participating in consensus"
```

---

## Disaster Recovery Scenarios

### Regional Failover

#### Primary Region Failure

**Problem:** Complete failure of primary AWS region (us-east-1)

**Response Procedure:**

1. **Immediate Assessment (0-5 minutes):**
```bash
#!/bin/bash
# region-failover-assessment.sh

echo "=== REGIONAL FAILOVER ASSESSMENT ==="
echo "Timestamp: $(date -u)"

# Check primary region status
echo "Primary region (us-east-1) status:"
aws ec2 describe-regions --region us-east-1 2>&1 || echo "PRIMARY REGION UNREACHABLE"

# Check EKS cluster status
aws eks describe-cluster --name asi-production --region us-east-1 2>&1 || echo "EKS CLUSTER UNREACHABLE"

# Verify DR region readiness
echo "DR region (us-west-2) status:"
aws eks describe-cluster --name asi-production-dr --region us-west-2

# Check RDS cross-region replica
aws rds describe-db-instances --region us-west-2 | jq '.DBInstances[] | {id: .DBInstanceIdentifier, status: .DBInstanceStatus}'
```

2. **Activate DR Region (5-15 minutes):**
```bash
#!/bin/bash
# activate-dr-region.sh

echo "=== ACTIVATING DISASTER RECOVERY REGION ==="

# Switch kubectl context to DR region
kubectl config use-context asi-production-dr-context

# Promote RDS read replica to master
aws rds promote-read-replica \
    --db-instance-identifier asi-production-db-replica \
    --region us-west-2

# Scale up DR cluster
kubectl scale deployment asi-wallet --replicas=6
kubectl scale deployment asi-validator --replicas=4
kubectl scale deployment asi-autopropose --replicas=1

# Update DNS to point to DR region
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch file://dr-dns-update.json

echo "DR region activation complete"
```

3. **Validate Failover (15-30 minutes):**
```bash
#!/bin/bash
# validate-dr-failover.sh

echo "=== VALIDATING DR FAILOVER ==="

# Test external API access
curl -v https://api.asichain.io/status || echo "EXTERNAL API FAILED"

# Check block production
kubectl logs deployment/asi-autopropose | tail -10 | grep "proposed block"

# Verify database connectivity
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -c "SELECT version();"

# Test wallet functionality
curl -X POST https://api.asichain.io/wallet/test-transaction \
    -H "Content-Type: application/json" \
    -d '{"test": true}'

echo "DR validation complete"
```

### Data Corruption Recovery

#### Database Corruption

**Problem:** Primary database shows signs of corruption

**Response:**

1. **Immediate Isolation:**
```bash
# Stop all database writes
kubectl scale deployment asi-wallet --replicas=0
kubectl scale deployment asi-api --replicas=0

# Set database to read-only
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -c "ALTER SYSTEM SET default_transaction_read_only = on;"
```

2. **Corruption Assessment:**
```bash
# Check database integrity
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -c "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE schemaname = 'public' ORDER BY tablename;"

# Run database consistency checks
kubectl exec -it postgres-primary-0 -- \
    psql -U postgres -d asichain -c "SELECT * FROM pg_stat_database WHERE datname = 'asichain';"
```

3. **Recovery from Backup:**
```bash
#!/bin/bash
# database-corruption-recovery.sh

# Get latest backup
LATEST_BACKUP=$(aws s3 ls s3://asi-backups/database/ --recursive | sort | tail -n 1 | awk '{print $4}')

# Download backup
aws s3 cp s3://asi-backups/database/$LATEST_BACKUP /tmp/

# Restore database
kubectl exec -i postgres-primary-0 -- \
    psql -U postgres -c "DROP DATABASE IF EXISTS asichain;"
kubectl exec -i postgres-primary-0 -- \
    psql -U postgres -c "CREATE DATABASE asichain;"

# Import backup
zcat /tmp/$LATEST_BACKUP | kubectl exec -i postgres-primary-0 -- \
    psql -U postgres -d asichain

# Restart services
kubectl scale deployment asi-wallet --replicas=3
kubectl scale deployment asi-api --replicas=3
```

---

## Diagnostic Tools & Scripts

### Comprehensive Health Check

```bash
#!/bin/bash
# production-health-check.sh - Complete system health assessment

echo "=== ASI CHAIN PRODUCTION HEALTH CHECK ==="
echo "Timestamp: $(date -u)"
echo "Operator: $(whoami)"
echo ""

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ $1"
        HEALTH_ISSUES=$((HEALTH_ISSUES + 1))
    fi
}

HEALTH_ISSUES=0

# 1. Kubernetes Cluster Health
echo "1. KUBERNETES CLUSTER HEALTH"
kubectl cluster-info > /dev/null 2>&1
check_status "Kubernetes API server accessible"

kubectl get nodes | grep -v NotReady > /dev/null 2>&1
check_status "All nodes ready"

kubectl get pods -A | grep -E "(CrashLoopBackOff|Error|Pending)" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "❌ Some pods in error state"
    kubectl get pods -A | grep -E "(CrashLoopBackOff|Error|Pending)"
    HEALTH_ISSUES=$((HEALTH_ISSUES + 1))
else
    echo "✅ All pods running normally"
fi

# 2. ASI Chain Services
echo ""
echo "2. ASI CHAIN SERVICES"

# Check wallet service
kubectl get deployment asi-wallet -o jsonpath='{.status.readyReplicas}' | grep -q "3"
check_status "ASI Wallet service (3/3 replicas ready)"

# Check validator service
kubectl get deployment asi-validator -o jsonpath='{.status.readyReplicas}' | grep -q "4"
check_status "ASI Validator service (4/4 replicas ready)"

# Check autopropose service
kubectl get deployment asi-autopropose -o jsonpath='{.status.readyReplicas}' | grep -q "1"
check_status "ASI AutoPropose service (1/1 replica ready)"

# 3. External Connectivity
echo ""
echo "3. EXTERNAL CONNECTIVITY"

curl -s --max-time 10 https://api.asichain.io/status > /dev/null 2>&1
check_status "External API endpoint accessible"

# Test DNS resolution
nslookup api.asichain.io > /dev/null 2>&1
check_status "DNS resolution working"

# 4. Database Health
echo ""
echo "4. DATABASE HEALTH"

kubectl exec -it postgres-primary-0 -- pg_isready > /dev/null 2>&1
check_status "PostgreSQL accepting connections"

# Check connection count
CONN_COUNT=$(kubectl exec -it postgres-primary-0 -- psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;")
if [ $CONN_COUNT -lt 100 ]; then
    echo "✅ Database connection count normal ($CONN_COUNT)"
else
    echo "⚠️  High database connection count ($CONN_COUNT)"
fi

# 5. Blockchain Health
echo ""
echo "5. BLOCKCHAIN HEALTH"

# Check recent block production
RECENT_BLOCKS=$(kubectl logs deployment/asi-autopropose --tail=50 | grep "proposed block" | tail -1)
if [ -n "$RECENT_BLOCKS" ]; then
    echo "✅ Recent block production detected"
    echo "   Latest: $RECENT_BLOCKS"
else
    echo "❌ No recent block production found"
    HEALTH_ISSUES=$((HEALTH_ISSUES + 1))
fi

# Check validator consensus participation
VALIDATOR_COUNT=$(kubectl exec -it deployment/asi-validator -- curl -s http://localhost:40403/api/validators 2>/dev/null | jq '.validators | length' 2>/dev/null)
if [ "$VALIDATOR_COUNT" = "4" ]; then
    echo "✅ All validators participating in consensus"
else
    echo "❌ Validator consensus issues (expected 4, found $VALIDATOR_COUNT)"
    HEALTH_ISSUES=$((HEALTH_ISSUES + 1))
fi

# 6. Resource Usage
echo ""
echo "6. RESOURCE USAGE"

# Check node resource usage
kubectl top nodes --no-headers | while read line; do
    NODE=$(echo $line | awk '{print $1}')
    CPU=$(echo $line | awk '{print $2}' | sed 's/%//')
    MEMORY=$(echo $line | awk '{print $4}' | sed 's/%//')
    
    if [ $CPU -lt 80 ] && [ $MEMORY -lt 80 ]; then
        echo "✅ Node $NODE resource usage normal (CPU: ${CPU}%, Memory: ${MEMORY}%)"
    else
        echo "⚠️  Node $NODE high resource usage (CPU: ${CPU}%, Memory: ${MEMORY}%)"
    fi
done

# 7. Monitoring Stack
echo ""
echo "7. MONITORING STACK"

curl -s http://prometheus:9090/-/healthy > /dev/null 2>&1
check_status "Prometheus healthy"

curl -s http://grafana:3000/api/health > /dev/null 2>&1
check_status "Grafana healthy"

# 8. Security Status
echo ""
echo "8. SECURITY STATUS"

# Check for security policy violations
kubectl get networkpolicies > /dev/null 2>&1
check_status "Network policies present"

# Check for privileged containers
PRIVILEGED_PODS=$(kubectl get pods -A -o json | jq -r '.items[] | select(.spec.containers[]?.securityContext?.privileged==true) | .metadata.name' | wc -l)
if [ $PRIVILEGED_PODS -eq 0 ]; then
    echo "✅ No privileged containers detected"
else
    echo "⚠️  Found $PRIVILEGED_PODS privileged containers"
fi

# Summary
echo ""
echo "=== HEALTH CHECK SUMMARY ==="
if [ $HEALTH_ISSUES -eq 0 ]; then
    echo "🎉 OVERALL STATUS: HEALTHY"
    echo "All systems operational"
else
    echo "⚠️  OVERALL STATUS: ISSUES DETECTED"
    echo "Found $HEALTH_ISSUES issue(s) requiring attention"
fi

echo ""
echo "Health check completed at $(date -u)"
exit $HEALTH_ISSUES
```

### Performance Monitoring Script

```python
#!/usr/bin/env python3
# performance-monitor.py - Real-time performance monitoring

import subprocess
import json
import time
import requests
from datetime import datetime
import statistics

class PerformanceMonitor:
    def __init__(self):
        self.metrics_history = []
        self.alert_thresholds = {
            'cpu_percent': 80,
            'memory_percent': 85,
            'response_time_ms': 1000,
            'error_rate_percent': 5
        }
    
    def get_cluster_metrics(self):
        """Collect cluster-wide metrics"""
        try:
            # Get node metrics
            result = subprocess.run([
                'kubectl', 'top', 'nodes', '--no-headers'
            ], capture_output=True, text=True)
            
            node_metrics = []
            for line in result.stdout.strip().split('\n'):
                parts = line.split()
                if len(parts) >= 5:
                    node_metrics.append({
                        'name': parts[0],
                        'cpu_percent': int(parts[1].replace('%', '')),
                        'memory_percent': int(parts[3].replace('%', ''))
                    })
            
            return node_metrics
        except Exception as e:
            print(f"Error collecting cluster metrics: {e}")
            return []
    
    def get_pod_metrics(self):
        """Collect pod-specific metrics"""
        try:
            result = subprocess.run([
                'kubectl', 'top', 'pods', '-A', '--no-headers'
            ], capture_output=True, text=True)
            
            pod_metrics = []
            for line in result.stdout.strip().split('\n'):
                parts = line.split()
                if len(parts) >= 4 and 'asi-' in parts[1]:
                    pod_metrics.append({
                        'namespace': parts[0],
                        'name': parts[1],
                        'cpu': parts[2],
                        'memory': parts[3]
                    })
            
            return pod_metrics
        except Exception as e:
            print(f"Error collecting pod metrics: {e}")
            return []
    
    def test_api_performance(self):
        """Test API response times"""
        endpoints = [
            'https://api.asichain.io/status',
            'https://api.asichain.io/health',
            'https://api.asichain.io/metrics'
        ]
        
        api_metrics = []
        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = requests.get(endpoint, timeout=10)
                response_time = (time.time() - start_time) * 1000
                
                api_metrics.append({
                    'endpoint': endpoint,
                    'response_time_ms': response_time,
                    'status_code': response.status_code,
                    'success': response.status_code < 400
                })
            except Exception as e:
                api_metrics.append({
                    'endpoint': endpoint,
                    'response_time_ms': 10000,
                    'status_code': 0,
                    'success': False,
                    'error': str(e)
                })
        
        return api_metrics
    
    def analyze_performance(self, metrics):
        """Analyze metrics and generate alerts"""
        alerts = []
        
        # Check node resource usage
        for node in metrics.get('nodes', []):
            if node['cpu_percent'] > self.alert_thresholds['cpu_percent']:
                alerts.append({
                    'type': 'high_cpu',
                    'severity': 'warning',
                    'message': f"Node {node['name']} CPU usage at {node['cpu_percent']}%",
                    'node': node['name']
                })
            
            if node['memory_percent'] > self.alert_thresholds['memory_percent']:
                alerts.append({
                    'type': 'high_memory',
                    'severity': 'warning',
                    'message': f"Node {node['name']} memory usage at {node['memory_percent']}%",
                    'node': node['name']
                })
        
        # Check API performance
        api_metrics = metrics.get('api', [])
        if api_metrics:
            avg_response_time = statistics.mean([m['response_time_ms'] for m in api_metrics])
            error_rate = (len([m for m in api_metrics if not m['success']]) / len(api_metrics)) * 100
            
            if avg_response_time > self.alert_thresholds['response_time_ms']:
                alerts.append({
                    'type': 'slow_api',
                    'severity': 'warning',
                    'message': f"High API response time: {avg_response_time:.2f}ms",
                    'value': avg_response_time
                })
            
            if error_rate > self.alert_thresholds['error_rate_percent']:
                alerts.append({
                    'type': 'api_errors',
                    'severity': 'critical',
                    'message': f"High API error rate: {error_rate:.2f}%",
                    'value': error_rate
                })
        
        return alerts
    
    def send_alerts(self, alerts):
        """Send alerts to monitoring systems"""
        if not alerts:
            return
        
        webhook_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
        
        for alert in alerts:
            message = {
                "text": f"🚨 {alert['severity'].upper()}: {alert['message']}",
                "channel": "#alerts" if alert['severity'] == 'warning' else "#critical-alerts"
            }
            
            try:
                requests.post(webhook_url, json=message)
            except Exception as e:
                print(f"Failed to send alert: {e}")
    
    def run_monitoring_cycle(self):
        """Run one complete monitoring cycle"""
        timestamp = datetime.utcnow()
        
        print(f"\n=== Performance Monitor - {timestamp.isoformat()} ===")
        
        # Collect metrics
        node_metrics = self.get_cluster_metrics()
        pod_metrics = self.get_pod_metrics()
        api_metrics = self.test_api_performance()
        
        # Combine metrics
        current_metrics = {
            'timestamp': timestamp.isoformat(),
            'nodes': node_metrics,
            'pods': pod_metrics,
            'api': api_metrics
        }
        
        # Store metrics history
        self.metrics_history.append(current_metrics)
        if len(self.metrics_history) > 100:  # Keep last 100 measurements
            self.metrics_history.pop(0)
        
        # Display current status
        print(f"Nodes: {len(node_metrics)} monitored")
        print(f"Pods: {len(pod_metrics)} ASI pods")
        print(f"API endpoints: {len(api_metrics)} tested")
        
        # Check for performance issues
        alerts = self.analyze_performance(current_metrics)
        
        if alerts:
            print(f"\n⚠️  {len(alerts)} alert(s) generated:")
            for alert in alerts:
                print(f"  - {alert['severity'].upper()}: {alert['message']}")
            
            self.send_alerts(alerts)
        else:
            print("✅ All systems within normal parameters")
        
        # Show API performance summary
        if api_metrics:
            successful_apis = [m for m in api_metrics if m['success']]
            if successful_apis:
                avg_response = statistics.mean([m['response_time_ms'] for m in successful_apis])
                print(f"📊 Average API response time: {avg_response:.2f}ms")
        
        return current_metrics

def main():
    monitor = PerformanceMonitor()
    
    print("Starting ASI Chain Performance Monitor...")
    print("Press Ctrl+C to stop")
    
    try:
        while True:
            monitor.run_monitoring_cycle()
            time.sleep(60)  # Monitor every minute
    except KeyboardInterrupt:
        print("\nStopping performance monitor...")
    except Exception as e:
        print(f"Monitor error: {e}")

if __name__ == "__main__":
    main()
```

### Emergency Automation Script

```bash
#!/bin/bash
# emergency-automation.sh - Automated emergency response system

set -euo pipefail

# Configuration
EMERGENCY_THRESHOLD_CPU=90
EMERGENCY_THRESHOLD_MEMORY=95
EMERGENCY_THRESHOLD_DISK=90
MAX_DOWNTIME_MINUTES=5

# Alert channels
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
PAGERDUTY_KEY="${PAGERDUTY_KEY:-}"

# Logging
LOG_FILE="/var/log/asi-emergency-$(date +%Y%m%d).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"
}

alert() {
    local severity="$1"
    local message="$2"
    
    log "$severity: $message"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 $severity: $message\",\"channel\":\"#emergency\"}" \
            --silent --fail || true
    fi
}

check_resource_usage() {
    log "Checking resource usage..."
    
    # Check node resource usage
    kubectl top nodes --no-headers | while read line; do
        NODE=$(echo $line | awk '{print $1}')
        CPU=$(echo $line | awk '{print $2}' | sed 's/%//')
        MEMORY=$(echo $line | awk '{print $4}' | sed 's/%//')
        
        if [ $CPU -gt $EMERGENCY_THRESHOLD_CPU ]; then
            alert "CRITICAL" "Node $NODE CPU usage at ${CPU}% - initiating emergency scaling"
            emergency_scale_cluster
        fi
        
        if [ $MEMORY -gt $EMERGENCY_THRESHOLD_MEMORY ]; then
            alert "CRITICAL" "Node $NODE memory usage at ${MEMORY}% - initiating emergency cleanup"
            emergency_memory_cleanup
        fi
    done
}

check_service_health() {
    log "Checking service health..."
    
    # Check critical services
    local critical_services=("asi-wallet" "asi-validator" "asi-autopropose")
    
    for service in "${critical_services[@]}"; do
        local ready_replicas=$(kubectl get deployment $service -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired_replicas=$(kubectl get deployment $service -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        
        if [ "$ready_replicas" != "$desired_replicas" ]; then
            alert "CRITICAL" "Service $service has $ready_replicas/$desired_replicas replicas ready"
            emergency_restart_service "$service"
        fi
    done
}

check_api_availability() {
    log "Checking API availability..."
    
    local api_url="https://api.asichain.io/status"
    local response_code
    
    response_code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "$api_url" || echo "000")
    
    if [ "$response_code" != "200" ]; then
        alert "CRITICAL" "API endpoint returned $response_code - initiating emergency recovery"
        emergency_api_recovery
    fi
}

emergency_scale_cluster() {
    log "EMERGENCY: Scaling cluster due to resource pressure"
    
    # Scale up worker nodes
    aws eks update-nodegroup-config \
        --cluster-name asi-production \
        --nodegroup-name asi-workers \
        --scaling-config minSize=5,maxSize=15,desiredSize=8 \
        --region us-east-1
    
    # Scale up critical services
    kubectl scale deployment asi-wallet --replicas=6
    kubectl scale deployment asi-validator --replicas=6
    
    alert "INFO" "Emergency scaling initiated - added worker nodes and scaled services"
}

emergency_memory_cleanup() {
    log "EMERGENCY: Performing memory cleanup"
    
    # Clean up completed pods
    kubectl delete pods --field-selector=status.phase==Succeeded --all-namespaces
    kubectl delete pods --field-selector=status.phase==Failed --all-namespaces
    
    # Clean up unused images on nodes
    kubectl get nodes -o name | while read node; do
        kubectl debug "$node" -it --image=alpine -- sh -c "docker system prune -f" &
    done
    
    # Restart memory-intensive services
    kubectl rollout restart deployment/asi-wallet
    
    alert "INFO" "Emergency memory cleanup completed"
}

emergency_restart_service() {
    local service="$1"
    log "EMERGENCY: Restarting service $service"
    
    # Force restart with zero downtime
    kubectl rollout restart deployment/"$service"
    kubectl rollout status deployment/"$service" --timeout=300s
    
    # Verify restart success
    local ready_replicas=$(kubectl get deployment $service -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment $service -o jsonpath='{.spec.replicas}')
    
    if [ "$ready_replicas" = "$desired_replicas" ]; then
        alert "INFO" "Service $service restart successful"
    else
        alert "CRITICAL" "Service $service restart failed - escalating"
        emergency_full_recovery
    fi
}

emergency_api_recovery() {
    log "EMERGENCY: Initiating API recovery procedure"
    
    # Check load balancer health
    local alb_arn=$(kubectl get ingress asi-api-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [ -n "$alb_arn" ]; then
        # Restart ingress controller
        kubectl rollout restart deployment/aws-load-balancer-controller -n kube-system
    fi
    
    # Restart API services
    kubectl rollout restart deployment/asi-api
    kubectl rollout restart deployment/asi-wallet
    
    # Wait and test
    sleep 60
    check_api_availability
}

emergency_full_recovery() {
    log "EMERGENCY: Initiating full system recovery"
    
    alert "CRITICAL" "Full system recovery initiated - expect temporary service interruption"
    
    # Scale down non-critical services
    kubectl scale deployment asi-explorer --replicas=0
    kubectl scale deployment asi-indexer --replicas=0
    
    # Restart core services in order
    kubectl rollout restart deployment/asi-database
    sleep 30
    kubectl rollout restart deployment/asi-validator
    sleep 30
    kubectl rollout restart deployment/asi-wallet
    sleep 30
    kubectl rollout restart deployment/asi-autopropose
    
    # Wait for full recovery
    sleep 120
    
    # Scale back up non-critical services
    kubectl scale deployment asi-explorer --replicas=2
    kubectl scale deployment asi-indexer --replicas=1
    
    alert "INFO" "Full system recovery completed"
}

main() {
    log "Starting emergency automation system"
    
    while true; do
        check_resource_usage
        check_service_health
        check_api_availability
        
        sleep 30  # Check every 30 seconds
    done
}

# Handle script termination
trap 'log "Emergency automation stopped"; exit 0' SIGTERM SIGINT

# Only run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

---

## Conclusion

This comprehensive production troubleshooting guide consolidates all operational knowledge for the ASI Chain platform, combining legacy troubleshooting procedures with modern Kubernetes and cloud-native infrastructure guidance.

### Key Emergency Numbers

- **RTO Target**: 30 minutes
- **RPO Target**: 5 minutes  
- **Availability Target**: 99.9%
- **Max Acceptable Downtime**: 8 hours/month

### Quick Reference Commands

```bash
# Emergency status check
kubectl get pods -A | grep -E "(Error|CrashLoop|Pending)"

# Resource pressure check
kubectl top nodes; kubectl top pods -A --sort-by=memory

# API health test
curl -f https://api.asichain.io/status

# Emergency scale up
kubectl scale deployment asi-wallet --replicas=6

# Emergency restart
kubectl rollout restart deployment/asi-validator

# Database emergency connection
kubectl exec -it postgres-primary-0 -- psql -U postgres
```

### Document Maintenance

This document should be reviewed and updated:
- **Monthly**: Update based on incident learnings
- **Quarterly**: Review alert thresholds and procedures  
- **After Major Changes**: Update for infrastructure modifications
- **Post-Incident**: Incorporate lessons learned

---

**Document Owner**: Production Operations Team  
**Last Reviewed**: August 14, 2025  
**Next Review**: September 14, 2025  
**Classification**: Internal Use Only

---

*This document is part of the ASI Chain operational documentation suite. For additional information, refer to the [Operations Runbook](/docs/operations/RUNBOOK.MD) and [Disaster Recovery Procedures](/docs/operations/DISASTER_RECOVERY_PROCEDURES.md).*