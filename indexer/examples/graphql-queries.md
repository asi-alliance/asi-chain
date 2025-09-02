# ASI-Chain GraphQL API Examples

The Hasura GraphQL engine provides instant GraphQL APIs for the ASI-Chain indexer database (v2.1).

**GraphQL Playground**: http://localhost:8080/console
**GraphQL Endpoint**: http://localhost:8080/v1/graphql
**Admin Secret**: `myadminsecretkey`

## Features (v2.1)
- Enhanced REV transfer detection (variable-based and match-based patterns)
- Address validation supports 53-56 character REV addresses
- Automatic Hasura configuration via bash script
- Genesis block processing with validator bonds

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

### Deployments by Type with Error Rates

```graphql
query DeploymentsByType {
  deployments_aggregate(group_by: [deployment_type, errored]) {
    aggregate {
      count
      avg {
        phlo_cost
      }
      sum {
        phlo_cost
      }
    }
    nodes {
      deployment_type
      errored
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

### Network Statistics (Enhanced)

```graphql
query NetworkStats {
  # Pre-calculated network stats
  network_stats {
    total_blocks
    avg_block_time_seconds
    earliest_block_time
    latest_block_time
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
  # Group by error message
  deployments_aggregate(
    where: {error_message: {_is_null: false}}
    group_by: error_message
  ) {
    aggregate {
      count
    }
    nodes {
      error_message
    }
  }
  
  # Error rate by deployment type
  by_type: deployments_aggregate(group_by: deployment_type) {
    aggregate {
      count
    }
    nodes {
      deployment_type
    }
  }
  
  by_type_errored: deployments_aggregate(
    where: {errored: {_eq: true}}
    group_by: deployment_type
  ) {
    aggregate {
      count
    }
    nodes {
      deployment_type
    }
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
  indexer_state {
    key
    value
    updated_at
  }
  
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
  "blockNumber": 1740,
  "hashPrefix": "51aa%",
  "address": "04a936f4e0cda4688ec61fa17cf3cbaed6a450ac8e6334905",
  "validatorKey": "04837a4cff833e3157e3135d7b40b8e1f33c6e6b5a4342b9fc784230ca4c4f9d356f",
  "startTime": 1754376000000,
  "endTime": 1754376999999,
  "searchTerm": "%insufficient%",
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

## v1.2 Updates

The v1.2 release includes enhanced deployment error tracking:
- Deployments with `error_message` automatically have `errored=true`
- Use OR conditions to catch all failed deployments
- 2,413 historical deployments have been corrected
- Error analysis queries now return accurate results