# ASI-Chain Troubleshooting Guide

This guide helps you diagnose and resolve common issues with ASI-Chain deployment and operation.

## Platform Notes

This guide includes commands for multiple platforms:
- **macOS/Linux**: Primary development platforms
- **Windows**: Supported via WSL2 (recommended) or PowerShell

For Windows users:
- **Recommended**: Use WSL2 (Windows Subsystem for Linux) for best compatibility
- **Alternative**: PowerShell commands are provided where applicable
- **Note**: Some features may require Administrator privileges on Windows

## Table of Contents
1. [Diagnostic Commands](#diagnostic-commands)
2. [Installation Issues](#installation-issues)
3. [Docker and Container Issues](#docker-and-container-issues)
4. [Network Communication Issues](#network-communication-issues)
5. [CLI Command Issues](#cli-command-issues)
6. [Consensus and Finalization Issues](#consensus-and-finalization-issues)
7. [Performance Issues](#performance-issues)
8. [Data and Storage Issues](#data-and-storage-issues)
9. [Development and Build Issues](#development-and-build-issues)
10. [Advanced Debugging](#advanced-debugging)

## Diagnostic Commands

Before troubleshooting, gather system information:

```bash
# Check all running containers
docker ps -a

# View logs for specific container
docker logs <container-name>

# Check system resources
docker stats

# Verify network connectivity
docker network ls
docker network inspect asi-chain-net

# Check volume status
docker volume ls | grep rnode

# Check if gRPC port is listening
# macOS/Linux:
netstat -an | grep 40403 || echo "Port 40403 not listening"

# Windows (PowerShell):
netstat -an | Select-String "40403" || Write-Host "Port 40403 not listening"
```

## Installation Issues

### Prerequisites Not Met

**Problem**: Missing required software

**Diagnosis**:
```bash
# Check all prerequisites at once
docker --version && \
docker compose version && \
git --version && \
make --version && \
java -version && \
rustc --version
```

**Solutions**:

1. **Docker not installed**:
   - macOS: Install [Docker Desktop](https://docs.docker.com/desktop/mac/install/)
   - Linux: Follow [Docker Engine installation](https://docs.docker.com/engine/install/)
   - Windows: Install [Docker Desktop](https://docs.docker.com/desktop/windows/install/)

2. **Java version too old**:
   ```bash
   # macOS with Homebrew
   brew install openjdk@17
   
   # Ubuntu/Debian
   sudo apt update && sudo apt install openjdk-17-jdk
   
   # Set JAVA_HOME
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Linux
   ```

3. **Rust not installed**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

### Repository Clone Failures

**Problem**: Cannot clone repositories

**Solutions**:
```bash
# Use HTTPS instead of SSH
git config --global url."https://github.com/".insteadOf git@github.com:

# Clear git credentials if authentication fails
git config --global --unset credential.helper

# Clone with depth limit for slow connections
git clone --depth 1 https://github.com/F1R3FLY-io/asi-chain.git
```

## Docker and Container Issues

### Containers Not Starting

**Problem**: Containers exit immediately after starting

**Diagnosis**:
```bash
# Check container exit codes
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"

# View detailed logs
docker logs --tail 50 rnode.bootstrap

# Inspect container configuration
docker inspect rnode.bootstrap | grep -A 10 "State"
```

**Solutions**:

1. **Port conflicts**:
   ```bash
   # Find processes using required ports
   
   # macOS/Linux:
   lsof -i :40400-40453
   
   # Windows (PowerShell):
   netstat -ano | findstr ":404"
   
   # Kill conflicting processes
   # macOS/Linux:
   kill -9 <PID>
   
   # Windows (PowerShell as Administrator):
   Stop-Process -Id <PID> -Force
   
   # Or use different ports by modifying docker-compose.integrated.yml
   ```

2. **Resource constraints**:
   ```bash
   # Increase Docker resources (Docker Desktop)
   # Go to Preferences > Resources
   # Set: CPUs: 4+, Memory: 8GB+, Disk: 20GB+
   
   # Check current limits
   docker system df
   docker system prune -a  # Clean up space
   ```

3. **Permission issues**:
   ```bash
   # Fix volume permissions
   docker compose -f node/docker/docker-compose.integrated.yml down -v
   sudo rm -rf node/docker/data  # Only if using old bind mounts
   ./scripts/deploy.sh
   ```

### Container Health Check Failures

**Problem**: Containers show as unhealthy

**Diagnosis**:
```bash
# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect rnode.bootstrap | jq '.[0].State.Health'
```

**Solution**:
```bash
# Restart unhealthy containers
docker restart rnode.bootstrap

# If persistent, recreate containers
docker compose -f node/docker/docker-compose.integrated.yml down
docker compose -f node/docker/docker-compose.integrated.yml up -d
```

## Network Communication Issues

### Nodes Not Connecting

**Problem**: Validators can't connect to bootstrap node

**Diagnosis**:
```bash
# Check network connectivity between containers
docker exec rnode.validator1 ping -c 3 rnode.bootstrap

# Verify DNS resolution
docker exec rnode.validator1 nslookup rnode.bootstrap

# Check node discovery
docker logs rnode.validator1 | grep "Peers:"
```

**Solutions**:

1. **Network isolation**:
   ```bash
   # Recreate network
   docker network rm asi-chain-net
   docker compose -f node/docker/docker-compose.integrated.yml up -d
   ```

2. **Firewall blocking**:
   ```bash
   # macOS
   sudo pfctl -d  # Temporarily disable firewall
   
   # Linux
   sudo ufw status
   sudo ufw allow 40400:40453/tcp
   ```

### gRPC Connection Errors

**Problem**: "Protocol mismatch" or "connection refused"

**Diagnosis**:
```bash
# Test gRPC endpoint
grpcurl -plaintext localhost:40403 list

# Check if port is listening
# macOS/Linux:
netstat -an | grep 40403

# Windows (PowerShell):
netstat -an | Select-String "40403"
```

**Solutions**:

1. **Wrong port for operation**:
   ```bash
   # Remember the port mapping:
   # Deploy: 40401, 40411, 40421, 40431
   # Propose: 40402, 40412, 40422, 40432
   # Query: 40453 (observer only)
   
   # Example: Deploy to bootstrap
   ./node_cli deploy --node-host 127.0.0.1:40401 ...
   
   # Example: Query from observer
   ./node_cli show-blocks --node-host 127.0.0.1:40453
   ```

2. **Node not ready**:
   ```bash
   # Wait for node startup (can take 1-2 minutes)
   # Wait for gRPC port to be available
   
   # macOS/Linux:
   while ! netstat -an | grep -q ":40403.*LISTEN"; do
     echo "Waiting for node..."
     sleep 5
   done
   
   # Windows (PowerShell):
   while (!(netstat -an | Select-String ":40403.*LISTENING")) {
     Write-Host "Waiting for node..."
     Start-Sleep -Seconds 5
   }
   ```

## CLI Command Issues

### Deploy Command Failures

**Problem**: Deployments fail or timeout

**Diagnosis**:
```bash
# Check if node is accepting deploys
docker logs rnode.bootstrap | grep -i deploy

# Verify key files exist
ls -la cli/node-cli/keys/
```

**Solutions**:

1. **Missing keys**:
   ```bash
   cd cli/node-cli
   make generate-key-pair SAVE=true
   ```

2. **Insufficient balance**:
   ```bash
   # Check balance
   make wallet-balance ADDRESS=<your-address>
   
   # Use genesis wallets for testing
   cat node/docker/genesis/wallets.txt
   ```

3. **Invalid contract syntax**:
   ```bash
   # Test with simple contract first
   echo 'new hello in { hello!("test") }' > test.rho
   
   # Validate Rholang syntax (if parser available)
   # Or use the simplest known working contract
   ```

### Propose Command Hanging

**Problem**: Propose command doesn't complete

**Diagnosis**:
```bash
# Check if validator can propose
docker logs rnode.validator1 | grep -i propose

# Verify validator is bonded
make bonds
```

**Solutions**:

1. **No deploys to propose**:
   ```bash
   # Ensure you deploy before proposing
   make deploy  # First deploy
   make propose # Then propose
   ```

2. **Validator rotation restriction**:
   ```bash
   # Due to consensus rules, validators must alternate
   # Use different validators or wait for finalizer-bot
   docker logs finalizer-bot
   ```

## Consensus and Finalization Issues

### Block Production Stops at Block 50 - SOLVED ✅

**Problem**: Network stops producing new blocks exactly at block 50

**Root Cause**: 
- Hardcoded `deployLifespan = 50` in consensus code
- All deploys have `validAfterBlockNumber = 0` (hardcoded in original CLI)
- After block 50, deploys with VABN=0 are expired

**Status**: ✅ FIXED - CLI now supports `--valid-after-block-number` flag

**Diagnosis**:
```bash
# Check current block height
docker logs finalizer-bot --tail 20 | grep "Current block"

# Verify VABN is being used
docker logs finalizer-bot | grep "VABN="

# Monitor block progression past 50
docker logs -f finalizer-bot | grep "blocks past"
```

**Solution Implemented**:

1. **CLI Patched**: The CLI now accepts `--valid-after-block-number` parameter
   ```bash
   # Deploy with custom validity window
   ./node_cli deploy \
       --file contract.rho \
       --valid-after-block-number 50  # Valid from block 50 to 100
   ```

2. **Finalizer Bot Updated**: Automatically sets VABN to current block
   ```bash
   # Use the VABN-aware finalizer
   cp finalizer-bot/finalizer_with_vabn.py finalizer-bot/finalizer.py
   docker restart finalizer-bot
   ```

3. **Manual Testing**: Deploy with appropriate VABN
   ```bash
   # Get current block
   CURRENT_BLOCK=$(./node_cli last-finalized-block --port 40403 | grep blockNumber | grep -o '[0-9]\+')
   
   # Deploy valid for next 50 blocks
   ./node_cli deploy \
       --file test.rho \
       --valid-after-block-number $CURRENT_BLOCK
   ```

**How It Works**:
- Deploy with VABN=50 is valid from block 50 to block 100
- Deploy with VABN=100 is valid from block 100 to block 150
- Setting VABN to current block ensures 50-block validity window

**Verification**:
```bash
# Watch the network continue past block 50
docker logs -f finalizer-bot

# You should see:
# 🎉 Network has produced X blocks past the original limit!
```

**Alternative Solutions** (if needed):
1. Continuous deploy generation (less efficient)
2. Modify `deployLifespan` in Scala code (requires recompilation)
3. Create deploy pools with staggered validity windows

See:
- [How Block 50 Was Fixed](../analysis/block-50/HOW_BLOCK_50_WAS_FIXED.md) - Complete solution journey
- [VABN Patch Success Report](../analysis/block-50/VABN_PATCH_SUCCESS.md) - Implementation details
- [Patch Management Guide](../development/PATCH_MANAGEMENT.md) - How the CLI patch is applied
- [Alternative Solutions](../analysis/block-50/BLOCK_50_ALTERNATIVE_SOLUTIONS.md) - Other approaches

### Blocks Not Finalizing

**Problem**: Blocks remain unfinalized

**Diagnosis**:
```bash
# Check finalizer bot status
docker logs --tail 50 finalizer-bot

# View block finalization status
./node_cli show-blocks --node-host 127.0.0.1:40453 | grep -i final
```

**Solutions**:

1. **Finalizer bot not running**:
   ```bash
   # Check if running
   docker ps | grep finalizer
   
   # Restart if needed
   docker restart finalizer-bot
   
   # Check logs for errors
   docker logs -f finalizer-bot
   ```

2. **Race condition in proposals**:
   ```bash
   # The finalizer bot handles timing automatically
   # If manual intervention needed, add delays between proposals
   sleep 2  # Between deploy and propose
   sleep 5  # Between different validator proposals
   ```

### Validator Not Producing Blocks

**Problem**: Validator is bonded but not creating blocks

**Diagnosis**:
```bash
# Check validator bonds
make bonds

# Check validator logs
docker logs rnode.validator1 | grep -E "(propose|block|error)"
```

**Solutions**:

1. **Not receiving deploys** (due to gossip issue):
   ```bash
   # Deploy directly to the validator
   ./node_cli deploy --node-host 127.0.0.1:40411 ...  # Validator1
   
   # Then propose on same validator
   ./node_cli propose --node-host 127.0.0.1:40412
   ```

2. **Waiting for turn** (alternating proposal rule):
   - Let finalizer bot handle rotation
   - Or manually rotate through validators

### NotEnoughNewBlocks Errors

**Problem**: Validator returns `NotEnoughNewBlocks (seqNum X)` errors

**Root Cause**: When the finalizer bot's error handling prevented validator rotation, the same validator would repeatedly fail with increasing sequence numbers.

**Status**: ✅ FIXED - Finalizer bot now properly rotates validators

**Diagnosis**:
```bash
# Check if finalizer is stuck on one validator
docker logs finalizer-bot | tail -20 | grep "Working with"

# Look for increasing sequence numbers
docker logs finalizer-bot | grep "NotEnoughNewBlocks"
```

**Solution Implemented**: 
- Validator rotation logic moved outside try-catch block
- Ensures rotation happens even when deploy/propose fails

**If Still Occurring**:
```bash
# Restart finalizer bot to reset rotation
docker restart finalizer-bot

# Verify proper rotation
docker logs -f finalizer-bot | grep "Working with"
# Should see: rnode.bootstrap -> rnode.validator1 -> rnode.validator2 -> rnode.validator3 -> repeat
```

## Performance Issues

### Slow Block Production

**Problem**: Blocks take too long to produce

**Diagnosis**:
```bash
# Monitor block times
docker logs finalizer-bot | grep -i "block created"

# Check system resources
docker stats --no-stream
```

**Solutions**:

1. **Resource constraints**:
   ```bash
   # Increase Docker resources
   # Reduce number of validators for testing
   # Use SSD storage for better I/O
   ```

2. **Complex contracts**:
   ```bash
   # Simplify contracts for testing
   # Break large contracts into smaller deploys
   ```

### High Memory Usage / Memory Leak

**Problem**: Containers using excessive memory, continuously growing over time

**Root Cause**: Deploy storage memory leak - deploys are never cleaned up from storage

**⚠️ Detailed Analysis**: See [Deploy Storage Memory Leak Analysis](MEMORY_LEAK_DEPLOY_STORAGE.md) for comprehensive analysis and solutions.

**Quick Diagnosis**:
```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}"

# Check for memory leaks
docker logs rnode.bootstrap | grep -i "heap\|memory"

# Count accumulated deploys (requires node shell access)
# High numbers indicate deploy accumulation
docker exec rnode.bootstrap ls /var/lib/rnode/deploy-storage | wc -l
```

**Immediate Workarounds**:
```bash
# 1. Increase JVM heap in docker-compose.yml
# Change: command: [...] -J-Xmx2g
# To:     command: [...] -J-Xmx8g

# 2. Add Docker memory limits
# Add under each service:
# deploy:
#   resources:
#     limits:
#       memory: 10G

# 3. Restart containers periodically (crontab)
0 */6 * * * docker compose -f /path/to/docker-compose.integrated.yml restart

# 4. Reduce finalizer frequency
# Edit finalizer.py: RETRY_INTERVAL = 30  # was 2
```

**Long-term Solution**: Implement deploy garbage collection in the node (see linked document)

## Data and Storage Issues

### Volume Permission Errors

**Problem**: Permission denied errors

**Solution**:
```bash
# Fix ownership (if needed)
docker compose -f node/docker/docker-compose.integrated.yml down
docker volume rm $(docker volume ls -q | grep rnode)
./scripts/deploy.sh
```

### Disk Space Issues

**Problem**: No space left on device

**Diagnosis**:
```bash
# Check Docker space usage
docker system df

# Check host disk space
df -h
```

**Solutions**:
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Remove old logs
docker logs --since 24h rnode.bootstrap > bootstrap.log
docker container prune
```

## Development and Build Issues

### Scala Build Failures

**Problem**: sbt compile errors

**Solutions**:
```bash
# Clean build
cd node
sbt clean
rm -rf target project/target

# Update dependencies
sbt update

# Use correct Java version
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
sbt compile
```

### Rust Build Failures

**Problem**: Cargo build errors

**Solutions**:
```bash
# Clean build
cd cli/node-cli
cargo clean

# Update dependencies
cargo update

# Install missing system dependencies
# Ubuntu/Debian:
sudo apt-get install pkg-config libssl-dev

# macOS:
brew install pkg-config openssl
```

### Docker Build Failures

**Problem**: Image build errors

**Solutions**:
```bash
# Clear Docker cache
docker builder prune -a

# Build with no cache
docker compose -f node/docker/docker-compose.integrated.yml build --no-cache

# Check Dockerfile syntax
docker build -f finalizer-bot/Dockerfile finalizer-bot/
```

## Advanced Debugging

### Enable Debug Logging

```bash
# Add to node configuration
# Edit docker-compose.integrated.yml environment:
RUST_LOG: "debug"
LOG_LEVEL: "DEBUG"

# For specific components
RUST_LOG: "node_cli=debug,casper=trace"
```

### Inspect RSpace State

```bash
# Connect to container
docker exec -it rnode.bootstrap bash

# Navigate to data directory
cd /var/lib/rnode

# Check block store
ls -la blockstore/

# View latest block hash
cat last-finalized-block
```

### Network Packet Capture

```bash
# Capture gRPC traffic
tcpdump -i any -w grpc.pcap port 40401

# Analyze with Wireshark
# Filter: tcp.port == 40401
```

### Manual Health Checks

```bash
# Create health check script
cat > check_health.sh << 'EOF'
#!/bin/bash
echo "=== ASI-Chain Health Check ==="
echo "Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}"
echo -e "\nLogs Summary:"
for node in bootstrap validator1 validator2 validator3 readonly finalizer-bot; do
  echo -n "$node: "
  docker logs --tail 10 "rnode.$node" 2>&1 | grep -E "(ERROR|WARN)" | wc -l
  echo " errors/warnings"
done
echo -e "\nNetwork:"
# Check node logs for status
docker logs --tail 20 rnode.bootstrap | grep -i "started"
EOF

chmod +x check_health.sh
./check_health.sh
```

## Getting Additional Help

If these solutions don't resolve your issue:

1. **Collect Diagnostic Information**:
   ```bash
   # Create diagnostic bundle
   mkdir asi-diagnostics
   docker ps -a > asi-diagnostics/containers.txt
   docker logs rnode.bootstrap > asi-diagnostics/bootstrap.log
   docker logs finalizer-bot > asi-diagnostics/finalizer.log
   tar -czf diagnostics.tar.gz asi-diagnostics/
   ```

2. **Check Known Issues**:
   - Review [Test Report](../analysis/TEST_REPORT.md) for known limitations
   - Check GitHub issues for similar problems

3. **Report New Issues**:
   - Include diagnostic bundle
   - Provide steps to reproduce
   - List your environment (OS, versions, etc.)

## Common Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `NotEnoughNewBlocks` | Validator sequence number too high | Ensure finalizer bot is rotating validators properly |
| `Protocol mismatch` | Wrong port or version | Use correct port for operation |
| `InsufficientBalance` | Not enough REV | Use genesis wallet or get funds |
| `InvalidSignature` | Key mismatch | Regenerate keys or check key file |
| `Connection refused` | Node not ready | Wait for node startup |
| `No peers` | Network isolation | Check network configuration |

---

**Remember**: Most issues can be resolved by:
1. Checking you're using the correct ports
2. Ensuring nodes are fully started
3. Letting the finalizer bot handle block production
4. Following the exact command sequence in documentation