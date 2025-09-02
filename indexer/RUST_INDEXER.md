# Rust CLI Indexer Implementation Guide

This document provides detailed information about the Rust CLI integration in the ASI-Chain indexer v2.1.

## Overview

The Rust CLI indexer represents a major architectural upgrade, replacing HTTP API calls with direct blockchain access through the native Rust client. Key features include:
- **Network-agnostic genesis processing**: Automatic extraction of validator bonds and REV allocations
- **Full historical sync**: Process entire blockchain from block 0
- **Enhanced REV transfer detection**: Supports both variable-based and match-based Rholang patterns
- **Address validation**: Now accepts 53-56 character REV addresses
- **GraphQL API integration**: Automatic Hasura configuration with bash script (no Python dependencies)
- **Balance state tracking**: Separate bonded and unbonded balances per address

## Architecture

```
┌──────────────────┐
│  Python Indexer  │
│  (asyncio loop)  │
└────────┬─────────┘
         │
    ┌────▼─────┐
    │ CLI      │
    │ Wrapper  │
    └────┬─────┘
         │
┌────────▼─────────┐      gRPC        ┌─────────────┐
│   Rust CLI       │ ◄───────────────► │ RChain Node │
│  (node_cli)      │      HTTP         │   (Ports)   │
└──────────────────┘                   └─────────────┘
```

## CLI Commands Implementation

### 1. Last Finalized Block

```python
async def get_last_finalized_block(self) -> Optional[Dict[str, Any]]:
    """Get the last finalized block."""
    stdout, _ = await self._run_command([
        "last-finalized-block",
        "-H", self.node_host,
        "-p", str(self.http_port)
    ])
```

**Output Format**: Text
```
Block Number: 5296
Block Hash: 301da37176b583f5fa5867cb5d91c365ff6d5e6ef33829876c18568fa2fa2633
Timestamp: 1754388838467
Deploy Count: 1
```

### 2. Get Blocks by Height

```python
async def get_blocks_by_height(self, start: int, end: int) -> List[Dict[str, Any]]:
    """Get blocks within a height range."""
    stdout, _ = await self._run_command([
        "get-blocks-by-height",
        "-s", str(start),
        "-e", str(end),
        "-H", self.node_host,
        "-p", str(self.grpc_port)
    ], timeout=60)
```

**Output Format**: Text with block summaries
```
Block #100: 
🔗 Hash: 34cdef5f311c67da7b7290c6219b65a196429c67d1102cd0b72c2470b88b4e70
👤 Sender: 0457febafcc25dd3
⏰ Timestamp: 1754373838454
📦 Deploy Count: 1
⚖️  Fault Tolerance: 1.0000
```

### 3. Get Block Details

```python
async def get_block_details(self, block_hash: str) -> Optional[Dict[str, Any]]:
    """Get detailed block information including deployments."""
    stdout, _ = await self._run_command([
        "blocks",
        "--block-hash", block_hash,
        "-H", self.node_host,
        "-p", str(self.http_port)
    ], timeout=30)
```

**Output Format**: JSON with full block data including:
- Pre/post state hashes
- Bonds mapping
- Justifications
- Deployments with full Rholang code

### 4. Get Deploy Info

```python
async def get_deploy_info(self, deploy_id: str) -> Optional[Dict[str, Any]]:
    """Get deployment information by ID."""
    stdout, _ = await self._run_command([
        "get-deploy",
        "-d", deploy_id,
        "--format", "json",
        "-H", self.node_host,
        "--http-port", str(self.http_port)
    ])
```

**Output Format**: JSON with deployment details

### 5. Get Bonds

```python
async def get_bonds(self) -> Optional[Dict[str, Any]]:
    """Get current validator bonds."""
    stdout, _ = await self._run_command([
        "bonds",
        "-H", self.node_host,
        "-p", str(self.http_port)
    ])
```

**Output Format**: Text
```
Validator: 04837a4cff833e31... | Stake: 50,000,000,000,000 REV
```

### 6. Additional Commands

- **active-validators**: List of active validator public keys
- **epoch-info**: Current epoch, length, blocks until next
- **network-consensus**: Network health and participation
- **show-main-chain**: Verify main chain consistency

## Cross-Compilation Setup

### Prerequisites (macOS to Linux)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add Linux target
rustup target add x86_64-unknown-linux-musl

# Install cross-compilation tools
brew install filosottile/musl-cross/musl-cross
```

### Build Process

```bash
# Configure cargo
cat > .cargo/config.toml << EOF
[target.x86_64-unknown-linux-musl]
linker = "x86_64-linux-musl-gcc"
EOF

