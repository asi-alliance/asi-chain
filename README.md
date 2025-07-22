<table>
  <tr>
    <td><img src="https://static.cryptobriefing.com/wp-content/uploads/2024/09/11085854/ASI-Alliance-Token-Merger-Reschedule-800x449.png" width="200"></td>
    <td><h1>ASI-Chain Workspace</h1></td>
  </tr>
</table>

This workspace provides the scripts and configuration to deploy a local ASI-Chain test network.

## 🚀 Quick Links

- **[Quick Start Guide](docs-external/GETTING_STARTED.md)** - Get running in 5 minutes
- **[Documentation Index](docs-external/INDEX.md)** - Complete documentation overview
- **[Architecture Overview](docs-external/ARCHITECTURE.md)** - System design and components
- **[Troubleshooting Guide](docs-external/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Repository Operations](docs-external/REPO_OPERATIONS_AND_MAINTENANCE.md)** - Git workflow and maintenance

## 📁 Repository Structure

The workspace is organized into the following directories:

### Core Components
-   **`asi_wallet_v2/`**: Modern React-based cryptocurrency wallet with WalletConnect support. See [Wallet Documentation](docs-external/WALLET.md).
-   **`block-explorer/`**: Python-based blockchain explorer with web interface (Docker supported). See [Explorer Documentation](docs-external/BLOCK_EXPLORER.md).
-   **`chain/`**: ASI Chain configuration and setup files
    - **`conf/`**: Node configuration files
    - **`.env.example`**: Example environment variables configuration
    - **[`Become-ASI-Chain-Validator.md`](chain/Become-ASI-Chain-Validator.md)**: Guide for becoming a validator on the ASI Chain
    - **[`How-We-Launch.md`](chain/How-We-Launch.md)**: Detailed launch process documentation
    - **`README.md`**: Chain-specific documentation
    - **`testnet-wallets.txt`**: List of testnet wallet addresses
    - **`validator.yml`**: Validator configuration template
-   **`contracts/`**: Contains sample Rholang smart contracts.
-   **`finalizer-bot/`**: Contains the Python-based automated finalizer bot and Docker configuration.
-   **`logs/`**: Contains log files from test runs.
-   **`patches/`**: Contains Git patches for fixing upstream issues, particularly the VABN CLI patch.
-   **`scripts/`**: Contains deployment and utility scripts (`deploy.sh`, `docker-flush.sh`).

### Documentation
-   **`docs-external/`**: Contains all project documentation. See [Documentation Index](docs-external/INDEX.md).
-   **`docs/`**: VitePress documentation site source files
    - **[`quick-start/`](docs/quick-start/index.md)**: Getting started guides, message exchange scenarios, and troubleshooting common errors
    - **[`node-image/`](docs/node-image/index.md)**: Node image source information and validator node setup instructions
    - **[`yaml-configuration/`](docs/yaml-configuration/index.md)**: YAML configuration file documentation, parameters, and examples
    - **[`network-access/`](docs/network-access/index.md)**: Explorer and RPC endpoint information, RNode address generation guides
    - **[`network-configuration/`](docs/network-configuration/index.md)**: Network configuration overview, parameters, and topology documentation
    - **[`interaction-examples/`](docs/interaction-examples/index.md)**: Practical examples including smart contracts, block history viewing, and balance checking

### Generated Directories
The `deploy.sh` script will automatically clone the required external repositories:
- **`node/`**: F1R3FLY Scala node from https://github.com/F1R3FLY-io/f1r3fly/
- **`cli/`**: F1R3FLY Rust CLI from https://github.com/F1R3FLY-io/f1r3fly/ (branch: preston/rholang_rust)

The script also applies the VABN patch from `patches/cli-vabn-support.patch` for block 50 compatibility and configures the network during the setup process.

## Automated Finalizer Bot

To ensure continuous block production and network finalization, the testnet includes an automated **[Finalizer Bot](docs-external/FINALIZER_BOT.md)**. This bot is a Python script that runs in its own Docker container (`finalizer-bot`) and performs the following cycle every 2 seconds:

1.  **Queries** the current block number from the observer node.
2.  **Iterates** through all validators including bootstrap (`rnode.bootstrap`, `rnode.validator1`, `rnode.validator2`, `rnode.validator3`).
3.  **Deploys** a unique Rholang contract with `validAfterBlockNumber` set to the current block.
4.  **Proposes** a new block on that same validator.
5.  **Monitors** block progression, especially past block 50.

