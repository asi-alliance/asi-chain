# Rust Port Plan for ASI-Chain Indexer

## Executive Summary

This document outlines a plan to port the ASI-Chain indexer from Python to pure Rust, creating a single, high-performance binary that combines the existing Rust CLI with indexing capabilities.

## Current Architecture

```
Python Indexer (asyncio)
    ↓
Rust CLI (node_cli)
    ↓
RChain Node (gRPC/HTTP)
```

## Target Architecture

```
Rust Indexer + CLI (single binary)
    ↓
RChain Node (gRPC/HTTP)
```

## Motivation

1. **Performance**: 5-10x improvement expected, especially in parsing operations
2. **Distribution**: Single binary, no Python/pip dependencies
3. **Memory Safety**: Eliminate Python GC issues and memory leaks
4. **Type Safety**: Catch schema mismatches at compile time
5. **Resource Usage**: Lower memory footprint, better CPU utilization
6. **Maintenance**: Single codebase, unified toolchain

## Implementation Plan

### Phase 1: Project Setup (Day 1-2)

**Goal**: Establish Rust project structure and dependencies

1. **Create workspace structure**:
   ```
   indexer-rust/
   ├── Cargo.toml (workspace)
   ├── cli/          (existing node_cli code)
   ├── indexer/      (new indexer module)
   ├── common/       (shared types and utils)
   └── migrations/   (existing SQL files)
   ```

2. **Add dependencies**:
   ```toml
   [dependencies]
   tokio = { version = "1", features = ["full"] }
   sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-rustls"] }
   axum = "0.7"
   serde = { version = "1", features = ["derive"] }
   serde_json = "1"
   chrono = "0.4"
   tracing = "0.1"
   prometheus = "0.13"
   regex = "1"
   nom = "7"  # For complex parsing
   anyhow = "1"
   thiserror = "1"
   ```

3. **Define core types**:
   - Block, Deployment, Transfer, Validator structs
   - Database models with sqlx derives
   - API response types

### Phase 2: Database Layer (Day 3-5)

**Goal**: Implement database operations using sqlx

1. **Database connection pool**:
   ```rust
   use sqlx::postgres::PgPoolOptions;
   
   pub async fn create_pool(database_url: &str) -> Result<PgPool> {
       PgPoolOptions::new()
           .max_connections(20)
           .connect(database_url)
           .await
   }
   ```

2. **Migration system**:
   - Use sqlx migrations
   - Reuse existing SQL migration files
   - Add migration runner to startup

3. **Repository pattern for each entity**:
   ```rust
   pub struct BlockRepository { pool: PgPool }
   impl BlockRepository {
       pub async fn insert(&self, block: &Block) -> Result<()>
       pub async fn get_latest(&self) -> Result<Option<Block>>
       pub async fn get_by_number(&self, num: i64) -> Result<Option<Block>>
   }
   ```

4. **Batch operations**:
   - Implement bulk inserts for performance
   - Transaction support for atomic updates

### Phase 3: CLI Integration (Day 6-7)

**Goal**: Integrate indexer into existing CLI codebase

1. **Add indexer subcommand**:
   ```rust
   #[derive(Parser)]
   enum Commands {
       // Existing commands...
       Index {
           #[arg(long, env = "DATABASE_URL")]
           database_url: String,
           #[arg(long, default_value = "5")]
           sync_interval: u64,
       }
   }
   ```

2. **Reuse existing CLI functions**:
   - `get_blocks_by_height()`
   - `get_deploy()`
   - `bonds()`
   - Parse responses directly instead of JSON string manipulation

3. **Genesis data extraction**:
   ```rust
   pub fn extract_genesis_data(block: &Block) -> Result<GenesisData> {
       // Port Python regex logic to Rust
       // Use nom for complex parsing if needed
   }
   ```

### Phase 4: Indexing Logic (Day 8-10)

**Goal**: Port core indexing logic from Python

1. **Main sync loop**:
   ```rust
   pub async fn run_indexer(config: IndexerConfig) -> Result<()> {
       let pool = create_pool(&config.database_url).await?;
       let mut interval = tokio::time::interval(Duration::from_secs(config.sync_interval));
       
       loop {
           interval.tick().await;
           sync_blocks(&pool, &config).await?;
       }
   }
   ```

2. **Block processing pipeline**:
   ```rust
   async fn process_block(block: Block) -> Result<ProcessedBlock> {
       // Extract deployments
       // Parse Rholang terms
       // Extract transfers
       // Update validator states
       // Calculate balances
   }
   ```

