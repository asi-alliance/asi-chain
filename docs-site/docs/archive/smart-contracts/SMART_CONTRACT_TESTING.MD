# F1R3FLY/ASI Chain Smart Contract Testing Guide

## Overview

This guide covers testing and deploying Rholang smart contracts on the F1R3FLY blockchain network. Rholang is a concurrent programming language designed for writing smart contracts on the RChain platform.

## Rholang Basics

### Key Concepts
- **Channels**: Named communication channels for message passing
- **Processes**: Concurrent computations
- **Pattern Matching**: Structural pattern matching for data
- **Par Composition**: Parallel execution using `|`

## Test Contracts

### 1. Hello World Contract

**Location**: `/home/ubuntu/f1r3fly/docker/contracts/hello_world.rho`

```rholang
// Simple Hello World contract
new helloWorld, stdout(`rho:io:stdout`) in {
  contract helloWorld(@name, return) = {
    stdout!("Hello, " ++ name ++ "!") |
    return!("Greeted " ++ name)
  } |
  helloWorld!("F1R3FLY Network", *stdout)
}
```

**Purpose**: Basic contract demonstrating:
- Channel creation
- Contract definition
- String concatenation
- Return values

### 2. Token Contract

**Location**: `/home/ubuntu/f1r3fly/docker/contracts/token.rho`

```rholang
// Simple Token Contract
new token, stdout(`rho:io:stdout`) in {
  contract token(@action, @from, @to, @amount, return) = {
    new balances in {
      balances!({"alice": 1000, "bob": 500}) |
      for (@currentBalances <- balances) {
        match action {
          "transfer" => {
            // Transfer logic
          }
          "balance" => {
            // Balance query logic
          }
        }
      }
    }
  }
}
```

**Purpose**: Demonstrates:
- State management
- Pattern matching
- Map operations
- Conditional logic

## Deployment Methods

### Method 1: Using gRPC Deploy API

```bash
# Deploy using gRPC from command line
grpcurl -plaintext \
  -d '{"data": "<rholang_code>", "phloLimit": 100000, "phloPrice": 1}' \
  localhost:40412 \
  casper.v1.DeployService/Deploy
```

### Method 2: Using RNode CLI

```bash
# From inside a validator container
docker exec -it rnode.validator1 bash

# Deploy a contract
rnode deploy \
  --phlo-limit 100000 \
  --phlo-price 1 \
  --valid-after-block-number 0 \
  /path/to/contract.rho

# Propose a block to include the deploy
rnode propose
```

### Method 3: Using Deploy Script

```bash
# Run the deployment script
cd /home/ubuntu/f1r3fly/docker
./deploy_contracts.sh
```

## Testing Workflow

### Step 1: Write Contract

Create a new contract file:
```bash
vim contracts/my_contract.rho
```

### Step 2: Validate Syntax

```bash
# Check syntax (from container)
docker exec rnode.validator1 rnode eval my_contract.rho
```

### Step 3: Deploy Contract

```bash
# Copy to container
docker cp contracts/my_contract.rho rnode.validator1:/tmp/

# Deploy
docker exec rnode.validator1 rnode deploy \
  --phlo-limit 100000 \
  --phlo-price 1 \
  /tmp/my_contract.rho
```

### Step 4: Create Block

```bash
# Propose block to include deploy
docker exec rnode.validator1 rnode propose
```

### Step 5: Verify Deployment

```bash
# Check deploy status
docker exec rnode.validator1 rnode show-deploy <deploy_id>

# View blocks
curl http://localhost:40413/api/blocks
```

## Validator4 Bonding Process

### Current Status
Validator4 is running but not bonded to the network. It operates as a read-only node until bonded.

### Bonding Requirements
1. Stake amount (minimum required by network)
2. Validator public key
3. Bonding contract deployment

### Bonding Steps

```bash
# 1. Check current validators
curl http://localhost:40413/api/bonds

# 2. Prepare bonding contract
cat > bond_validator4.rho << 'EOF'
new bond, stdout(`rho:io:stdout`) in {
  // Bonding logic here
  stdout!("Bonding validator4 with stake")
}
EOF

# 3. Deploy bonding contract
docker exec rnode.validator1 rnode deploy \
  --phlo-limit 1000000 \
  --phlo-price 1 \
  bond_validator4.rho

# 4. Propose block
docker exec rnode.validator1 rnode propose

# 5. Verify bonding
curl http://localhost:40443/api/bonds
```

