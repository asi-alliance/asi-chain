# Security & Credentials Guide

## 🔐 Security Overview

This document contains sensitive information about credentials, access management, and security protocols for ASI Chain. **Treat this document as CONFIDENTIAL**.

## ⚠️ Immediate Security Actions

### Day 1 - Critical Tasks

1. **Rotate ALL credentials after handover**
2. **Generate new SSH keys for production**
3. **Change all database passwords**
4. **Update Hasura admin secrets**
5. **Rotate API keys and tokens**
6. **Enable 2FA on all accounts**
7. **Audit access logs**

## 🔑 Credential Locations

### SSH Keys

| Key | Location | Purpose | Action Required |
|-----|----------|---------|-----------------|
| Production SSH | `XXXXXXX.pem` | AWS Lightsail access | ROTATE IMMEDIATELY |
| Backup SSH | [To be provided] | Emergency access | Generate new pair |

```bash
# Set correct permissions for SSH key
chmod 600 XXXXXXX.pem

# Test SSH access
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

# Generate new SSH key pair
ssh-keygen -t ed25519 -f ~/.ssh/asi_chain_prod -C "asi-chain-prod"
```

### Environment Files

| Service | File | Sensitive Data | Priority |
|---------|------|----------------|----------|
| Indexer | `indexer/.env` | DB passwords, API keys | CRITICAL |
| Wallet | `asi_wallet_v2/.env` | WalletConnect ID | HIGH |
| Explorer | `explorer/.env.production.secure` | API endpoints | MEDIUM |
| Faucet | `faucet/.env` | Private keys, DB | CRITICAL |

### Database Credentials

```bash
# Production Database
Host: 13.251.66.61
Port: 5432
Database: asichain
Username: indexer
Password: [CHECK indexer/.env]

# Local Development
Host: localhost
Port: 5432
Database: asichain
Username: indexer
Password: indexer_pass

# Connection string format
postgresql://username:password@host:port/database
```

### API Secrets

| Service | Secret | Current Value | Location |
|---------|--------|---------------|----------|
| Hasura Admin | `HASURA_ADMIN_SECRET` | myadminsecretkey | `indexer/.env` |
| WalletConnect | `WALLETCONNECT_PROJECT_ID` | [To be provided] | `asi_wallet_v2/.env` |
| Faucet Private Key | `PRIVATE_KEY` | [NEVER COMMIT] | `faucet/.env` |

## 🛡️ Security Best Practices

### 1. Credential Management

```bash
# Never commit secrets
echo ".env" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore

# Use environment variables
export ASI_DB_PASSWORD="$(openssl rand -base64 32)"
export HASURA_ADMIN_SECRET="$(uuidgen)"

# Store in secure vault (recommended)
# Use AWS Secrets Manager, HashiCorp Vault, or similar
```

### 2. SSH Security

```bash
# Generate strong SSH key
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/asi_prod

# Add to SSH config
cat >> ~/.ssh/config << EOF
Host asi-prod
    HostName 13.251.66.61
    User ubuntu
    IdentityFile ~/.ssh/asi_prod
    StrictHostKeyChecking yes
    ServerAliveInterval 60
EOF

# Use SSH agent
ssh-add ~/.ssh/asi_prod

# Connect using config
ssh asi-prod
```

### 3. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER monitor WITH PASSWORD 'strong_password_here';
GRANT CONNECT ON DATABASE asichain TO monitor;
GRANT USAGE ON SCHEMA public TO monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor;

-- Revoke unnecessary privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Enable SSL connections only
-- Add to postgresql.conf:
-- ssl = on
-- ssl_cert_file = 'server.crt'
-- ssl_key_file = 'server.key'
```

### 4. API Security

```javascript
// Hasura security headers
const headers = {
  'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
  'X-Hasura-Role': 'user',
  'X-Hasura-User-Id': userId
};

