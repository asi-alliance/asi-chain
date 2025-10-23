# F1R3FLY Rust Client (node_cli) Guide

## Overview

The F1R3FLY Rust Client (`node_cli`) is a command-line interface tool for interacting with F1R3FLY blockchain nodes. It provides comprehensive functionality for deploying smart contracts, managing validators, querying network state, and performing blockchain operations.

## Architecture

### Project Structure
```
rust-client/
├── Cargo.toml              # Rust project configuration
├── src/
│   ├── main.rs            # Entry point
│   ├── args.rs            # CLI argument definitions
│   ├── dispatcher.rs      # Command dispatcher
│   ├── error.rs           # Error handling
│   ├── f1r3fly_api.rs     # API client implementation
│   ├── commands/
│   │   ├── crypto.rs      # Cryptographic operations
│   │   ├── network.rs     # Network operations
│   │   └── query.rs       # Query operations
│   └── utils/
│       ├── crypto.rs      # Crypto utilities
│       ├── http.rs        # HTTP utilities
│       └── output.rs      # Output formatting
├── rho_examples/          # Sample Rholang contracts
│   └── stdout.rho         # Hello world example
└── VALIDATOR4_BONDING_GUIDE.md  # Validator bonding instructions
```

### Dependencies
- **f1r3fly-models**: Protocol buffer models
- **f1r3fly-crypto**: Cryptographic operations
- **f1r3fly-rholang**: Rholang language support
- **tokio**: Async runtime
- **clap**: Command-line argument parsing
- **reqwest**: HTTP client
- **secp256k1**: Elliptic curve cryptography

## Available Commands

### Deployment Commands

#### `deploy`
Deploy Rholang code to the network.
```bash
cargo run -- deploy -f <file> [OPTIONS]
  -f, --file <FILE>           Rholang file to deploy
  -H, --host <HOST>           Node host [default: localhost]
  -p, --port <PORT>           gRPC port [default: 40412]
  --private-key <KEY>         Private key for signing
  -b, --big-phlo             Use higher phlo limit
```

#### `propose`
Propose a new block.
```bash
cargo run -- propose [OPTIONS]
  -H, --host <HOST>           Node host [default: localhost]
  -p, --port <PORT>           gRPC port [default: 40412]
  --private-key <KEY>         Private key for signing
```

#### `full-deploy`
Deploy and propose in one operation.
```bash
cargo run -- full-deploy -f <file> [OPTIONS]
```

#### `deploy-and-wait`
Deploy and wait for finalization.
```bash
cargo run -- deploy-and-wait -f <file> [OPTIONS]
  --max-wait <SECONDS>        Maximum wait time [default: 300]
  --check-interval <SECONDS>  Check interval [default: 5]
```

### Query Commands

#### `status`
Get node status and peer information.
```bash
cargo run -- status [OPTIONS]
  -H, --host <HOST>           Node host [default: localhost]
  --http-port <PORT>          HTTP API port [default: 40403]
```

#### `blocks`
Get recent blocks or specific block information.
```bash
cargo run -- blocks [OPTIONS]
  --height <HEIGHT>           Specific block height
  --limit <LIMIT>             Number of blocks to return
```

#### `bonds`
Get current validator bonds.
```bash
cargo run -- bonds [OPTIONS]
```

#### `active-validators`
List active validators in the network.
```bash
cargo run -- active-validators [OPTIONS]
```

#### `wallet-balance`
Check wallet balance for an address.
```bash
cargo run -- wallet-balance --address <ADDRESS> [OPTIONS]
```

### Validator Commands

#### `bond-validator`
Bond a new validator to the network.
```bash
cargo run -- bond-validator [OPTIONS]
  --validator-key <KEY>       Validator public key
  --stake <AMOUNT>           Stake amount
  --private-key <KEY>        Private key for transaction
```

#### `bond-status`
Check if a validator is bonded.
```bash
cargo run -- bond-status --validator <KEY> [OPTIONS]
```

#### `validator-status`
Get detailed validator status (bonded, active, quarantine).
```bash
cargo run -- validator-status --validator <KEY> [OPTIONS]
```

### Network Health Commands

#### `network-health`
Check health across multiple nodes.
```bash
cargo run -- network-health [OPTIONS]
  --nodes <NODES>            Comma-separated list of nodes
```

#### `network-consensus`
Get network-wide consensus overview.
```bash
cargo run -- network-consensus [OPTIONS]
```

#### `epoch-info`
Get current epoch information.
```bash
cargo run -- epoch-info [OPTIONS]
```

### Cryptographic Commands

#### `generate-key-pair`
Generate a new secp256k1 key pair.
```bash
cargo run -- generate-key-pair
```

#### `generate-public-key`
Generate public key from private key.
```bash
cargo run -- generate-public-key --private-key <KEY>
```

#### `generate-rev-address`
Generate REV address from public key.
```bash
cargo run -- generate-rev-address --public-key <KEY>
```

### Transaction Commands

#### `transfer`
Transfer REV tokens between addresses.
```bash
cargo run -- transfer [OPTIONS]
  --from <ADDRESS>           Source address
  --to <ADDRESS>             Destination address
  --amount <AMOUNT>          Amount to transfer
  --private-key <KEY>        Private key for signing
```

## Configuration for AWS Lightsail Network

### Connection Parameters
For the F1R3FLY network running on AWS Lightsail (54.254.197.253):

