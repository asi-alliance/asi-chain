# GraphQL Schema Documentation

**Version**: 2.1.1 | **Updated**: January 2025

## Overview

The ASI-Chain indexer provides a GraphQL API through Hasura with automatic relationship configuration, exposing comprehensive blockchain data for querying. This document describes the current schema with 10 tables, available queries, and relationships.

## Available Tables

### blocks
Stores blockchain block data.

**Fields:**
- `block_number` (bigint): Block height
- `block_hash` (varchar): Block hash
- `parent_hash` (varchar): Parent block hash
- `timestamp` (bigint): Block timestamp
- `proposer` (varchar): Validator who proposed the block
- `deployment_count` (integer): Number of deployments in block
- `state_hash` (varchar): State hash
- `pre_state_hash` (varchar): Pre-state hash
- `state_root_hash` (varchar): State root hash
- `bonds_map` (jsonb): Validator bonds at this block
- `fault_tolerance` (numeric): Fault tolerance value
- `finalization_status` (varchar): Block finalization status
- `justifications` (jsonb): Block justifications
- `seq_num` (integer): Sequence number
- `shard_id` (varchar): Shard identifier
- `sig` (text): Block signature
- `sig_algorithm` (varchar): Signature algorithm
- `version` (integer): Block version
- `extra_bytes` (text): Extra block data
- `created_at` (timestamp): When indexed

### deployments
Stores smart contract deployments.

**Fields:**
- `deploy_id` (varchar): Deployment ID
- `deployer` (varchar): Address of deployer
- `term` (text): Rholang term
- `timestamp` (bigint): Deployment timestamp
- `deployment_type` (varchar): Type of deployment
- `phlo_cost` (bigint): Phlo gas cost
- `phlo_price` (bigint): Phlo price
- `phlo_limit` (bigint): Phlo limit
- `valid_after_block_number` (bigint): Valid after block
- `status` (varchar): Deployment status
- `block_number` (bigint): Block containing deployment
- `block_hash` (varchar): Block hash
- `seq_num` (integer): Sequence number
- `shard_id` (varchar): Shard ID
- `sig` (text): Deployment signature
- `sig_algorithm` (varchar): Signature algorithm
- `errored` (boolean): Whether deployment failed
- `error_message` (text): Error details if failed
- `created_at` (timestamp): When indexed

### transfers
Stores REV token transfers.

**Fields:**
- `id` (serial): Primary key
- `deploy_id` (varchar): Related deployment ID
- `from_address` (varchar): Sender address
- `to_address` (varchar): Recipient address
- `amount_rev` (bigint): Amount in REV (nano units)
- `amount_dust` (bigint): Dust amount
- `status` (varchar): Transfer status
- `block_number` (bigint): Block number
- `created_at` (timestamp): When indexed

### validators
Stores validator information.

**Fields:**
- `public_key` (varchar): Validator public key
- `name` (varchar): Validator name
- `status` (varchar): Current status
- `total_stake` (bigint): Total staked amount
- `first_seen_block` (bigint): First block as validator
- `last_seen_block` (bigint): Last block as validator
- `created_at` (timestamp): When first indexed
- `updated_at` (timestamp): Last update

### validator_bonds
Stores validator bond/stake records.

**Fields:**
- `id` (serial): Primary key
- `validator_public_key` (varchar): Validator's public key
- `stake` (bigint): Staked amount
- `block_number` (bigint): Block number
- `block_hash` (varchar): Block hash

### network_stats
Stores network health statistics.

**Fields:**
- `id` (serial): Primary key
- `total_validators` (integer): Total validator count
- `active_validators` (integer): Active validator count
- `validators_in_quarantine` (integer): Quarantined validators
- `consensus_participation` (numeric): Participation rate
- `consensus_status` (varchar): Consensus status
- `block_number` (bigint): Block number
- `timestamp` (bigint): Timestamp

### balance_states
Stores address balance snapshots with bonded/unbonded separation.

**Fields:**
- `id` (serial): Primary key
- `address` (varchar): Address (REV address or validator key)
- `unbonded_balance_dust` (bigint): Unbonded balance in dust
- `unbonded_balance_rev` (numeric): Unbonded balance in REV
- `bonded_balance_dust` (bigint): Bonded balance in dust
- `bonded_balance_rev` (numeric): Bonded balance in REV
- `total_balance_dust` (bigint): Computed total in dust
- `total_balance_rev` (numeric): Computed total in REV
- `block_number` (bigint): Block number
- `updated_at` (timestamp): When updated

