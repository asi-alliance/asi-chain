# ASI Chain: Node Configurations

← [Back to Main README](../README.md)

This directory contains node configurations for the ASI Chain network, including genesis nodes (bootstrap, validators, observer) and external validator setup.

For detailed configuration instructions, see:
- **[Configuration Guide](../CONFIGURATION.md)** - Environment variables and network settings
- **[Development Guide](../DEVELOPMENT.md)** - Building and deployment procedures

---

## DevNet Configuration

ASI Chain DevNet consists of the following node types:

**Network Topology:**
```
┌─────────────┐
│  Bootstrap  │ ← Genesis node, network entry point
│  (Genesis)  │
└─────┬───────┘
      │
      ├──────────┬──────────┬──────────┐
      │          │          │          │
      ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Validator │ │Validator │ │Validator │ │ Observer │
│    1     │ │    2     │ │    3     │ │(Read-only)│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Node Roles:**
- **Bootstrap (Genesis)** - Initial node that starts the network and coordinates peer discovery
- **Validators 1-3** - Participate in consensus, produce and finalize blocks
- **Observer** - Read-only node for querying blockchain state without participating in consensus

---

## Directory Structure

```
chain/
├── genesis/                    # Genesis node configurations
│   ├── devnet-bootstrap/      # Bootstrap node
│   ├── devnet-validator1/     # Validator 1
│   ├── devnet-validator2/     # Validator 2
│   ├── devnet-validator3/     # Validator 3
│   ├── devnet-observer/       # Observer node
│   └── shard.yml              # Genesis nodes Docker Compose
│
├── validator/                  # External validator setup
│   ├── conf/                  # Configuration files
│   ├── scripts/               # Setup scripts
│   ├── configurator.Dockerfile
│   ├── connector.Dockerfile
│   ├── validator.yml
│   └── README.md              # External validator guide
│
├── testnet-wallets.txt        # Pre-generated wallet keys
├── How-We-Launch.md           # Network launch procedures
└── README.md                  # This file
```

---

## Genesis Nodes

Genesis nodes are pre-configured in the `genesis/` directory and launched together to form the initial network.

### Configuration Files

Each genesis node directory contains:
- `conf/` - Node configuration files (RNode config, logging)
- `genesis/` - Genesis state files (wallets, bonds)
- `*.yml` - Docker Compose configuration

### Launch Genesis Network

**Note:** Automated deployment scripts are currently in development. For manual deployment steps, see [Development Guide](../DEVELOPMENT.md#manual-deployment).

---

## External Validators

External validators can join the existing network after genesis.

**Complete Setup Guide:** [validator/README.md](validator/README.md)

**Quick Overview:**

1. **Build Docker Images**
   ```bash
   cd validator
   docker build -f configurator.Dockerfile -t configurator:latest ../..
   docker build -f connector.Dockerfile -t connector:latest .
   ```

2. **Configure Environment**
   ```bash
   cp conf/validator.env .env
   # Edit .env with validator settings
   ```

3. **Generate or Provide Credentials**
   - Auto-generate: Leave validator parameters empty, run configurator
   - Manual: Provide VALIDATOR_PRIVATE_KEY, VALIDATOR_PUBLIC_KEY, VALIDATOR_ADDRESS

4. **Start Validator**
   ```bash
   docker compose -f validator.yml up -d
   ```

5. **Verify Synchronization**
   - Check local finalized block: `http://localhost:40443/api/last-finalized-block`
   - Compare with network: `http://54.152.57.201:40453/api/last-finalized-block`

For detailed instructions and troubleshooting, see [validator/README.md](validator/README.md).

---

## Network Information

**Official DevNet:**
- **Bootstrap Node:** `rnode://e5e6faf012f36a30176d459ddc0db81435f6f1dc@54.152.57.201?protocol=40400&discovery=40404`
- **Bootstrap HTTP:** http://54.152.57.201:40403
- **Observer HTTP:** http://54.235.138.68:40403

**Documentation Portal:**
- **Main:** https://docs.asichain.io
- **Quick Start:** https://docs.asichain.io/quick-start/join-validator/
- **DevNet Structure:** https://docs.asichain.io/shard-nodes/devnet-structure/

**Web Applications:**
- **ASI Wallet:** https://wallet.dev.asichain.io
- **Block Explorer:** https://explorer.dev.asichain.io
- **Faucet:** https://faucet.dev.asichain.io

---

## Configuration

For detailed configuration options:
- **[Configuration Guide](../CONFIGURATION.md)** - All environment variables
- **[validator/conf/validator.env](validator/conf/validator.env)** - Validator configuration template

---

## Additional Resources

**Validator Setup:**
- [validator/README.md](validator/README.md) - Complete external validator guide
- [validator/Become-ASI-Chain-Validator.md](validator/Become-ASI-Chain-Validator.md) - Validator onboarding (legacy)

**Network Launch:**
- [How-We-Launch.md](How-We-Launch.md) - Network launch procedures
