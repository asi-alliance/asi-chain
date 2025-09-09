# ASI-Chain GraphQL API Examples

The Hasura GraphQL engine provides instant GraphQL APIs for the ASI-Chain indexer database (v2.1).

**GraphQL Playground**: http://localhost:8080/console
**GraphQL Endpoint**: http://localhost:8080/v1/graphql
**Admin Secret**: `myadminsecretkey`

## Features (v2.1)
- Enhanced REV transfer detection (variable-based and match-based patterns)
- Address validation supports 53-56 character REV addresses and 130+ char validator keys
- Automatic Hasura configuration with zero-touch deployment
- Genesis block processing with validator bonds
- Comprehensive nested relationships working out of the box

## Basic Queries

### Get Latest Blocks with Deployments

```graphql
query LatestBlocks {
  blocks(limit: 10, order_by: {block_number: desc}) {
    block_number
    block_hash
    timestamp
    proposer
    deployment_count
    deployments {
      deploy_id
      deployer
      deployment_type
      errored
      error_message
      phlo_cost
    }
  }
}
```

### Get Block with Full Details

```graphql
query BlockDetails($blockNumber: bigint!) {
  blocks(where: {block_number: {_eq: $blockNumber}}) {
    block_number
    block_hash
    parent_hash
    timestamp
    proposer
    state_hash
    state_root_hash
    finalization_status
    bonds_map
    deployment_count
    deployments {
      deploy_id
      deployer
      term
      deployment_type
      timestamp
      phlo_cost
      phlo_price
      phlo_limit
      errored
      error_message
      sig
      transfers {
        from_address
        to_address
        amount_rev
        status
      }
    }
    validator_bonds {
      validator {
        public_key
        name
      }
      stake
    }
  }
}
```

### Search Blocks by Hash (Partial)

```graphql
query SearchBlocks($hashPrefix: String!) {
  blocks(where: {block_hash: {_like: $hashPrefix}}, limit: 10) {
    block_number
    block_hash
    timestamp
    proposer
    deployment_count
  }
}
```

## Transfer Queries

### Get All REV Transfers (Including Genesis)

```graphql
query AllTransfers {
  transfers(order_by: {block_number: asc}) {
    id
    block_number
    from_address  # Supports 53-56 char addresses
    to_address    # and 130+ char validator keys
    amount_rev
    amount_dust
    status
    deployment {
      deploy_id
      deployer
      timestamp
      errored
      error_message
    }
  }
  transfers_aggregate {
    aggregate {
      count
      sum { amount_rev }
    }
  }
}
```

### Query Transfers with Aggregates

```graphql
query TransferStats {
  # Genesis transfers (validator bonds)
  genesis: transfers(where: {block_number: {_eq: "0"}}) {
    from_address
    to_address
    amount_rev
  }
  
  # User transfers (non-genesis)
  user_transfers: transfers(where: {block_number: {_neq: "0"}}) {
    block_number
    from_address
    to_address
    amount_rev
  }
  
  # Aggregate stats
  stats: transfers_aggregate {
    aggregate {
      count
      sum { amount_rev }
      avg { amount_rev }
      max { amount_rev }
      min { amount_rev }
    }
  }
}
```

### Get Transfers for Address

```graphql
query AddressTransfers($address: String!) {
  transfers(
    where: {
      _or: [
        {from_address: {_eq: $address}}
        {to_address: {_eq: $address}}
      ]
    }
    order_by: {created_at: desc}
  ) {
    id
    from_address
    to_address
    amount_rev
    status
    deployment {
      deploy_id
      block_number
      timestamp
    }
  }
}
```

## Validator Queries

### Active Validators with Stakes

```graphql
query ActiveValidators {
  validators(order_by: {total_stake: desc}) {
    public_key
    name
    total_stake
    first_seen_block
    last_seen_block
    validator_bonds(limit: 1, order_by: {block_number: desc}) {
      block_number
      stake
      block {
        timestamp
      }
    }
  }
}
```

### Validator Performance with Block Count

```graphql
query ValidatorPerformance($validatorKey: String!) {
  validators(where: {public_key: {_eq: $validatorKey}}) {
    public_key
    name
    total_stake
    validator_bonds_aggregate {
      aggregate {
        count
        avg {
          stake
        }
        max {
          stake
        }
      }
    }
  }
  
  # Count blocks proposed by this validator
  blocks_aggregate(where: {proposer: {_eq: $validatorKey}}) {
    aggregate {
      count
    }
  }
}
```