### block_validators
Many-to-many relationship between blocks and validators.

**Fields:**
- `id` (serial): Primary key
- `block_number` (bigint): Block number
- `validator_public_key` (varchar): Validator public key
- `role` (varchar): Role in block (proposer/justifier)

### indexer_state
Stores indexer sync metadata.

**Fields:**
- `key` (varchar): State key
- `value` (text): State value
- `updated_at` (timestamp): Last update

### epoch_transitions
Stores epoch boundary information (⚠️ Not populated).

**Fields:**
- `id` (serial): Primary key
- `epoch_number` (integer): Epoch number
- `start_block` (bigint): Starting block
- `end_block` (bigint): Ending block
- `active_validators` (integer): Active validator count
- `created_at` (timestamp): When indexed

## GraphQL Query Examples

### Get Latest Blocks
```graphql
query GetLatestBlocks {
  blocks(
    limit: 10
    order_by: { block_number: desc }
  ) {
    block_number
    block_hash
    timestamp
    proposer
    deployment_count
  }
}
```

### Get Deployments for a Block
```graphql
query GetBlockDeployments($blockNumber: bigint!) {
  deployments(
    where: { block_number: { _eq: $blockNumber } }
  ) {
    deploy_id
    deployer
    deployment_type
    phlo_cost
    errored
    error_message
  }
}
```

### Get REV Transfers
```graphql
query GetTransfers {
  transfers(
    limit: 50
    order_by: { created_at: desc }
  ) {
    from_address
    to_address
    amount_rev
    status
    block_number
  }
}
```

### Get Validators
```graphql
query GetValidators {
  validators(
    order_by: { total_stake: desc }
  ) {
    public_key
    name
    status
    total_stake
    first_seen_block
    last_seen_block
  }
}
```

### Get Address Transfers
```graphql
query GetAddressTransfers($address: String!) {
  transfers(
    where: {
      _or: [
        { from_address: { _eq: $address } }
        { to_address: { _eq: $address } }
      ]
    }
  ) {
    from_address
    to_address
    amount_rev
    block_number
  }
}
```

### Aggregate Queries
```graphql
query GetStats {
  blocks_aggregate {
    aggregate {
      count
      max {
        block_number
      }
    }
  }
  
  deployments_aggregate {
    aggregate {
      count
      avg {
        phlo_cost
      }
    }
  }
  
  transfers_aggregate {
    aggregate {
      count
      sum {
        amount_rev
      }
    }
  }
}
```

## Known Limitations

1. **No Table Relationships**: Hasura relationships between tables are not configured. You cannot query nested data (e.g., `blocks { deployments { ... } }`).

2. **Epoch Data Not Populated**: The `epoch_transitions` table exists but contains no data. Epoch rewards and validator reward distribution are not tracked.

3. **Missing indexer_state Table**: Referenced in some queries but not created in the schema.

4. **Manual Joins Required**: To get related data, you must query tables separately and join client-side:
   ```graphql
   # Get block and its deployments separately
   query GetBlockWithDeployments($blockNumber: bigint!) {
     blocks(where: { block_number: { _eq: $blockNumber } }) {
       block_number
       block_hash
       timestamp
     }
     deployments(where: { block_number: { _eq: $blockNumber } }) {
       deploy_id
       deployer
       deployment_type
     }
   }
   ```

## Accessing the GraphQL API

### Endpoint
```
http://localhost:8080/v1/graphql
```

### Authentication
Include the Hasura admin secret in headers:
```
x-hasura-admin-secret: myadminsecretkey
```

### Example cURL Request
```bash
curl http://localhost:8080/v1/graphql \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query":"{ blocks(limit: 5) { block_number block_hash } }"}'
```

### GraphQL Playground
Access the interactive GraphQL playground at:
```
http://localhost:8080/console
```

## WebSocket Subscriptions

Hasura supports real-time subscriptions, but they require WebSocket connections:

```graphql
subscription WatchNewBlocks {
  blocks(
    limit: 1
    order_by: { block_number: desc }
  ) {
    block_number
    block_hash
    timestamp
  }
}
```

Note: WebSocket subscriptions work through the GraphQL playground but require a WebSocket client for programmatic access.