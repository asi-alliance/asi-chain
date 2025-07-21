# ASI-Chain Architecture Overview

This document provides a comprehensive overview of the ASI-Chain system architecture, including components, interactions, and design decisions.

## Table of Contents
1. [System Overview](#system-overview)
2. [Network Architecture](#network-architecture)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Consensus Mechanism](#consensus-mechanism)
6. [Smart Contract System](#smart-contract-system)
7. [Security Architecture](#security-architecture)

## System Overview

ASI-Chain is a blockchain implementation based on RChain technology, featuring:
- **CBC Casper** consensus with Proof of Stake
- **Rholang** smart contract language (process calculus-based)
- **gRPC** for network communication
- **Multi-node** architecture with specialized node types

### High-Level Architecture

```mermaid
graph TB
    subgraph "External Clients"
        CLI[CLI Tool<br/>Rust]
        API[External APIs]
    end
    
    subgraph "ASI-Chain Network"
        subgraph "Node Types"
            BN[Bootstrap Node<br/>Initial Network Entry]
            VN1[Validator Node 1<br/>Block Producer]
            VN2[Validator Node 2<br/>Block Producer]
            VN3[Validator Node 3<br/>Block Producer]
            ON[Observer Node<br/>Read-Only Queries]
        end
        
        subgraph "Support Services"
            FB[Finalizer Bot<br/>Python Service]
        end
    end
    
    subgraph "Infrastructure"
        Docker[Docker Compose<br/>Orchestration]
        Storage[(Docker Volumes<br/>Persistent Storage)]
    end
    
    CLI -->|gRPC| BN
    CLI -->|gRPC| VN1
    API -->|gRPC| ON
    
    BN <-->|P2P| VN1
    BN <-->|P2P| VN2
    BN <-->|P2P| VN3
    VN1 <-->|P2P| VN2
    VN2 <-->|P2P| VN3
    VN3 <-->|P2P| VN1
    
    ON -->|Sync| BN
    
    FB -->|Deploy/Propose| VN1
    FB -->|Deploy/Propose| VN2
    FB -->|Deploy/Propose| VN3
    
    Docker --> BN
    Docker --> VN1
    Docker --> VN2
    Docker --> VN3
    Docker --> ON
    Docker --> FB
    
    Storage --> Docker
```

## Network Architecture

### Node Types and Responsibilities

| Node Type | Purpose | Capabilities | Port Range |
|-----------|---------|--------------|------------|
| **Bootstrap** | Network initialization | Deploy, Propose, Query | 40400-40405 |
| **Validator** | Block production | Deploy, Propose, Query | 40410-40435 |
| **Observer** | Read-only access | Query only | 40451-40453 |

### Port Mapping

```mermaid
graph LR
    subgraph "Bootstrap Node"
        BP1[40401 - Deploy]
        BP2[40402 - Propose]
        BP3[40403 - Query]
    end
    
    subgraph "Validator 1"
        V1P1[40411 - Deploy]
        V1P2[40412 - Propose]
        V1P3[40413 - Query]
    end
    
    subgraph "Observer"
        OP[40453 - Query Only]
    end
```

### Network Topology

```mermaid
graph TD
    subgraph "Network Discovery"
        BS[Bootstrap Node<br/>Known Address]
    end
    
    subgraph "Validators"
        V1[Validator 1]
        V2[Validator 2]
        V3[Validator 3]
    end
    
    subgraph "Read Layer"
        OB[Observer]
    end
    
    BS -->|Initial Connection| V1
    BS -->|Initial Connection| V2
    BS -->|Initial Connection| V3
    
    V1 <-->|Peer Discovery| V2
    V2 <-->|Peer Discovery| V3
    V3 <-->|Peer Discovery| V1
    
    OB -->|Bootstrap| BS
    OB -.->|Sync Only| V1
    OB -.->|Sync Only| V2
    OB -.->|Sync Only| V3
```

## Component Architecture

### Node Components (Scala)

```mermaid
classDiagram
    class Node {
        +RSpace Storage
        +Casper Engine
        +P2P Network
        +gRPC Server
        +start()
        +shutdown()
    }
    
    class CasperEngine {
        +BlockStore
        +DAG
        +Validator
        +createBlock()
        +validateBlock()
        +addBlock()
    }
    
    class RSpace {
        +Tuplespace
        +History
        +produce()
        +consume()
        +install()
    }
    
    class P2PNetwork {
        +PeerManager
        +Transport
        +Discovery
        +connect()
        +broadcast()
        +gossip()
    }
    
    class gRPCServer {
        +DeployService
        +ProposeService
        +QueryService
        +handleDeploy()
        +handlePropose()
        +handleQuery()
    }
    
    Node --> CasperEngine
    Node --> RSpace
    Node --> P2PNetwork
    Node --> gRPCServer
    
    CasperEngine --> RSpace
```

### CLI Components (Rust)

```mermaid
classDiagram
    class CLI {
        +CommandParser
        +gRPCClient
        +KeyManager
        +execute()
    }
    
    class Commands {
        <<enumeration>>
        Deploy
        Propose
        Query
        GenerateKey
        ShowBlocks
    }
    
    class gRPCClient {
        +connect()
        +sendDeploy()
        +propose()
        +query()
    }
    
    class KeyManager {
        +generateKeyPair()
        +loadPrivateKey()
        +sign()
    }
    
    CLI --> Commands
    CLI --> gRPCClient
    CLI --> KeyManager
```

### Finalizer Bot Architecture

```mermaid
stateDiagram-v2
    [*] --> Initialize
    Initialize --> QueryCurrentBlock
    
    QueryCurrentBlock --> SelectValidator
    SelectValidator --> GenerateUniqueContract
    GenerateUniqueContract --> DeployWithVABN
    
    DeployWithVABN --> WaitDeployment
    WaitDeployment --> ProposeBlock
    
    ProposeBlock --> WaitFinalization
    WaitFinalization --> CheckFinalization
    
    CheckFinalization --> NextValidator: Success
    CheckFinalization --> RetryPropose: Failed
    
    RetryPropose --> WaitFinalization
    NextValidator --> QueryCurrentBlock
    
    DeployWithVABN --> HandleError: Error
    ProposeBlock --> HandleError: Error
    HandleError --> QueryCurrentBlock: Retry
    
    note right of DeployWithVABN: Uses --valid-after-block-number<br/>set to current block
    note right of GenerateUniqueContract: Creates unique Rholang contract<br/>with timestamp + nonce
```

#### Finalizer Bot Implementation Details

**File Management**:
- Primary: `finalizer-bot/finalizer.py` (production version)
- Template: `finalizer-bot/finalizer_with_vabn.py` (VABN-enabled template)
- Deploy script copies template to production during deployment

**Key Features**:
- **Dynamic VABN**: Queries current block number and sets `--valid-after-block-number` accordingly
- **Unique Contracts**: Generates unique Rholang contracts with timestamps and nonces
- **Docker Networking**: Uses container names (`rnode.bootstrap`, `rnode.validator1-3`)
- **Retry Logic**: Handles connection failures and node readiness delays
- **Block 50 Resolution**: Ensures network operates indefinitely past block 50

## Data Flow

### Transaction Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Validator
    participant Casper
    participant RSpace
    participant Network
    participant Finalizer
    
    User->>CLI: Deploy Contract
    CLI->>CLI: Sign Transaction
    CLI->>Validator: gRPC Deploy
    Validator->>RSpace: Store Deploy
    Validator->>CLI: Deploy Receipt
    
    Note over Finalizer: Automated Process
    Finalizer->>Validator: Propose Block
    Validator->>Casper: Create Block
    Casper->>RSpace: Execute Deploys
    RSpace->>Casper: Execution Results
    Casper->>Validator: New Block
    Validator->>Network: Broadcast Block
    
    Network->>Validator: Block Gossip
    Validator->>Casper: Validate Block
    Casper->>Validator: Add to DAG
    
    User->>CLI: Query Result
    CLI->>Validator: gRPC Query
    Validator->>RSpace: Read State
    RSpace->>Validator: Query Result
    Validator->>CLI: Response
    CLI->>User: Display Result
```

## Consensus Mechanism

### CBC Casper Implementation

```mermaid
graph TD
    subgraph "Block Creation"
        A[Validator Receives Deploys] -->|Propose| B[Create Block]
        B --> C[Execute Deploys]
        C --> D[Update State]
        D --> E[Sign Block]
    end
    
    subgraph "Block Validation"
        E --> F[Broadcast Block]
        F --> G[Other Validators Receive]
        G --> H[Validate Signatures]
        H --> I[Validate Deploys]
        I --> J[Check Conflicts]
    end
    
    subgraph "Finalization"
        J -->|Valid| K[Add to DAG]
        K --> L[Update Local State]
        L --> M[Calculate LFB]
        M --> N[Finalize Blocks]
        
        J -->|Invalid| O[Reject Block]
    end
```

### Validator Rotation (Alternating Proposals)

```mermaid
stateDiagram-v2
    [*] --> Validator1_Turn
    
    Validator1_Turn --> Validator1_Proposes: Has Deploys
    Validator1_Turn --> Wait_V1: No Deploys
    
    Validator1_Proposes --> Validator2_Turn
    Wait_V1 --> Validator2_Turn: Timeout
    
    Validator2_Turn --> Validator2_Proposes: Has Deploys
    Validator2_Turn --> Wait_V2: No Deploys
    
    Validator2_Proposes --> Validator3_Turn
    Wait_V2 --> Validator3_Turn: Timeout
    
    Validator3_Turn --> Validator3_Proposes: Has Deploys
    Validator3_Turn --> Wait_V3: No Deploys
    
    Validator3_Proposes --> Validator1_Turn
    Wait_V3 --> Validator1_Turn: Timeout
    
    note right of Validator1_Turn: Enforced by consensus rules
    note right of Validator2_Turn: Prevents consecutive proposals
    note right of Validator3_Turn: Ensures network liveness
```

## Smart Contract System

### Rholang Execution Model

```mermaid
graph TD
    subgraph "Contract Deployment"
        RC[Rholang Code] --> P[Parser]
        P --> N[Normalizer]
        N --> C[Compiler]
        C --> B[Bytecode]
    end
    
    subgraph "Execution Environment"
        B --> RE[Rholang Evaluator]
        RE --> TS[Tuplespace<br/>RSpace++]
        
        TS --> PR[Produce<br/>Send on Channel]
        TS --> CO[Consume<br/>Receive on Channel]
        TS --> MA[Match<br/>Pattern Matching]
    end
    
    subgraph "State Management"
        MA --> ST[State Transition]
        ST --> H[History]
        H --> CH[Checkpoint]
    end
```

### Contract Example Flow

```mermaid
sequenceDiagram
    participant Contract as Rholang Contract
    participant RSpace as RSpace++
    participant State as Blockchain State
    
    Note over Contract: new ch in {<br/>  ch!(42) |<br/>  for(@x <- ch) {<br/>    stdout!(x)<br/>  }<br/>}
    
    Contract->>RSpace: produce(ch, 42)
    RSpace->>State: Store Data
    
    Contract->>RSpace: consume(ch, pattern)
    RSpace->>RSpace: Match pattern @x
    RSpace->>Contract: Return 42
    
    Contract->>RSpace: produce(stdout, 42)
    RSpace->>State: Update State
```

## Security Architecture

### Key Security Features

```mermaid
graph TB
    subgraph "Network Security"
        TLS[TLS Encryption<br/>Node Communication]
        Auth[Certificate-based<br/>Authentication]
        Sign[Message Signing<br/>Ed25519]
    end
    
    subgraph "Consensus Security"
        POS[Proof of Stake<br/>Sybil Resistance]
        VAL[Validator Bonds<br/>Economic Security]
        SLASH[Slashing<br/>Penalty Mechanism]
    end
    
    subgraph "Contract Security"
        ISO[Process Isolation<br/>Namespace Separation]
        CAP[Capability Security<br/>Unforgeable Names]
        REV[Rev Limiting<br/>Resource Control]
    end
    
    TLS --> Auth
    Auth --> Sign
    
    POS --> VAL
    VAL --> SLASH
    
    ISO --> CAP
    CAP --> REV
```

### Trust Model

```mermaid
graph LR
    subgraph "Trust Assumptions"
        A[2/3 Honest Validators]
        B[Cryptographic Security]
        C[Network Availability]
    end
    
    subgraph "Threat Model"
        D[Byzantine Validators]
        E[Network Partition]
        F[Resource Exhaustion]
    end
    
    subgraph "Mitigations"
        G[Economic Penalties]
        H[Consensus Rules]
        I[Resource Limits]
    end
    
    D --> G
    E --> H
    F --> I
```

## Deployment Architecture

### Docker Compose Structure

```mermaid
graph TD
    subgraph "Docker Network"
        NET[asi-chain-net<br/>Bridge Network]
    end
    
    subgraph "Services"
        BOOT[Bootstrap Service<br/>rnode.bootstrap]
        VAL1[Validator1 Service<br/>rnode.validator1]
        VAL2[Validator2 Service<br/>rnode.validator2]
        VAL3[Validator3 Service<br/>rnode.validator3]
        OBS[Observer Service<br/>rnode.readonly]
        FIN[Finalizer Service<br/>finalizer-bot]
    end
    
    subgraph "Volumes"
        VB[rnode_bootstrap_data]
        V1[rnode_validator1_data]
        V2[rnode_validator2_data]
        V3[rnode_validator3_data]
        VO[rnode_readonly_data]
    end
    
    subgraph "Configuration"
        CONF[Config Files<br/>Bind Mounts]
        GEN[Genesis Files<br/>bonds.txt, wallets.txt]
    end
    
    NET --> BOOT
    NET --> VAL1
    NET --> VAL2
    NET --> VAL3
    NET --> OBS
    NET --> FIN
    
    BOOT --> VB
    VAL1 --> V1
    VAL2 --> V2
    VAL3 --> V3
    OBS --> VO
    
    CONF --> BOOT
    CONF --> VAL1
    CONF --> VAL2
    CONF --> VAL3
    GEN --> BOOT
    GEN --> VAL1
    GEN --> VAL2
    GEN --> VAL3
```

## Performance Considerations

### Scalability Factors

1. **Network Size**: Currently optimized for small validator sets (3-5 nodes)
2. **Block Size**: Limited by execution time and network propagation
3. **State Size**: RSpace++ provides efficient storage but grows over time
4. **Query Performance**: Observer nodes provide read scaling

### Known Limitations

1. **Transaction Gossip**: Currently broken, requiring direct deployment to validators
2. **Auto-propose**: Non-functional, requiring manual block proposals or finalizer bot
3. **Finalization**: Requires alternating validators due to consensus rules
4. **Network Size**: Not yet tested at scale beyond testnet configuration

## Future Architecture Improvements

1. **Sharding**: Planned for horizontal scaling
2. **Light Clients**: For mobile and resource-constrained environments
3. **State Channels**: For off-chain scaling
4. **Cross-chain Communication**: IBC-style protocols
5. **Hardware Security Modules**: For validator key management

---

For implementation details, see:
- [CLI Tutorial](../getting-started/CLI_TUTORIAL.md) - Command-line interface details
- [Test Report](../analysis/TEST_REPORT.md) - Current functionality status
- [Project Roadmap](../development/PROJECT_STATUS_AND_ROADMAP.md) - Future development plans
- [Finalizer Bot Operations](../operations/FINALIZER_BOT.md) - Detailed finalizer bot documentation
- [Block Explorer Architecture](../block-explorer/ARCHITECTURE.md) - Block explorer implementation details
- [Wallet Architecture](../wallet/architecture.md) - ASI Wallet v2 technical documentation