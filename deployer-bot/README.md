# ASI Chain: Deployer Bot

← [Back to Main README](../README.md)

Automated deployment bot for continuous contract deployment and block proposal on ASI Chain network. Runs in a Docker container with the Rust client for blockchain interaction.

For configuration details, see [Configuration Guide](../CONFIGURATION.md#deployer-bot-configuration).

---

## Overview

The Deployer Bot automates the process of deploying smart contracts and proposing blocks to ASI Chain validators. It connects to multiple validator nodes, submits transactions, and triggers block production on a continuous schedule.

**Use Cases:**
- Automated testing of smart contracts
- Continuous block production in development networks
- Load testing validator nodes
- Network health monitoring

---

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Access to ASI Chain validator nodes

### Setup and Run

```bash
cd deployer-bot

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build and start
docker build -t deployer-bot:latest .
docker compose -f deployer.yml up -d

# View logs
docker logs -f deployer
```

---

## Configuration

Create `.env` file from `.env.example`:

```bash
VALIDATOR_PORTS=40412,40422,40432
VALIDATOR_HOSTS=validator1.example.com,validator2.example.com,validator3.example.com
VALIDATOR_NODES=validator1,validator2,validator3
PRIVATE_KEY=<your_private_key>
DELAY_AFTER_DEPLOY=2
DELAY_AFTER_PROPOSE=2
```

**Configuration Parameters:**

See [Configuration Guide](../CONFIGURATION.md#deployer-bot-configuration) for detailed parameter descriptions.

**Required:**
- `VALIDATOR_PORTS` - gRPC ports for transaction submission
- `VALIDATOR_HOSTS` - Validator hostnames or IP addresses
- `VALIDATOR_NODES` - Node identifiers for logging
- `PRIVATE_KEY` - Private key for signing transactions (from [wallet-generator](../wallet-generator/))

**Optional:**
- `DELAY_AFTER_DEPLOY` - Wait time after deployment (default: 2 seconds)
- `DELAY_AFTER_PROPOSE` - Wait time after block proposal (default: 2 seconds)

---

## Docker Configuration

### Dockerfile

Base image: `rust:slim`

**Build process:**
1. Install dependencies (make, git, curl, protobuf-compiler, jq)
2. Clone Rust client from https://github.com/singnet/rust-client.git
3. Build Rust client with Cargo
4. Copy deployment script `bot.sh`

**Build command:**
```bash
docker build -t deployer-bot:latest .
```

### Docker Compose

File: `deployer.yml`

**Configuration:**
```yaml
name: deployer

services:
  deployer:
    image: deployer-bot:latest
    container_name: deployer
    env_file:
      - .env
    networks:
      - devnet

networks:
  devnet:
    external: true
    name: devnet
```

**Network:** Connects to the `devnet` external network (must be created before starting the bot).

---

## Operation

### Deployment Script

The bot runs `bot.sh` which performs:

1. **Parse Configuration** - Read environment variables
2. **Connect to Validators** - Establish connections to specified nodes
3. **Deploy Contracts** - Submit smart contract deployments
4. **Propose Blocks** - Request validators to create blocks
5. **Wait and Repeat** - Delay based on configuration, then restart cycle

### Logging

View bot activity:
```bash
docker logs -f deployer
```

**Log format:**
- Deployment transactions with deploy IDs
- Block proposal confirmations with block hashes
- Connection status to validators
- Error messages for failed operations

---

## Management

### Start Bot

```bash
docker compose -f deployer.yml up -d
```

### Stop Bot

```bash
docker compose -f deployer.yml down
```

### Restart with New Configuration

```bash
# Stop bot
docker compose -f deployer.yml down

# Edit configuration
vim .env

# Restart bot (automatically uses new .env)
docker compose -f deployer.yml up -d
```

### View Logs

```bash
# Follow logs in real-time
docker logs -f deployer

# View last 100 lines
docker logs --tail 100 deployer
```

---

## Troubleshooting

### Bot Not Starting

**Check container status:**
```bash
docker ps -a | grep deployer
```

**View error logs:**
```bash
docker logs deployer
```

**Common issues:**
- Network `devnet` doesn't exist: Create with `docker network create devnet`
- Invalid .env format: Check for syntax errors in .env file
- Missing private key: Ensure PRIVATE_KEY is set in .env

### Connection Errors

**"Connection refused":**
- Verify validator nodes are running
- Check VALIDATOR_HOSTS are correct
- Ensure VALIDATOR_PORTS match node configuration

**"Protocol mismatch":**
- Verify Rust client version is compatible with node version
- Rebuild Docker image: `docker build -t deployer-bot:latest .`

### Deployment Failures

**"Insufficient balance":**
- Check wallet balance on the faucet
- Request tokens from https://faucet.dev.asichain.io

**"Invalid signature":**
- Verify PRIVATE_KEY is correct
- Generate new key with [wallet-generator](../wallet-generator/)

---

## Security Considerations

### Private Key Management

**Important:**
- Never commit `.env` file to version control
- Store private keys securely
- Use separate keys for production and development

**File permissions:**
```bash
chmod 600 .env
```

### Network Security

**Docker network isolation:**
- Bot runs in isolated `devnet` network
- Only connects to specified validator hosts
- No public ports exposed by default

**Access control:**
- Limit which hosts can connect to validator gRPC ports
- Use firewall rules to restrict access
- Consider VPN or private network for production

---

## Integration

### With Local Development Network

**Note:** Automated deployment scripts are currently in development. For manual deployment of the complete network including the deployer bot, see [Development Guide](../DEVELOPMENT.md#manual-deployment).

### With External Validators

Configure `.env` to point to external validator endpoints:
```bash
VALIDATOR_HOSTS=54.152.57.201,54.152.57.202,54.152.57.203
VALIDATOR_PORTS=40412,40422,40432
```

---

## Additional Resources

**Related Documentation:**
- [Configuration Guide](../CONFIGURATION.md) - Environment variables
- [Development Guide](../DEVELOPMENT.md) - Building and deployment
- [Main README](../README.md) - Project overview

**External Resources:**
- **Rust Client:** https://github.com/singnet/rust-client
- **ASI Chain Docs:** https://docs.asichain.io