**Solution to Block 50 Issue**: The finalizer bot uses the patched CLI's `--valid-after-block-number` flag to ensure deploys remain valid beyond block 50. Each deploy is valid for 50 blocks from its creation, allowing indefinite network operation.

### Race Condition and Resolution

A significant challenge during development was a race condition where the `finalizer-bot` container would start and attempt to communicate with the validator nodes before they were fully initialized. This resulted in two primary errors:

1.  `Connection refused`: The node's gRPC server was not yet listening.
2.  `Error: Could not deploy, casper instance was not available yet.`: The gRPC server was up, but the internal Casper consensus engine was not ready to process requests.

The issue was resolved by implementing a robust retry mechanism in the bot's `run_command` function (`finalizer-bot/finalizer.py`). The bot will now attempt to connect up to 10 times with a 2-second delay, specifically catching and retrying on both of the errors mentioned above. This makes the startup sequence resilient to network and service timing issues, allowing the bot to wait patiently until the validators are fully operational.

## Overview of the Blockchain

ASICHAIN (F1R3FLY) is a blockchain platform based on RChain technology using the CBC Casper consensus mechanism. This guide provides comprehensive instructions for deploying and managing a local testnet.

### Key Technical Details

-   **Language**: Scala (node) + Rust (CLI)
-   **Consensus**: CBC Casper with Proof of Stake
-   **Smart Contracts**: Rholang

### Network Port Architecture

The testnet is composed of several node containers, each with specific roles and port mappings. The `node-cli` tool interacts with the nodes by connecting to their external host ports.

| Node Name | Role | External gRPC Port | Internal gRPC Port | CLI Service | Purpose & Usage |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **`boot`** | Bootstrap | `40401` | `40401` | `Deploy` | Send a transaction (e.g., `cargo run -- bond-validator -p 40401 ...`). |
| | | `40402` | `40402` | `Propose` | Request the node to create a block (e.g., `cargo run -- propose -p 40402`). |
| **`validator1`**| Validator | `40411` | `40401` | `Deploy` | Send a transaction directly to this validator. |
| | | `40412` | `40402` | `Propose` | Request this specific validator to create a block. |
| **`validator2`**| Validator | `40421` | `40401` | `Deploy` | Send a transaction directly to this validator. |
| | | `40422` | `40402` | `Propose` | Request this specific validator to create a block. |
| **`validator3`**| Validator | `40431` | `40401` | `Deploy` | Send a transaction directly to this validator. |
| | | `40432` | `40402` | `Propose` | Request this specific validator to create a block. |
| **`readonly`** | **Observer**| **`40453`** | **`40403`** | **`Query`** | **Read blockchain state (e.g., `cargo run -- bonds -p 40453`).** |

---

**Key Architectural Points:**

*   **P2P Communication (`40400`, `40404`)**: The Protocol (`40400`) and Discovery (`40404`) ports are used for internal communication *between* the Docker containers for consensus and peer discovery. They are mapped to external ports (e.g., `40410`, `40414`) but are not typically interacted with directly by the CLI.
*   **Deploying & Proposing (Any Validator)**: While it's common to send initial transactions to the bootstrap node, any validator in the network is capable of accepting a `deploy` or `propose` request on its respective external port. The transaction will then be gossiped to the rest of the network for inclusion in a block.
*   **Querying (Observer Only)**: As demonstrated by the `Exploratory deploy can only be executed on read-only RNode` error, state queries (`bonds`) are a specialized function that **must** be handled by an observer node. The validators' gRPC servers are configured to reject such read-only requests. This is a deliberate design choice to separate the workload of transaction processing from state querying, ensuring network stability and performance.

## 1. Getting Started: Workspace Setup

The first step is to clone this workspace repository, which contains all the necessary scripts, contracts, and configuration files.

```bash
git clone --branch develop https://github.com/asi-alliance/asi-chain.git
cd asi-chain
```

All subsequent commands should be run from within this directory.

## 2. Prerequisites

### System Requirements

- **Operating System**: Linux/macOS (tested on Darwin 24.5.0) or Windows with WSL2
- **Memory**: Minimum 12GB RAM recommended (was 36GB before optimization)
- **Storage**: At least 20GB free space
- **Network**: Stable internet connection for downloading dependencies

### Software Dependencies

Ensure you have the following versions installed:

1. **Git** (2.30+) - For cloning repositories
   ```bash
   # macOS
   brew install git
   
   # Linux
   sudo apt-get install git
   
   # Verify version
   git --version
   ```

