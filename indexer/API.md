# ASI-Chain Indexer API Documentation

Base URL: `http://localhost:9090`
GraphQL URL: `http://localhost:8080/v1/graphql`

## 🆕 New Features (v2.1.1 - Data Quality & Bond Detection)

- **Network-Agnostic Genesis**: Automatic validator bond and REV allocation extraction
- **Balance State Tracking**: Separate bonded/unbonded balances per address
- **Enhanced Transfer Detection**: Both variable-based and match-based Rholang patterns
- **Address Validation**: Supports 53-56 character REV addresses (previously 54-56)
- **GraphQL API**: Full Hasura integration with automatic relationship configuration
- **10 Comprehensive Tables**: Complete blockchain data model
- **Full Blockchain Sync**: Index from genesis (block 0) without limitations
- **Validator Bond Detection**: Fixed regex pattern for new CLI output format
- **Data Quality**: Proper NULL handling for deployment error messages

## Data Model Overview

### Core Tables
- **blocks**: Blockchain blocks with JSONB bonds_map and justifications
- **deployments**: Smart contracts with full Rholang code
- **transfers**: REV token transfers (both variable-based and match-based patterns)
- **balance_states**: Address balances (bonded vs unbonded)
- **validators**: Validator registry with full public keys (130+ chars)
- **validator_bonds**: Historical stake records per block (including genesis)
- **block_validators**: Block signers/justifications
- **network_stats**: Network health snapshots
- **epoch_transitions**: Epoch boundaries
- **indexer_state**: Sync metadata

## Health & Monitoring Endpoints

### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-06T08:11:24.843378",
  "version": "2.0.0"
}
```

### GET /ready
Readiness check that verifies all dependencies.

**Response:**
```json
{
  "ready": true,
  "checks": {
    "database": true,
    "rust_cli": true,
    "rchain_node": true
  },
  "timestamp": "2025-08-06T08:11:29.504095"
}
```

### GET /status
Detailed status information about the indexer.

**Response:**
```json
{
  "indexer": {
    "version": "2.0.0",
    "indexer_type": "rust_cli",
    "running": true,
    "last_indexed_block": 240,
    "last_sync_time": "2025-08-06T08:10:11.052104",
    "sync_lag": 0,
    "sync_percentage": 100.0,
    "syncing_from_genesis": true
  },
  "database": {
    "total_blocks": 240,
    "total_deployments": 148,
    "total_transfers": 0,
    "total_validators": 4,
    "total_validator_bonds": 732,
    "total_balance_states": 0,
    "total_epoch_transitions": 0,
    "total_network_stats": 0,
    "genesis_bonds_extracted": 4
  },
  "cli": {
    "binary_path": "/usr/local/bin/node_cli",
    "version": "0.1.0",
    "commands_executed": 1450,
    "command_errors": 0
  },
  "node": {
    "connected": true,
    "host": "host.docker.internal",
    "grpc_port": 40412,
    "http_port": 40413,
    "latest_block": 240
  },
  "config": {
    "sync_interval": 5,
    "batch_size": 50,
    "start_from_block": 0
  },
  "timestamp": "2025-08-06T08:10:16.223646"
}
```

### GET /metrics
Prometheus-compatible metrics endpoint.

**Response:** Text format metrics including:
- `indexer_blocks_indexed_total`
- `indexer_deployments_indexed_total`
- `indexer_deployment_errors_total`
- `indexer_transfers_extracted_total`
- `indexer_sync_lag_blocks`
- `indexer_last_block_height`
- `indexer_cli_commands_total{command="..."}`
- `indexer_cli_errors_total{command="...",error_type="..."}`
- `indexer_cli_command_duration_seconds{command="..."}`
- `indexer_epoch_transitions_total`
- `indexer_network_health_score`
- `process_resident_memory_bytes`
- `process_cpu_seconds_total`

## Data Access Endpoints

### GET /api/blocks
List blocks with pagination and enhanced metadata.

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page

**Response:**
```json
{
  "blocks": [
    {
      "block_number": 240,
      "block_hash": "f7b91125604d8177bd84b858223b98608c085fb319d64848061b6fc5ac5fdc37",
      "parent_hash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "timestamp": 1754385503049,
      "proposer": "04fa70d7be5eb750e0915c0f6d19e7085d18bb1c22d030feb2a877ca2cd226d04438aa819359c56c720142fbc66e9da03a5ab960a3d8b75363a226b7c800f60420",
      "state_root_hash": "2dc50eaff6e59997bb1fd539d8a6bbab5b7a0df7c1f5e70363d69617f1b70b21",
      "pre_state_hash": "7b190a6a669aed2b9780e4157585d1975230eb5f10486512696543305f83528b",
      "finalization_status": "finalized",
      "fault_tolerance": 1.0,
      "deployment_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 240,
    "pages": 12
  }
}
```

### GET /api/blocks/search
Search blocks by partial hash.

**Query Parameters:**
- `q` (string, required): Partial block hash to search for
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page

**Response:** Same format as GET /api/blocks with matching blocks

### GET /api/blocks/{block_number}
Get detailed information about a specific block.

**Path Parameters:**
- `block_number` (integer): Block number

**Response:**
```json
{
  "block_number": 100,
  "block_hash": "34cdef5f311c67da7b7290c6219b65a196429c67d1102cd0b72c2470b88b4e70",
  "parent_hash": "2fe72f6cbaeb87df6687d673119910ddc65a03549970811a72addb5ad5d197bc",
  "timestamp": 1754373838454,
  "proposer": "0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c",
  "state_hash": "8a9b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
  "state_root_hash": "8a9b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
  "pre_state_hash": "7a8b9c0d1e2f3456789012345678901234567890123456789012345678901234567",
  "finalization_status": "finalized",
  "bonds_map": [
    {
      "validator": "04837a4cff833e31...",
      "stake": 50000000000000
    }
  ],
  "justifications": [
    {
      "validator": "04837a4cff833e31...",
      "latestBlockHash": "2fe72f6cbaeb87df..."
    }
  ],
  "fault_tolerance": 1.0,
  "seq_num": 25,
  "sig": "3045022100...",
  "sig_algorithm": "secp256k1",
  "shard_id": "root",
  "extra_bytes": "",
  "version": 1,
  "deployment_count": 1,
  "created_at": "2025-08-06T08:06:09.862429",
  "deployments": [
    {
      "deploy_id": "3045022100...",
      "deployer": "04a936f4e0cda468...",
      "deployment_type": "validator_operation",
      "timestamp": 1754373836301,
      "errored": true,
      "error_message": "Deploy payment failed: Insufficient funds"
    }
  ],
  "bonds": [
    {
      "validator_public_key": "04837a4cff833e31...",
      "stake": 50000000000000,
      "name": "04837a4cff833e31..."
    }
  ]
}
```

### GET /api/deployments
List deployments with pagination, filtering, and type classification.

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page
- `deployer` (string): Filter by deployer address
- `errored` (boolean): Filter by error status
- `type` (string): Filter by deployment type
- `status` (string): Filter by status (pending/included/error)

**Response:**
```json
{
  "deployments": [
    {
      "deploy_id": "3045022100...",
      "deployer": "04a936f4e0cda468...",
      "timestamp": 1754381274668,
      "block_number": 95,
      "deployment_type": "validator_operation",
      "status": "included",
      "phlo_cost": 0,
      "phlo_limit": 50000,
      "phlo_price": 1,
      "errored": true,
      "error_message": "Deploy payment failed: Insufficient funds",
      "block_hash": "8cdfe2505cfff9eb9f543e3f8a049f680604c19c1cffdce9f696aa94a7583acd"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 148,
    "pages": 8
  }
}
```

### GET /api/deployments/search
Search deployments by deploy ID or deployer address.

**Query Parameters:**
- `q` (string, required): Search term (partial deploy ID or deployer)
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page

**Response:** Same format as GET /api/deployments

### GET /api/deployments/{deploy_id}
Get detailed information about a specific deployment.

**Path Parameters:**
- `deploy_id` (string): Deployment ID/signature

**Response:** Full deployment details including Rholang code

### GET /api/transfers
List REV transfers with pagination and filtering.

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page
- `from` (string): Filter by sender address (REV address or validator key)
- `to` (string): Filter by recipient address (REV address or validator key)

**Response:**
```json
{
  "transfers": [
    {
      "id": 1,
      "from_address": "04837a4cff833e31...",
      "to_address": "1111K6oNBewfN8iw...",
      "amount_dust": 1000000,
      "amount_rev": "0.01000000",
      "deploy_id": "3045022100...",
      "block_number": 50,
      "status": "success"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 🆕 GET /api/balance/{address}
Get balance state for an address.

**Path Parameters:**
- `address` (string): REV address or validator public key

**Response:**
```json
{
  "address": "04837a4cff833e31...",
  "unbonded_balance_dust": 0,
  "unbonded_balance_rev": "0.00000000",
  "bonded_balance_dust": 50000000000000,
  "bonded_balance_rev": "500000.00000000",
  "total_balance_dust": 50000000000000,
  "total_balance_rev": "500000.00000000",
  "block_number": 240,
  "updated_at": "2025-08-06T08:10:00.000000"
}
```

### GET /api/address/{address}/transfers
Get transaction history for a specific address.

**Path Parameters:**
- `address` (string): Wallet address

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page

**Response:** Same format as GET /api/transfers

### GET /api/validators
List all validators with enhanced information.

**Response:**
```json
{
  "validators": [
    {
      "public_key": "04837a4cff833e31...",
      "name": "04837a4cff833e31...",
      "total_stake": 50000000000000,
      "status": "active",
      "first_seen_block": 1,
      "last_seen_block": 240,
      "created_at": "2025-08-06T07:50:20.968249",
      "updated_at": "2025-08-06T08:08:00.445302"
    }
  ]
}
```

### 🆕 GET /api/epochs
Get epoch transition information.

**Response:**
```json
{
  "epochs": [
    {
      "epoch_number": 1,
      "start_block": 1,
      "end_block": 100,
      "active_validators": 4,
      "quarantine_length": 20,
      "timestamp": "2025-08-06T08:00:00.000000"
    }
  ],
  "current_epoch": {
    "epoch_number": 3,
    "blocks_until_next": 15,
    "epoch_length": 100
  }
}
```

### 🆕 GET /api/consensus
Get network consensus status.

**Response:**
```json
{
  "consensus": {
    "current_block": 240,
    "total_bonded_validators": 4,
    "active_validators": 4,
    "validators_in_quarantine": 0,
    "participation_rate": 100.0,
    "status": "healthy",
    "fault_tolerance": 1.0,
    "last_updated": "2025-08-06T08:15:00.000000"
  }
}
```

### GET /api/stats/network
Get comprehensive network statistics.

**Response:**
```json
{
  "network": {
    "total_blocks": 240,
    "avg_block_time_seconds": 7.78,
    "blocks_per_hour": 462.74,
    "blocks_per_day": 11105.82,
    "earliest_block_time": 1754373001000,
    "latest_block_time": 1754374900000
  },
  "validators": {
    "total": 4,
    "active": 4,
    "in_quarantine": 0,
    "max_blocks_by_single_validator": 60
  },
  "deployments": {
    "by_type": [
      {"deployment_type": "validator_operation", "count": 146},
      {"deployment_type": "rev_transfer", "count": 2}
    ],
    "total_errored": 148
  },
  "epochs": {
    "total_transitions": 2,
    "current_epoch": 3,
    "avg_epoch_length": 100
  },
  "transfers": {
    "total": 0,
    "total_volume_rev": "0.00000000"
  },
  "sync": {
    "started_from_block": 0,
    "using_rust_cli": true,
    "sync_complete": true
  },
  "timestamp": "2025-08-06T09:18:12.284108"
}
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "error": "Error message here"
}
```

## Deployment Types

The indexer automatically classifies deployments into the following types:

- `rev_transfer`: REV token transfers between addresses
- `validator_operation`: Validator consensus and bonding operations
- `smart_contract`: General smart contract deployments
- `registry_lookup`: Registry service interactions
- `finalizer_contract`: Block finalization contracts
- `auction_contract`: Auction and marketplace contracts

## Deployment Status

Deployments can have the following statuses:

- `pending`: Deployment submitted but not yet included
- `included`: Deployment included in a block
- `error`: Deployment failed with an error

## Enhanced Data Fields (v2.0)

### Block Enhancements
- `state_root_hash`: Post-state hash after block execution
- `pre_state_hash`: Pre-state hash before block execution
- `finalization_status`: Block finalization state
- `bonds_map`: JSONB array of validator bonds at block
- `justifications`: JSONB array of validator justifications
- `fault_tolerance`: Network fault tolerance metric (0-1)

### Deployment Enhancements
- `deployment_type`: Auto-classified deployment category
- `seq_num`: Sequence number within block
- `shard_id`: Shard identifier for deployment
- `status`: Deployment lifecycle status

### New Data Types
- **Epoch Transitions**: Track validator set changes between epochs
- **Network Statistics**: Real-time consensus health metrics
- **Validator Bonds**: Historical bond tracking per block

## Rate Limiting

Currently, there are no rate limits implemented. In production, consider adding rate limiting based on your requirements.

## Authentication

Currently, all endpoints are public. In production, consider adding authentication for sensitive endpoints.

## GraphQL API

The indexer includes a fully configured Hasura GraphQL engine at `http://localhost:8080`.

### Key Features
- **Auto-configuration**: deploy.sh automatically sets up all tables and relationships
- **Real-time subscriptions**: Live updates as blocks are indexed
- **Complex queries**: Join data across multiple tables in one request
- **Aggregations**: Count, sum, avg operations built-in

See `GRAPHQL_GUIDE.md` for comprehensive examples.

## Changelog

### v2.1.1 (2025-09-09)
- ✅ Fixed validator bond detection for new CLI output format
- ✅ Proper NULL handling for empty deployment error messages
- ✅ Automatic Hasura relationship configuration
- ✅ Zero-touch deployment with all fixes applied

### v2.1.0 (2025-08-06)
- ✅ Network-agnostic genesis processing
- ✅ Automatic validator bond extraction from block 0
- ✅ Balance state tracking (bonded vs unbonded)
- ✅ Enhanced REV transfer pattern matching (variable and match-based)
- ✅ GraphQL API with Hasura integration
- ✅ One-command deployment with deploy.sh
- ✅ Support for 150-char addresses (validators and REV)
- ✅ 10 comprehensive database tables
- ✅ Integrated Rust CLI for full blockchain access