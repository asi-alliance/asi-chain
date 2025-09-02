#!/bin/bash
# ASI Chain Automated Security Check
# This script runs comprehensive security checks and generates reports

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECURITY_DIR="$PROJECT_ROOT/security"
REPORTS_DIR="$SECURITY_DIR/reports"
LOG_FILE="$REPORTS_DIR/security-check.log"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Initialize log file
echo "ASI Chain Security Check - $(date)" > "$LOG_FILE"

log "🔐 Starting ASI Chain Security Assessment"
log "====================================="

# Check if required tools are installed
check_prerequisites() {
    log "📋 Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for Node.js
    if ! command -v node >/dev/null 2>&1; then
        missing_tools+("node")
    fi
    
    # Check for npm
    if ! command -v npm >/dev/null 2>&1; then
        missing_tools+("npm")
    fi
    
    # Check for Docker
    if ! command -v docker >/dev/null 2>&1; then
        missing_tools+("docker")
    fi
    
    # Check for git
    if ! command -v git >/dev/null 2>&1; then
        missing_tools+("git")
    fi
    
    # Check for curl
    if ! command -v curl >/dev/null 2>&1; then
        missing_tools+("curl")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All prerequisites are available"
}

# Run secrets scanning
scan_secrets() {
    log "🔍 Scanning for exposed secrets..."
    
    local secrets_found=0
    
    # Check for common secret patterns
    local secret_patterns=(
        "AKIA[0-9A-Z]{16}"  # AWS Access Keys
        "aws_secret_access_key"
        "password.*="
        "secret.*="
        "token.*="
        "api.*key"
        "private.*key"
        "-----BEGIN.*PRIVATE KEY-----"
    )
    
    for pattern in "${secret_patterns[@]}"; do
        local matches=$(grep -r -i "$pattern" "$PROJECT_ROOT" \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            --exclude-dir=build \
            --exclude-dir=dist \
            --exclude="*.log" \
            --exclude="security-check.sh" \
            2>/dev/null | wc -l)
        
        if [ "$matches" -gt 0 ]; then
            log_warning "Found $matches potential secrets matching pattern: $pattern"
            secrets_found=$((secrets_found + matches))
        fi
    done
    
    if [ "$secrets_found" -eq 0 ]; then
        log_success "No exposed secrets detected"
    else
        log_error "Found $secrets_found potential secret exposures"
    fi
    
    echo "$secrets_found" > "$REPORTS_DIR/secrets_count.txt"
}

# Scan dependencies for vulnerabilities
scan_dependencies() {
    log "📦 Scanning dependencies for vulnerabilities..."
    
    local total_vulns=0
    
    # Find all package.json files
    find "$PROJECT_ROOT" -name "package.json" -not -path "*/node_modules/*" | while read -r package_file; do
        local dir=$(dirname "$package_file")
        log "Scanning dependencies in: $dir"
        
        if [ -f "$dir/package-lock.json" ] || [ -f "$dir/yarn.lock" ]; then
            cd "$dir"
            
            # Run npm audit
            if npm audit --json > "$REPORTS_DIR/npm-audit-$(basename "$dir").json" 2>/dev/null; then
                local vulns=$(jq '.metadata.vulnerabilities.total // 0' "$REPORTS_DIR/npm-audit-$(basename "$dir").json" 2>/dev/null || echo "0")
                total_vulns=$((total_vulns + vulns))
                
                if [ "$vulns" -gt 0 ]; then
                    log_warning "Found $vulns vulnerabilities in $dir"
                else
                    log_success "No vulnerabilities found in $dir"
                fi
            else
                log_warning "Could not run npm audit in $dir"
            fi
        else
            log_warning "No lock file found in $dir - skipping audit"
        fi
    done
    
    echo "$total_vulns" > "$REPORTS_DIR/dependency_vulns.txt"
}

# Check Docker security
scan_docker() {
    log "🐳 Scanning Docker configurations..."
    
    local docker_issues=0
    
    # Find Dockerfile and docker-compose files
    find "$PROJECT_ROOT" -name "Dockerfile*" -o -name "docker-compose*.yml" | while read -r docker_file; do
        log "Scanning Docker file: $docker_file"
        
        # Check for security issues
        local issues=(
            "FROM.*:latest"  # Using latest tag
            "USER root"      # Running as root
            "ADD http"       # Using ADD with HTTP
            "--password"     # Password in command
        )
        
        for issue in "${issues[@]}"; do
            if grep -q "$issue" "$docker_file" 2>/dev/null; then
                log_warning "Docker security issue in $docker_file: $issue"
                docker_issues=$((docker_issues + 1))
            fi
        done
    done
    
    if [ "$docker_issues" -eq 0 ]; then
        log_success "No Docker security issues detected"
    else
        log_error "Found $docker_issues Docker security issues"
    fi
    
    echo "$docker_issues" > "$REPORTS_DIR/docker_issues.txt"
}