2. **Java 17+** - Required JDK version
   ```bash
   # macOS with Homebrew
   brew install openjdk@17
   
   # Configure jenv (recommended)
   brew install jenv
   echo 'export PATH="$HOME/.jenv/bin:$PATH"' >> ~/.zshrc
   echo 'eval "$(jenv init -)"' >> ~/.zshrc
   source ~/.zshrc
   jenv add /usr/local/opt/openjdk@17
   jenv global 17.0
   ```

3. **sbt** (1.9+) - Scala build tool
   ```bash
   # macOS
   brew install sbt
   
   # Linux
   echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
   curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x99E82A75642AC823" | sudo apt-key add
   sudo apt-get update && sudo apt-get install sbt
   
   # Verify version
   sbt --version
   ```

4. **Docker** (20.10+) & **Docker Compose** (2.0+) - For containerized deployment
   ```bash
   # macOS
   brew install --cask docker
   
   # Linux
   sudo apt-get install docker.io docker-compose-plugin
   
   # Verify versions
   docker --version
   docker compose version
   ```

5. **Rust** (1.70+) & **Cargo** - For building the CLI
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   
   # Verify version
   rustc --version
   ```

6. **Make** - Build automation tool (usually pre-installed)
   ```bash
   # Verify installation
   make --version
   ```

## 3. Automated Deployment (Recommended)

An automated script, `scripts/deploy.sh`, is included to handle the entire end-to-end process of cloning dependencies, building components, and launching the network.

### Usage

1.  **Make the script executable:**
    ```bash
    chmod +x scripts/deploy.sh
    ```

2.  **Run the deployment script:**
    ```bash
    ./scripts/deploy.sh
    ```

The script will perform the following actions:
- Clone the `node` and `cli` repositories if they do not already exist.
- **Automatically apply the VABN patch** from `patches/cli-vabn-support.patch` to enable `--valid-after-block-number` support.
- **Copy custom configuration files** from `finalizer-bot/conf/` to `node/docker/conf/` (if present).
- Build the `f1r3fly-scala-node` Docker image using `sbt`.
- Build the patched `node-cli` Rust binary with VABN support.
- Start all testnet services (bootstrap, validators, observer, and finalizer-bot) in the background using Docker Compose.
- Verify that the network is operational by polling the observer node's bond status.

### Configuration Customization

The deployment script now supports custom node configurations. If you have modified configuration files in `finalizer-bot/conf/`, they will automatically replace the default configurations during deployment. This is useful for:
- Adjusting API limits (e.g., `max-blocks-limit`)
- Tuning memory settings
- Modifying network parameters

## 4. Manual Deployment & Interaction

**Note**: The `deploy.sh` script automatically handles all these steps, including cloning repositories. Manual steps are only needed if you want to customize the process.

### 4.1. Build Dependencies

**Important**: The `node/` and `cli/` directories do not exist in the base repository. They must be cloned from external repositories.

1.  **Clone Node & CLI Repositories:**
    ```bash
    # Only needed if not using deploy.sh
    # (From the asi-chain workspace root)
    git clone https://github.com/F1R3FLY-io/f1r3fly/ node
    git clone -b preston/rholang_rust https://github.com/F1R3FLY-io/f1r3fly/ cli
    
    # Apply VABN patch manually (if not using deploy.sh)
    # See patches/cli-vabn-support.patch for details
    cd cli
    patch -p1 < ../patches/cli-vabn-support.patch
    cd ..
    ```
2.  **Compile the Scala Node & Build Docker Image:**
    ```bash
    cd node
    sbt clean compile
    sbt "project node" Docker/publishLocal
    cd ..
    ```
3.  **Build the CLI Tool:**
    ```bash
    cd cli/node-cli
    cargo build --release
    cd ../..
    ```

### 4.2. Start and Verify the Network

1.  **Prepare Docker Compose File:**
    The docker-compose.integrated.yml file is maintained in `finalizer-bot/` directory.
    The `deploy.sh` script automatically copies it to the expected location (`node/docker/`).
    If doing this manually:
    ```bash
    # (From the asi-chain workspace root)
    cp finalizer-bot/docker-compose.integrated.yml node/docker/
    ```
2.  **Start the Network:**
    From the `node` directory, launch all services, including the `finalizer-bot`.
    ```bash
    cd node
    docker compose -f docker/docker-compose.integrated.yml up -d --build finalizer-bot
    cd ..
    ```
3.  **Verify Node Status:**
    Check that all containers are running and healthy.
    ```bash
    docker ps
    ```

### 4.3. Interacting with the CLI

All CLI commands should be run from the `cli/node-cli` directory.

```bash
cd ../cli/node-cli
```

**Key Workflow: Deploy & Propose on the Same Node**

Testing has conclusively shown that the **only reliable method** for getting a transaction included in a block is to send both the `deploy` and `propose` commands to the *same* node.

1.  **Deploy a Contract:**
    Send the deployment to any validator's `Deploy` port (e.g., `40401` for bootstrap).
    ```bash
    # Replace with your private key
    # Note: --valid-after-block-number is now supported (requires patched CLI)
    cargo run --release -- deploy --file ../../contracts/hello.rho --private-key <YOUR_PRIVATE_KEY> -p 40401 --valid-after-block-number 0
    ```
2.  **Propose a Block:**
    Send the proposal to the **same node's** `Propose` port (`40402` for bootstrap).
    ```bash
    cargo run --release -- propose -p 40402
    ```
    A successful response will include the hash of the newly created block, confirming the deployment was included.

## 5. Testing & Documentation

This workspace includes a suite of scripts to automate testing and comprehensive documentation based on the results.

### 5.1. Testing

For testing the network functionality, see the testing section below.

For testing the network functionality:
- Use the manual CLI commands documented in section 4.3
- Monitor the finalizer-bot logs: `docker logs -f finalizer-bot`
- Check network health through the observer node
- Use the block explorer at http://localhost:5001 (if deployed with Docker) or http://localhost:8080 (if running locally)

### 5.2. Documentation

The project includes comprehensive documentation in the `docs-external/` directory. Start with the [Documentation Index](docs-external/INDEX.md) for easy navigation.

#### Essential Documentation
-   **[Getting Started Guide](docs-external/GETTING_STARTED.md)**: Get running in 5 minutes
-   **[Architecture Overview](docs-external/ARCHITECTURE.md)**: System design, components, and data flow diagrams
-   **[Getting Started Guide](docs-external/GETTING_STARTED.md#cli-tutorial)**: Comprehensive guide for the `node-cli` tool
-   **[Troubleshooting Guide](docs-external/TROUBLESHOOTING.md)**: Solutions for common issues

#### Development & Operations
-   **[Documentation Index](docs-external/INDEX.md)**: Overview of all available documentation
-   **[Repository Operations](docs-external/REPO_OPERATIONS_AND_MAINTENANCE.md)**: Git workflow and CI/CD processes
-   **[Troubleshooting Guide](docs-external/TROUBLESHOOTING.md)**: Solutions and known limitations

#### Technical Analysis
-   **[Finalizer Bot](docs-external/FINALIZER_BOT.md)**: Automated block production solution
-   **[Block Explorer](docs-external/BLOCK_EXPLORER.md)**: Real-time blockchain monitoring
-   **[Wallet Guide](docs-external/WALLET.md)**: ASI Wallet v2 documentation

#### Deprecated Documentation
-   **[Architecture Overview](docs-external/ARCHITECTURE.md)**: System design and data flow

For a complete overview of all documentation, see the [Documentation Index](docs-external/INDEX.md).

## 6. Additional Tools

### ASI Wallet v2

A modern, secure cryptocurrency wallet for the ASI Chain:

- **100% Client-Side**: No backend servers, runs entirely in your browser
- **Multi-Account Support**: Manage multiple accounts with AES-256 encryption
- **WalletConnect Integration**: Connect to dApps using QR codes or deep links
- **Integrated Rholang IDE**: Built-in Monaco editor for smart contract development

#### Recent Updates (July 2025)
- **Network Persistence Fix**: Custom network settings now persist across page reloads (Issue #12)
- **Comprehensive Testing**: Added Jest testing framework with 62.88% store coverage
- **LocalStorage Integration**: Automatic synchronization between Redux store and browser storage
- **Build Optimization**: Excluded test files from production builds for smaller bundle size

See the [Wallet Documentation](docs-external/WALLET.md) for usage instructions and installation guide.

### Block Explorer

A comprehensive blockchain explorer for monitoring the ASI Chain:

- **Real-Time Updates**: Auto-refreshing interface with 5-second intervals
- **REV Transfer Tracking**: Monitors and displays all REV token transfers with accurate status
- **Deployment Tracking**: Full deployment history with Rholang code viewing
- **Full Hash Display**: Shows complete 64-character block hashes
- **Dark/Light Themes**: User-selectable themes with persistence
- **Docker Support**: Run in an isolated container with automatic node discovery

#### Docker Deployment (Recommended)
```bash
cd block-explorer
# Build and start the explorer container
docker-compose -f docker-compose.explorer.yml up -d

