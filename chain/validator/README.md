# ASI Chain: External Validator Setup

← [Back to Chain README](../README.md) | [Configuration Guide](../../CONFIGURATION.md) | [Development Guide](../../DEVELOPMENT.md)

This guide provides complete instructions for deploying an external validator node to the ASI Chain network.

---

## Introduction

Follow these instructions to connect an external validator to the ASI Chain network. The process covers building Docker images, preparing the environment, bonding the validator, running the node, verifying synchronization, testing transaction deployment, and safely stopping the node.

## Requirements

* Docker and docker compose installed
* Rust and Cargo installed (required for the transaction deployment verification)
* Network access to the testnet endpoints specified in this guide

---

## 1. Building Docker Images

All operations are performed from the `chain/validator` directory in the project repository.

### 1.1 Building the Configurator Image

The configurator image handles automatic generation of missing wallet parameters in the environment configuration.

**Dockerfile:** [`configurator.Dockerfile`](./configurator.Dockerfile)  
**Working Directory:** `./chain/validator`  
**Build Command:**
```bash
docker build -f configurator.Dockerfile -t configurator:latest ../..
```

**Important:** The build context must be set to the project root (`../..`) because the build process needs to access the `wallet-generator` utility from the root directory.

### 1.2 Building the Connector Image

The connector image contains a utility container that sends the bonding transaction to register your validator with the network.

**Dockerfile:** [`connector.Dockerfile`](./connector.Dockerfile)  
**Working Directory:** `./chain/validator`  
**Build Command:**
```bash
docker build -f connector.Dockerfile -t connector:latest .
```

### 1.3 Verifying Image Build

Confirm the images were created:

```bash
docker image ls
```

Expected output should include:

| REPOSITORY   | TAG    |
|--------------|--------|
| configurator | latest |
| connector    | latest |

### 1.4 Docker Images

The compose files reference public ECR images by default:
- Configurator: `public.ecr.aws/f6y9h6x4/asi-chain/validator-configurator:latest`
- Connector: `public.ecr.aws/f6y9h6x4/asi-chain/validator-connector:latest`
- Node: `public.ecr.aws/f6y9h6x4/asi-chain/node:latest`

You can use these public images directly, or build local images as described above and update the compose files to use `configurator:latest` and `connector:latest`.

---

## 2. Environment Configuration

### 2.1 Preparing the Configuration File

Copy the template configuration:

```bash
cp conf/validator.env .env
```

