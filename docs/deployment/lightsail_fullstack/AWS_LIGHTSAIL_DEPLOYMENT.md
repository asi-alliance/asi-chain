# F1R3FLY AWS Lightsail Deployment Guide

This guide walks through deploying a complete F1R3FLY testnet on AWS Lightsail using the automated deployment script.

## Prerequisites

### Local Machine Requirements
- SSH client
- Git (to clone the repository)
- Terminal/command line access

### AWS Lightsail Requirements
- Active AWS account with Lightsail access
- Lightsail instance (recommended: 4GB RAM minimum, Ubuntu 24.04 LTS)
- SSH key pair for instance access

## Step 1: Create Lightsail Instance

1. **Go to AWS Lightsail Console**
2. **Create instance:**
   - Platform: Linux/Unix
   - Blueprint: Ubuntu 24.04 LTS
   - Instance plan: $20/month (4GB RAM) or higher
   - Instance name: `f1r3fly-testnet` (or your preference)
   - Download the default SSH key or use existing one

3. **Wait for instance to be "Running"**

4. **IMPORTANT: Attach Static IP**
   - Go to "Networking" tab in Lightsail console
   - Click "Create static IP"
   - Select your instance from dropdown
   - Name it (e.g., `f1r3fly-static-ip`)
   - Click "Create"
   
   **Why this matters:**
   - Dynamic IPs change when instance stops/starts
   - Static IP ensures consistent access to your testnet
   - Free while attached to running instance
   - Small charge only if not attached to any instance

5. **Enable Automatic Snapshots**
   - Go to your instance page
   - Click on "Snapshots" tab
   - Click "Enable automatic snapshots"
   - Choose snapshot time (e.g., 3:00 AM UTC)
   - Set retention: Keep last 7 days (or adjust as needed)
   
   **Benefits:**
   - Automatic daily backups
   - Quick disaster recovery
   - Can restore to any previous state
   - First 20GB of snapshots are free

6. **Optional: Connect Custom Domain**
   - Go to "Networking" → "Domains & DNS" in Lightsail console
   - Click "Create DNS zone"
   - Enter your domain name (e.g., `testnet.yourdomain.com`)
   - Click "Create DNS zone"
   
   **Add DNS Records:**
   - Click "Add record"
   - Type: `A record`
   - Subdomain: `@` (for root) or subdomain name
   - Resolves to: Select your static IP
   - Click "Save"
   
   **Update Domain Registrar:**
   - Copy the Lightsail name servers shown
   - Update NS records at your domain registrar
   - DNS propagation takes 24-48 hours
   
   **Benefits:**
   - Access testnet via `testnet.yourdomain.com` instead of IP
   - Professional appearance for public testnets
   - Easy to remember and share
   - Can add multiple subdomains (api.testnet.yourdomain.com, etc.)

## Step 2: Configure Networking

### Open Required Ports

1. **In Lightsail Console, click on your instance**
2. **Go to "Networking" tab**
3. **Add firewall rules:**

#### Option A: Open All Ports (Testing Only)
- Click "+ Add rule"
- Application: `Custom`
- Protocol: `All`
- Port or range: `All`
- Click "Create"

#### Option B: Specific Ports (Recommended)
Add these Custom TCP rules:
- `40400-40405` - Bootstrap node
- `40410-40415` - Validator1
- `40420-40425` - Validator2
- `40440-40445` - Validator4
- `40450-40455` - Observer

## Step 3: Prepare Deployment Files

### On Your Local Machine

```bash
# Clone the repository
git clone https://github.com/your-org/asi-chain.git
cd asi-chain

# Create deployment archive
tar --exclude='f1r3fly/docker/data/*' \
    --exclude='rust-client/target/*' \
    --exclude='*.log' \
    -czf f1r3fly-deployment.tar.gz \
    scripts/deploy-f1r3fly-complete-v2.sh \
    scripts/apply-f1r3fly-patches.sh \
    scripts/generate-f1r3fly-validator-keys.sh \
    f1r3fly/ \
    rust-client/ \
    patches/

# Copy to Lightsail instance
scp -i ~/path/to/lightsail-key.pem \
    f1r3fly-deployment.tar.gz \
    ubuntu@<YOUR-INSTANCE-IP>:~/
```