## Deployment Queries

### Deployments by Type

```graphql
query DeploymentsByType {
  # Get unique deployment types and their counts
  registry_lookup: deployments_aggregate(
    where: {deployment_type: {_eq: "registry_lookup"}}
  ) {
    aggregate {
      count
      avg { phlo_cost }
      sum { phlo_cost }
    }
  }
  
  rev_transfer: deployments_aggregate(
    where: {deployment_type: {_eq: "rev_transfer"}}
  ) {
    aggregate {
      count
      avg { phlo_cost }
      sum { phlo_cost }
    }
  }
  
  smart_contract: deployments_aggregate(
    where: {deployment_type: {_eq: "smart_contract"}}
  ) {
    aggregate {
      count
      avg { phlo_cost }
      sum { phlo_cost }
    }
  }
  
  other: deployments_aggregate(
    where: {deployment_type: {_eq: "other"}}
  ) {
    aggregate {
      count
      avg { phlo_cost }
      sum { phlo_cost }
    }
  }
}
```

### Failed Deployments (v1.2 Enhanced)

```graphql
query FailedDeployments {
  deployments(
    where: {
      _or: [
        {errored: {_eq: true}},
        {error_message: {_is_null: false}}
      ]
    }
    order_by: {timestamp: desc}
    limit: 20
  ) {
    deploy_id
    deployer
    deployment_type
    errored
    error_message
    phlo_cost
    timestamp
    block {
      block_number
      timestamp
    }
  }
}
```

### Search Deployments

```graphql
query SearchDeployments($searchTerm: String!) {
  deployments(
    where: {
      _or: [
        {deploy_id: {_ilike: $searchTerm}},
        {deployer: {_ilike: $searchTerm}}
      ]
    }
    limit: 20
    order_by: {created_at: desc}
  ) {
    deploy_id
    deployer
    deployment_type
    errored
    error_message
    block_number
    timestamp
  }
}
```

## Real-time Subscriptions

### Subscribe to New Blocks

```graphql
subscription NewBlocks {
  blocks(
    order_by: {block_number: desc}
    limit: 1
  ) {
    block_number
    block_hash
    timestamp
    proposer
    deployment_count
    deployments {
      deploy_id
      deployment_type
      errored
      error_message
    }
  }
}
```

### Subscribe to New Transfers

```graphql
subscription NewTransfers {
  transfers(
    order_by: {created_at: desc}
    limit: 10
  ) {
    id
    from_address
    to_address
    amount_rev
    status
    created_at
    deployment {
      deploy_id
      block_number
    }
  }
}
```

### Subscribe to Failed Deployments

```graphql
subscription FailedDeployments {
  deployments(
    where: {
      _or: [
        {errored: {_eq: true}},
        {error_message: {_is_null: false}}
      ]
    }
    order_by: {created_at: desc}
    limit: 10
  ) {
    deploy_id
    deployer
    error_message
    timestamp
    block_number
  }
}
```

## Analytics Queries

### Network Statistics

```graphql
query NetworkStats {
  # Network consensus stats
  network_stats(limit: 1, order_by: {timestamp: desc}) {
    block_number
    timestamp
    active_validators
    total_validators
    validators_in_quarantine
    consensus_participation
    consensus_status
  }
  
  # Block aggregates
  blocks_aggregate {
    aggregate {
      count
      max {
        block_number
      }
    }
  }
  
  # Deployment aggregates with error counts
  deployments_aggregate {
    aggregate {
      count
      avg {
        phlo_cost
      }
    }
  }
  
  # Failed deployments count
  failed_deployments: deployments_aggregate(
    where: {
      _or: [
        {errored: {_eq: true}},
        {error_message: {_is_null: false}}
      ]
    }
  ) {
    aggregate {
      count
    }
  }
  
  # Transfer aggregates
  transfers_aggregate {
    aggregate {
      count
      sum {
        amount_rev
      }
    }
  }
  
  # Validator count
  validators_aggregate {
    aggregate {
      count
    }
  }
}
```

### Deployment Error Analysis

