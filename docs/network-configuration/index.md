# Network Configuration

Current ASI:Chain testnet configuration and node topology.

## Network Composition

- **1 Bootstrap Node** - Network entry point
- **4 Validator Nodes** - Consensus participants  
- **1 Observer Node** - Read-only access

Technology stack: F1R3FLY-based blockchain implementation.

## Node Addresses

### Bootstrap Node
```
rnode://138410b5da898936ec1dc13fafd4893950eb191b@44.198.8.24?protocol=40400&discovery=40404
```

### Validator Nodes
```
Validator 1: rnode://46412097b9895ccf786c84d8db3a91ec80762a8e@44.198.8.24?protocol=40410&discovery=40414
Validator 2: rnode://992703c92b5ea37e27256a687cdb68d8b182badf@44.198.8.24?protocol=40420&discovery=40424
Validator 3: rnode://67676f0954467aa3507f36fe801b8ec12370501@44.198.8.24?protocol=40430&discovery=40434
Validator 4: rnode://73992afad92256bcc914836c40decccdbd0048d4@44.198.8.24?protocol=40440&discovery=40444
```

## Network Topology

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Bootstrap  │ ──▶ │ Validator 1 │ ──▶ │ Validator 2 │
│  (Genesis)  │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Validator 3 │ ──▶ │ Validator 4 │ ──▶ │  Observer   │
│             │     │  (Extra)    │     │ (Read-only) │
└─────────────┘     └─────────────┘     └─────────────┘
```

## External Validator Integration

**Status**: External validator connection with custom wallets is under development.

**Current Requirement**: Use prepared wallet credentials from [`testnet-wallets.txt`](https://github.com/asi-alliance/asi-chain/blob/master/testnet-wallets.txt).

**Development Timeline**: Connection procedures for custom wallets are being validated with F1R3FLY and MetaCycle teams.

## Documentation References

- [Network Parameters](/network-configuration/parameters/) - Detailed consensus and configuration parameters
- [Network Topology](/network-configuration/topology/) - Visual network layout and node roles
- [Quick Start Guide](/quick-start/) - Validator connection procedures