## Step 4: Install Prerequisites on Lightsail

### SSH into your instance
```bash
ssh -i ~/path/to/lightsail-key.pem ubuntu@<YOUR-INSTANCE-IP>
```

### Run installation script
```bash
# Extract deployment files
tar -xzf f1r3fly-deployment.tar.gz

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
rm get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install build dependencies
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev protobuf-compiler

# Log out and back in for docker group to take effect
exit
```

## Step 5: Deploy F1R3FLY Testnet

### SSH back into instance
```bash
ssh -i ~/path/to/lightsail-key.pem ubuntu@<YOUR-INSTANCE-IP>
```

### Run deployment script
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run the complete deployment (10-15 minutes)
./scripts/deploy-f1r3fly-complete-v2.sh --cleanup --reset
```

### Monitor deployment progress
```bash
# The script will show progress in real-time
# You can also check logs:
tail -f deployment.log

# Check Docker containers
docker ps

# View container logs
docker logs rnode.bootstrap
docker logs rnode.validator1
docker logs autopropose
```

## Step 6: Verify Deployment

### Check node status via API
```bash
# From your local machine
curl http://<YOUR-INSTANCE-IP>:40401/api/status | jq .
curl http://<YOUR-INSTANCE-IP>:40411/api/status | jq .
curl http://<YOUR-INSTANCE-IP>:40453/api/status | jq .  # Observer node
```

### Expected output
- 4 bonded validators (bootstrap, validator1, validator2, validator4)
- Blocks being proposed every 30 seconds
- All containers running healthy

### Testing with Rust Client
```bash
# Build rust client locally
cd rust-client
cargo build --release

# Check node status
./target/release/node_cli status --host <YOUR-INSTANCE-IP> --port 40403

# Check wallet balance (use Observer node for exploratory deploys)
./target/release/node_cli wallet-balance \
  --address 1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g \
  --host <YOUR-INSTANCE-IP> --port 40452

# Perform transfer (use Validator1 ports)
./target/release/node_cli transfer \
  --to-address 11112bV5w5j69MPUbLVysfD21aCrZdB5d5eCiQGpWxGhQLYjHt6z4 \
  --amount 100 \
  --private-key <YOUR-PRIVATE-KEY> \
  --port 40412 --http-port 40413 \
  --host <YOUR-INSTANCE-IP>
```

## Network Architecture

```
Internet
    |
AWS Lightsail Firewall
    |
Your Instance
    |
    ├── Bootstrap Node (40400-40405)
    ├── Validator1 (40410-40415)
    ├── Validator2 (40420-40425)
    ├── Validator4 (40440-40445)
    ├── Observer (40450-40455)
    └── Autopropose Service
```

## Service Endpoints

Once deployed, your testnet is accessible at:

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Bootstrap API | `http://<IP>:40401/api/` | Main API endpoint |
| Bootstrap gRPC | `<IP>:40402` | gRPC operations |
| Bootstrap HTTP | `http://<IP>:40403/api/` | HTTP API |
| Validator1 API | `http://<IP>:40411/api/` | Validator1 queries |
| Validator1 gRPC | `<IP>:40412` | Validator1 gRPC (for transfers/bonding) |
| Validator1 HTTP | `http://<IP>:40413/api/` | Validator1 HTTP API |
| Validator2 API | `http://<IP>:40421/api/` | Validator2 queries |
| Validator2 gRPC | `<IP>:40422` | Validator2 gRPC |
| Validator4 gRPC | `<IP>:40442` | Validator4 gRPC |
| Observer gRPC | `<IP>:40452` | Read-only node (for balance checks) |
| Observer API | `http://<IP>:40453/api/` | Observer HTTP API |