# Check file permissions
check_permissions() {
    log "🔒 Checking file permissions..."
    
    local perm_issues=0
    
    # Check for world-writable files
    local writable_files=$(find "$PROJECT_ROOT" -type f -perm -002 \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        2>/dev/null | wc -l)
    
    if [ "$writable_files" -gt 0 ]; then
        log_warning "Found $writable_files world-writable files"
        perm_issues=$((perm_issues + writable_files))
    fi
    
    # Check for executable files in web directories
    local web_dirs=("public" "static" "assets" "www")
    for dir in "${web_dirs[@]}"; do
        if [ -d "$PROJECT_ROOT/$dir" ]; then
            local exec_files=$(find "$PROJECT_ROOT/$dir" -type f -executable 2>/dev/null | wc -l)
            if [ "$exec_files" -gt 0 ]; then
                log_warning "Found $exec_files executable files in web directory: $dir"
                perm_issues=$((perm_issues + exec_files))
            fi
        fi
    done
    
    if [ "$perm_issues" -eq 0 ]; then
        log_success "No permission issues detected"
    else
        log_error "Found $perm_issues permission issues"
    fi
    
    echo "$perm_issues" > "$REPORTS_DIR/permission_issues.txt"
}

# Check SSL/TLS configuration
check_ssl_config() {
    log "🔐 Checking SSL/TLS configuration..."
    
    local ssl_issues=0
    
    # Check for insecure SSL configurations
    local ssl_patterns=(
        "ssl.*false"
        "rejectUnauthorized.*false"
        "NODE_TLS_REJECT_UNAUTHORIZED.*0"
        "verify.*false"
    )
    
    for pattern in "${ssl_patterns[@]}"; do
        local matches=$(grep -r -i "$pattern" "$PROJECT_ROOT" \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            --include="*.js" \
            --include="*.ts" \
            --include="*.json" \
            --include="*.yml" \
            --include="*.yaml" \
            2>/dev/null | wc -l)
        
        if [ "$matches" -gt 0 ]; then
            log_warning "Found $matches potential SSL/TLS issues: $pattern"
            ssl_issues=$((ssl_issues + matches))
        fi
    done
    
    if [ "$ssl_issues" -eq 0 ]; then
        log_success "No SSL/TLS configuration issues detected"
    else
        log_error "Found $ssl_issues SSL/TLS configuration issues"
    fi
    
    echo "$ssl_issues" > "$REPORTS_DIR/ssl_issues.txt"
}

# Run custom JavaScript security scanner
run_custom_scanner() {
    log "🔍 Running custom security scanner..."
    
    if [ -f "$SECURITY_DIR/scanning/security-scanner.js" ]; then
        cd "$PROJECT_ROOT"
        if node "$SECURITY_DIR/scanning/security-scanner.js" > "$REPORTS_DIR/custom-scan.log" 2>&1; then
            log_success "Custom security scan completed"
        else
            log_warning "Custom security scan had issues (check custom-scan.log)"
        fi
    else
        log_warning "Custom security scanner not found, skipping"
    fi
}

# Generate security score
calculate_security_score() {
    log "📊 Calculating security score..."
    
    local secrets=0
    local dep_vulns=0
    local docker_issues=0
    local perm_issues=0
    local ssl_issues=0
    
    # Read issue counts
    [ -f "$REPORTS_DIR/secrets_count.txt" ] && secrets=$(cat "$REPORTS_DIR/secrets_count.txt")
    [ -f "$REPORTS_DIR/dependency_vulns.txt" ] && dep_vulns=$(cat "$REPORTS_DIR/dependency_vulns.txt")
    [ -f "$REPORTS_DIR/docker_issues.txt" ] && docker_issues=$(cat "$REPORTS_DIR/docker_issues.txt")
    [ -f "$REPORTS_DIR/permission_issues.txt" ] && perm_issues=$(cat "$REPORTS_DIR/permission_issues.txt")
    [ -f "$REPORTS_DIR/ssl_issues.txt" ] && ssl_issues=$(cat "$REPORTS_DIR/ssl_issues.txt")
    
    # Calculate score (100 points maximum)
    local total_issues=$((secrets + dep_vulns + docker_issues + perm_issues + ssl_issues))
    local score=$((100 - (total_issues * 2))) # Deduct 2 points per issue
    
    # Ensure score doesn't go below 0
    [ "$score" -lt 0 ] && score=0
    
    # Generate security grade
    local grade=""
    if [ "$score" -ge 90 ]; then
        grade="A+"
    elif [ "$score" -ge 80 ]; then
        grade="A"
    elif [ "$score" -ge 70 ]; then
        grade="B"
    elif [ "$score" -ge 60 ]; then
        grade="C"
    elif [ "$score" -ge 50 ]; then
        grade="D"
    else
        grade="F"
    fi
    
    # Save results
    cat > "$REPORTS_DIR/security-summary.json" <<EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "score": $score,
    "grade": "$grade",
    "issues": {
        "secrets": $secrets,
        "dependencies": $dep_vulns,
        "docker": $docker_issues,
        "permissions": $perm_issues,
        "ssl": $ssl_issues,
        "total": $total_issues
    }
}
EOF
    
    log "📊 Security Score: $score/100 (Grade: $grade)"
    log "🔍 Total Issues Found: $total_issues"
    
    return $total_issues
}

