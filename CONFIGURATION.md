# Configuration Guide

← [Back to README](README.md)

This guide covers all configuration options for ASI Chain node infrastructure components.

---

## Table of Contents

1. [Validator Configuration](#validator-configuration)
2. [Deployer Bot Configuration](#deployer-bot-configuration)
3. [Network Configuration](#network-configuration)
4. [Docker Configuration](#docker-configuration)

---

## Validator Configuration

Configuration file: `chain/validator/conf/validator.env`

### Chain Configuration Parameters

These parameters define the network connection settings and should not be changed unless connecting to a different network:

**BOOTSTRAP**
- Description: Bootstrap node connection string for network entry
- Format: `rnode://<public_key>@<host>?protocol=<port>&discovery=<port>`
- Default: `rnode://0d1312b556db1d3fa4745fd88c29f8e15095621e@54.152.57.201?protocol=40400&discovery=40404`

**OBSERVER_HOST**
- Description: Observer node's host IP address for blockchain queries
- Default: `54.235.138.68`

**FAUCET_API_URL**
- Description: API endpoint for testnet faucet service
- Default: `https://ffyp8igwwc.execute-api.us-east-1.amazonaws.com`
- Purpose: Automatic wallet funding during validator setup

**BOOTSTRAP_GRPC_PORT**
- Description: Bootstrap node's internal gRPC port
- Default: `40402`
- Purpose: Used for blockchain queries and validator bonding

**BOOTSTRAP_HTTP_PORT**
- Description: Bootstrap node's HTTP API port
- Default: `40403`
- Purpose: REST API access

**OBSERVER_GRPC_PORT**
- Description: Observer node's gRPC port
- Default: `40402`
- Purpose: Used for blockchain queries

**OBSERVER_HTTP_PORT**
- Description: Observer node's HTTP API port
- Default: `40403`
- Purpose: REST API access

**STAKE**
- Description: Amount of tokens to stake when bonding the validator
- Default: `100000000`
- Unit: Smallest token denomination
- Note: The connector utility automatically requests funds from the faucet if wallet balance is insufficient

### Validator Configuration Parameters

These parameters must be configured for each validator node:

**VALIDATOR_HOST**
- Description: Public IP address or hostname of the validator machine
- Required: Yes
- Format: IP address (e.g., `203.0.113.10`)
- Note: Used by other nodes to connect to your validator

**VALIDATOR_PRIVATE_KEY**
- Description: Private key for the validator node
- Required: Yes
- Format: Hexadecimal string
- Security: Keep secure, never commit to version control
- Generation: Use `wallet-generator` utility or leave empty for auto-generation

**VALIDATOR_PUBLIC_KEY**
- Description: Public key corresponding to the validator's private key
- Required: Yes
- Format: Hexadecimal string
- Generation: Automatically generated if using wallet-generator

**VALIDATOR_ADDRESS**
- Description: Blockchain address for the validator wallet
- Required: Yes
- Format: Base58Check encoded address starting with "1111"
- Generation: Automatically derived from public key by wallet-generator

### Configuration Options

**Option A: Auto-generate Credentials**

Leave validator parameters empty in `.env`:
```bash
VALIDATOR_HOST=
VALIDATOR_PRIVATE_KEY=
VALIDATOR_PUBLIC_KEY=
VALIDATOR_ADDRESS=
```

Run the configurator:
```bash
docker compose -f chain/validator/configurator.yml up
```

The configurator will generate new credentials and write them to `.env`.

**Option B: Use Existing Credentials**

Provide all parameters manually:
```bash
VALIDATOR_HOST=203.0.113.10
VALIDATOR_PRIVATE_KEY=b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb
VALIDATOR_PUBLIC_KEY=0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c
VALIDATOR_ADDRESS=1111LAd2PWaHsw84gxarNx99YVK2aZhCThhrPsWTV7cs1BPcvHftP
```

---

## Deployer Bot Configuration

Configuration file: `deployer-bot/.env`

Use `deployer-bot/.env.example` as a template.

**VALIDATOR_PORTS**
- Description: Comma-separated list of validator gRPC ports
- Format: `<PORT>,<PORT>,<PORT>`
- Example: `40412,40422,40432`
- Purpose: Ports for transaction submission

**VALIDATOR_HOSTS**
- Description: Comma-separated list of validator hostnames or IPs
- Format: `<HOST>,<HOST>,<HOST>`
- Example: `validator1.example.com,validator2.example.com,validator3.example.com`
- Purpose: Validator connection endpoints

**VALIDATOR_NODES**
- Description: Comma-separated list of validator names
- Format: `<NAME>,<NAME>,<NAME>`
- Example: `validator1,validator2,validator3`
- Purpose: Node identification in logs

**PRIVATE_KEY**
- Description: Private key for signing transactions
- Format: Hexadecimal string
- Security: Keep secure, never commit to version control

**DELAY_AFTER_DEPLOY**
- Description: Wait time after contract deployment before next action
- Default: `2`
- Unit: Seconds
- Purpose: Allow transaction propagation

**DELAY_AFTER_PROPOSE**
- Description: Wait time after block proposal before next action
- Default: `2`
- Unit: Seconds
- Purpose: Allow block finalization

---

## Network Configuration

### Port Assignments

Validator nodes use the following port configuration:

| Port  | Service | Purpose |
|-------|---------|---------|
| 40440 | Protocol | Node-to-node communication |
| 40441 | gRPC External | Public gRPC API |
| 40442 | gRPC Internal | Internal gRPC API |
| 40443 | HTTP | REST API |
| 40444 | Discovery | Peer discovery |
| 40445 | Admin HTTP | Administrative interface |

### Docker Network

All nodes operate within a Docker network:

**Network Name:** `devnet`

**Configuration:**
```yaml
networks:
  devnet:
    external: false
    name: devnet
```

**Purpose:** Isolates node communication while allowing external access through mapped ports

---

## Docker Configuration

### Validator Node Configuration

Docker Compose file: `chain/validator/validator.yml`

**Image:**
- Source: `public.ecr.aws/f6y9h6x4/asi-chain/node:latest`
- Platform: Linux/amd64
- Base: OpenJDK 17

**Environment Variables:**
```yaml
JAVA_OPTS=-Xss16m -XX:+UseG1GC -XX:MaxGCPauseMillis=200
SBT_OPTS=-Xmx4g -Xss2m -Dsbt.supershell=false
```

**Volumes:**
```yaml
- ./conf/validator.conf:/var/lib/rnode/rnode.conf
- ./conf/logback.xml:/var/lib/rnode/logback.xml
- ./data:/var/lib/rnode/
```

### Deployer Bot Configuration

Docker Compose file: `deployer-bot/deployer.yml`

**Image:** `deployer-bot:latest`

**Build Context:** `deployer-bot/`

**Base Image:** `rust:slim`

**External Network:**
```yaml
networks:
  devnet:
    external: true
    name: devnet
```

---

For development guidance and deployment procedures, see [DEVELOPMENT.md](DEVELOPMENT.md).
