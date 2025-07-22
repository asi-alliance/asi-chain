# Validator Node Setup

This guide describes how you can connect to the ASI:Chain testnet and become a validator using prepared wallet keys.

## Important Notice

We are working on allowing you to create your own wallets and become a validator with your own credentials, but this feature is currently in development.

**For now**: Use our prepared wallet keys from the [`testnet-wallets.txt`](https://github.com/asi-alliance/asi-chain/blob/master/chain/testnet-wallets.txt) file.

## System Requirements

- **RAM**: 16GB minimum (Docker Desktop needs 16GB allocated on macOS)
- **CPU**: 4+ cores
- **Storage**: 50GB free
- **Network**: Stable connection, no strict firewall

## Software Requirements

Verify you have the required software versions:

```bash
docker --version          # Need: 20.10+
docker compose version    # Need: 2.0+
java -version             # Need: OpenJDK 11 or 17
git --version             # Need: 2.0+
cargo --version           # Need: 1.70+
```

## Installation

### macOS Setup
```bash
brew install openjdk@17 sbt rust
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export PATH="$JAVA_HOME/bin:$PATH"
```

### Ubuntu Setup
```bash
sudo apt update
sudo apt install -y openjdk-17-jdk sbt docker.io docker-compose
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Setup

### Generate Private and Public Keys

Use our wallet generator script to generate private and public keys for your wallet.

These keys are required for managing your wallet and validator node.

See more in the [wallet generator instruction](https://github.com/asi-alliance/asi-chain/blob/master/wallet-generator/README.md)

> [!CAUTION]
> Connection of validators with new wallets is under development.

> [!TIP]
> Connection with new wallets is currently not available. **Use our prepared wallet keys sets from the [testnet-wallets.txt file](https://github.com/asi-alliance/asi-chain/blob/master/chain/testnet-wallets.txt)**

## Setup Process

### Step 1: Clone Repository

```bash
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain/chain
```

### Step 2: Configure Environment

Create your `.env` file using `.env.example` as a template:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
VALIDATOR_PRIVATE_KEY=<YOUR-PRIVATE-KEY>
VALIDATOR_HOST=<YOUR-PUBLIC-IP-ADDRESS>
```

> [!TIP]
> Use prepared wallet keys from the [testnet-wallets.txt file](https://github.com/asi-alliance/asi-chain/blob/master/chain/testnet-wallets.txt)

### Step 3: Configure Validator YAML

Edit `validator.yml` to set up ports (or leave defaults):

```yaml
ports:
  - "40400:40400"
  - "40401:40401"
  - "40402:40402"
  - "40403:40403"
  - "40404:40404"
  - "40405:40405"
```

### Step 4: Configure Validator Settings

Edit `conf/validator.conf` and replace the validator keys in the `casper` section:

```hocon
casper {
  validator-public-key = <YOUR-PUBLIC-KEY>
  validator-private-key = <YOUR-PRIVATE-KEY>
}
```

**TIP**: **Use our prepared wallet keys sets from the [testnet-wallets.txt file](https://github.com/asi-alliance/asi-chain/blob/master/chain/testnet-wallets.txt)**

### Step 5: Launch Validator Node

Start your validator:

```bash
sudo docker compose -f validator.yml up -d
```

### Step 6: Monitor Synchronization

Check logs and wait for full sync:

```bash
sudo docker logs validator -f
```

Wait for logs indicating successful synchronization:

```
rnode.readonly  | Approved state for block Block #0 (b22fa19038...) with empty parents (supposedly genesis) is successfully restored.
rnode.readonly  | Received ForkChoiceTipRequest from rnode.validator2
rnode.readonly  | Sending tips [b22fa19038...] to rnode.validator2
rnode.readonly  | Received ForkChoiceTipRequest from rnode.bootstrap
rnode.readonly  | Sending tips [b22fa19038...] to rnode.bootstrap
```

This indicates your node has finished synchronization with the network.

## Testing Your Setup

### Deploy a Smart Contract

```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode \
    --grpc-host localhost \
    --grpc-port "40402" \
    deploy \
    --private-key "<YOUR-PRIVATE-KEY>" \
    --phlo-limit 10000000 \
    --phlo-price 1 \
    --valid-after-block-number 0 \
    --shard-id root \
    "/opt/docker/examples/stdout.rho"
```

Expected response:
```
Response: Success!
DeployId is: 304402206c435cee64d97d123f0c1b4552b3568698e64096a29fb50ec38f11a6c5f7758b022002e05322156bf5ed878ce20cef072cd8faf9e8bb15b58131f2fee06053b5d1c5
```

### Propose a Block

```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode \
    --grpc-host localhost \
    --grpc-port "40402" \
    propose
```

Expected response:
```
Response: Success! Block 4dda69c62838e18abd3c131818e60110ac3caccc66ec05792cedb327a3bafff7 created and added.
```

## Next Steps

- [Troubleshoot common issues](/quick-start/troubleshooting/)
- [Explore interaction examples](/interaction-examples/)
- [Check network configuration](/network-configuration/)

## Getting Help

If you encounter issues:
1. Check [common errors and solutions](/quick-start/troubleshooting/)
2. Visit the [GitHub repository](https://github.com/asi-alliance/asi-chain) for support