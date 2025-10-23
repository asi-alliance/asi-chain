# CBC Casper Consensus Implementation Guide

## Table of Contents
1. [Introduction to CBC Casper](#introduction-to-cbc-casper)
2. [Core Concepts](#core-concepts)
3. [Implementation Details](#implementation-details)
4. [Block Structure](#block-structure)
5. [Validation Pipeline](#validation-pipeline)
6. [Finality and Safety](#finality-and-safety)
7. [Fork Choice Rule](#fork-choice-rule)
8. [Equivocation Handling](#equivocation-handling)
9. [Performance Optimizations](#performance-optimizations)
10. [Configuration and Tuning](#configuration-and-tuning)

## Introduction to CBC Casper

CBC (Correct-by-Construction) Casper is a family of consensus protocols that provide Byzantine fault-tolerant agreement in distributed systems. F1R3FLY implements a variant optimized for high throughput and fast finality.

### Key Innovations

1. **Multi-Parent DAG**: Unlike traditional blockchains, CBC Casper allows blocks to have multiple parents, creating a DAG (Directed Acyclic Graph) structure
2. **Adaptive Finality**: Finality is determined based on validator agreement rather than fixed block depth
3. **Continuous Proposing**: Validators can propose blocks continuously without strict rounds
4. **Economic Security**: Validator stakes provide economic incentives for honest behavior

## Core Concepts

### Block DAG Structure

```
Traditional Blockchain:
[Block 1] → [Block 2] → [Block 3] → [Block 4]

CBC Casper DAG:
        ┌→ [Block 2a] ─┐
[Block 1]              ├→ [Block 4]
        └→ [Block 3a] ─┘
```

### Justifications

Each block contains justifications - references to previous blocks that the validator has seen:

```scala
case class Justification(
  validator: Validator,
  latestBlockHash: BlockHash
)

case class Block(
  // ... other fields
  justifications: Seq[Justification]
)
```

### Validator Weights

Validators have different weights based on their bonded stake:

```scala
type Weight = Long
type Validator = PublicKey

case class Bond(
  validator: Validator,
  stake: Weight
)
```

## Implementation Details

### MultiParentCasperImpl

The core consensus implementation in `casper/src/main/scala/coop/rchain/casper/MultiParentCasperImpl.scala`:

```scala
class MultiParentCasperImpl[F[_]: Sync: Concurrent: Time: Log: Metrics: Span](
  validatorId: Option[ValidatorIdentity],
  genesis: BlockMessage,
  postGenesisStateHash: StateHash,
  shardId: String,
  blockProcessingLock: Semaphore[F],
  casperState: Cell[F, CasperState]
) extends Casper[F] {
  
  def createBlock: F[CreateBlockStatus] = {
    // 1. Select parent blocks
    // 2. Collect pending deploys
    // 3. Execute deploys
    // 4. Create block structure
    // 5. Sign block
    // 6. Update local state
  }
  
  def addBlock(block: BlockMessage): F[BlockStatus] = {
    // 1. Validate block
    // 2. Execute deploys
    // 3. Update DAG
    // 4. Check for finality
    // 5. Broadcast to peers
  }
}
```

### Block Creation Process

#### 1. Parent Selection

```scala
def selectParents[F[_]: Monad: BlockStore](
  dag: BlockDAG,
  maxParents: Int
): F[Set[BlockHash]] = {
  for {
    tips <- dag.tips // Get current DAG tips
    selected <- selectOptimalParents(tips, maxParents)
  } yield selected
}
```

#### 2. Deploy Collection

```scala
def collectDeploys[F[_]: Sync](
  mempool: DeployBuffer[F],
  maxDeploys: Int,
  maxDeploySize: Long
): F[Seq[Deploy]] = {
  mempool.readN(
    maxDeploys,
    d => d.data.totalSize <= maxDeploySize
  )
}
```

#### 3. Block Assembly

```scala
def assembleBlock[F[_]: Sync: Time](
  parents: Set[BlockHash],
  deploys: Seq[Deploy],
  state: GlobalState
): F[BlockMessage] = {
  for {
    timestamp <- Time[F].currentMillis
    header = Header(
      parentsHashList = parents.toList,
      timestamp = timestamp,
      // ... other fields
    )
    body = Body(
      deploys = deploys,
      state = state
    )
  } yield BlockMessage(header, body)
}
```

## Block Structure

### Block Message Format

```protobuf
message BlockMessage {
  bytes blockHash = 1;
  Header header = 2;
  Body body = 3;
  repeated Justification justifications = 4;
  bytes sender = 5;
  int32 seqNum = 6;
  bytes sig = 7;
  bytes sigAlgorithm = 8;
  string shardId = 9;
  bytes extraBytes = 10;
}
```

### Header Structure

```protobuf
message Header {
  repeated bytes parentsHashList = 1;
  int64 timestamp = 2;
  int64 version = 3;
  int32 deployCount = 4;
  string chainName = 5;
  bytes deployer = 6;
  bytes validatorPublicKey = 7;
  int64 validatorBlockSeqNum = 8;
  int64 validatorPrevBlockHash = 9;
}
```

### Body Structure

```protobuf
message Body {
  RChainState state = 1;
  repeated ProcessedDeploy deploys = 2;
  repeated ProcessedSystemDeploy systemDeploys = 3;
}
```

## Validation Pipeline

### Block Validation Stages

```scala
object Validate {
  def blockSummary[F[_]: Sync: Log: Time: BlockStore: Metrics](
    block: BlockMessage,
    genesis: BlockMessage,
    dag: BlockDAG,
    shardId: String,
    expirationThreshold: Int
  ): F[ValidBlockProcessing] = {
    for {
      // Stage 1: Format validation
      _ <- checkBlockFormat(block)
      
      // Stage 2: Semantic validation
      _ <- checkSemantics(block, dag)
      
      // Stage 3: Justification validation
      _ <- checkJustifications(block, dag)
      
      // Stage 4: Bonding validation
      _ <- checkBonds(block, genesis)
      
      // Stage 5: Signature validation
      _ <- checkSignatures(block)
      
      // Stage 6: Deploy validation
      _ <- checkDeploys(block, expirationThreshold)
      
      // Stage 7: State validation
      _ <- checkStateTransition(block, dag)
      
    } yield Valid
  }
}
```

### Validation Rules

#### 1. Format Validation
- Block hash correctness
- Field presence and types
- Size limits

#### 2. Semantic Validation
- Timestamp ordering
- Sequence number progression
- Parent existence

#### 3. Justification Validation
- Justification regression check
- Invalid justification detection
- Justification consistency

#### 4. Bond Validation
- Validator bonded status
- Stake verification
- Slashing conditions

#### 5. Signature Validation
- Cryptographic signature verification
- Validator identity confirmation
- Algorithm support

#### 6. Deploy Validation
- Deploy signature verification
- Expiration checking
- Duplicate detection
- Phlogiston limits

#### 7. State Validation
- State transition correctness
- Post-state hash verification
- Merkle proof validation

## Finality and Safety

### Finality Detection

```scala
class Finalizer[F[_]: Sync: Log: BlockStore] {
  def findLastFinalizedBlock(
    dag: BlockDAG,
    lastFinalizedBlockHash: BlockHash,
    faultToleranceThreshold: Float
  ): F[Option[BlockHash]] = {
    for {
      candidates <- findFinalizationCandidates(dag, lastFinalizedBlockHash)
      finalized <- candidates.findM(isFinalized(_, dag, faultToleranceThreshold))
    } yield finalized
  }
  
  private def isFinalized(
    block: BlockHash,
    dag: BlockDAG,
    threshold: Float
  ): F[Boolean] = {
    // Check if block has enough validator agreement
    val validators = dag.validators
    val agreeing = validators.filter(v => 
      dag.latestMessage(v).exists(_.ancestors.contains(block))
    )
    val agreeingWeight = agreeing.map(_.weight).sum
    val totalWeight = validators.map(_.weight).sum
    
    agreeingWeight.toFloat / totalWeight > threshold
  }
}
```

### Safety Oracle

The safety oracle determines when it's safe to propose a new block:

```scala
object SafetyOracle {
  def normalizedFaultTolerance(
    dag: BlockDAG,
    estimateBlockHash: BlockHash
  ): Float = {
    val validators = dag.validators
    val agreeingValidators = validators.filter(v =>
      isAgreeing(v, estimateBlockHash, dag)
    )
    
    val agreeingWeight = agreeingValidators.map(_.weight).sum
    val totalWeight = validators.map(_.weight).sum
    
    (agreeingWeight - totalWeight / 2).toFloat / totalWeight
  }
}
```

## Fork Choice Rule

### GHOST-like Algorithm

The fork choice rule selects the heaviest subtree:

```scala
object Estimator {
  def tips[F[_]: Monad: BlockStore](
    dag: BlockDAG,
    genesis: BlockMessage
  ): F[List[BlockMessage]] = {
    def heaviestPath(start: BlockMessage): F[BlockMessage] = {
      dag.children(start) match {
        case Nil => start.pure[F]
        case children =>
          val weighted = children.map(c => (c, scoreBlock(c, dag)))
          val heaviest = weighted.maxBy(_._2)._1
          heaviestPath(heaviest)
      }
    }
    
    heaviestPath(genesis).map(List(_))
  }
  
  private def scoreBlock(block: BlockMessage, dag: BlockDAG): Weight = {
    // Sum of validator weights in block's subtree
    dag.descendants(block)
      .flatMap(_.sender)
      .distinct
      .map(validatorWeight)
      .sum
  }
}
```

### Tie Breaking

When multiple blocks have equal weight:

```scala
def tieBreaker(blocks: List[BlockMessage]): BlockMessage = {
  blocks.minBy(b => (b.header.timestamp, b.blockHash))
}
```

## Equivocation Handling

### Detection

```scala
class EquivocationDetector[F[_]: Sync: BlockStore] {
  def detectEquivocation(
    block: BlockMessage,
    dag: BlockDAG
  ): F[Option[Equivocation]] = {
    val validator = block.sender
    val seqNum = block.header.validatorBlockSeqNum
    
    dag.blocksByValidator(validator)
      .filter(_.header.validatorBlockSeqNum == seqNum)
      .filter(_ != block) match {
        case Nil => none[Equivocation].pure[F]
        case conflicting => 
          Equivocation(validator, block, conflicting).some.pure[F]
      }
  }
}
```

### Slashing

```scala
def slashEquivocator[F[_]: Sync](
  equivocation: Equivocation,
  bonds: Map[Validator, Weight]
): F[Map[Validator, Weight]] = {
  val validator = equivocation.validator
  val slashAmount = bonds.getOrElse(validator, 0L)
  
  Log[F].warn(s"Slashing $validator for $slashAmount") >>
  (bonds - validator).pure[F]
}
```

## Performance Optimizations

### 1. Caching Strategies

```scala
class CasperCache[F[_]: Sync] {
  private val blockCache: Cache[BlockHash, BlockMessage]
  private val dagCache: Cache[BlockHash, BlockDAG]
  private val stateCache: Cache[StateHash, GlobalState]
  
  def getCachedBlock(hash: BlockHash): F[Option[BlockMessage]] = 
    blockCache.get(hash).pure[F]
    
  def cacheBlock(block: BlockMessage): F[Unit] =
    blockCache.put(block.blockHash, block).pure[F]
}
```

### 2. Parallel Validation

```scala
def validateBlocksParallel[F[_]: Concurrent](
  blocks: List[BlockMessage]
): F[List[ValidatedBlock]] = {
  blocks.parTraverse(validateBlock)
}
```

### 3. Speculative Execution

```scala
class SpeculativeExecutor[F[_]: Sync] {
  def speculativelyExecute(
    deploys: List[Deploy],
    baseState: GlobalState
  ): F[(GlobalState, Map[Deploy, ExecutionResult])] = {
    // Execute deploys optimistically
    // Roll back on validation failure
  }
}
```

### 4. DAG Pruning

```scala
def pruneDag[F[_]: Sync: BlockStore](
  dag: BlockDAG,
  lastFinalized: BlockHash,
  keepBlocks: Int
): F[BlockDAG] = {
  for {
    toKeep <- dag.ancestors(lastFinalized, keepBlocks)
    pruned <- dag.filterBlocks(toKeep)
  } yield pruned
}
```

## Configuration and Tuning

### Key Parameters

```hocon
casper {
  # Fault tolerance threshold (0.0 to 0.5)
  fault-tolerance-threshold = 0.1
  
  # Maximum number of parents per block
  max-parent-count = 5
  
  # Maximum deploys per block
  max-deploy-count = 100
  
  # Block proposal interval (ms)
  min-block-proposal-interval = 5000
  
  # Finalization rate (blocks)
  finalization-rate = 10
  
  # Deploy expiration (blocks)
  deploy-expiration = 50
  
  # Maximum block size (bytes)
  max-block-size = 10485760
  
  # Synchrony constraint threshold
  synchrony-constraint-threshold = 0.34
  
  # Height constraint threshold
  height-constraint-threshold = 100
}
```

### Performance Tuning

#### For High Throughput
```hocon
casper {
  max-deploy-count = 500
  max-block-size = 52428800  # 50MB
  min-block-proposal-interval = 2000
}
```

#### For Fast Finality
```hocon
casper {
  fault-tolerance-threshold = 0.05
  finalization-rate = 5
  max-parent-count = 3
}
```

#### For High Security
```hocon
casper {
  fault-tolerance-threshold = 0.33
  synchrony-constraint-threshold = 0.5
  deploy-expiration = 20
}
```

### Monitoring Metrics

Key metrics to monitor:

```scala
object CasperMetrics {
  val blockCreationTime = histogram("casper_block_creation_time")
  val blockValidationTime = histogram("casper_block_validation_time")
  val deploysPerBlock = histogram("casper_deploys_per_block")
  val forkChoiceTime = histogram("casper_fork_choice_time")
  val finalityDelay = gauge("casper_finality_delay")
  val equivocationsDetected = counter("casper_equivocations")
  val blocksFinalized = counter("casper_blocks_finalized")
  val activeValidators = gauge("casper_active_validators")
}
```

## Advanced Topics

### Cross-Shard Communication

```scala
trait CrossShardCommunication[F[_]] {
  def sendCrossShardMessage(
    targetShard: ShardId,
    message: CrossShardMessage
  ): F[MessageId]
  
  def receiveCrossShardMessages(
    fromShard: ShardId
  ): F[List[CrossShardMessage]]
}
```

### Validator Rotation

```scala
class ValidatorRotation[F[_]: Sync] {
  def rotateValidators(
    currentEpoch: Epoch,
    bonds: Map[Validator, Weight]
  ): F[Map[Validator, Weight]] = {
    // Implement validator rotation logic
    // Based on performance, stake changes, etc.
  }
}
```

### Adaptive Parameters

```scala
class AdaptiveConsensus[F[_]: Sync] {
  def adjustParameters(
    metrics: ConsensusMetrics
  ): F[CasperConfig] = {
    for {
      throughput <- metrics.averageThroughput
      finality <- metrics.averageFinality
      adjusted <- if (throughput < targetThroughput) {
        increaseThroughputParams
      } else if (finality > targetFinality) {
        decreaseFinalityParams
      } else {
        currentParams.pure[F]
      }
    } yield adjusted
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Slow Finality
- Increase validator participation
- Reduce fault tolerance threshold
- Check network connectivity

#### 2. Fork Formation
- Verify time synchronization
- Check for network partitions
- Review equivocation logs

#### 3. Low Throughput
- Increase block size limits
- Reduce validation overhead
- Optimize deploy execution

#### 4. Validation Failures
- Check validator bonds
- Verify signatures
- Review deploy expiration

### Debugging Tools

```scala
// DAG visualization
def visualizeDag(dag: BlockDAG): String = {
  dag.toGraphviz
}

// Consensus state inspection
def inspectConsensusState(state: CasperState): ConsensusReport = {
  ConsensusReport(
    validators = state.bonds.size,
    totalStake = state.bonds.values.sum,
    lastFinalized = state.lastFinalizedBlock,
    forkChoice = state.forkChoice
  )
}
```

## Conclusion

CBC Casper represents a significant advancement in consensus mechanisms, providing Byzantine fault tolerance with adaptive finality and high throughput. The F1R3FLY implementation demonstrates how theoretical consensus research can be translated into production-ready systems. Understanding these mechanisms is crucial for operating and optimizing F1R3FLY networks effectively.

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