# View logs
docker logs -f asi-block-explorer

# Access the explorer at http://localhost:5001
```

#### Local Development
```bash
cd block-explorer
pip install -r requirements.txt
python parser/enhanced_parser.py &  # Start the parser
python web/app.py                   # Start the web server (http://localhost:8080)
```

See the [Block Explorer Documentation](docs-external/BLOCK_EXPLORER.md) for more information.

## 7. Troubleshooting

### Common Issues and Solutions

#### Docker Containers Not Starting
- **Issue**: Containers fail to start or immediately exit
- **Solution**: 
  ```bash
  # Check container logs
  docker logs rnode.bootstrap
  
  # Ensure old containers are removed
  docker compose -f node/docker/docker-compose.integrated.yml down -v
  
  # Rebuild and restart
  ./scripts/deploy.sh
  ```

#### Port Already in Use
- **Issue**: Error "bind: address already in use"
- **Solution**:
  ```bash
  # Find process using the port (example for port 40401)
  lsof -i :40401
  
  # Kill the process or choose different ports
  ```

#### CLI Commands Failing
- **Issue**: "Protocol mismatch" or connection errors
- **Solution**:
  - Ensure you're using the correct port for the operation:
    - Deploy: 40401 (bootstrap), 40411/21/31 (validators)
    - Propose: 40402 (bootstrap), 40412/22/32 (validators)
    - Query: 40453 (observer only)
  - Check that nodes are fully synced (may take 1-2 minutes after startup)

#### Transaction Not Appearing
- **Issue**: Deployed contract doesn't appear in blocks
- **Solution**:
  - Transaction gossip is broken - deploy directly to the validator that will propose
  - Ensure a block is proposed after deployment
  - Check the finalizer-bot logs: `docker logs finalizer-bot`

#### Build Failures
- **Issue**: Scala or Rust compilation errors
- **Solution**:
  ```bash
  # Clean build artifacts
  cd node && sbt clean
  cd ../cli/node-cli && cargo clean
  
  # Ensure correct Java version (17+)
  java -version
  
  # Rebuild
  ./scripts/deploy.sh
  ```

#### Network Not Finalizing Blocks
- **Issue**: Blocks remain unfinalized
- **Solution**:
  - Check finalizer-bot is running: `docker ps | grep finalizer`
  - View finalizer logs: `docker logs -f finalizer-bot`
  - Restart if needed: `docker restart finalizer-bot`

#### Block Production Stops at Block 50 - SOLVED ✅
- **Issue**: Network stops producing blocks at block 50
- **Root Cause**: Hardcoded `deployLifespan = 50` combined with all deploys having `validAfterBlockNumber = 0`
- **Solution Implemented**: 
  - CLI now supports `--valid-after-block-number` flag
  - Finalizer bot sets VABN to current block number
  - Deploys remain valid for 50 blocks from their VABN
- **Status**: ✅ Fully resolved with patched CLI
- **Details**: 
  - Patch implementation in `patches/cli-vabn-support.patch`
  - Solution details in [Finalizer Bot Documentation](docs-external/FINALIZER_BOT.md)

### Getting Help

If you encounter issues not covered here:
1. Check the detailed [Troubleshooting Guide](docs-external/TROUBLESHOOTING.md)
2. Review the [Troubleshooting Guide](docs-external/TROUBLESHOOTING.md) for known limitations
3. Check container logs: `docker logs <container-name>`
4. Open an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Docker version, etc.)

## 8. Project Status

**Current Version**: Pre-Alpha Testnet v1.1 (July 2025)

See the [Documentation Index](docs-external/INDEX.md) for detailed information about the project status and available features.

### Key Working Features
- ✅ Automated deployment with `deploy.sh`
- ✅ Block production past block 50 (VABN patch)
- ✅ Finalizer bot for continuous operation
- ✅ ASI Wallet v2 with WalletConnect and persistent network settings
- ✅ Block Explorer with real-time updates
- ✅ Comprehensive documentation
- ✅ Reduced memory requirements (2GB validators, 1GB observer)
- ✅ Testing framework with 62.88% store coverage for wallet