The template [`conf/validator.env`](./conf/validator.env) contains two sections:
* **Chain config** — Network parameters (pre-filled, typically don't require changes unless connecting to a different shard)
* **Validator config** — Empty parameters that must be filled

### 2.2 Configuring Validator Parameters

Choose one of the following options:

#### Option A: Generate New Wallet
Leave the validator parameters empty in `.env`. The configurator will:
- Generate new credentials (`VALIDATOR_PRIVATE_KEY`, `VALIDATOR_PUBLIC_KEY`, `VALIDATOR_ADDRESS`)
- Write them to the `.env` file
- Display them in the container logs

#### Option B: Use Existing Wallet
Provide all three parameters in `.env`:
- `VALIDATOR_ADDRESS`
- `VALIDATOR_PUBLIC_KEY`
- `VALIDATOR_PRIVATE_KEY`

### 2.3 Understanding the Stake Parameter

The `STAKE` parameter in the chain config section determines the bonding amount. The connector utility handles funding automatically:
- If wallet balance is sufficient for the stake amount, the utility sends the bonding transaction
- If balance is insufficient, the connector requests funds from the faucet
- If faucet limits are exceeded and balance remains insufficient, the connector exits with an error

### 2.4 Running the Configurator

Execute the configurator:

**Linux/macOS:**
```bash
docker compose -f ./configurator.yml up
```

**Windows PowerShell:**
```powershell
docker compose -f .\configurator.yml up
```

The configurator:
1. Reads the `.env` file
2. Searches for empty required parameters
3. If no wallet parameters are present, generates new credentials
4. If any wallet parameter exists, skips generation (assumes you're using existing credentials)
5. Writes generated parameters back to `.env`

---

## 3. Starting the Validator

### Standard Deployment (Recommended)

The standard deployment runs both bonding and validation with a single command:

**Linux/macOS:**
```bash
docker compose -f ./validator.yml up -d
```

**Windows PowerShell:**
```powershell
docker compose -f .\validator.yml up -d
```

This starts two services:
1. **connector** — A utility container that sends the bonding transaction to register your validator (runs once and exits after successful bonding)
2. **validator** — Runs the validator node

The `-d` flag runs services in detached mode.

### Alternative: Manual Bonding

If you prefer to bond separately before starting the validator:

**Step 1: Run bonding utility**
```bash
docker compose -f ./connector.yml up
```

This starts a utility container that sends the bonding transaction to the network.

Wait for confirmation: `Validator bonded successfully`

The container will exit automatically after successful bonding.

**Step 2: Start validator**
```bash
docker compose -f ./validator.yml up -d
```

---

## 4. Verifying Synchronization

### 4.1 Checking Network Status

1. **Check the observer's latest finalized block:**
   ```
   http://54.235.138.68:40403/api/last-finalized-block
   ```
   If the response contains at least one block, the network is operational.

2. **Check your validator's latest finalized block:**
   Replace the host and port with your validator's HTTP API endpoint (port 40443):
   ```
   http://<YOUR_VALIDATOR_HOST>:40443/api/last-finalized-block
   ```

3. **Evaluate synchronization:**
   - If your validator shows at least one block, synchronization has started
   - When your validator's last block approximately matches the observer's (within ~50 blocks), synchronization is successful
   - If the validator is behind, allow time for it to catch up

---

## 5. Transaction Deployment Verification

Verify your validator can submit transactions to the network:

1. **Clone the Rust client:**
```bash
git clone https://github.com/singnet/rust-client
cd rust-client
```

2. **Deploy a test transaction:**
```bash
cargo run -- full-deploy -f ./rho_examples/stdout.rho --private-key <YOUR_PRIVATE_KEY> -g 40442
```

This confirms that an external validator (not known to the autopropose script) can successfully send transactions to the network.

---

## 6. Stopping the Validator

To stop the validator node:

**Linux/macOS:**
```bash
docker compose -f ./validator.yml stop
```

**Windows PowerShell:**
```powershell
docker compose -f .\validator.yml stop
```

This stops the container without deleting it, preserving state for future restarts.

### 6.1 Data Persistence

The validator stores blockchain data in the `./data` directory (configured as a volume in [`validator.yml`](./validator.yml)). This data persists after stopping the container, which means:
- You can restart the validator without re-synchronizing the blockchain
- The validator will resume from its last state when restarted
- Blockchain data is preserved during container updates

To completely restart with fresh synchronization, you would need to remove the data directory:
```bash
rm -rf ./data
```

---

## Reference Information

### Port Configuration

The validator uses the following ports:

| Port  | Purpose |
|-------|---------|
| 40440 | Protocol port |
| 40441 | API port gRPC external |
| 40442 | API port gRPC internal |
| 40443 | API port HTTP |
| 40444 | Discovery port |
| 40445 | API port admin HTTP |

### Configuration Files

| File | Description |
|------|-------------|
| [`conf/validator.env`](./conf/validator.env) | Configuration template with chain and validator parameters |
| `.env` | Active configuration file |
| [`conf/validator.conf`](./conf/validator.conf) | RNode configuration |
| [`conf/logback.xml`](./conf/logback.xml) | Logging configuration |

### Docker Compose Files

| File | Purpose |
|------|---------|
| [`configurator.yml`](./configurator.yml) | Runs configurator for environment setup |
| [`validator.yml`](./validator.yml) | Main validator with automatic bonding via included connector utility |
| [`connector.yml`](./connector.yml) | Standalone bonding utility (optional, for manual bonding or debugging) |

### Key Parameters in validator.env

**Chain Config:**
- `BOOTSTRAP` — Bootstrap node connection string
- `OBSERVER_HOST` — Observer node host IP address
- `FAUCET_API_URL` — Testnet faucet for automatic funding
- `BOOTSTRAP_GRPC_PORT` — Bootstrap node gRPC port
- `BOOTSTRAP_HTTP_PORT` — Bootstrap node HTTP port
- `OBSERVER_GRPC_PORT` — Observer node gRPC port
- `OBSERVER_HTTP_PORT` — Observer node HTTP port
- `STAKE` — Amount to stake when bonding

**Validator Config:**
- `VALIDATOR_HOST` — Validator's network host
- `VALIDATOR_PRIVATE_KEY` — Private key for validator
- `VALIDATOR_PUBLIC_KEY` — Public key for validator
- `VALIDATOR_ADDRESS` — Validator address

### Network Endpoints

- **Bond Validator Node:** `rnode://0d1312b556db1d3fa4745fd88c29f8e15095621e@54.152.57.201?protocol=40400&discovery=40404`
- **Bootstrap HTTP:** http://54.152.57.201:40403
- **Observer HTTP:** http://54.235.138.68:40403
- **Observer API Example:** http://54.235.138.68:40403/api/last-finalized-block
- **Faucet API:** https://ffyp8igwwc.execute-api.us-east-1.amazonaws.com
- **Repository:** [ASI Chain - External Validator](https://github.com/asi-alliance/asi-chain/chain/validator)
