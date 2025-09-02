# F1R3FLY Network Stress Testing

## Overview

The F1R3FLY Network Stress Testing suite provides comprehensive testing tools to validate network stability, endpoint performance, and transaction processing under various load conditions. The testing suite uses authentic private keys from the docker configuration and targets all documented endpoints.

## Test Suite Components

### 1. Main Stress Test Script
**Location**: `scripts/monitoring/network_stress_test.sh`

A comprehensive bash script that performs multi-phase testing:
- **Phase 1**: Basic endpoint testing (all 6 node APIs)
- **Phase 2**: Network health validation using rust client
- **Phase 3**: Wallet balance queries with authentic keys
- **Phase 4**: Validator status queries
- **Phase 5**: Blockchain query testing (various depths)
- **Phase 6**: Concurrent load testing with monitoring
- **Phase 7**: Light transaction testing (optional)

### 2. Test Runner
**Location**: `scripts/monitoring/run_stress_tests.sh`

User-friendly wrapper providing different test configurations:
- **Quick**: 2 minutes, 5 parallel operations
- **Standard**: 5 minutes, 10 parallel operations  
- **Intensive**: 10 minutes, 20 parallel operations
- **Endurance**: 30 minutes, 15 parallel operations
- **Custom**: Interactive configuration

## Network Configuration

### Target Endpoints
- **Bootstrap**: 54.254.197.253:40403
- **Validator1**: 54.254.197.253:40413
- **Validator2**: 54.254.197.253:40423
- **Validator3**: 54.254.197.253:40433
- **Validator4**: 54.254.197.253:40443
- **Observer**: 54.254.197.253:40453

### Authentication
Uses authentic private keys from `f1r3fly/docker/README.md`:

```bash
# Bootstrap Node
PRIVATE_KEY="5f668a7ee96d944a4494cc947e4005e172d7ab3461ee5538f1f2a45a835e9657"

# Validator1 
PRIVATE_KEY="357cdc4201a5650830e0bc5a03299a30038d9934ba4c7ab73ec164ad82471ff9"

# Validator2
PRIVATE_KEY="2c02138097d019d263c1d5383fcaddb1ba6416a0f4e64e3a617fe3af45b7851d"

# Validator3
PRIVATE_KEY="b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb"

# Validator4
PRIVATE_KEY="5ff3514bf79a7d18e8dd974c699678ba63b7762ce8d78c532346e52f0ad219cd"

# AutoPropose Wallet
PRIVATE_KEY="61e594124ca6af84a5468d98b34a4f3431ef39c54c6cf07fe6fbf8b079ef64f6"
```

## Quick Start

### Prerequisites
1. **Rust Client Built**:
   ```bash
   cd rust-client
   cargo build --release
   ```

2. **Network Connectivity**:
   ```bash
   curl http://54.254.197.253:40403/status
   ```

3. **Dependencies**:
   - `curl` - HTTP requests
   - `jq` - JSON processing
   - `timeout` - Command timeouts

### Running Tests

#### Standard Test (Recommended)
```bash
./scripts/monitoring/run_stress_tests.sh
# or
./scripts/monitoring/run_stress_tests.sh standard
```

#### Quick Test (Development)
```bash
./scripts/monitoring/run_stress_tests.sh quick
```

#### Intensive Test (Load Testing)
```bash
./scripts/monitoring/run_stress_tests.sh intensive
```

#### Custom Configuration
```bash
./scripts/monitoring/run_stress_tests.sh custom
```

### Direct Script Usage
```bash
# Run the main stress test script directly
./scripts/monitoring/network_stress_test.sh
```

## Test Categories

### 1. Endpoint Tests
**Purpose**: Validate all documented API endpoints are responsive

**Tests Performed**:
- HTTP status checks on all 6 node endpoints
- JSON response validation
- Version information retrieval

**Expected Results**: 6/6 endpoints healthy

### 2. Network Health Tests  
**Purpose**: Validate network-level functionality

**Tests Performed**:
- `network-health` command via rust client
- `epoch-info` queries
- `network-consensus` status

**Expected Results**: Network fully connected and healthy

### 3. Wallet Query Tests
**Purpose**: Test authenticated balance queries

**Tests Performed**:
- Balance queries for bootstrap, validator1, validator2, autopropose wallets
- Uses authentic private keys for validation

**Expected Results**: Successful balance retrieval

### 4. Validator Query Tests
**Purpose**: Test validator-specific queries

**Tests Performed**:
- Validator status queries using public keys
- Bonding status verification

**Expected Results**: Status information retrieval (some API limitations expected)

### 5. Block Query Tests
**Purpose**: Test blockchain data retrieval

**Tests Performed**:
- Main chain queries with depths 1, 5, 10, 20
- Node status queries on different gRPC ports
- Block metadata validation

**Expected Results**: Successful block data retrieval

### 6. Concurrent Load Tests
**Purpose**: Test network stability under parallel load

**Tests Performed**:
- Multiple parallel workers making simultaneous requests
- Network stability monitoring during load
- Performance metrics collection

**Expected Results**: >90% success rate with stable network

### 7. Transaction Tests (Light)
**Purpose**: Test transaction processing capability

**Tests Performed**:
- Small REV transfers between wallets
- Transaction confirmation monitoring

**Expected Results**: Successful transaction processing

## Output and Reporting

### Real-time Output
- Colored progress indicators (✅ ❌ ⚠️)
- Phase-by-phase execution status
- Immediate feedback on failures

### Log Files
**Location**: `/tmp/stress_test_YYYYMMDD_HHMMSS.log`

Contains:
- Detailed command outputs
- Error messages and stack traces
- Timing information
- Raw API responses

