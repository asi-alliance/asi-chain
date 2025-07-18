# Smart Contract Deployment

## Overview

This guide shows how to deploy Rholang smart contracts to the ASI:Chain testnet using your validator node.

## Requirements

- Running validator node with API access
- Valid private key for transaction signing
- Node synchronized with the network

## Basic Contract Example

### Hello World Contract

```rholang
new stdout(`rho:io:stdout`) in {
  stdout!("Hello, ASI:Chain!")
}
```

## Deployment Process

### Step 1: Deploy Contract

Use the RNode CLI to deploy your contract:

```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode \
    --grpc-host localhost \
    --grpc-port "40402" \
    deploy \
    --private-key "<YOUR-PRIVATE-KEY>" \
    --phlo-limit 10000000 \
    --phlo-price 1 \
    --valid-after-block-number 0 \
    --shard-id root \
    "/opt/docker/examples/stdout.rho"
```

### Parameters Explanation

- `--grpc-host localhost`: Connect to local node
- `--grpc-port "40402"`: Internal gRPC port
- `--private-key`: Your validator's private key
- `--phlo-limit`: Maximum computational resources (gas limit)
- `--phlo-price`: Price per computational unit (gas price) 
- `--valid-after-block-number`: Minimum block for execution
- `--shard-id root`: Target shard for deployment

### Step 2: Verify Deployment

**Expected Success Response**:
```
Response: Success!
DeployId is: 304402206c435cee64d97d123f0c1b4552b3568698e64096a29fb50ec38f11a6c5f7758b022002e05322156bf5ed878ce20cef072cd8faf9e8bb15b58131f2fee06053b5d1c5
```

### Step 3: Propose Block

After deployment, propose a block to include your contract:

```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode \
    --grpc-host localhost \
    --grpc-port "40402" \
    propose
```

**Expected Success Response**:
```
Response: Success! Block 4dda69c62838e18abd3c131818e60110ac3caccc66ec05792cedb327a3bafff7 created and added.
```

## Verify Execution

### Check Logs

Monitor validator logs for contract execution:

```bash
sudo docker logs validator -f
```

Look for your contract output (e.g., "Hello, ASI:Chain!")

### Alternative: Custom Term Deployment

You can also deploy custom Rholang code directly:

```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode \
    --grpc-host localhost \
    --grpc-port "40402" \
    deploy \
    --private-key "<YOUR-PRIVATE-KEY>" \
    --phlo-limit 10000000 \
    --phlo-price 1 \
    --valid-after-block-number 0 \
    --shard-id root \
    --term 'new stdout(`rho:io:stdout`) in { stdout!("Custom message") }'
```

## Available Examples

The node container includes example contracts in `/opt/docker/examples/`:
- `stdout.rho` - Simple output example

## Troubleshooting

**Deployment Fails**:
- Verify private key is correct
- Check node synchronization status
- Ensure sufficient phlo limit

**No Output in Logs**:
- Wait for block proposal and finalization
- Check if contract uses stdout correctly
- Verify contract syntax