## Advanced Contract Examples

### 1. Multi-Signature Wallet

```rholang
new MultiSigWallet, stdout(`rho:io:stdout`) in {
  contract MultiSigWallet(@owners, @required, return) = {
    new transactions, approvals in {
      contract @"propose"(@to, @amount, @data, proposer, txReturn) = {
        // Proposal logic
      } |
      contract @"approve"(@txId, @approver, result) = {
        // Approval logic
      } |
      contract @"execute"(@txId, result) = {
        // Execution logic
      }
    }
  }
}
```

### 2. Voting Contract

```rholang
new Voting, stdout(`rho:io:stdout`) in {
  contract Voting(@proposal, @duration, return) = {
    new votes, endTime in {
      contract @"vote"(@voter, @choice, result) = {
        // Voting logic
      } |
      contract @"tally"(result) = {
        // Count votes
      }
    }
  }
}
```

## Testing Best Practices

### 1. Unit Testing
- Test individual contract functions
- Use mock data for testing
- Verify return values

### 2. Integration Testing
- Test contract interactions
- Verify state changes
- Test error conditions

### 3. Performance Testing
- Monitor phlo consumption
- Test with various data sizes
- Measure execution time

### 4. Security Testing
- Test access controls
- Verify input validation
- Check for race conditions

## Common Patterns

### State Management
```rholang
new state in {
  state!(initialValue) |
  contract update(@newValue, return) = {
    for (@oldValue <- state) {
      state!(newValue) |
      return!("Updated")
    }
  }
}
```

### Access Control
```rholang
new accessControl in {
  contract restricted(@caller, @action, return) = {
    if (caller == owner) {
      // Execute action
      return!("Success")
    } else {
      return!("Unauthorized")
    }
  }
}
```

### Event Emission
```rholang
new events in {
  contract emit(@eventType, @data) = {
    events!({"type": eventType, "data": data, "timestamp": *timestamp})
  }
}
```

## Monitoring Deployments

### View Recent Deploys
```bash
# Get recent deploys
curl http://localhost:40413/api/deploys

# Check specific deploy
curl http://localhost:40413/api/deploy/<deploy_id>
```

### Monitor Block Production
```bash
# Watch for new blocks
watch -n 5 'curl -s http://localhost:40413/api/blocks | jq ".[] | {blockNumber, timestamp}"'
```

### Check Contract Execution
```bash
# View contract results in logs
docker logs rnode.validator1 --tail 50 | grep -A5 "stdout"
```

## Troubleshooting

### Issue: Deploy Not Included in Block
**Solution**: 
- Ensure AutoPropose is running
- Manually propose: `docker exec rnode.validator1 rnode propose`
- Check phlo limits

### Issue: Contract Syntax Error
**Solution**:
- Validate syntax: `rnode eval contract.rho`
- Check for matching brackets and quotes
- Verify channel names

### Issue: Insufficient Phlo
**Solution**:
- Increase phlo limit in deploy command
- Optimize contract code
- Remove unnecessary computations

### Issue: Deploy Failed
**Solution**:
- Check validator logs: `docker logs rnode.validator1`
- Verify network connectivity
- Ensure validator is synchronized

## Performance Considerations

### Phlo Optimization
- Minimize pattern matching complexity
- Reduce nested for comprehensions
- Use efficient data structures

### Concurrency
- Leverage parallel composition (`|`)
- Avoid unnecessary synchronization
- Design for concurrent execution

### Storage
- Minimize on-chain data
- Use references for large data
- Clean up unused channels

## Resources

### Documentation
- [Rholang Tutorial](https://github.com/rchain/rchain/tree/dev/docs/rholang)

### Tools
- [RNode CLI Reference](https://rchain.atlassian.net/wiki/spaces/CORE/pages/)
- [gRPC API Documentation](https://github.com/rchain/rchain/tree/dev/models/src/main/protobuf)

### Examples
- [Official Examples](https://github.com/rchain/rchain/tree/dev/casper/src/test/resources/rholang-examples)
- [Community Contracts](https://github.com/rchain-community)

---

**Created**: August 12, 2025
**Network**: F1R3FLY/ASI Chain on AWS Lightsail
**Status**: Testing Environment Ready

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