// Rate limiting
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
  message: 'Too many requests'
};

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
};
```

## 🔒 Production Access

### AWS Lightsail Access

```bash
# Login to AWS Console
URL: https://lightsail.aws.amazon.com/
Region: ap-southeast-1 (Singapore)
Account ID: [To be provided]
IAM User: [To be provided]

# Required permissions
- Lightsail:*
- EC2:DescribeInstances
- CloudWatch:GetMetricStatistics
```

### Server Access Matrix

| Server | IP | Port | Protocol | Purpose |
|--------|----|----|----------|---------|
| Production | 13.251.66.61 | 22 | SSH | Server management |
| Production | 13.251.66.61 | 3000 | HTTP | Wallet UI |
| Production | 13.251.66.61 | 3001 | HTTP | Explorer UI |
| Production | 13.251.66.61 | 5050 | HTTP | Faucet API |
| Production | 13.251.66.61 | 8080 | HTTP | GraphQL |
| Production | 13.251.66.61 | 9090 | HTTP | Indexer API |
| Production | 13.251.66.61 | 40413 | HTTP | Validator1 |
| Production | 13.251.66.61 | 40453 | HTTP | Observer |

### Firewall Rules

```bash
# Current firewall configuration
Port 22: SSH (Restricted to specific IPs)
Port 80: HTTP (Public)
Port 443: HTTPS (Public)
Port 3000-3003: Web apps (Public)
Port 5050: Faucet (Public)
Port 5432: PostgreSQL (Internal only)
Port 6379-6380: Redis (Internal only)
Port 8080: Hasura (Public - NEEDS RESTRICTION)
Port 9090-9091: APIs (Public)
Port 40400-40455: Blockchain (Public)

# Recommended changes
- Restrict port 8080 to specific IPs
- Add rate limiting to all public ports
- Enable fail2ban for SSH
- Implement IP whitelisting
```

## 🚨 Incident Response

### Security Breach Protocol

1. **Immediate Actions**
   ```bash
   # Disconnect from network
   docker-compose down
   
   # Backup current state
   docker exec asi-indexer-db pg_dump -U indexer asichain > emergency_backup.sql
   
   # Check access logs
   sudo tail -n 1000 /var/log/auth.log
   docker logs asi-rust-indexer --since 1h
   ```

2. **Containment**
   ```bash
   # Change all passwords immediately
   # Revoke all API keys
   # Rotate SSH keys
   # Enable firewall lockdown
   sudo ufw default deny incoming
   sudo ufw allow from YOUR_IP to any port 22
   ```

3. **Investigation**
   ```bash
   # Check for unauthorized access
   last -n 50
   who
   w
   
   # Review Docker containers
   docker ps -a
   docker images
   
   # Check for modified files
   find / -mtime -1 -type f 2>/dev/null
   ```

## 🔑 Blockchain Keys

### Validator Keys

**⚠️ CRITICAL: These are TEST keys - MUST be replaced in production!**

```bash
# Location of validator keys
f1r3fly/docker/genesis/bonds.txt
f1r3fly/docker/genesis/wallets.txt

# Default deployer address (TEST ONLY)
Address: 1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g
Private Key: [NEVER SHARE OR COMMIT]

# Generate new keys for production
cd rust-client
./target/release/node_cli keygen
```

### Faucet Wallet

```bash
# Current faucet wallet (ROTATE IMMEDIATELY)
Address: [Check faucet/.env]
Private Key: [Check faucet/.env - NEVER COMMIT]
Balance: Monitor at http://13.251.66.61:3001

# Generate new faucet wallet
cd rust-client
./target/release/node_cli keygen
# Fund with appropriate amount
# Update faucet/.env with new credentials
```

## 📋 Security Audit Checklist

### Daily Checks
- [ ] Review SSH access logs
- [ ] Check Docker container status
- [ ] Monitor API rate limits
- [ ] Verify SSL certificates
- [ ] Check disk usage

### Weekly Checks
- [ ] Audit user permissions
- [ ] Review firewall rules
- [ ] Check for security updates
- [ ] Backup verification
- [ ] Log rotation status

### Monthly Checks
- [ ] Rotate API keys
- [ ] Update dependencies
- [ ] Security scan (npm audit, safety)
- [ ] Penetration testing
- [ ] Disaster recovery drill

## 🔄 Credential Rotation Procedures

### 1. Database Password Rotation

```bash
# Connect to production
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