**Important Notes:**
- Use Observer node (40452) for exploratory deploys and balance checks
- Use Validator1 ports (40412/40413) for transfers and bonding operations
- Bootstrap node cannot propose blocks (not a genesis validator)

## Useful Commands

### Start/Stop Services
```bash
# Stop all services
cd f1r3fly/docker
docker-compose -f shard-with-autopropose.yml down

# Start all services
docker-compose -f shard-with-autopropose.yml up -d

# Restart specific service
docker restart rnode.bootstrap
docker restart autopropose
```

### Check Logs
```bash
# View all logs
docker-compose -f shard-with-autopropose.yml logs

# Follow specific service logs
docker logs -f rnode.validator1
docker logs -f autopropose
```

### Deploy Smart Contract
```bash
curl -X POST http://<IP>:40401/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "term": "new out(`rho:io:stdout`) in { out!(\"Hello F1R3FLY!\") }",
    "phloLimit": 100000,
    "phloPrice": 1,
    "deployer": "your-deployer-key"
  }'
```

## Troubleshooting

### Issue: Rust client build fails
**Solution**: Build directly on server with required dependencies
```bash
# Install protobuf compiler (required for rust client)
sudo apt-get update
sudo apt-get install -y protobuf-compiler

# Clone and build rust client on server
git clone https://github.com/your-org/rust-client.git
cd rust-client
cargo build --release

# Alternative: Use wrapper script to bypass rust build
# Create a simple deployment wrapper that uses Docker directly
```

### Issue: Containers not starting
**Solution**: Check Docker daemon
```bash
sudo systemctl status docker
sudo systemctl restart docker
docker ps -a  # Check all containers including stopped
```

### Issue: Cannot access API endpoints
**Solution**: Verify firewall rules
1. Check Lightsail Networking tab
2. Ensure ports 40400-40455 are open
3. Test with: `telnet <IP> 40401`

### Issue: Out of memory
**Solution**: Upgrade instance
- Minimum: 4GB RAM
- Recommended: 8GB RAM for stable operation

## Cleanup

To completely remove the deployment:
```bash
# Stop and remove all containers
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q) --force

# Clean volumes and cache
docker volume rm $(docker volume ls -q)
docker system prune --all --volumes --force

# Remove deployment files
rm -rf f1r3fly/ rust-client/ patches/ scripts/
```

## Cost Optimization

### Lightsail Pricing (as of 2024)
- $10/month: 2GB RAM (minimum, may struggle)
- $20/month: 4GB RAM (recommended minimum)
- $40/month: 8GB RAM (optimal performance)
- **Static IP**: Free while attached, $0.005/hour if unattached
- **Snapshots**: First 20GB free, then $0.05/GB per month

### Tips
- **Enable automatic snapshots** for daily backups
- **Keep static IP attached** to avoid charges
- Stop instance when not in use (still charged for storage)
- Set up billing alerts in AWS
- Clean up old snapshots beyond retention needs
- Release static IP if destroying instance permanently

## Security Considerations

### Production Recommendations
1. **Restrict firewall rules** to specific IPs instead of "All"
2. **Use SSH key authentication** only (disable password auth)
3. **Regular updates**: `sudo apt update && sudo apt upgrade`
4. **Monitor logs** for suspicious activity
5. **Backup regularly** using Lightsail snapshots
6. **Use HTTPS** with SSL certificates for API endpoints
7. **Change default keys** in production deployments

## Support

For issues specific to:
- **F1R3FLY deployment**: Check `F1R3FLY_DEPLOYMENT_GUIDE.md`
- **AWS Lightsail**: AWS Support or Lightsail documentation
- **Docker issues**: Check container logs with `docker logs <container>`
- **Network issues**: Verify firewall rules and instance networking

## Next Steps

After successful deployment:
1. Test smart contract deployments
2. Connect wallet applications
3. Monitor network performance
4. Set up monitoring/alerting
5. Document your validator keys securely
6. Consider setting up additional validator nodes