# REV Transfer Tracking in ASI-Chain/RChain

## Overview

REV transfers in the ASI-Chain/RChain network are not regular deployments but are executed through the RevVault system contract. This document explains how to track and extract REV transfer data from the blockchain.

## Understanding REV Transfers

### 1. REV Transfer Mechanism

REV transfers are executed through the RevVault contract with the following pattern:

```rholang
@RevVault!("transfer", targetAddress, amount, authKey, returnChannel)
```

### 2. System Deploys vs User Deploys

REV transfers involve multiple types of deploys:

- **PreCharge**: System deploy that charges the deployer for transaction costs
- **UserDeploy**: The actual user's deployment containing the transfer request
- **Refund**: System deploy that refunds unused gas to the deployer

### 3. Transfer Logging

The RevVault contract maintains an internal log that can be enabled:

```rholang
// From RevVault.rho
contract revVault(@"transfer", @targetAddress, @amount, authKey, ret) = {
  // ... transfer logic ...
  for (logCh <<- logStore) {
    if (Nil != *logCh) {
      new bd(`rho:block:data`), bdCh in {
        bd!(*bdCh) |
        for (@blockNumber, @timestamp, @sender <- bdCh) {
          logCh!(["transfer", targetAddress, amount, result, blockNumber, timestamp, sender])
        }
      }
    }
  }
}
```

## Methods to Track REV Transfers

### 1. Transaction API (Recommended)

The node provides a Transaction API that extracts transfer information from blocks:

```python
# API endpoint: /api/transaction/{blockHash}
# Returns: TransactionResponse with list of TransactionInfo objects
```

Transaction types include:
- `PreCharge(deployId)`
- `UserDeploy(deployId)`
- `Refund(deployId)`
- `CloseBlock(blockHash)`
- `SlashingDeploy(blockHash)`

### 2. Block Report API

Use the block report to get detailed deploy information:

```bash
# Via RNode CLI
docker exec rnode.readonly ./bin/rnode show-block <block_hash>

# Via API
POST /api/block-report
{
  "hash": "<block_hash>",
  "forceReplay": false
}
```

### 3. Data at Name Query

Query specific RevVault data:

```bash
# Via API
POST /api/data-at-name
{
  "name": {
    "UnforgPrivate": "<rev_vault_unforgeable_name>"
  },
  "depth": 10
}
```

### 4. System Deploy Extraction

System deploys are stored in the block body:

```protobuf
message BodyProto {
  RChainStateProto state = 1;
  repeated ProcessedDeployProto deploys = 2;
  repeated ProcessedSystemDeployProto systemDeploys = 3;  // <-- Contains transfer-related system deploys
  bytes extraBytes = 4;
  repeated RejectedDeployProto rejectedDeploys = 5;
}
```

## Implementation Approach for Block Explorer

### 1. Enhanced Parser Updates

```python
def extract_rev_transfers(block_data):
    """Extract REV transfer information from a block."""
    transfers = []
    
    # Parse system deploys
    for sys_deploy in block_data.get('systemDeploys', []):
        if sys_deploy['type'] == 'PreCharge':
            # Track pre-charge for transfer cost
            pass
        elif sys_deploy['type'] == 'Refund':
            # Track refund amount
            pass
    
    # Parse user deploys for RevVault calls
    for deploy in block_data.get('deploys', []):
        term = deploy.get('term', '')
        if '@RevVault!("transfer"' in term or 'revVault!("transfer"' in term:
            # Extract transfer details from the Rholang term
            transfer_info = parse_transfer_term(term)
            transfers.append(transfer_info)
    
    return transfers

def parse_transfer_term(term):
    """Parse a RevVault transfer term to extract details."""
    # Extract targetAddress, amount, etc. from the Rholang term
    # This requires parsing the Rholang syntax
    pass
```

### 2. Database Schema Addition

```sql
CREATE TABLE IF NOT EXISTS rev_transfers (
    transfer_id         TEXT PRIMARY KEY,
    block_hash          TEXT NOT NULL,
    deploy_id           TEXT NOT NULL,
    from_address        TEXT NOT NULL,
    to_address          TEXT NOT NULL,
    amount              INTEGER NOT NULL,
    status              TEXT NOT NULL,  -- 'success', 'failed'
    error_message       TEXT,
    gas_cost            INTEGER,
    timestamp           INTEGER NOT NULL,
    created_at          TEXT NOT NULL,
    FOREIGN KEY (block_hash) REFERENCES blocks (block_hash),
    FOREIGN KEY (deploy_id) REFERENCES deployments (deploy_id)
);
```

### 3. API Integration

```python
# Use the Transaction API to get transfer data
def get_block_transfers(block_hash):
    url = f"http://rnode.readonly:40403/api/transaction/{block_hash}"
    response = requests.get(url)
    if response.status_code == 200:
        transaction_data = response.json()
        return parse_transaction_response(transaction_data)
    return []
```

## Practical Steps for Implementation

1. **Update the Enhanced Parser**:
   - Add system deploy parsing
   - Implement RevVault term detection
   - Extract transfer parameters from Rholang terms

2. **Create Transfer Tracking Tables**:
   - Add rev_transfers table
   - Link transfers to blocks and deploys

3. **Implement Transaction API Client**:
   - Query transaction endpoint for each block
   - Parse and store transfer information

4. **Update Block Explorer UI**:
   - Add transfers section to block details
   - Create transfer history view
   - Show transfer statistics

## Example: Detecting REV Transfers

```python
import re

def is_rev_transfer(deploy_term):
    """Check if a deploy contains a REV transfer."""
    patterns = [
        r'@RevVault!\s*\(\s*"transfer"',
        r'revVault!\s*\(\s*"transfer"',
        r'@\w+Vault!\s*\(\s*"transfer"'
    ]
    return any(re.search(pattern, deploy_term) for pattern in patterns)

def extract_transfer_params(deploy_term):
    """Extract transfer parameters from Rholang term."""
    # Pattern to match: @RevVault!("transfer", targetAddress, amount, authKey, *ret)
    pattern = r'Vault!\s*\(\s*"transfer"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,'
    match = re.search(pattern, deploy_term)
    if match:
        return {
            'to_address': match.group(1),
            'amount': int(match.group(2))
        }
    return None
```

## Notes

1. **System Deploys**: REV transfers involve system deploys (PreCharge, Refund) that are not visible in regular deployment lists
2. **Transfer Events**: The actual transfer logic generates events that can be tracked through the event log
3. **Balance Changes**: Track balance changes by querying RevVault balances before and after blocks
4. **Gas Costs**: PreCharge and Refund system deploys contain gas cost information

## Future Enhancements

1. **Real-time Transfer Monitoring**: Subscribe to block events and extract transfers in real-time
2. **Transfer Analytics**: Aggregate transfer data for network statistics
3. **Wallet Integration**: Link transfers to wallet addresses for transaction history
4. **Event Log Parsing**: Parse the event log for detailed transfer execution traces