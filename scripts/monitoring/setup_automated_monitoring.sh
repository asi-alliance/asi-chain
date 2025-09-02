#!/bin/bash

# Setup script for F1R3FLY automated stress test monitoring

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 F1R3FLY Automated Monitoring Setup"
echo "======================================"
echo ""

# 1. Create log directories
echo "1. Creating log directories..."
if [[ $EUID -eq 0 ]]; then
    # Running as root
    mkdir -p /var/log/f1r3fly/stress_tests
    chown -R ubuntu:ubuntu /var/log/f1r3fly
    echo "   ✅ Created /var/log/f1r3fly/stress_tests"
else
    # Running as regular user
    mkdir -p "$HOME/logs/f1r3fly/stress_tests"
    echo "   ✅ Created $HOME/logs/f1r3fly/stress_tests"
fi

# 2. Setup crontab
echo ""
echo "2. Crontab Configuration"
echo "   Current crontab entries:"
crontab -l 2>/dev/null || echo "   (no existing crontab)"

echo ""
echo "   Add the following to your crontab (crontab -e):"
echo "   ================================================"
cat "$SCRIPT_DIR/crontab_config"
echo "   ================================================"

read -p "   Do you want to automatically add these entries? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup existing crontab
    crontab -l 2>/dev/null > /tmp/crontab.backup || true
    
    # Add new entries if not already present
    if ! crontab -l 2>/dev/null | grep -q "automated_stress_monitor.sh"; then
        (crontab -l 2>/dev/null || true; cat "$SCRIPT_DIR/crontab_config") | crontab -
        echo "   ✅ Crontab entries added"
    else
        echo "   ⚠️  Entries already exist in crontab"
    fi
else
    echo "   ⏭️  Skipped - add manually with: crontab -e"
fi

# 3. Setup logrotate (requires sudo)
echo ""
echo "3. Logrotate Configuration"
if [[ $EUID -eq 0 ]]; then
    cp "$SCRIPT_DIR/logrotate_config" /etc/logrotate.d/f1r3fly-stress-tests
    echo "   ✅ Logrotate configuration installed"
else
    echo "   To install logrotate config, run as root:"
    echo "   sudo cp $SCRIPT_DIR/logrotate_config /etc/logrotate.d/f1r3fly-stress-tests"
fi

# 4. Create Prometheus metrics directory
echo ""
echo "4. Prometheus Metrics Setup"
METRICS_DIR="/var/lib/prometheus/node-exporter"
if [[ -d "$METRICS_DIR" ]]; then
    if [[ -w "$METRICS_DIR" ]]; then
        touch "$METRICS_DIR/f1r3fly_stress_test.prom"
        echo "   ✅ Prometheus metrics file created"
    else
        echo "   ⚠️  Prometheus directory exists but not writable"
        echo "   Run: sudo touch $METRICS_DIR/f1r3fly_stress_test.prom"
        echo "        sudo chown ubuntu:ubuntu $METRICS_DIR/f1r3fly_stress_test.prom"
    fi
else
    echo "   ℹ️  Prometheus node-exporter not found - metrics will be skipped"
fi

# 5. Test the monitoring script
echo ""
echo "5. Testing monitoring script..."
if "$SCRIPT_DIR/automated_stress_monitor.sh" --help &>/dev/null; then
    echo "   ✅ Monitoring script is working"
else
    echo "   ❌ Monitoring script test failed"
    exit 1
fi

# 6. Summary
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Verify crontab entries: crontab -l"
echo "2. Check first test run: tail -f ~/logs/f1r3fly/stress_tests/cron.log"
echo "3. Monitor metrics (if Prometheus installed)"
echo ""
echo "Manual test run:"
echo "  $SCRIPT_DIR/automated_stress_monitor.sh quick"
echo ""
echo "Log locations:"
if [[ -d "/var/log/f1r3fly" ]]; then
    echo "  /var/log/f1r3fly/stress_tests/*.log"
else
    echo "  $HOME/logs/f1r3fly/stress_tests/*.log"
fi
echo "=========================================="