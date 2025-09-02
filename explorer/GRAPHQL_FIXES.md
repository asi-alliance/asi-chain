# GraphQL Schema Fixes Documentation

## Overview

This document describes the GraphQL schema issues encountered in the ASI Chain Explorer and the fixes applied to resolve them.

## ✅ UPDATE: Relationships Have Been Fixed!

As of the latest update, all Hasura relationships have been properly configured using the `setup-hasura-relationships.sh` script located in `indexer/scripts/`. The explorer now supports nested queries as originally intended.

### Configured Relationships:
- **blocks → deployments** (array relationship)
- **deployments → block** (object relationship)
- **deployments → transfers** (array relationship)
- **transfers → deployment** (object relationship)
- **transfers → block** (object relationship)
- **validators → validator_bonds** (array relationship)
- **validator_bonds → validator** (object relationship)
- **blocks → transfers** (array relationship)

The relationships are automatically configured during indexer deployment via `indexer/deploy.sh`.

## Issues Encountered

### 1. Missing Table Relationships

**Error Messages:**
- `Error: field 'deployments' not found in type: 'blocks'`
- `Error: field 'block' not found in type: 'transfers'`
- `Error: field 'validator_bonds' not found in type: 'validators'`
- `Error: field 'indexer_state' not found in type: 'query_root'`

**Root Cause:**
Hasura relationships between tables were not configured in the indexer setup. The GraphQL schema only exposes direct table queries without nested relationships.

### 2. Non-existent Tables

**Error Message:**
- `Error: field 'indexer_state' not found in type: 'query_root'`

**Root Cause:**
The `indexer_state` table is referenced in queries but was never created in the database schema.

## Fixes Applied

### 1. Query Restructuring

**Before (with relationships):**
```graphql
query GetLatestBlocks {
  blocks {
    block_number
    deployments {  # This relationship doesn't exist
      deploy_id
      deployer
    }
  }
}
```

**After (separate queries):**
```graphql
query GetLatestBlocks {
  blocks {
    block_number
  }
}

query GetBlockDeployments($blockNumber: bigint!) {
  deployments(where: { block_number: { _eq: $blockNumber } }) {
    deploy_id
    deployer
  }
}
```

### 2. Component Updates

Modified components to fetch related data separately:

**BlockDetailPage.tsx:**
```typescript
// Before
const block = data?.blocks?.[0];
// Expected: block.deployments, block.validator_bonds

// After
const block = data?.blocks?.[0];
const deployments = data?.deployments || [];
const transfers = data?.transfers || [];
```

### 3. Removed References to Missing Tables

**IndexerStatusPage.tsx:**
```typescript
// Before
const state = data?.indexer_state?.find((s) => s.key === key);

// After
// Removed indexer_state queries
// Display sync status based on blocks_aggregate data only
```

## Updated Query Patterns

### Pattern 1: Fetching Block with Details

```graphql
query GetBlockDetails($blockNumber: bigint!) {
  # Fetch block
  blocks(where: { block_number: { _eq: $blockNumber } }) {
    block_number
    block_hash
    timestamp
    proposer
  }
  
  # Fetch related deployments separately
  deployments(where: { block_number: { _eq: $blockNumber } }) {
    deploy_id
    deployer
    deployment_type
    phlo_cost
  }
  
  # Fetch related transfers separately
  transfers(where: { block_number: { _eq: $blockNumber } }) {
    from_address
    to_address
    amount_rev
    status
  }
}
```

### Pattern 2: Address-based Queries

```graphql
query GetAddressActivity($address: String!) {
  # Get transfers involving the address
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
  
  # Get deployments by the address
  deployments(where: { deployer: { _eq: $address } }) {
    deploy_id
    deployment_type
    block_number
  }
}
```

### Pattern 3: Aggregate Queries

```graphql
query GetNetworkStats {
  blocks_aggregate {
    aggregate {
      count
      max { block_number }
    }
  }
  
  deployments_aggregate {
    aggregate {
      count
      avg { phlo_cost }
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

## Files Modified

1. **src/graphql/queries.ts**
   - Removed all nested relationship queries
   - Split complex queries into separate simple queries
   - Removed references to `indexer_state`

2. **src/pages/BlockDetailPage.tsx**
   - Updated to handle separate deployment and transfer data
   - Removed validator_bonds references

3. **src/pages/IndexerStatusPage.tsx**
   - Removed dependency on indexer_state table
   - Simplified to show basic sync status

4. **src/pages/ValidatorsPage.tsx**
   - Removed nested validator_bonds queries
   - Fetch validator data directly

## Future Improvements

### ✅ Option 1: Configure Hasura Relationships - COMPLETED

Relationships have been configured using the `indexer/scripts/setup-hasura-relationships.sh` script, which creates relationships without requiring foreign keys in the database. The script uses Hasura's manual relationship configuration API.

### Option 2: Create Missing Tables

Create the indexer_state table:

```sql
CREATE TABLE indexer_state (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial values
INSERT INTO indexer_state (key, value) VALUES 
  ('last_indexed_block', '0'),
  ('indexer_version', '1.0.0'),
  ('sync_status', 'syncing');
```

### Option 3: Use Custom GraphQL Resolvers

Implement custom resolvers in Hasura to join data:

```javascript
// Custom resolver example
const customResolvers = {
  Block: {
    deployments: async (parent, args, context) => {
      return await context.db.query(
        'SELECT * FROM deployments WHERE block_number = $1',
        [parent.block_number]
      );
    }
  }
};
```

## Testing

After fixes, test with:

```bash
# Test blocks page
curl http://localhost:3001

# Test GraphQL endpoint directly
curl http://localhost:8080/v1/graphql \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ blocks(limit: 1) { block_number } }"}'

# Run comprehensive tests
python test_all_pages.py
```

## Monitoring

Watch for these errors in browser console:
- GraphQL network errors (400, 500 status codes)
- Missing field errors in responses
- Type mismatch errors

Use browser DevTools Network tab to inspect GraphQL requests and responses.

## Summary

The fixes ensure the explorer works with the current Hasura schema without relationships. While this requires more queries and client-side data joining, it provides a stable, working solution. Future improvements can add proper relationships for better performance and simpler queries.