# Change PostgreSQL password
docker exec -it asi-indexer-db psql -U postgres
ALTER USER indexer WITH PASSWORD 'new_secure_password';
\q

# Update all .env files
sed -i 's/old_password/new_secure_password/g' indexer/.env

# Restart services
docker-compose restart
```

### 2. Hasura Admin Secret Rotation

```bash
# Generate new secret
export NEW_SECRET=$(openssl rand -base64 32)

# Update environment
echo "HASURA_ADMIN_SECRET=$NEW_SECRET" >> indexer/.env

# Restart Hasura
docker restart asi-hasura

# Update all client configurations
```

### 3. SSH Key Rotation

```bash
# Generate new key pair
ssh-keygen -t ed25519 -f ~/.ssh/asi_new -C "asi-prod-new"

# Add to authorized_keys on server
ssh-copy-id -i ~/.ssh/asi_new.pub ubuntu@13.251.66.61

# Test new key
ssh -i ~/.ssh/asi_new ubuntu@13.251.66.61

# Remove old key from authorized_keys
# Update local SSH config
```

## 🔍 Monitoring & Alerting

### Security Monitoring Setup

```bash
# Install monitoring tools
sudo apt-get install -y fail2ban auditd aide

# Configure fail2ban for SSH
sudo nano /etc/fail2ban/jail.local
[sshd]
enabled = true
maxretry = 3
bantime = 3600

# Setup log monitoring
tail -f /var/log/auth.log | grep -E "(Failed|Accepted)"

# Docker security scanning
docker scan asi-wallet:latest
```

### Alert Configuration

```yaml
# Prometheus alerts (alerting.rules.yml)
groups:
  - name: security
    rules:
      - alert: UnauthorizedAccess
        expr: rate(nginx_http_requests_total{status=~"401|403"}[5m]) > 10
        annotations:
          summary: "High rate of unauthorized access attempts"
      
      - alert: SSHBruteForce
        expr: rate(fail2ban_banned_ips[1h]) > 5
        annotations:
          summary: "Possible SSH brute force attack"
```

## 🚫 Common Security Mistakes to Avoid

1. **Never commit credentials to Git**
2. **Don't use default passwords**
3. **Avoid running containers as root**
4. **Don't expose database ports publicly**
5. **Never share private keys**
6. **Don't disable SSL verification**
7. **Avoid hardcoding secrets in code**
8. **Don't use production data in development**
9. **Never skip security updates**
10. **Don't ignore security warnings**

## 📞 Security Contacts

### Internal Escalation
- Security Lead: [To be filled]
- DevOps Lead: [To be filled]
- On-call Engineer: [To be filled]

### External Resources
- AWS Support: [Account specific]
- Docker Security: security@docker.com
- GitHub Security: https://github.com/security

### Incident Reporting
1. Document the incident
2. Notify security lead immediately
3. Preserve evidence
4. Follow incident response protocol
5. Post-incident review

## ✅ Handover Security Checklist

### Outgoing Team
- [ ] All credentials documented
- [ ] Access logs exported
- [ ] Security scan completed
- [ ] Vulnerabilities documented
- [ ] Handover credentials securely

### Incoming Team  
- [ ] All credentials received
- [ ] Access verified
- [ ] Credentials rotated
- [ ] Security tools configured
- [ ] Monitoring enabled
- [ ] Backup access tested
- [ ] Emergency procedures reviewed

## 📚 Next Steps

After securing credentials:
1. Continue to [04-ARCHITECTURE.md](04-ARCHITECTURE.md)
2. Review system architecture
3. Set up monitoring
4. Configure alerts

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Classification**: CONFIDENTIAL  
**Next Review**: Monthly