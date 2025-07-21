# Finalizer Bot

## Overview

The Finalizer Bot is a critical component of the ASI-Chain test network that ensures continuous block production by automatically deploying contracts and proposing blocks across all validators in a round-robin fashion.

## Purpose

The finalizer bot serves several important functions:

1. **Continuous Block Production**: Ensures the blockchain continues to produce blocks even when no external users are submitting transactions
2. **Network Stability**: Works around the broken transaction gossip by deploying directly to each validator
3. **Block 50 Solution**: Uses the patched CLI with `--valid-after-block-number` to set dynamic validity windows, completely resolving the block 50 halt issue
4. **Testing Facilitation**: Provides a stable environment for testing other blockchain features

## How It Works

### Basic Operation

The finalizer bot operates in a continuous loop:

1. Queries the observer node to get the current block number
2. Iterates through all validators (bootstrap, validator1, validator2, validator3)
3. For each validator:
   - Generates a unique Rholang contract with timestamp and nonce
   - Deploys the contract using `--valid-after-block-number` set to the current block
   - Proposes a block on the same validator's propose port
4. Waits 2 seconds before the next iteration

### Dynamic VABN Implementation

The finalizer bot uses the patched CLI's `--valid-after-block-number` feature to resolve the block 50 issue:

```bash
# Example deploy command with dynamic VABN
./node_cli deploy --file deploy.rho --valid-after-block-number 45
# This deploy is valid from block 45 to 95 (45 + 50)
```

### Unique Deploy Generation

For network stability, the bot generates unique Rholang contracts for each block. Each contract follows proper Rholang syntax and creates a unique data logging transaction:

#### Contract Format
```rholang
new ch_{timestamp}_{nonce} in { 
    ch_{timestamp}_{nonce}!({
        "validator": "{validator_name}", 
        "block": {block_num}, 
        "timestamp": {timestamp}, 
        "nonce": "{nonce}"
    }) 
}
```

#### Example Contract
```rholang
new ch_1752497264226_SnQ3TdHr in { 
    ch_1752497264226_SnQ3TdHr!({
        "validator": "rnode.validator3", 
        "block": 2, 
        "timestamp": 1752497264226, 
        "nonce": "SnQ3TdHr"
    }) 
}
```

#### Contract Components
- **Unique Channel**: `ch_{timestamp}_{nonce}` ensures each contract is unique
- **Data Payload**: JSON-like structure with deployment metadata
- **Valid Rholang**: Follows proper syntax with `new`, `in`, and `!` operations
- **No Side Effects**: Creates data logging entries without complex operations

This approach ensures that each deploy has a unique signature and can be accepted by the network beyond block 50.

## Configuration

### Validator Configuration

The validators are configured in the `VALIDATORS` array with proper Docker container names:

```python
VALIDATORS = [
    {
        "name": "rnode.bootstrap",
        "deploy_port": 40401,
        "propose_port": 40402
    },
    {
        "name": "rnode.validator1",
        "deploy_port": 40401,
        "propose_port": 40402
    },
    {
        "name": "rnode.validator2",
        "deploy_port": 40401,
        "propose_port": 40402
    },
    {
        "name": "rnode.validator3",
        "deploy_port": 40401,
        "propose_port": 40402
    }
]
```

**Note**: All validators use the same internal Docker ports (40401 for deploy, 40402 for propose) since they're accessed by container name within the Docker network.

### Environment Variables

- `RETRY_INTERVAL`: Time to wait between retries (default: 2 seconds)
- `MAX_RETRIES`: Maximum number of retry attempts (default: 10)

## Files

- `finalizer.py`: Main implementation with VABN support and unique deploy generation
- `finalizer_with_vabn.py`: VABN-enabled version (used as template by deploy script)
- `finalizer_unique_deploys.py`: Enhanced version with more deploy variety
- `finalizer_original.py`: Original version (causes block 50 halt)
- `Dockerfile`: Container configuration
- `requirements.txt`: Python dependencies

### Deploy Script Integration

The `scripts/deploy.sh` script automatically manages the finalizer bot versions:

```bash
# Deploy script copies finalizer_with_vabn.py to finalizer.py
cp finalizer-bot/finalizer_with_vabn.py finalizer-bot/finalizer.py
```

