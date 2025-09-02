// ASI Chain Security Scanner
// This module provides automated vulnerability scanning and security monitoring

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SecurityScanner {
    constructor(options = {}) {
        this.options = {
            scanPath: options.scanPath || process.cwd(),
            outputPath: options.outputPath || './security-reports',
            severity: options.severity || 'medium', // low, medium, high, critical
            includeDevDependencies: options.includeDevDependencies || false,
            ...options
        };
        
        this.vulnerabilities = [];
        this.securityRules = this.loadSecurityRules();
    }

    loadSecurityRules() {
        return {
            // Secrets detection patterns
            secrets: [
                {
                    name: 'AWS Access Key',
                    pattern: /AKIA[0-9A-Z]{16}/g,
                    severity: 'critical'
                },
                {
                    name: 'AWS Secret Key',
                    pattern: /[A-Za-z0-9/+=]{40}/g,
                    severity: 'critical'
                },
                {
                    name: 'API Key',
                    pattern: /[aA][pP][iI]_?[kK][eE][yY].*['"]\s*[:=]\s*['"][0-9a-zA-Z]{32,}['"]/g,
                    severity: 'high'
                },
                {
                    name: 'Database Password',
                    pattern: /[pP][aA][sS][sS][wW][oO][rR][dD].*['"]\s*[:=]\s*['"][^'"]{8,}['"]/g,
                    severity: 'high'
                },
                {
                    name: 'Private Key',
                    pattern: /-----BEGIN.*PRIVATE KEY-----/g,
                    severity: 'critical'
                },
                {
                    name: 'JWT Secret',
                    pattern: /[jJ][wW][tT].*[sS][eE][cC][rR][eE][tT].*['"]\s*[:=]\s*['"][^'"]{16,}['"]/g,
                    severity: 'high'
                },
                {
                    name: 'Generic Secret',
                    pattern: /[sS][eE][cC][rR][eE][tT].*['"]\s*[:=]\s*['"][^'"]{16,}['"]/g,
                    severity: 'medium'
                }
            ],
            
            // Security anti-patterns
            antiPatterns: [
                {
                    name: 'SQL Injection Risk',
                    pattern: /['"]\s*\+\s*.*\s*\+\s*['"].*query|execute|select|insert|update|delete/gi,
                    severity: 'high'
                },
                {
                    name: 'XSS Risk - innerHTML',
                    pattern: /innerHTML\s*=\s*.*[+]/g,
                    severity: 'medium'
                },
                {
                    name: 'Eval Usage',
                    pattern: /eval\s*\(/g,
                    severity: 'high'
                },
                {
                    name: 'Weak Crypto',
                    pattern: /md5|sha1|DES|RC4/gi,
                    severity: 'medium'
                },
                {
                    name: 'HTTP URLs in Production',
                    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g,
                    severity: 'low'
                },
                {
                    name: 'Debug Code',
                    pattern: /console\.log|debugger;|TODO.*security|FIXME.*security/gi,
                    severity: 'low'
                }
            ],
            
            // Insecure configurations
            configurations: [
                {
                    name: 'Wildcard CORS',
                    pattern: /['"]\*['"].*cors|origin.*['"]\*['"]/gi,
                    severity: 'high'
                },
                {
                    name: 'Disabled SSL Verification',
                    pattern: /rejectUnauthorized.*false|NODE_TLS_REJECT_UNAUTHORIZED.*0/gi,
                    severity: 'critical'
                },
                {
                    name: 'Weak Session Config',
                    pattern: /secure.*false|httpOnly.*false/gi,
                    severity: 'medium'
                }
            ],
            
            // File permission issues
            permissions: [
                {
                    name: 'World Writable Files',
                    check: 'permissions',
                    severity: 'high'
                },
                {
                    name: 'Executable Scripts',
                    extensions: ['.sh', '.py', '.js'],
                    severity: 'medium'
                }
            ]
        };
    }

    async runComprehensiveScan() {
        console.log('🔍 Starting ASI Chain Security Scan...');
        
        try {
            await this.createOutputDirectory();
            
            // Run all scan types
            await this.scanForSecrets();
            await this.scanForVulnerabilities();
            await this.scanDependencies();
            await this.scanConfigurations();
            await this.scanFilePermissions();
            await this.scanDockerImages();
            
            // Generate report
            const report = await this.generateReport();
            await this.saveReport(report);
            
            console.log(`✅ Security scan completed. Report saved to ${this.options.outputPath}`);
            return report;
            
        } catch (error) {
            console.error('❌ Security scan failed:', error.message);
            throw error;
        }
    }

    async createOutputDirectory() {
        try {
            await fs.access(this.options.outputPath);
        } catch {
            await fs.mkdir(this.options.outputPath, { recursive: true });
        }
    }

    async scanForSecrets() {
        console.log('🔐 Scanning for exposed secrets...');
        
        const files = await this.getFilesToScan([
            '.js', '.ts', '.json', '.yaml', '.yml', '.env', '.conf', '.config'
        ]);
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.scanFileForSecrets(file, content);
            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }
    }

    async scanFileForSecrets(filePath, content) {
        for (const rule of this.securityRules.secrets) {
            const matches = content.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    this.addVulnerability({
                        type: 'secret',
                        name: rule.name,
                        severity: rule.severity,
                        file: filePath,
                        line: this.getLineNumber(content, match),
                        evidence: this.maskSensitiveData(match),
                        recommendation: `Remove ${rule.name} from source code and use environment variables or secret management`
                    });
                });
            }
        }
    }

    async scanForVulnerabilities() {
        console.log('🔍 Scanning for security vulnerabilities...');
        
        const files = await this.getFilesToScan([
            '.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.sql'
        ]);
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.scanFileForVulnerabilities(file, content);
            } catch (error) {
                continue;
            }
        }
    }

    async scanFileForVulnerabilities(filePath, content) {
        // Scan for anti-patterns
        for (const rule of this.securityRules.antiPatterns) {
            const matches = content.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    this.addVulnerability({
                        type: 'vulnerability',
                        name: rule.name,
                        severity: rule.severity,
                        file: filePath,
                        line: this.getLineNumber(content, match),
                        evidence: match.substring(0, 100),
                        recommendation: this.getRecommendation(rule.name)
                    });
                });
            }
        }
        
        // Scan for configuration issues
        for (const rule of this.securityRules.configurations) {
            const matches = content.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    this.addVulnerability({
                        type: 'configuration',
                        name: rule.name,
                        severity: rule.severity,
                        file: filePath,
                        line: this.getLineNumber(content, match),
                        evidence: match,
                        recommendation: this.getRecommendation(rule.name)
                    });
                });
            }
        }
    }

    async scanDependencies() {
        console.log('📦 Scanning dependencies for vulnerabilities...');
        
        try {
            // Check for package.json files
            const packageFiles = await this.findFiles('package.json');
            
            for (const packageFile of packageFiles) {
                await this.scanPackageFile(packageFile);
            }
            
            // Run npm audit if available
            await this.runNpmAudit();
            
        } catch (error) {
            console.warn('⚠️ Dependency scan failed:', error.message);
        }
    }

    async scanPackageFile(packagePath) {
        try {
            const content = await fs.readFile(packagePath, 'utf8');
            const packageData = JSON.parse(content);
            
            // Check for outdated dependencies
            if (packageData.dependencies) {
                await this.checkDependencyVersions(packagePath, packageData.dependencies, 'production');
            }
            
            if (this.options.includeDevDependencies && packageData.devDependencies) {
                await this.checkDependencyVersions(packagePath, packageData.devDependencies, 'development');
            }
            
        } catch (error) {
            this.addVulnerability({
                type: 'dependency',
                name: 'Invalid package.json',
                severity: 'medium',
                file: packagePath,
                evidence: error.message,
                recommendation: 'Fix package.json syntax errors'
            });
        }
    }

    async checkDependencyVersions(packagePath, dependencies, type) {
        const outdatedPackages = [];
        
        for (const [name, version] of Object.entries(dependencies)) {
            // Check for wildcards or loose version constraints
            if (version.includes('*') || version.includes('^') || version.includes('~')) {
                this.addVulnerability({
                    type: 'dependency',
                    name: 'Loose Dependency Version',
                    severity: 'low',
                    file: packagePath,
                    evidence: `${name}: ${version}`,
                    recommendation: 'Use exact version numbers for better security'
                });
            }
        }
    }

    async runNpmAudit() {
        try {
            const auditResult = execSync('npm audit --json', { 
                encoding: 'utf8',
                cwd: this.options.scanPath,
                timeout: 30000
            });
            
            const audit = JSON.parse(auditResult);
            
            if (audit.vulnerabilities) {
                Object.entries(audit.vulnerabilities).forEach(([name, vuln]) => {
                    this.addVulnerability({
                        type: 'dependency',
                        name: `Vulnerable Dependency: ${name}`,
                        severity: this.mapNpmSeverity(vuln.severity),
                        file: 'package.json',
                        evidence: vuln.via?.[0]?.title || 'Known vulnerability',
                        recommendation: `Update ${name} to version ${vuln.fixAvailable?.version || 'latest'}`
                    });
                });
            }
            
        } catch (error) {
            // npm audit not available or failed
            console.warn('⚠️ npm audit failed:', error.message);
        }
    }

    async scanConfigurations() {
        console.log('⚙️ Scanning configuration files...');
        
        const configFiles = await this.getFilesToScan([
            '.conf', '.config', '.ini', '.yaml', '.yml', '.json'
        ]);
        
        for (const file of configFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.scanConfigurationFile(file, content);
            } catch (error) {
                continue;
            }
        }
    }

    async scanConfigurationFile(filePath, content) {
        // Check for insecure configurations
        const insecurePatterns = [
            { pattern: /debug\s*=\s*true/gi, name: 'Debug Mode Enabled', severity: 'medium' },
            { pattern: /ssl\s*=\s*false/gi, name: 'SSL Disabled', severity: 'high' },
            { pattern: /password\s*=\s*['"']?[^'"\s]{1,7}['"']?/gi, name: 'Weak Password', severity: 'high' },
            { pattern: /127\.0\.0\.1|localhost/g, name: 'Localhost in Production Config', severity: 'low' }
        ];
        
        insecurePatterns.forEach(rule => {
            const matches = content.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    this.addVulnerability({
                        type: 'configuration',
                        name: rule.name,
                        severity: rule.severity,
                        file: filePath,
                        line: this.getLineNumber(content, match),
                        evidence: match,
                        recommendation: `Review and secure ${rule.name.toLowerCase()}`
                    });
                });
            }
        });
    }

    async scanFilePermissions() {
        console.log('🔒 Scanning file permissions...');
        
        const files = await this.getFilesToScan();
        
        for (const file of files) {
            try {
                const stats = await fs.stat(file);
                const mode = (stats.mode & parseInt('777', 8)).toString(8);
                
                // Check for world-writable files
                if (mode.endsWith('2') || mode.endsWith('3') || mode.endsWith('6') || mode.endsWith('7')) {
                    this.addVulnerability({
                        type: 'permission',
                        name: 'World Writable File',
                        severity: 'high',
                        file: file,
                        evidence: `File mode: ${mode}`,
                        recommendation: 'Remove world write permissions'
                    });
                }
                
                // Check for executable files in web directories
                if (stats.mode & 0o111 && this.isWebFile(file)) {
                    this.addVulnerability({
                        type: 'permission',
                        name: 'Executable Web File',
                        severity: 'medium',
                        file: file,
                        evidence: `Executable web file: ${mode}`,
                        recommendation: 'Remove execute permissions from web files'
                    });
                }
                
            } catch (error) {
                continue;
            }
        }
    }

    async scanDockerImages() {
        console.log('🐳 Scanning Docker configurations...');
        
        const dockerFiles = await this.findFiles('Dockerfile*');
        
        for (const dockerFile of dockerFiles) {
            try {
                const content = await fs.readFile(dockerFile, 'utf8');
                await this.scanDockerFile(dockerFile, content);
            } catch (error) {
                continue;
            }
        }
    }

    async scanDockerFile(filePath, content) {
        const dockerRules = [
            { pattern: /FROM.*:latest/gi, name: 'Latest Tag Usage', severity: 'medium' },
            { pattern: /USER root/gi, name: 'Running as Root', severity: 'high' },
            { pattern: /ADD\s+http/gi, name: 'HTTP ADD Command', severity: 'medium' },
            { pattern: /--password|--passwd/gi, name: 'Password in Build Args', severity: 'high' }
        ];
        
        dockerRules.forEach(rule => {
            const matches = content.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    this.addVulnerability({
                        type: 'docker',
                        name: rule.name,
                        severity: rule.severity,
                        file: filePath,
                        line: this.getLineNumber(content, match),
                        evidence: match,
                        recommendation: this.getDockerRecommendation(rule.name)
                    });
                });
            }
        });
    }

    async getFilesToScan(extensions = null) {
        const files = [];
        const excludePatterns = [
            /node_modules/,
            /\.git/,
            /build/,
            /dist/,
            /coverage/,
            /\.tmp/,
            /temp/
        ];
        
        const scanDirectory = async (dir) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (excludePatterns.some(pattern => pattern.test(fullPath))) {
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (entry.isFile()) {
                        if (!extensions || extensions.some(ext => fullPath.endsWith(ext))) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };
        
        await scanDirectory(this.options.scanPath);
        return files;
    }

    async findFiles(pattern) {
        const files = [];
        
        const searchDirectory = async (dir) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory() && !fullPath.includes('node_modules')) {
                        await searchDirectory(fullPath);
                    } else if (entry.isFile() && entry.name.match(pattern)) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };
        
        await searchDirectory(this.options.scanPath);
        return files;
    }

    addVulnerability(vulnerability) {
        this.vulnerabilities.push({
            ...vulnerability,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
        });
    }

    getLineNumber(content, match) {
        const lines = content.substring(0, content.indexOf(match)).split('\n');
        return lines.length;
    }

    maskSensitiveData(data) {
        if (data.length <= 8) return '***masked***';
        return data.substring(0, 4) + '***' + data.substring(data.length - 4);
    }

    getRecommendation(ruleName) {
        const recommendations = {
            'SQL Injection Risk': 'Use parameterized queries or prepared statements',
            'XSS Risk - innerHTML': 'Use textContent or sanitize HTML input',
            'Eval Usage': 'Avoid eval() and use safer alternatives',
            'Weak Crypto': 'Use strong cryptographic algorithms (AES-256, SHA-256+)',
            'Wildcard CORS': 'Specify allowed origins explicitly',
            'Disabled SSL Verification': 'Enable SSL certificate verification',
            'Latest Tag Usage': 'Use specific version tags for Docker images',
            'Running as Root': 'Create and use a non-root user in Docker'
        };
        
        return recommendations[ruleName] || 'Review and fix security issue';
    }

    getDockerRecommendation(ruleName) {
        const recommendations = {
            'Latest Tag Usage': 'Use specific version tags instead of latest',
            'Running as Root': 'Add USER directive to run as non-root user',
            'HTTP ADD Command': 'Use COPY instead of ADD for local files',
            'Password in Build Args': 'Use Docker secrets or multi-stage builds'
        };
        
        return recommendations[ruleName] || 'Fix Docker security issue';
    }

    mapNpmSeverity(npmSeverity) {
        const mapping = {
            'info': 'low',
            'low': 'low',
            'moderate': 'medium',
            'high': 'high',
            'critical': 'critical'
        };
        
        return mapping[npmSeverity] || 'medium';
    }

    isWebFile(filePath) {
        const webExtensions = ['.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.php'];
        return webExtensions.some(ext => filePath.endsWith(ext));
    }

    async generateReport() {
        const summary = this.generateSummary();
        const groupedVulnerabilities = this.groupVulnerabilities();
        
        return {
            metadata: {
                scanDate: new Date().toISOString(),
                scanPath: this.options.scanPath,
                totalFiles: await this.countFiles(),
                scanDuration: this.getScanDuration()
            },
            summary,
            vulnerabilities: groupedVulnerabilities,
            recommendations: this.generateRecommendations()
        };
    }

    generateSummary() {
        const summary = {
            total: this.vulnerabilities.length,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            byType: {}
        };
        
        this.vulnerabilities.forEach(vuln => {
            summary[vuln.severity]++;
            summary.byType[vuln.type] = (summary.byType[vuln.type] || 0) + 1;
        });
        
        return summary;
    }

    groupVulnerabilities() {
        const grouped = {};
        
        this.vulnerabilities.forEach(vuln => {
            if (!grouped[vuln.type]) {
                grouped[vuln.type] = [];
            }
            grouped[vuln.type].push(vuln);
        });
        
        // Sort by severity within each type
        Object.keys(grouped).forEach(type => {
            grouped[type].sort((a, b) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            });
        });
        
        return grouped;
    }

    generateRecommendations() {
        const recommendations = [
            'Implement secrets management for API keys and passwords',
            'Enable security headers (CSP, HSTS, X-Frame-Options)',
            'Use parameterized queries to prevent SQL injection',
            'Implement input validation and sanitization',
            'Keep dependencies updated and monitor for vulnerabilities',
            'Use HTTPS everywhere and disable HTTP in production',
            'Implement proper error handling without exposing sensitive data',
            'Set up automated security scanning in CI/CD pipeline'
        ];
        
        return recommendations;
    }

    async countFiles() {
        const files = await this.getFilesToScan();
        return files.length;
    }

    getScanDuration() {
        // Implementation would track scan start/end times
        return 'N/A';
    }

    async saveReport(report) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(this.options.outputPath, `security-report-${timestamp}.json`);
        
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Also save a human-readable version
        const htmlReport = this.generateHTMLReport(report);
        const htmlPath = path.join(this.options.outputPath, `security-report-${timestamp}.html`);
        await fs.writeFile(htmlPath, htmlReport);
        
        console.log(`📊 Security report saved to: ${reportPath}`);
        console.log(`📊 HTML report saved to: ${htmlPath}`);
    }

    generateHTMLReport(report) {
        // Generate a basic HTML report
        return `
<!DOCTYPE html>
<html>
<head>
    <title>ASI Chain Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .critical { color: #d32f2f; }
        .high { color: #f57c00; }
        .medium { color: #fbc02d; }
        .low { color: #388e3c; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .vulnerability { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
    </style>
</head>
<body>
    <h1>ASI Chain Security Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total vulnerabilities: ${report.summary.total}</p>
        <p>Critical: <span class="critical">${report.summary.critical}</span></p>
        <p>High: <span class="high">${report.summary.high}</span></p>
        <p>Medium: <span class="medium">${report.summary.medium}</span></p>
        <p>Low: <span class="low">${report.summary.low}</span></p>
    </div>
    <h2>Vulnerabilities</h2>
    ${Object.entries(report.vulnerabilities).map(([type, vulns]) => `
        <h3>${type.toUpperCase()}</h3>
        ${vulns.map(vuln => `
            <div class="vulnerability">
                <h4 class="${vuln.severity}">${vuln.name}</h4>
                <p><strong>File:</strong> ${vuln.file}</p>
                <p><strong>Severity:</strong> ${vuln.severity}</p>
                <p><strong>Recommendation:</strong> ${vuln.recommendation}</p>
            </div>
        `).join('')}
    `).join('')}
</body>
</html>`;
    }
}

module.exports = SecurityScanner;