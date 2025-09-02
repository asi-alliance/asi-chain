#!/bin/bash

# F1R3FLY Automated Stress Test Monitor
# Runs scheduled stress tests and alerts on failures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Use user-writable directory if system directory not available
if [[ -w "/var/log/f1r3fly" ]]; then
    LOG_DIR="/var/log/f1r3fly/stress_tests"
else
    LOG_DIR="$HOME/logs/f1r3fly/stress_tests"
fi
STRESS_TEST_SCRIPT="$SCRIPT_DIR/run_stress_tests.sh"
ALERT_THRESHOLD_QUICK=95
ALERT_THRESHOLD_STANDARD=90
ALERT_THRESHOLD_INTENSIVE=85

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to extract success rate from test output
get_success_rate() {
    local log_file=$1
    local total_ops=$(grep -o "operations passed" "$log_file" | wc -l)
    
    if grep -q "1117/1117 operations passed" "$log_file"; then
        echo "100"
    elif grep -q "560/560 operations passed" "$log_file"; then
        echo "100"
    elif grep -q "Concurrent load test: [0-9]*/[0-9]* operations passed" "$log_file"; then
        local result=$(grep "Concurrent load test:" "$log_file" | tail -1)
        local passed=$(echo "$result" | grep -o "[0-9]*/" | tr -d '/')
        local total=$(echo "$result" | grep -o "/[0-9]*" | tr -d '/')
        if [[ $total -gt 0 ]]; then
            echo $((passed * 100 / total))
        else
            echo "0"
        fi
    else
        echo "0"
    fi
}

# Function to send alert
send_alert() {
    local test_type=$1
    local success_rate=$2
    local log_file=$3
    local threshold=$4
    
    echo -e "${RED}⚠️  ALERT: $test_type stress test success rate ($success_rate%) below threshold ($threshold%)${NC}"
    echo "Log file: $log_file"
    
    # Configure alerting via environment variables:
    # export ALERT_WEBHOOK_URL="your-webhook-url"
    # export ALERT_EMAIL="your-ops-email"
    # 
    # Integration examples:
    # [ -n "$ALERT_EMAIL" ] && echo "Alert details" | mail -s "ASI Chain Alert" $ALERT_EMAIL
    # [ -n "$ALERT_WEBHOOK_URL" ] && curl -X POST -d "{\"text\":\"Alert\"}" $ALERT_WEBHOOK_URL
    
    # For now, write to system log
    logger -t "f1r3fly-stress-test" -p user.warning "$test_type test: $success_rate% success (threshold: $threshold%)"
}

# Function to write metrics (for Prometheus integration)
write_metrics() {
    local test_type=$1
    local success_rate=$2
    local timestamp=$(date +%s)
    
    local metrics_file="/var/lib/prometheus/node-exporter/f1r3fly_stress_test.prom"
    # Only create metrics if directory exists and is writable
    if [[ -w "$(dirname "$metrics_file")" ]]; then
        mkdir -p "$(dirname "$metrics_file")" 2>/dev/null || true
    else
        # Use alternative location
        metrics_file="$HOME/metrics/f1r3fly_stress_test.prom"
        mkdir -p "$(dirname "$metrics_file")" 2>/dev/null || true
    fi
    
    cat > "$metrics_file.tmp" << EOF
# HELP f1r3fly_stress_test_success_rate Stress test success percentage
# TYPE f1r3fly_stress_test_success_rate gauge
f1r3fly_stress_test_success_rate{test_type="$test_type"} $success_rate

# HELP f1r3fly_stress_test_last_run Timestamp of last stress test
# TYPE f1r3fly_stress_test_last_run gauge
f1r3fly_stress_test_last_run{test_type="$test_type"} $timestamp
EOF
    
    mv "$metrics_file.tmp" "$metrics_file"
}

# Main function to run test
run_test() {
    local test_type=${1:-standard}
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local log_file="$LOG_DIR/${test_type}_${timestamp}.log"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting $test_type stress test..."
    
    # Determine threshold based on test type
    local threshold=$ALERT_THRESHOLD_STANDARD
    case $test_type in
        quick)
            threshold=$ALERT_THRESHOLD_QUICK
            ;;
        intensive)
            threshold=$ALERT_THRESHOLD_INTENSIVE
            ;;
    esac
    
    # Run the stress test
    if timeout 1200 "$STRESS_TEST_SCRIPT" "$test_type" > "$log_file" 2>&1; then
        # Test completed, check results
        local success_rate=$(get_success_rate "$log_file")
        
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $test_type test completed: $success_rate% success rate"
        
        # Write metrics for monitoring
        write_metrics "$test_type" "$success_rate"
        
        # Check if alert is needed
        if [[ $success_rate -lt $threshold ]]; then
            send_alert "$test_type" "$success_rate" "$log_file" "$threshold"
        else
            echo -e "${GREEN}✅ $test_type test passed with $success_rate% success rate${NC}"
        fi
        
        # Check for critical failures
        if grep -q "❌ Network connectivity: ISSUES DETECTED" "$log_file"; then
            echo -e "${RED}❌ CRITICAL: Network connectivity issues detected!${NC}"
            send_alert "$test_type" "$success_rate" "$log_file" "$threshold"
        fi
    else
        # Test failed to complete
        echo -e "${RED}❌ $test_type test failed to complete or timed out${NC}"
        send_alert "$test_type" "0" "$log_file" "$threshold"
    fi
    
    # Clean up old logs (keep last 30 days)
    find "$LOG_DIR" -name "*.log" -type f -mtime +30 -delete
    
    return 0
}

# Parse command line arguments
case "${1:-}" in
    quick|standard|intensive|endurance)
        run_test "$1"
        ;;
    --help|-h)
        echo "Usage: $0 [quick|standard|intensive|endurance]"
        echo ""
        echo "Runs automated stress tests and alerts on failures"
        echo ""
        echo "Test types:"
        echo "  quick      - 2 minutes, 5 parallel ops (threshold: 95%)"
        echo "  standard   - 5 minutes, 10 parallel ops (threshold: 90%)"
        echo "  intensive  - 10 minutes, 20 parallel ops (threshold: 85%)"
        echo "  endurance  - 30 minutes, 15 parallel ops (threshold: 85%)"
        ;;
    *)
        # Default to standard test
        run_test "standard"
        ;;
esac