This ensures the latest VABN-enabled version is always used in production deployments. Both files are kept in sync with the same Docker container networking configuration.

## Deployment

The finalizer bot is automatically deployed as part of the test network:

```bash
# Automatic deployment
./scripts/deploy.sh

# Manual deployment
docker compose -f node/docker/docker-compose.integrated.yml up -d finalizer-bot
```

## Monitoring

Monitor the finalizer bot's operation:

```bash
# View logs
docker logs -f finalizer-bot

# Check for unique deploy generation
docker logs finalizer-bot | grep "Generated deploy"

# Monitor block progression
docker logs finalizer-bot | grep "Last finalized block"

# Check for errors
docker logs finalizer-bot | grep -i error
```

## Troubleshooting

### Bot Not Starting

If the bot fails to start:

1. Check if validators are ready:
   ```bash
   docker ps | grep rnode
   ```

2. View error logs:
   ```bash
   docker logs finalizer-bot --tail 50
   ```

3. Restart the bot:
   ```bash
   docker restart finalizer-bot
   ```

### Blocks Not Being Produced

If blocks stop being produced:

1. Check for deploy exhaustion errors:
   ```bash
   docker logs rnode.bootstrap | grep -i "deploy"
   ```

2. Verify unique deploy generation is working:
   ```bash
   docker logs finalizer-bot | grep "Generated deploy" | tail -10
   ```

3. Ensure the bot is using the correct version:
   ```bash
   docker exec finalizer-bot cat /app/finalizer.py | grep "unique"
   ```

### Race Condition Issues

The bot implements robust retry logic to handle startup race conditions:

- Retries up to 10 times with 2-second intervals
- Handles "Connection refused" errors
- Handles "casper instance was not available yet" errors
- Uses proper Docker container networking

### NotEnoughNewBlocks Errors

If you see `NotEnoughNewBlocks` errors with increasing sequence numbers:

**Root Cause**: The validator rotation logic was getting stuck on the same validator when errors occurred, causing its sequence number to increase beyond what the consensus algorithm allows.

**Solution**: The finalizer bot has been fixed to ensure validator rotation happens regardless of success/failure:
- Validator selection and rotation moved outside the try-catch block
- Even if a deploy/propose fails, the next iteration uses a different validator
- This prevents any single validator from getting stuck with an excessively high sequence number

If you still see these errors:
1. Restart the finalizer bot to reset the rotation:
   ```bash
   docker restart finalizer-bot
   ```
2. Monitor that it's cycling through all validators:
   ```bash
   docker logs finalizer-bot | grep "Working with"
   ```

## Important Notes

1. **Block 50 Solution**: The network previously had a hardcoded limit of 50 blocks for deploy validity. This is now resolved through the CLI's `--valid-after-block-number` support, allowing continuous operation indefinitely.

2. **Transaction Gossip**: Due to broken transaction gossip, the bot must deploy directly to each validator rather than relying on network propagation.

3. **Bootstrap Node**: The bootstrap node is included in the rotation to ensure all nodes participate in block production.

4. **VABN Implementation**: The bot dynamically queries the current block number and sets validAfterBlockNumber accordingly, ensuring deploys remain valid for 50 blocks from the current position.

## Future Improvements

1. ~~**Remove DeployLifespan Hardcoding**: The consensus code should be modified to make this configurable~~ ✅ **RESOLVED** - VABN support provides dynamic validity windows
2. **Fix Transaction Gossip**: Once gossip is fixed, the bot can be simplified
3. **Dynamic Validator Discovery**: Automatically discover validators from the network
4. **Configurable Deploy Patterns**: Allow custom deploy templates
5. **Performance Monitoring**: Add metrics for deploy success rates and block production times

## Related Documentation

- [Block 50 Root Cause Analysis](../analysis/block-50/BLOCK_50_ROOT_CAUSE_ANALYSIS_AND_SOLUTIONS.md)
- [Quick Fix Guide](../analysis/block-50/QUICK_FIX_GUIDE_BLOCK_50.md)
- [Main README](../../README.md#automated-finalizer-bot)
- [Patch Management](../development/PATCH_MANAGEMENT.md)