3. **REV transfer extraction**:
   ```rust
   fn extract_rev_transfers(term: &str) -> Vec<Transfer> {
       // Port pattern matching logic
       // Handle both variable and match patterns
   }
   ```

4. **Parallel processing**:
   - Use tokio::spawn for concurrent block processing
   - Maintain order for database writes

### Phase 5: HTTP API Server (Day 11-12)

**Goal**: Replace Flask with Axum

1. **API routes**:
   ```rust
   use axum::{Router, Json};
   
   pub fn create_router(pool: PgPool) -> Router {
       Router::new()
           .route("/status", get(status_handler))
           .route("/api/blocks", get(blocks_handler))
           .route("/api/transfers", get(transfers_handler))
           .route("/metrics", get(metrics_handler))
           .with_state(pool)
   }
   ```

2. **Prometheus metrics**:
   ```rust
   lazy_static! {
       static ref BLOCKS_INDEXED: IntCounter = 
           register_int_counter!("indexer_blocks_indexed_total", "Total blocks indexed").unwrap();
   }
   ```

3. **Health checks**:
   - `/health` - Basic liveness
   - `/ready` - Database connectivity
   - `/status` - Detailed sync status

### Phase 6: Testing & Migration (Day 13-14)

**Goal**: Ensure feature parity and smooth migration

1. **Unit tests**:
   - Parser tests with known Rholang samples
   - Database repository tests
   - API endpoint tests

2. **Integration tests**:
   - Full sync from genesis
   - Parallel processing correctness
   - API compatibility tests

3. **Migration strategy**:
   - Run Rust and Python indexers in parallel
   - Compare database outputs
   - Gradual cutover with fallback option

4. **Performance benchmarks**:
   - Measure blocks/second processing rate
   - Memory usage comparison
   - API response times

### Phase 7: Docker & Deployment (Day 15)

**Goal**: Production-ready deployment

1. **Multi-stage Dockerfile**:
   ```dockerfile
   FROM rust:1.75 as builder
   WORKDIR /app
   COPY . .
   RUN cargo build --release
   
   FROM debian:bookworm-slim
   COPY --from=builder /app/target/release/asi-indexer /usr/local/bin/
   CMD ["asi-indexer", "index"]
   ```

2. **Docker Compose updates**:
   - Replace Python service with Rust binary
   - Smaller image size (likely <50MB vs 200MB+)

3. **Documentation**:
   - Update README with new build instructions
   - API migration guide
   - Configuration changes

## Technical Decisions

### Why sqlx over diesel?
- Compile-time checked queries
- Async-first design
- Simpler API for our use case
- Better performance

### Why axum over actix-web?
- Tokio-native
- Simpler middleware system
- Better type inference
- Smaller compile times

### Why nom for parsing?
- Combat-tested parser combinator library
- Better than regex for complex Rholang parsing
- Composable and maintainable

## Risk Mitigation

1. **Rholang Parsing Complexity**:
   - Keep Python version as reference
   - Extensive test cases from real data
   - Fallback to regex if nom is overkill

2. **Database Schema Changes**:
   - Use sqlx migrations
   - Keep schema version tracking
   - Backward compatibility mode

3. **Performance Regression**:
   - Benchmark against Python version
   - Profile with cargo flamegraph
   - Optimize hot paths only

## Success Metrics

- [ ] Single binary under 50MB
- [ ] Memory usage <100MB at runtime
- [ ] Process 100 blocks in <1 second
- [ ] Zero runtime panics in 24h test
- [ ] API response times <10ms
- [ ] 100% feature parity with Python version

## Timeline Summary

- **Week 1**: Database layer, CLI integration, core indexing logic
- **Week 2**: API server, testing, migration, deployment

**Total estimate**: 2-3 weeks for experienced Rust developer

## Future Enhancements

Once ported to Rust:

1. **Embedded Database Option**: Add SQLite support for single-file deployment
2. **WebAssembly Target**: Run indexer in browser for light clients
3. **Plugin System**: Dynamic loading of custom extractors
4. **Streaming APIs**: WebSocket/gRPC streaming for real-time updates
5. **Native Hasura Integration**: Direct metadata API manipulation

## Conclusion

Porting the indexer to Rust is highly feasible and would result in a more maintainable, performant, and deployable system. The modular Python codebase maps well to Rust patterns, and the existing Rust CLI provides a solid foundation to build upon.

The investment of 2-3 weeks would pay dividends in:
- Operational simplicity (single binary)
- Performance improvements (5-10x expected)
- Development velocity (type safety catches bugs early)
- Deployment flexibility (50MB binary vs 200MB+ Python container)