# ASI:Chain - How we launch?

This instruction describes how we launch testnet of ASI:Chain blockchain network.
Stay tuned for updates.

## System Requirements

- **RAM**: 16GB minimum (Docker Desktop needs 8GB allocated on macOS)
- **CPU**: 4+ cores
- **Storage**: 50GB free
- **Network**: Stable connection, no strict firewall

Software Requirments:

## Check versions
```bash
docker --version          # Need: 20.10+
docker compose version    # Need: 2.0+
java -version            # Need: OpenJDK 11 or 17
git --version            # Need: 2.0+
cargo --version          # Need: 1.70+
```

## macOS Setup
```bash
brew install openjdk@17 sbt rust
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export PATH="$JAVA_HOME/bin:$PATH"
```

## Ubuntu Setup
```bash
sudo apt update
sudo apt install -y openjdk-17-jdk sbt docker.io docker-compose
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Project Structure
```
asichain/
├── node/
│   └── docker/
├── cli/
│      └── rust-client/
│               └── node-cli/
```

## Setup ASI:Chain

### Clone ASI Chain repository

```bash
git clone --recursive https://github.com/asi-alliance/asi-chain.git
cd asi-chain
```

The `--recursive` flag automatically initializes the `node/` submodule.

If you already cloned without `--recursive`, initialize the submodule:
```bash
git submodule update --init --recursive
```

### Setup CLI

```bash
# Clone CLI tools (from asi-chain root directory)
mkdir -p cli
cd cli
git clone https://github.com/asi-alliance/asi-chain-client
cd asi-chain-client
git checkout asi-main-scala

# Test CLI is working
cargo run --

# Return to project root
cd ../../../
```

### Build Chain

We used `amamata/asi-scala-node:latest` docker image for ASI:Chain

Here we launch 1 bootstrap node and 3 validator nodes:

```bash
cd chain/genesis
docker compose -f shard.yml up -d
```

Important: Need some time, that blockchain fully initializes (few minutes).

In logs you should see:
* Peers: 4
* Approved state for block Block #0 (875f655e81...) with empty parents (supposedly genesis) is successfully restored.

This indicates the readiness of the blockchain.

Next we launch observer:

```bash
docker compose -f devnet-observer/observer.yml up -d
```

### Launch one more validator.

For external validators, use the dedicated setup guide:

**For Complete Instructions:**
See [chain/validator/README.md](validator/README.md)

#### Create bond (stake)

Return to directory with CLI
```
asichain/
├── ...
│   └── ...
├── cli/
│      └── rust-client/
│               └── node-cli/
```

Check current bonds:
```bash
cargo run -- bonds -p 40402
```

We already have 4 bonds, so we can launch one more validator.

Deploy bond contract with validator4 private key to bootsrap node

```bash
cargo run -- bond-validator --private-key <PRIVATE KEY>
```

2. **Configure Environment:**
   ```bash
   cp conf/validator.env .env
   # Edit .env with your validator settings:
   # - VALIDATOR_PRIVATE_KEY, VALIDATOR_PUBLIC_KEY, VALIDATOR_ADDRESS
   # - EXEC_NODE_HOST (executor node for bonding)
   # - VALIDATOR_HOST (your validator's host)
   ```

3. **Start Validator:**
   ```bash
   docker compose -f validator.yml up -d
   ```
   The connector utility will automatically bond your validator to the network.

4. **Verify Synchronization:**
   - Check your validator: `http://<YOUR_VALIDATOR_HOST>:40443/api/last-finalized-block`
   - Compare with observer: `http://<OBSERVER_HOST>:<OBSERVER_HTTP_PORT>/api/last-finalized-block`

For complete external validator setup instructions, see [chain/validator/README.md](validator/README.md).