```graphql
query DeploymentErrorAnalysis {
  # Total deployments
  total: deployments_aggregate {
    aggregate {
      count
    }
  }
  
  # Failed deployments
  failed: deployments_aggregate(
    where: {
      _or: [
        {errored: {_eq: true}},
        {error_message: {_is_null: false}}
      ]
    }
  ) {
    aggregate {
      count
    }
  }
  
  # Recent errors with details
  recent_errors: deployments(
    where: {
      _or: [
        {errored: {_eq: true}},
        {error_message: {_is_null: false}}
      ]
    }
    limit: 10
    order_by: {timestamp: desc}
  ) {
    deploy_id
    deployment_type
    error_message
    timestamp
  }
}
```

### Validator History at Block

```graphql
query ValidatorHistoryAtBlock($blockNumber: bigint!) {
  validator_bonds(
    where: {block_number: {_eq: $blockNumber}}
    order_by: {stake: desc}
  ) {
    stake
    validator {
      public_key
      name
    }
  }
  
  block: blocks(where: {block_number: {_eq: $blockNumber}}) {
    block_number
    timestamp
    proposer
  }
}
```

## Complex Relationship Queries

### Blocks with Complete Transaction History

```graphql
query CompleteBlockHistory($limit: Int = 5) {
  blocks(
    limit: $limit
    order_by: {block_number: desc}
  ) {
    block_number
    block_hash
    parent_hash
    timestamp
    proposer
    state_root_hash
    finalization_status
    deployment_count
    
    # All deployments in this block
    deployments {
      deploy_id
      deployer
      deployment_type
      phlo_cost
      errored
      error_message
      
      # All transfers from this deployment
      transfers {
        from_address
        to_address
        amount_rev
        status
      }
    }
    
    # Validator bonds at this block
    validator_bonds {
      stake
      validator {
        public_key
        name
      }
    }
  }
}
```

### Indexer Status Query

```graphql
query IndexerStatus {
  # Note: indexer_state table may not be populated
  # Use blocks_aggregate for sync status instead
  
  blocks_aggregate {
    aggregate {
      max {
        block_number
      }
    }
  }
  
  # Check for deployment consistency
  deployment_consistency: deployments_aggregate(
    where: {
      errored: {_eq: false},
      error_message: {_is_null: false}
    }
  ) {
    aggregate {
      count
    }
  }
}
```

## Sample Variables

For queries that use variables, here are some examples:

```json
{
  "blockNumber": 100,
  "hashPrefix": "6f3a%",
  "address": "1111gW5kkGxHg7xDg6dRkZx2f7qxTizJzaCH9VEM1oJKWRvSX9Sk5",
  "validatorKey": "04837a4cff833e3157e3135d7b40b8e1f33c6e6b5a4342b9fc784230ca4c4f9d356f258debef56ad4984726d6ab3e7709e1632ef079b4bcd653db00b68b2df065f",
  "searchTerm": "%registry%",
  "limit": 10
}
```

## Authentication

For public queries (read-only), no authentication is required. The `public` role has been configured with read access to all tables.

For admin operations, use the admin secret in the header:
```
X-Hasura-Admin-Secret: myadminsecretkey
```

## WebSocket Subscriptions

GraphQL subscriptions work over WebSockets. Most GraphQL clients handle this automatically:

- **Apollo Client**: Built-in subscription support
- **GraphQL Playground**: Click "DOCS" to see available subscriptions
- **Hasura Console**: Built-in subscription testing

## Performance Notes

- All queries are automatically optimized by PostgreSQL indexes
- Relationships are resolved efficiently using foreign keys
- Aggregations are computed by the database, not in memory
- Real-time subscriptions use PostgreSQL's LISTEN/NOTIFY for efficiency
- Complex queries with multiple aggregations may take longer (10-50ms)

## v2.1 Updates

### Zero-Touch Deployment
- Automatic Hasura relationship configuration
- No manual GraphQL setup required
- All nested queries work immediately after deployment
- Single comprehensive database migration

### Enhanced Features
- Genesis block processing with validator bonds
- Full blockchain sync from block 0
- Enhanced REV transfer detection patterns
- Support for 130+ character validator public keys
- JSONB fields for bonds_map and justifications
- Computed columns for balance tracking

### Known Limitations
- Group by aggregations not directly supported in Hasura
- Some network_stats fields may be unpopulated
- Epoch transitions table exists but not actively populated