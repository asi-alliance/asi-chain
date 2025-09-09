# ASI-Chain GraphQL API Guide

**Version**: 2.1.1 | **Updated**: January 2025

This guide provides comprehensive documentation for accessing ASI-Chain blockchain data through the Hasura GraphQL endpoint with automatic relationship configuration.

## Table of Contents
- [Overview](#overview)
- [Access Details](#access-details)
- [Available Tables & Schema](#available-tables--schema)
- [Relationships](#relationships)
- [Query Examples](#query-examples)
- [Advanced Features](#advanced-features)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Performance Tips](#performance-tips)

## Overview

The ASI-Chain indexer provides a powerful GraphQL API powered by Hasura, offering:
- **Zero-Touch Setup**: Automatic relationship configuration during deployment
- **Single Query Access**: Fetch related data across multiple tables in one request
- **Real-time Subscriptions**: Live updates as new blocks are indexed
- **Flexible Filtering**: Complex where clauses, sorting, and pagination
- **Aggregate Functions**: Count, sum, avg, max, min operations
- **JSONB Support**: Query into complex JSON fields like bonds_map and justifications
- **Enhanced Transfer Detection**: Supports both variable-based and match-based Rholang patterns
- **Data Quality**: Proper NULL handling for deployment error messages
- **Validator Bond Detection**: Full support for new CLI output format

## Access Details

### Endpoints
- **GraphQL Endpoint**: `http://localhost:8080/v1/graphql`
- **GraphQL Console**: `http://localhost:8080/console`
- **Admin Secret**: `myadminsecretkey`

### Authentication
Include the admin secret in your requests:
```bash
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query": "{ blocks(limit: 1) { block_number } }"}'
```

## Available Tables & Schema

### 1. **blocks**
Core blockchain blocks with enhanced Rust CLI data.

| Field | Type | Description |
|-------|------|-------------|
| block_number | String | Block height |
| block_hash | String | Unique block identifier |
| parent_hash | String | Previous block hash |
| timestamp | String | Block creation time (milliseconds) |
| proposer | String | Validator who proposed the block |
| state_root_hash | String | Post-execution state hash |
| pre_state_hash | String | Pre-execution state hash |
| fault_tolerance | Numeric | Network fault tolerance (0-1) |
| finalization_status | String | Block finalization state |
| bonds_map | JSONB | Array of validator bonds |
| justifications | JSONB | Array of validator justifications |
| deployment_count | Integer | Number of deployments |

### 2. **deployments**
Smart contract deployments and transactions.

| Field | Type | Description |
|-------|------|-------------|
| deploy_id | String | Unique deployment signature |
| deployer | String | Account that created deployment |
| deployment_type | String | Classification (smart_contract, validator_operation, rev_transfer) |
| term | Text | Rholang source code |
| timestamp | String | Deployment creation time |
| block_number | String | Block containing deployment |
| block_hash | String | Block hash reference |
| errored | Boolean | Whether deployment failed |
| error_message | String | Error details if failed |
| status | String | Deployment status |

### 3. **transfers**
REV token transfers extracted from deployments.

| Field | Type | Description |
|-------|------|-------------|
| id | BigInt | Auto-increment transfer ID |
| from_address | String | Sender address (REV address or validator public key) |
| to_address | String | Recipient address (REV address or validator public key) |
| amount_dust | BigInt | Amount in dust (smallest unit) |
| amount_rev | Numeric | REV amount (8 decimals) |
| deploy_id | String | Associated deployment |
| block_number | String | Block containing transfer |
| status | String | Transfer status |

### 4. **validator_bonds**
Historical validator stake records per block (including genesis bonds).

| Field | Type | Description |
|-------|------|-------------|
| id | BigInt | Unique record ID |
| validator_public_key | String | Full validator public key (130+ chars) |
| stake | BigInt | Staked amount in dust |
| block_number | String | Block height |
| block_hash | String | Block reference |

### 5. **network_stats**
Network health metrics over time.

| Field | Type | Description |
|-------|------|-------------|
| block_number | BigInt | Block height |
| total_validators | Integer | Total validator count |
| active_validators | Integer | Active validator count |
| validators_in_quarantine | Integer | Quarantined validators |
| consensus_participation | Numeric | Participation rate (%) |
| consensus_status | String | Network health status |

### 6. **balance_states**
Address balance tracking with bonded/unbonded separation.

| Field | Type | Description |
|-------|------|-------------|
| id | BigInt | Unique record ID |
| address | String | REV address or validator public key (up to 150 chars) |
| block_number | BigInt | Block height for this balance snapshot |
| unbonded_balance_dust | BigInt | Unbonded balance in dust |
| unbonded_balance_rev | Numeric | Unbonded balance in REV |
| bonded_balance_dust | BigInt | Bonded/staked balance in dust |
| bonded_balance_rev | Numeric | Bonded/staked balance in REV |
| updated_at | Timestamp | Last update time |

### 7. **epoch_transitions**
Epoch boundary tracking.

| Field | Type | Description |
|-------|------|-------------|
| id | BigInt | Unique record ID |
| epoch_number | BigInt | Epoch number |
| start_block | BigInt | First block of epoch |
| end_block | BigInt | Last block of epoch |
| active_validators | Integer | Number of active validators |
| quarantine_length | Integer | Quarantine period length |

### 8. **block_validators**
Block-validator relationships for justifications.

| Field | Type | Description |
|-------|------|-------------|
| block_hash | String | Block hash (composite PK) |
| validator_public_key | String | Validator who signed/justified |

### 9. **validators**
Validator registry.

| Field | Type | Description |
|-------|------|-------------|
| public_key | String | Validator public key (PK) |
| name | String | Validator name (optional) |
| total_stake | BigInt | Total staked amount |
| status | String | active/bonded/quarantine/inactive |
| first_seen_block | BigInt | First appearance |
| last_seen_block | BigInt | Last activity |

### 10. **indexer_state**
Indexer metadata and sync status.

| Field | Type | Description |
|-------|------|-------------|
| key | String | State key |
| value | Text | State value |
| updated_at | Timestamp | Last update |

## Relationships

The following relationships are configured for nested queries:

### One-to-Many (Array Relationships)
- `blocks` → `deployments`: All deployments in a block
- `blocks` → `transfers`: All transfers in a block
- `blocks` → `validator_bonds`: Validator stakes at block
- `blocks` → `block_validators`: Validators who justified block
- `blocks` → `balance_states`: Balance snapshots at block
- `deployments` → `transfers`: REV transfers from deployment

### Many-to-One (Object Relationships)
- `deployments` → `block`: Parent block details
- `transfers` → `deployment`: Source deployment
- `transfers` → `block`: Block containing transfer
- `validator_bonds` → `block`: Block reference
- `balance_states` → `block`: Block reference

## Query Examples

### Basic Queries

#### Get Latest Blocks
```graphql
query GetLatestBlocks {
  blocks(limit: 10, order_by: {block_number: desc}) {
    block_number
    block_hash
    timestamp
    proposer
    deployment_count
  }
}
```

#### Search Deployments by Deployer
```graphql
query SearchDeployments($deployer: String!) {
  deployments(where: {deployer: {_eq: $deployer}}) {
    deploy_id
    deployment_type
    timestamp
    errored
    error_message
  }
}
```

### Nested Queries

#### Blocks with All Related Data
```graphql
query BlocksWithDetails {
  blocks(limit: 5, order_by: {block_number: desc}) {
    block_number
    block_hash
    state_root_hash
    fault_tolerance
    
    # Nested deployments
    deployments {
      deploy_id
      deployment_type
      errored
      
      # Nested transfers
      transfers {
        from_address
        to_address
        amount_rev
      }
    }
    
    # Validator bonds
    validator_bonds {
      validator_public_key
      stake
    }
  }
}
```

#### REV Transfer Analysis (Enhanced in v2.1)
```graphql
query TransferAnalysis {
  transfers(order_by: {amount_rev: desc}, limit: 10) {
    from_address  # Now supports 53-56 char addresses
    to_address    # Both REV addresses and validator keys
    amount_rev
    
    # Parent deployment details
    deployment {
      deploy_id
      deployer
      
      # Parent block details
      block {
        block_number
        timestamp
      }
    }
  }
}
```

#### All Transfers Including Genesis
```graphql
query AllTransfers {
  transfers(order_by: {block_number: asc}) {
    block_number
    from_address
    to_address
    amount_rev
    status
  }
  transfers_aggregate {
    aggregate {
      count
      sum { amount_rev }
    }
  }
}
```

### Aggregate Queries

#### Network Statistics
```graphql
query NetworkStats {
  blocks_aggregate {
    aggregate {
      count
      avg {
        deployment_count
      }
    }
  }
  
  deployments_aggregate(where: {errored: {_eq: true}}) {
    aggregate {
      count
    }
  }
  
  transfers_aggregate {
    aggregate {
      count
      sum {
        amount_rev
      }
      avg {
        amount_rev
      }
      max {
        amount_rev
      }
    }
  }
}
```

#### Validator Performance
```graphql
query ValidatorStats {
  validator_bonds_aggregate(
    distinct_on: validator_public_key
  ) {
    aggregate {
      count
    }
    nodes {
      validator_public_key
      stake
    }
  }
}
```

### JSONB Queries

#### Query Bonds Map
```graphql
query BlockBonds {
  blocks(where: {block_number: {_eq: "100"}}) {
    block_number
    bonds_map
    justifications
  }
}
```

#### Filter by JSONB Content
```graphql
query HighStakeValidators {
  blocks(
    where: {
      bonds_map: {
        _contains: [{stake: 50000000000000}]
      }
    },
    limit: 5
  ) {
    block_number
    bonds_map
  }
}
```

### Wallet Balance Query

#### Check Any Wallet Balance
```graphql
query GetWalletBalance($address: String!) {
  # Incoming transfers
  incoming: transfers_aggregate(
    where: {to_address: {_eq: $address}}
  ) {
    aggregate {
      sum { amount_rev }
      count
    }
  }
  
  # Outgoing transfers
  outgoing: transfers_aggregate(
    where: {from_address: {_eq: $address}}
  ) {
    aggregate {
      sum { amount_rev }
      count
    }
  }
  
  # Transaction history
  transactions: transfers(
    where: {
      _or: [
        {from_address: {_eq: $address}},
        {to_address: {_eq: $address}}
      ]
    },
    order_by: {block_number: desc}
  ) {
    from_address
    to_address
    amount_rev
    block_number
    status
    deployment {
      timestamp
      block {
        timestamp
      }
    }
  }
}
```

**Example Usage:**
```bash
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{
    "query": "query { incoming: transfers_aggregate(where: {to_address: {_eq: \"111129p33f7vaRrpLqK8Nr35Y2aacAjrR5pd6PCzqcdrMuPHzymczH\"}}) { aggregate { sum { amount_rev } count } } outgoing: transfers_aggregate(where: {from_address: {_eq: \"111129p33f7vaRrpLqK8Nr35Y2aacAjrR5pd6PCzqcdrMuPHzymczH\"}}) { aggregate { sum { amount_rev } count } } }"
  }'
```

**Balance Calculation:**
- Balance = Total Received - Total Sent
- The query returns aggregated sums that you can subtract client-side
- Transaction history helps verify the calculation

**Note:** This shows the balance based on indexed transfers only. Consider:
- Genesis allocations aren't included
- Validator rewards aren't tracked as transfers
- Gas fees aren't deducted
- Only successful transfers are counted

### Complex Analysis Query

```graphql
query BlockchainAnalysis($start_block: String!, $end_block: String!) {
  # Block range analysis
  block_range: blocks(
    where: {
      _and: [
        {block_number: {_gte: $start_block}},
        {block_number: {_lte: $end_block}}
      ]
    }
  ) {
    block_number
    timestamp
    deployment_count
    fault_tolerance
  }
  
  # Deployment types in range
  deployment_types: deployments_aggregate(
    where: {
      block_number: {_gte: $start_block, _lte: $end_block}
    }
  ) {
    aggregate {
      count
    }
    group_by {
      deployment_type
    }
  }
  
  # Transfer volume in range
  transfer_volume: transfers_aggregate(
    where: {
      block_number: {_gte: $start_block, _lte: $end_block}
    }
  ) {
    aggregate {
      sum {
        amount_rev
      }
      count
    }
  }
}
```

## Advanced Features

### Pagination
```graphql
query PaginatedBlocks($offset: Int!, $limit: Int!) {
  blocks(
    offset: $offset,
    limit: $limit,
    order_by: {block_number: desc}
  ) {
    block_number
    block_hash
  }
}
```

### Complex Filtering
```graphql
query ComplexFilter {
  deployments(
    where: {
      _and: [
        {deployment_type: {_eq: "smart_contract"}},
        {errored: {_eq: false}},
        {timestamp: {_gte: "1754373000000"}}
      ]
    }
  ) {
    deploy_id
    term
  }
}
```

### Distinct Values
```graphql
query UniqueDeployers {
  deployments(
    distinct_on: deployer,
    order_by: {deployer: asc}
  ) {
    deployer
  }
}
```

## Real-time Subscriptions

Hasura supports GraphQL subscriptions for real-time updates:

```graphql
subscription NewBlocks {
  blocks(
    order_by: {block_number: desc},
    limit: 1
  ) {
    block_number
    block_hash
    timestamp
    deployment_count
  }
}
```

```graphql
subscription TransferStream {
  transfers(
    order_by: {created_at: desc},
    limit: 10,
    where: {amount_rev: {_gt: "100"}}
  ) {
    from_address
    to_address
    amount_rev
    created_at
  }
}
```

## Performance Tips

1. **Use Specific Fields**: Only request fields you need
   ```graphql
   # Good
   blocks { block_number, block_hash }
   
   # Avoid
   blocks { ... all fields ... }
   ```

2. **Limit Nested Queries**: Deep nesting can be expensive
   ```graphql
   # Set reasonable limits on nested arrays
   blocks(limit: 10) {
     deployments(limit: 5) {
       transfers(limit: 2)
     }
   }
   ```

3. **Use Indexes**: Queries on indexed columns are faster
   - block_number, block_hash, deploy_id are indexed
   - timestamp fields are indexed
   - Foreign key columns are indexed

4. **Aggregate Wisely**: Large aggregations can be slow
   ```graphql
   # Add filters to aggregates
   deployments_aggregate(
     where: {block_number: {_gte: "1000"}}
   )
   ```

5. **Pagination**: Use offset/limit for large datasets
   ```graphql
   blocks(offset: 0, limit: 100)
   ```

## GraphQL vs REST API

While the indexer also provides REST endpoints, GraphQL offers advantages:

| Feature | GraphQL | REST API |
|---------|---------|----------|
| Single Request | ✅ Fetch related data in one query | ❌ Multiple endpoints |
| Over/Under-fetching | ✅ Request exact fields | ❌ Fixed responses |
| Real-time | ✅ Subscriptions | ❌ Polling required |
| Type Safety | ✅ Strong typing | ⚠️ Limited |
| Filtering | ✅ Complex where clauses | ⚠️ Basic |
| Relationships | ✅ Nested queries | ❌ Manual joins |

## Practical Examples

### Wallet Balance Checker (JavaScript)
```javascript
async function getWalletBalance(address) {
  const query = `
    query GetBalance($address: String!) {
      incoming: transfers_aggregate(where: {to_address: {_eq: $address}}) {
        aggregate { sum { amount_rev } count }
      }
      outgoing: transfers_aggregate(where: {from_address: {_eq: $address}}) {
        aggregate { sum { amount_rev } count }
      }
      transactions: transfers(
        where: {_or: [{from_address: {_eq: $address}}, {to_address: {_eq: $address}}]},
        order_by: {block_number: desc},
        limit: 10
      ) {
        from_address
        to_address
        amount_rev
        block_number
      }
    }
  `;

  const response = await fetch('http://localhost:8080/v1/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': 'myadminsecretkey'
    },
    body: JSON.stringify({ query, variables: { address } })
  });

  const { data } = await response.json();
  
  const received = parseFloat(data.incoming.aggregate.sum?.amount_rev || 0);
  const sent = parseFloat(data.outgoing.aggregate.sum?.amount_rev || 0);
  
  return {
    address,
    balance: received - sent,
    totalReceived: received,
    totalSent: sent,
    transactionCount: data.incoming.aggregate.count + data.outgoing.aggregate.count,
    recentTransactions: data.transactions
  };
}

// Usage
const balance = await getWalletBalance('111129p33f7vaRrpLqK8Nr35Y2aacAjrR5pd6PCzqcdrMuPHzymczH');
console.log(`Balance: ${balance.balance} REV`);
```

### Top Wallets by Activity
```graphql
query TopWallets {
  # Most active senders
  top_senders: transfers_aggregate(
    group_by: from_address,
    order_by: {count: desc},
    limit: 10
  ) {
    aggregate {
      count
      sum { amount_rev }
    }
    group_by {
      from_address
    }
  }
  
  # Most active receivers
  top_receivers: transfers_aggregate(
    group_by: to_address,
    order_by: {count: desc},
    limit: 10
  ) {
    aggregate {
      count
      sum { amount_rev }
    }
    group_by {
      to_address
    }
  }
}
```

### Wallet Transaction History with Pagination
```graphql
query WalletHistory($address: String!, $offset: Int!, $limit: Int!) {
  transfers(
    where: {
      _or: [
        {from_address: {_eq: $address}},
        {to_address: {_eq: $address}}
      ]
    },
    order_by: {block_number: desc},
    offset: $offset,
    limit: $limit
  ) {
    from_address
    to_address
    amount_rev
    block_number
    status
    deployment {
      timestamp
      deployer
      deployment_type
    }
  }
  
  # Get total count for pagination
  transfers_aggregate(
    where: {
      _or: [
        {from_address: {_eq: $address}},
        {to_address: {_eq: $address}}
      ]
    }
  ) {
    aggregate { count }
  }
}
```

## Client Libraries

### JavaScript/TypeScript
```javascript
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('http://localhost:8080/v1/graphql', {
  headers: {
    'x-hasura-admin-secret': 'myadminsecretkey'
  }
});

const query = `
  query GetBlocks($limit: Int!) {
    blocks(limit: $limit, order_by: {block_number: desc}) {
      block_number
      block_hash
    }
  }
`;

const data = await client.request(query, { limit: 10 });
```

### Python
```python
import requests

url = 'http://localhost:8080/v1/graphql'
headers = {
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': 'myadminsecretkey'
}

query = '''
query GetBlocks($limit: Int!) {
  blocks(limit: $limit, order_by: {block_number: desc}) {
    block_number
    block_hash
  }
}
'''

response = requests.post(url, json={
    'query': query,
    'variables': {'limit': 10}
}, headers=headers)

data = response.json()
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```json
   {"error": "x-hasura-admin-secret required"}
   ```
   Solution: Include the admin secret header

2. **Field Not Found**
   ```json
   {"error": "field 'xyz' not found in type: 'blocks'"}
   ```
   Solution: Check field names in schema

3. **Relationship Not Found**
   ```json
   {"error": "field 'deployments' not found"}
   ```
   Solution: Ensure relationships are configured

4. **Timeout on Large Queries**
   - Add limits to nested queries
   - Use pagination
   - Add where clauses to reduce dataset

## Next Steps

1. **Explore the Console**: Visit http://localhost:8080/console to:
   - Browse the schema
   - Build queries visually
   - Test subscriptions
   - View relationships

2. **Set Up Permissions**: Configure role-based access control

3. **Add Custom Business Logic**: Create Actions and Remote Schemas

4. **Monitor Performance**: Use Hasura's built-in analytics

5. **Deploy to Production**: Consider Hasura Cloud for managed hosting