# Network Interaction Procedures

Standard operations for interacting with the ASI:Chain network after node deployment and synchronization.

## Prerequisites

- Running and synchronized RNode instance
- HTTP API access (port 40403)
- For deployment operations: gRPC Internal API access (port 40402)

## Available Operations

### Smart Contract Deployment

Deploy Rholang contracts to validator nodes:

```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode \
    --grpc-host localhost \
    --grpc-port "40402" \
    deploy \
    --private-key "<PRIVATE-KEY>" \
    --phlo-limit 10000000 \
    --phlo-price 1 \
    --valid-after-block-number 0 \
    --shard-id root \
    "/opt/docker/examples/stdout.rho"
```

### Block History Query

Retrieve block information via HTTP API:

```bash
curl http://localhost:40403/blocks
```

### Account Balance Query

Query wallet state using the explore-deploy endpoint:

```bash
curl -X POST http://localhost:40403/explore-deploy \
  -H 'Content-Type: application/json' \
  -d '{"term": "new rl(`rho:registry:lookup`) in { rl!(\"rho:rchain:revVault\") }"}'
```

### Node Status Verification

```bash
curl http://localhost:40403/status
```

## Block Explorer Access

Web interface for network monitoring: [http://44.198.8.24:5173/](http://44.198.8.24:5173/)

## Operation Requirements

| Operation | Required Access | Port |
|-----------|----------------|------|
| Contract Deployment | Validator gRPC Internal | 40402 |
| Data Queries | HTTP API | 40403 |
| Status Monitoring | HTTP API | 40403 |

## Documentation References

- [Smart Contract Deployment](/interaction-examples/smart-contracts/)
- [Block History Procedures](/interaction-examples/block-history/)
- [Balance Query Methods](/interaction-examples/balance-check/)