# Build
CC=x86_64-linux-musl-gcc cargo build --release --target x86_64-unknown-linux-musl

# Verify binary
file target/x86_64-unknown-linux-musl/release/node_cli
# Output: ELF 64-bit LSB executable, x86-64, statically linked
```

## Database Schema Enhancements

### Enhanced Schema (v2.0)

```sql
-- Address fields support both REV addresses (54-56 chars) and validator keys (130+ chars)
ALTER TABLE transfers ALTER COLUMN from_address TYPE VARCHAR(150);
ALTER TABLE transfers ALTER COLUMN to_address TYPE VARCHAR(150);

-- blocks table additions
ALTER TABLE blocks ADD COLUMN state_root_hash VARCHAR(64);
ALTER TABLE blocks ADD COLUMN pre_state_hash VARCHAR(64);
ALTER TABLE blocks ADD COLUMN finalization_status VARCHAR(20) DEFAULT 'finalized';
ALTER TABLE blocks ADD COLUMN bonds_map JSONB;
ALTER TABLE blocks ADD COLUMN justifications JSONB;
ALTER TABLE blocks ADD COLUMN fault_tolerance NUMERIC(5,4);

-- deployments table additions
ALTER TABLE deployments ADD COLUMN deployment_type VARCHAR(50);
ALTER TABLE deployments ADD COLUMN seq_num INTEGER;
ALTER TABLE deployments ADD COLUMN shard_id VARCHAR(20);
ALTER TABLE deployments ADD COLUMN status VARCHAR(20) DEFAULT 'included';
```

### New Tables (v2.0)

```sql
-- Balance state tracking
CREATE TABLE balance_states (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL,
    block_number BIGINT NOT NULL,
    unbonded_balance_dust BIGINT DEFAULT 0,
    unbonded_balance_rev NUMERIC(28,8) DEFAULT 0,
    bonded_balance_dust BIGINT DEFAULT 0,
    bonded_balance_rev NUMERIC(28,8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, block_number)
);

