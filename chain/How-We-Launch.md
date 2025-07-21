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
├── f1r3fly/
│   └── docker/
├── cli/
│      └── f1r3fly/
│               └── node-cli/
```

## Setup ASI:Chain

### Clone repository for chain

```bash
git clone https://github.com/F1R3FLY-io/f1r3fly
cd f1r3fly
# use the main branch
```

### Setup CLI

```bash
mkdir cli
cd cli
git clone https://github.com/F1R3FLY-io/f1r3fly
cd f1r3fly
git checkout preston/rholang_rust
cd node-cli
cargo run --
```

### Build Chain

We used `f1r3flyindustries/f1r3fly-scala-node:latest` docker image for ASI:Chain

Target Directory:

```
asichain/
├── f1r3fly/
│   └── docker/
```

Here we launch 1 bootstrap node and 3 validator nodes:

```bash
docker compose -f shard.yml up -d
```

Important: Need some time, that blockchain fully initializes (few minutes).

In logs you should see:
* Peers: 4
* Approved state for block Block #0 (875f655e81...) with empty parents (supposedly genesis) is successfully restored.

This indicates the readiness of the blockchain.

Next we launch observer:

```
docker compose -f observer.yml up -d
```

### Launch one more validator.

#### Create bond (stake)

Return to directory with CLI
```
asichain/
├── ...
│   └── ...
├── cli/
│      └── f1r3fly/
│               └── node-cli/
```

Check current bonds:
```bash
cargo run -- bonds -p 40453
```

We already have 4 bonds, so we can launch one more validator.

Deploy bond contract with validator4 private key to bootsrap node

```bash
cargo run -- bond-validator --private-key <PRIVATE KEY>
```

We deployed some contracts to other validators:

```bash
cargo run -- deploy -f ../rholang/examples/stdout.rho -p 40412
cargo run -- deploy -f ../rholang/examples/stdout.rho -p 40422
```

And propose new block with our bond (stake):

```bash
cargo run -- propose
```

Checked after some time created block:

```bash
cargo run -- is-finalized -b <block_hash>
```

We check that bonds after some time.  Must be run against observer node. Should now see 5 bonds.

```bash
cargo run -- bonds -p 40453
```

Last step - launch one more validator in separate terminal:

```bash
docker compose -f docker/validator4.yml up
```