```bash
# Bootstrap node
--host 54.254.197.253 --port 40402 --http-port 40403

# Validator1
--host 54.254.197.253 --port 40412 --http-port 40413

# Validator2
--host 54.254.197.253 --port 40422 --http-port 40423

# Validator3
--host 54.254.197.253 --port 40432 --http-port 40433

# Validator4
--host 54.254.197.253 --port 40442 --http-port 40443

# Observer
--host 54.254.197.253 --port 40452 --http-port 40453
```

## Usage Examples

### 1. Check Network Status
```bash
# Check bootstrap node status
cargo run -- status -H 54.254.197.253 --http-port 40403

# Check all validators
cargo run -- network-health --nodes "54.254.197.253:40403,54.254.197.253:40413,54.254.197.253:40423"
```

### 2. Deploy Smart Contract
```bash
# Deploy to validator1
cargo run -- deploy \
  -f ./rho_examples/stdout.rho \
  -H 54.254.197.253 \
  -p 40412 \
  --private-key <YOUR_PRIVATE_KEY>

# Deploy and propose
cargo run -- full-deploy \
  -f ./rho_examples/stdout.rho \
  -H 54.254.197.253 \
  -p 40412
```

### 3. Query Blockchain State
```bash
# Get recent blocks
cargo run -- blocks -H 54.254.197.253 --http-port 40403 --limit 10

# Check validator bonds
cargo run -- bonds -H 54.254.197.253 --http-port 40403

# Get active validators
cargo run -- active-validators -H 54.254.197.253 --http-port 40403
```

### 4. Validator Operations
```bash
# Check validator4 bond status
cargo run -- bond-status \
  --validator <VALIDATOR4_PUBLIC_KEY> \
  -H 54.254.197.253 \
  --http-port 40443

# Get validator status
cargo run -- validator-status \
  --validator <VALIDATOR_KEY> \
  -H 54.254.197.253 \
  --http-port 40403
```

### 5. Monitor Epoch Status
```bash
# Get epoch information
cargo run -- epoch-info -H 54.254.197.253 --http-port 40403

# Check epoch rewards
cargo run -- epoch-rewards -H 54.254.197.253 --http-port 40403
```

## Building from Source

### Prerequisites
- Rust toolchain (rustc, cargo)
- Protocol Buffers compiler (`protoc`)

### Installation
```bash
# Install protobuf compiler
sudo apt-get update
sudo apt-get install -y protobuf-compiler

# Clone repository
git clone https://github.com/F1R3FLY-io/rust-client.git
cd rust-client

# Build release version
cargo build --release

# Binary will be at: target/release/node_cli
```

### Running
```bash
# Run directly with cargo
cargo run -- <command> [options]

# Or use the compiled binary
./target/release/node_cli <command> [options]
```

## Error Handling

The client provides detailed error messages for common issues:

### Connection Errors
- **"Connection refused"**: Node is not running or wrong port
- **"Network unreachable"**: Check network connectivity
- **"Timeout"**: Node is slow or unresponsive

### Transaction Errors
- **"Insufficient funds"**: Wallet balance too low
- **"Invalid signature"**: Wrong private key
- **"Deploy failed"**: Contract syntax error or phlo limit exceeded

### Solutions
```bash
# Increase timeout
export RUST_CLIENT_TIMEOUT=60

# Enable debug logging
export RUST_LOG=debug

# Retry with exponential backoff
cargo run -- deploy-and-wait --max-wait 600 --check-interval 10
```

## Output Formats

The client supports multiple output formats:

### Pretty (Default)
Human-readable format with colors and emojis.

### JSON
Machine-readable JSON for scripting.
```bash
cargo run -- get-deploy -d <ID> --format json
```

### Summary
One-line status summary.
```bash
cargo run -- get-deploy -d <ID> --format summary
```

## Performance Considerations

### Connection Pooling
The client reuses HTTP connections for better performance.

### Batch Operations
Multiple operations can be scripted:
```bash
#!/bin/bash
for file in contracts/*.rho; do
  cargo run -- deploy -f "$file" -H 54.254.197.253 -p 40412
done
```

### Parallel Queries
```bash
# Check multiple nodes in parallel
parallel --jobs 4 'cargo run -- status -H 54.254.197.253 --http-port {}' ::: 40403 40413 40423 40433
```

## Security Best Practices

1. **Private Key Management**
   - Never hardcode private keys
   - Use environment variables or secure key stores
   ```bash
   export VALIDATOR_PRIVATE_KEY="your_key_here"
   cargo run -- deploy --private-key "$VALIDATOR_PRIVATE_KEY"
   ```

2. **Network Security**
   - Use HTTPS when available
   - Verify node certificates
   - Use VPN for sensitive operations

3. **Transaction Safety**
   - Always verify transaction details before signing
   - Use test networks first
   - Keep backups of important keys

## Troubleshooting

### Build Issues
```bash
# Missing protoc
sudo apt-get install protobuf-compiler

# Clear cargo cache
cargo clean
cargo build --release
```

### Connection Issues
```bash
# Test connectivity
ping 54.254.197.253
curl http://54.254.197.253:40403/status

# Check firewall
sudo ufw status
```

### Debug Mode
```bash
# Enable verbose logging
export RUST_LOG=node_cli=debug
cargo run -- status
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Deploy Contract
on:
  push:
    paths:
      - 'contracts/*.rho'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
      - run: cargo build --release
      - run: ./target/release/node_cli deploy -f contract.rho
```

## References

- [F1R3FLY Documentation](https://github.com/F1R3FLY-io/f1r3fly)
- [Rholang Tutorial](https://github.com/rchain/rchain/tree/dev/docs/rholang)

---

**Version**: 0.1.0
**Last Updated**: August 12, 2025
**Network**: F1R3FLY on AWS Lightsail (54.254.197.253)

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