-- Epoch transitions tracking
CREATE TABLE epoch_transitions (
    id BIGSERIAL PRIMARY KEY,
    epoch_number BIGINT UNIQUE NOT NULL,
    start_block BIGINT NOT NULL,
    end_block BIGINT NOT NULL,
    active_validators INTEGER NOT NULL,
    quarantine_length INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Network statistics
CREATE TABLE network_stats (
    id BIGSERIAL PRIMARY KEY,
    block_number BIGINT NOT NULL,
    total_validators INTEGER NOT NULL,
    active_validators INTEGER NOT NULL,
    validators_in_quarantine INTEGER DEFAULT 0,
    consensus_participation NUMERIC(5,2) NOT NULL,
    consensus_status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Block validators (justifications)
CREATE TABLE block_validators (
    block_hash VARCHAR(64) NOT NULL,
    validator_public_key VARCHAR(150) NOT NULL,
    PRIMARY KEY (block_hash, validator_public_key)
);
```

## Performance Optimizations

### Batch Processing

```python
# Standard batch size
batch_size = settings.batch_size  # Default: 50

# Parallel command execution
tasks = [
    self.client.get_block_details(block["blockHash"]),
    self.client.get_bonds(),
    self.client.get_active_validators()
]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

### Connection Management

```python
# CLI timeout configuration
CLI_TIMEOUT = int(os.getenv("CLI_TIMEOUT", "30"))

# Retry logic
for attempt in range(3):
    try:
        result = await self._run_command(cmd, timeout=timeout)
        break
    except asyncio.TimeoutError:
        if attempt == 2:
            raise
        await asyncio.sleep(1)
```

## Error Handling

### Common CLI Errors

1. **Binary Not Found**
   ```python
   if not Path(self.cli_path).exists():
       raise FileNotFoundError(f"Rust CLI not found at {self.cli_path}")
   ```

2. **Connection Failed**
   ```
   Error: Cannot connect to node at localhost:40413
   Solution: Check node is running and ports are accessible
   ```

3. **Command Timeout**
   ```
   TimeoutError: Command timed out after 30s
   Solution: Increase CLI_TIMEOUT environment variable
   ```

## Monitoring and Metrics

### New Prometheus Metrics

```python
# CLI command metrics
cli_commands_total = Counter(
    'indexer_cli_commands_total',
    'Total CLI commands executed',
    ['command']
)

cli_errors_total = Counter(
    'indexer_cli_errors_total', 
    'Total CLI command errors',
    ['command', 'error_type']
)

cli_command_duration = Histogram(
    'indexer_cli_command_duration_seconds',
    'CLI command execution time',
    ['command']
)
```

### Health Checks

```python
async def health_check(self) -> bool:
    """Check if the node is healthy and responding."""
    try:
        last_block = await self.get_last_finalized_block()
        return last_block is not None
    except Exception:
        return False
```

## Docker Configuration

### Multi-stage Build (Optional)

```dockerfile
# Build stage
FROM rust:1.70 as builder
WORKDIR /build
COPY rust-client .
RUN cargo build --release --target x86_64-unknown-linux-musl

# Runtime stage
FROM python:3.11-slim
COPY --from=builder /build/target/x86_64-unknown-linux-musl/release/node_cli /usr/local/bin/
```

### Simple Deployment

```dockerfile
# Copy pre-compiled binary
COPY node_cli_linux /usr/local/bin/node_cli
RUN chmod +x /usr/local/bin/node_cli
```

## Migration Path

### From HTTP to CLI Indexer

1. **Data Compatibility**: Database schema is backward compatible
2. **Enhanced Fields**: New fields are nullable, won't break existing queries
3. **Full Resync**: Recommended to start from block 0 for complete data

### Rollback Plan

```bash
# Stop Rust indexer
docker-compose -f docker-compose.rust.yml down

# Start HTTP indexer
docker-compose up -d

# Update last indexed block to continue from same point
UPDATE indexer_state SET value = 'LAST_BLOCK' WHERE key = 'last_indexed_block';
```

## Genesis Processing (v2.0)

### Automatic Bond Extraction

```python
async def process_genesis_block(self, block_data: Dict[str, Any]):
    """Extract validator bonds from genesis block."""
    if block_data.get("blockNumber", "") == "0":
        bonds_map = block_data.get("bonds", [])
        for bond in bonds_map:
            validator = bond.get("validator")
            stake = bond.get("stake")
            # Store genesis bonds in validator_bonds table
```

### REV Transfer Pattern Matching (Enhanced in v2.1)

```python
# Variable-based pattern for modern Rholang
VARIABLE_TRANSFER_PATTERN = re.compile(
    r'@vault!\s*\(\s*"transfer"\s*,\s*@toAddr\s*,\s*([0-9]+)\s*,\s*\*[^)]+\)',
    re.DOTALL | re.MULTILINE
)

# Match-based pattern for direct transfers (NEW in v2.1)
DIRECT_TRANSFER_PATTERN = re.compile(
    r'match \("(1111[^"]+)", "(1111[^"]+)", (\d+)\)',
    re.MULTILINE
)

# Extract variable assignments
FROM_ADDR_PATTERN = re.compile(
    r'@fromAddr\s*=\s*"([^"]+)"',
    re.MULTILINE
)

# Address validation now supports 53-56 characters (previously 54-56)
# This enables detection of transfers in blocks 365 and 377
```

## Future Enhancements

1. **WebSocket Support**: Real-time block notifications
2. **Parallel Sync**: Multiple height ranges concurrently
3. **State Queries**: Direct state inspection via CLI
4. **Custom Indexes**: Rholang-specific query optimization
5. **Shard Support**: Multi-shard indexing capability
6. **Enhanced Transfer Detection**: More Rholang patterns

## Troubleshooting Guide

### Debug CLI Commands

```bash
# Test CLI manually
docker exec -it asi-rust-indexer /bin/bash
/usr/local/bin/node_cli last-finalized-block -H localhost -p 40413

# Check CLI version
/usr/local/bin/node_cli --version

# Verbose output
RUST_LOG=debug /usr/local/bin/node_cli bonds -H localhost -p 40413
```

### Common Issues

1. **"Exec format error"**
   - Wrong architecture binary
   - Solution: Use correct cross-compilation target

2. **"Connection refused"**
   - Node not accessible
   - Solution: Check NODE_HOST and port settings

3. **"Command not found"**
   - Binary path incorrect
   - Solution: Verify RUST_CLI_PATH environment variable

4. **Slow sync performance**
   - Small batch sizes
   - Solution: Increase BATCH_SIZE to 50-100

## Support

For Rust CLI specific issues:
- Check rust-client repository for CLI documentation
- Review indexer logs for command execution details
- Enable DEBUG logging for detailed traces
- Submit issues with full command output