### Final Report
Comprehensive summary including:
- **Test Results by Category**: Pass/fail counts
- **Overall Summary**: Total operations and success rate
- **Network Health Indicators**: Connectivity and stability
- **Recommendations**: Based on test results

## Example Report

```
==============================================
          F1R3FLY STRESS TEST REPORT
==============================================
Timestamp: Tue Aug 12 21:55:35 +08 2025
Host: 54.254.197.253
Duration: 5-10 minutes
Parallel Operations: 10
Log File: /tmp/stress_test_20250812_215403.log

TEST RESULTS BY CATEGORY:
------------------------------------------
✅ Endpoint Tests: 6 passed
✅ Network Health Tests: 2 passed, 1 failed
✅ Validator Query Tests: 4 passed
✅ Block Query Tests: 6 passed, 2 failed
✅ Concurrent Load Tests: 450/500 operations passed
✅ Transaction Tests: 1 passed

OVERALL SUMMARY:
------------------------------------------
Total Successful Operations: 469
Total Failed Operations: 3
Overall Result: ✅ NETWORK PERFORMING WELL

NETWORK HEALTH INDICATORS:
------------------------------------------
✅ Network connectivity: HEALTHY
✅ Metrics export: OPERATIONAL

RECOMMENDATIONS:
------------------------------------------
• Network is performing excellently under stress
• All endpoints are stable and responsive
• Ready for production workloads
```

## Performance Metrics

### Success Rate Thresholds
- **Excellent**: >95% success rate
- **Good**: 90-95% success rate  
- **Acceptable**: 80-90% success rate
- **Concerning**: <80% success rate

### Load Test Expectations
| Configuration | Duration | Parallel Ops | Expected Success Rate |
|--------------|----------|--------------|----------------------|
| Quick        | 2 min    | 5            | >95%                |
| Standard     | 5 min    | 10           | >90%                |
| Intensive    | 10 min   | 20           | >85%                |
| Endurance    | 30 min   | 15           | >90%                |

### Response Time Expectations
- **API Endpoints**: <500ms average
- **Network Health**: <2s average
- **Block Queries**: <1s average
- **Wallet Queries**: <3s average

## Troubleshooting

### Common Issues

#### 1. Rust Client Not Found
```bash
Error: Rust client not found at ./target/release/node_cli
```
**Solution**:
```bash
cd rust-client
cargo build --release
```

#### 2. Network Unreachable
```bash
Error: Cannot reach F1R3FLY network at 54.254.197.253
```
**Solution**:
- Check network connectivity
- Verify F1R3FLY containers are running:
  ```bash
  ssh -i devnet.pem ubuntu@54.254.197.253 "docker ps | grep rnode"
  ```

#### 3. API Timeouts
```bash
❌ Network health check: FAILED
```
**Solution**:
- Check server load
- Verify no other stress tests running concurrently
- Check AutoPropose service health

#### 4. High Failure Rate
```bash
Overall Result: ⚠️ SOME ISSUES DETECTED
```
**Investigation**:
1. Check detailed log file for specific errors
2. Verify network stability: `curl http://54.254.197.253:40403/status`
3. Check container health: `docker ps`
4. Monitor system resources

### Debugging Tips

#### View Detailed Logs
```bash
# Find latest log file
ls -t /tmp/stress_test_*.log | head -1

# View errors only
grep ERROR /tmp/stress_test_*.log

# View timing issues
grep "timeout\|Time taken" /tmp/stress_test_*.log
```

#### Monitor Network During Testing
```bash
# Watch block production
watch -n 2 'curl -s http://54.254.197.253:40403/status | jq'

# Monitor metrics
watch -n 5 'curl -s http://54.254.197.253:9091/metrics | grep f1r3fly_block_height'

# Check container health
watch 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

## Integration with Monitoring

### Automated Testing
Add to crontab for regular network validation:
```bash
# Daily stress test at 2 AM
0 2 * * * /home/ubuntu/code/asi-chain/scripts/monitoring/run_stress_tests.sh quick >> /var/log/stress_tests.log 2>&1
```

### Alerting Integration
Parse test results for monitoring systems:
```bash
# Extract success rate
grep "Total Successful Operations" /tmp/stress_test_*.log | tail -1

# Check for critical failures
if grep -q "Overall Result:.*ISSUES DETECTED" /tmp/stress_test_*.log; then
    echo "ALERT: Network stress test failures detected"
fi
```

### Prometheus Metrics
Consider extending the blockchain metrics exporter to include:
- Stress test success rates
- API response times
- Transaction throughput

## Security Considerations

### Private Key Usage
- Private keys are used from docker configuration
- Keys are for testnet/development use only
- Never use production private keys in stress tests

### Network Impact
- Tests are designed to be non-disruptive
- Transaction tests use minimal amounts
- Concurrent load is controlled and limited

### Access Control
- Tests require network access to AWS Lightsail instance
- SSH key access required for some monitoring functions
- Logs may contain sensitive debugging information

## Future Enhancements

### Planned Features
1. **Rholang Contract Deployment Testing**
   - Deploy and execute test contracts
   - Measure contract execution performance

2. **Multi-node Transaction Testing**  
   - Cross-validator transactions
   - Network partition tolerance

3. **Historical Performance Tracking**
   - Test result database
   - Performance trend analysis

4. **Custom Contract Stress Testing**
   - Deploy stress test contracts
   - Measure throughput under load

5. **Network Recovery Testing**
   - Simulated failures
   - Recovery time measurement

### Integration Opportunities
- **CI/CD Pipeline**: Automated testing on deployments
- **Performance Regression**: Detect performance degradation
- **Capacity Planning**: Determine scaling requirements
- **SLA Monitoring**: Validate service level agreements

---

*For questions or issues with stress testing, check logs in `/tmp/stress_test_*.log` or review the troubleshooting section above.*

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
