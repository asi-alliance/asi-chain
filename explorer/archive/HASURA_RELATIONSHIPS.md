# Hasura GraphQL Relationships Documentation

## Overview

This document describes the Hasura GraphQL relationships configuration for the ASI Chain Explorer.

## Current Status: ✅ FULLY CONFIGURED

All table relationships have been properly configured in Hasura using the `indexer/scripts/setup-hasura-relationships.sh` script. The relationships are automatically established during indexer deployment.

## Configured Relationships

### 1. Blocks Table

**Array Relationships (one-to-many):**
- `blocks.deployments` → Points to all deployments in this block
- `blocks.transfers` → Points to all transfers in this block
- `blocks.validator_bonds` → Points to all validator bonds at this block height

### 2. Deployments Table

**Object Relationships (many-to-one):**
- `deployments.block` → Points to the block containing this deployment

**Array Relationships (one-to-many):**
- `deployments.transfers` → Points to all transfers from this deployment

### 3. Transfers Table

**Object Relationships (many-to-one):**
- `transfers.deployment` → Points to the deployment that created this transfer
- `transfers.block` → Points to the block containing this transfer

### 4. Validators Table

**Array Relationships (one-to-many):**
- `validators.validator_bonds` → Points to all bond records for this validator

### 5. Validator Bonds Table

**Object Relationships (many-to-one):**
- `validator_bonds.validator` → Points to the validator record
- `validator_bonds.block` → Points to the block at this bond height

### 6. Balance States Table

**Object Relationships (many-to-one):**
- `balance_states.block` → Points to the block at this balance snapshot

## Example Nested Queries

With relationships configured, you can now write nested queries:

### Get Block with All Related Data
```graphql
query GetBlockComplete($blockNumber: bigint!) {
  blocks(where: { block_number: { _eq: $blockNumber } }) {
    block_number
    block_hash
    timestamp
    proposer
    
    # Nested deployments
    deployments {
      deploy_id
      deployer
      deployment_type
      phlo_cost
      
      # Nested transfers from deployment
      transfers {
        from_address
        to_address
        amount_rev
      }
    }
    
    # Direct transfers in block
    transfers {
      from_address
      to_address
      amount_rev
      status
    }
    
    # Validator bonds at this height
    validator_bonds {
      validator_address
      amount
    }
  }
}
```

### Get Transfer with Full Context
```graphql
query GetTransferDetails($transferId: Int!) {
  transfers(where: { id: { _eq: $transferId } }) {
    from_address
    to_address
    amount_rev
    status
    
    # Block information
    block {
      block_number
      timestamp
      proposer
    }
    
    # Deployment information
    deployment {
      deploy_id
      deployer
      deployment_type
      phlo_cost
    }
  }
}
```

### Get Validator with Bond History
```graphql
query GetValidatorDetails($publicKey: String!) {
  validators(where: { public_key: { _eq: $publicKey } }) {
    public_key
    name
    status
    total_stake
    
    # Bond history
    validator_bonds(order_by: { block_number: desc }) {
      amount
      block_number
      
      # Block details for each bond
      block {
        timestamp
        block_hash
      }
    }
  }
}
```

## Configuration Script

The relationships are configured using `indexer/scripts/setup-hasura-relationships.sh`, which:

1. Creates object relationships (many-to-one)
2. Creates array relationships (one-to-many)
3. Uses manual configuration (no foreign keys required)
4. Handles cases where columns don't match exactly

### Running the Script

The script is automatically run during indexer deployment:

```bash
cd indexer
./deploy.sh  # Automatically runs setup-hasura-relationships.sh
```

To manually configure relationships:

```bash
cd indexer/scripts
./setup-hasura-relationships.sh
```

## Benefits of Configured Relationships

1. **Simplified Queries**: No need for multiple separate queries and client-side joins
2. **Better Performance**: Database handles joins efficiently
3. **Cleaner Code**: Components can request exactly the data they need
4. **Type Safety**: GraphQL schema reflects actual relationships
5. **Reduced Network Overhead**: Single request instead of multiple

## Troubleshooting

### If Relationships Are Missing

1. Check Hasura is running:
   ```bash
   docker ps | grep hasura
   ```

2. Re-run the setup script:
   ```bash
   cd indexer/scripts
   ./setup-hasura-relationships.sh
   ```

3. Verify in Hasura Console:
   - Navigate to http://localhost:8080/console
   - Go to Data → Track tables
   - Check Relationships tab for each table

### Common Issues

- **"Relationship already exists"**: Safe to ignore, means it's already configured
- **"Column not found"**: Check database schema matches expected columns
- **"Permission denied"**: Ensure Hasura admin secret is correct

## Migration from Non-Relational Queries

If you have code using separate queries, you can now simplify:

**Before (without relationships):**
```typescript
const { data: blockData } = useQuery(GET_BLOCK);
const { data: deploymentsData } = useQuery(GET_DEPLOYMENTS, {
  variables: { blockNumber: blockData?.blocks[0]?.block_number }
});
```

**After (with relationships):**
```typescript
const { data } = useQuery(GET_BLOCK_WITH_DEPLOYMENTS);
// data.blocks[0].deployments is already available
```

## Summary

The Hasura relationships are now fully configured, enabling powerful nested queries that simplify the explorer codebase and improve performance. The configuration is automated and integrated into the indexer deployment process.