# Generate HTML report
generate_html_report() {
    log "📄 Generating HTML security report..."
    
    local summary_file="$REPORTS_DIR/security-summary.json"
    
    if [ -f "$summary_file" ]; then
        local score=$(jq -r '.score' "$summary_file")
        local grade=$(jq -r '.grade' "$summary_file")
        local timestamp=$(jq -r '.timestamp' "$summary_file")
        local total_issues=$(jq -r '.issues.total' "$summary_file")
        
        cat > "$REPORTS_DIR/security-report.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASI Chain Security Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .score { font-size: 3em; font-weight: bold; color: #2e7d32; }
        .grade { font-size: 2em; margin: 10px 0; }
        .timestamp { color: #666; font-size: 0.9em; }
        .section { margin: 30px 0; }
        .issue-card { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .critical { border-left-color: #dc3545; }
        .warning { border-left-color: #ffc107; }
        .success { border-left-color: #28a745; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ ASI Chain Security Report</h1>
            <div class="score">$score/100</div>
            <div class="grade">Grade: $grade</div>
            <div class="timestamp">Generated: $timestamp</div>
        </div>
        
        <div class="section">
            <h2>Security Metrics</h2>
            <div class="metric">
                <div class="metric-value">$total_issues</div>
                <div class="metric-label">Total Issues</div>
            </div>
            $(jq -r '.issues | to_entries[] | "<div class=\"metric\"><div class=\"metric-value\">\(.value)</div><div class=\"metric-label\">\(.key | ascii_upcase)</div></div>"' "$summary_file")
        </div>
        
        <div class="section">
            <h2>Recommendations</h2>
            <div class="issue-card">
                <h3>🔐 Secrets Management</h3>
                <p>Implement AWS Secrets Manager or similar service for API keys and passwords</p>
            </div>
            <div class="issue-card">
                <h3>🛡️ Security Headers</h3>
                <p>Deploy comprehensive security headers (CSP, HSTS, X-Frame-Options)</p>
            </div>
            <div class="issue-card">
                <h3>🔒 Database Security</h3>
                <p>Enable SSL/TLS encryption for all database connections</p>
            </div>
            <div class="issue-card">
                <h3>⚡ API Security</h3>
                <p>Implement rate limiting, input validation, and CORS policies</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Next Steps</h2>
            <ol>
                <li>Address critical and high-severity issues first</li>
                <li>Implement automated security scanning in CI/CD</li>
                <li>Regular dependency updates and security patches</li>
                <li>Security team review of all configurations</li>
                <li>Penetration testing before production deployment</li>
            </ol>
        </div>
    </div>
</body>
</html>
EOF
        
        log_success "HTML report generated: $REPORTS_DIR/security-report.html"
    else
        log_error "Could not generate HTML report - summary file not found"
    fi
}

# Send notification (can be customized for your notification system)
send_notification() {
    local score="$1"
    local total_issues="$2"
    
    log "📢 Sending security notification..."
    
    # Example: Send to webhook, email, or Slack
    # curl -X POST "YOUR_WEBHOOK_URL" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"score\": $score, \"issues\": $total_issues, \"message\": \"ASI Chain security scan completed\"}"
    
    log "Notification: Security scan completed with score $score/100 ($total_issues issues)"
}

# Main execution
main() {
    log "🚀 Starting comprehensive security assessment"
    
    # Run all security checks
    check_prerequisites
    scan_secrets
    scan_dependencies
    scan_docker
    check_permissions
    check_ssl_config
    run_custom_scanner
    
    # Calculate score and generate reports
    if calculate_security_score; then
        local total_issues=$?
        generate_html_report
        
        # Get final score
        local score=$(jq -r '.score' "$REPORTS_DIR/security-summary.json" 2>/dev/null || echo "0")
        
        send_notification "$score" "$total_issues"
        
        log_success "Security assessment completed!"
        log "📊 Final Score: $score/100"
        log "📄 Reports available in: $REPORTS_DIR"
        
        # Exit with error code if security issues found
        if [ "$total_issues" -gt 0 ]; then
            log_warning "Security issues detected - review reports and fix issues"
            exit 1
        else
            log_success "No security issues detected! ✅"
            exit 0
        fi
    else
        log_error "Security assessment failed"
        exit 1
    fi
}

# Handle script interruption
trap 'log "Security scan interrupted"; exit 1' INT TERM

# Run main function
main "$@"