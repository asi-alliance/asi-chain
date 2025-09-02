# Changelog

All notable changes to the ASI-Chain Indexer project will be documented in this file.

## [2.1.0] - 2025-08-06

### 🚀 Enhanced REV Transfer Detection

This release improves upon v2.0 with enhanced transfer detection capabilities, supporting both variable-based and match-based Rholang patterns. The indexer now detects previously missed transfers in blocks like 365 and 377.

### Added
- ✅ **Match-based transfer pattern detection** - `match ("addr1", "addr2", amount)` pattern support
- ✅ **Enhanced address validation** - Now accepts 53-56 character REV addresses (previously 54-56)
- ✅ **Bash-based Hasura configuration** - Zero Python dependencies for GraphQL setup
- ✅ **Transfer analysis script** - `analyze_transfers.py` for comprehensive transfer reports
- ✅ **Improved deployment script** - Pre-pulls Docker images with retry logic

### Changed
- 🔄 **REV address validation** updated from `range(54, 57)` to `range(53, 57)`
- 🔄 **Transfer extraction logic** enhanced with `DIRECT_TRANSFER_PATTERN` regex
- 🔄 **Hasura configuration** now prefers bash script over Python
- 🔄 **Documentation** updated across all MD files to reflect v2.1 improvements

### Fixed
- ✅ **Missing transfers in blocks 365 and 377** - Now properly detected
- ✅ **53-character REV addresses** - Previously rejected, now accepted
- ✅ **Python dependency issues** - Hasura config no longer requires requests module

### Transfer Detection Stats
- **Genesis transfers**: 4 validator bonds (2,000,000 REV total)
- **User transfers detected**: 3 transfers (97,553 REV total)
  - Block 334: 88,888 REV
  - Block 365: 7,777 REV (newly detected)
  - Block 377: 888 REV (newly detected)

## [2.0.0] - 2025-08-06

### 🚀 Major Update: Network-Agnostic Genesis Support

This release represents a revolutionary upgrade with network-agnostic genesis processing, enabling automatic extraction of validator bonds and REV allocations from any ASI-Chain network. The indexer now processes the entire blockchain from block 0 without limitations.

### Added
- ✅ **Network-agnostic genesis processing** - Automatic validator bond extraction
- ✅ **Balance state tracking** - Separate bonded/unbonded balances per address
- ✅ **Variable-based REV transfer detection** - Modern Rholang pattern matching
- ✅ **GraphQL API via Hasura** - Automatic configuration with deploy.sh
- ✅ **One-command deployment** - deploy.sh handles everything automatically
- ✅ **Rust CLI client integration** - Complete wrapper for 9 CLI commands
- ✅ **Full blockchain sync from genesis** - No more 50-block API limitation
- ✅ **Enhanced data extraction capabilities:**
  - Genesis validator bonds and REV allocations
  - Balance states with bonded/unbonded separation
  - Variable-based transfer patterns (@fromAddr, @toAddr)
  - Block justifications as JSONB
  - Fault tolerance metrics
  - Pre-state and state root hashes
  - Epoch transitions tracking
  - Network consensus monitoring
  - Validator quarantine status
- ✅ **10 comprehensive database tables:**
  - `balance_states` - Address balance tracking
  - `epoch_transitions` - Track epoch changes and timing
  - `network_stats` - Network health and participation metrics
  - `block_validators` - Block signers/justifications
  - Plus enhanced existing tables
- ✅ **New API endpoints:**
  - `/api/balance/{address}` - Get bonded/unbonded balances
  - `/api/epochs` - Epoch transition information
  - `/api/consensus` - Network consensus status
- ✅ **Enhanced monitoring metrics:**
  - Genesis bonds extracted count
  - Balance states updated
  - CLI command execution counts
  - CLI error tracking
  - Network health score (0-1)
  - Epoch transition events

### Changed
- 🔄 **Complete indexer rewrite** (`rust_indexer.py`) using CLI commands
- 🔄 **Batch size** set to 50 blocks
- 🔄 **Start from block 0** by default (configurable)
- 🔄 **Enhanced block processing** with parallel CLI command execution
- 🔄 **Improved error handling** with CLI-specific retry logic
- 🔄 **Docker deployment** simplified with pre-compiled binary

### Fixed
- ✅ **Historical sync limitation** - Can now sync entire blockchain
- ✅ **Foreign key constraints** - Removed problematic validator constraint
- ✅ **Column size limitations** - Increased to 150 chars for addresses
- ✅ **Schema migration ordering** - Fixed dependency issues
- ✅ **Genesis bond extraction** - Now works for any network
- ✅ **REV transfer patterns** - Supports variable-based Rholang

### Technical Details
- **Cross-compilation**: macOS ARM64 → Linux x86_64 using musl
- **CLI Commands Used**: 
  - `last-finalized-block`, `get-blocks-by-height`, `blocks`
  - `get-deploy`, `bonds`, `active-validators`
  - `epoch-info`, `network-consensus`, `show-main-chain`
- **Database Changes**:
  - Added `balance_states` table for address balance tracking
  - Added `state_root_hash`, `bonds_map`, `finalization_status` to blocks
  - Added `deployment_type` to deployments
  - Increased address columns to VARCHAR(150) for validator keys
  - Dropped `validator_bonds_validator_public_key_fkey` constraint
  - Added JSONB fields for bonds_map and justifications

### Migration Guide
1. Stop existing indexer: `docker-compose down`
2. Backup data (optional): `docker exec asi-indexer-db pg_dump -U indexer asichain > backup.sql`
3. Run deployment script: `./deploy.sh`
4. Script will:
   - Build and start all services
   - Configure Hasura GraphQL automatically
   - Process genesis block with validator bonds
   - Begin syncing from block 0

### Performance
- Syncs 50 blocks in ~1 second
- Full chain sync capability (no limitations)
- CLI command latency: 10-50ms
- Memory usage: ~80MB (indexer) + ~50MB (database)

## [1.2.0] - 2025-08-05

### Added
- ✅ Automatic deployment error detection - sets `errored=true` when error_message exists
- ✅ Database cleanup script for historical data consistency
- ✅ Enhanced error tracking logic in deployment processing

### Changed
- ✅ Updated deployment processing to check both errored flag and error_message
- ✅ Improved error status consistency across the system

### Fixed
- ✅ Fixed 2,413 historical deployments showing as successful when they had error messages
- ✅ Resolved deployment status display issues in explorer
- ✅ Corrected "Insufficient funds" deployments showing incorrect status

### Database Updates
```sql
-- Applied to fix historical data
UPDATE deployments 
SET errored = true 
WHERE errored = false 
AND error_message IS NOT NULL 
AND length(error_message) > 0;
```

## [1.1.0] - 2025-08-05

### Added
- ✅ Enhanced block metadata extraction (parent hash, state root, finalization status)
- ✅ Added JSONB bonds mapping storage for complex validator queries
- ✅ Implemented smart contract type classification (6 categories)
- ✅ Added partial hash search for blocks and deployments with optimized indexes
- ✅ Created network statistics endpoint with real-time analytics
- ✅ Added address transaction history lookup capability
- ✅ Implemented block-validator relationship tracking via justifications
- ✅ Enhanced all API endpoints with new data fields and search capabilities
- ✅ Added comprehensive database views for performance optimization

### Changed
- ✅ Removed hardcoded validator names - now uses public keys directly
- ✅ Updated all documentation to reflect v1.1 features

### Fixed
- ✅ Resolved Decimal JSON serialization errors in transfer endpoints
- ✅ Fixed Docker container caching issues preventing code updates
- ✅ Corrected validator name field length constraints

### Database Schema Changes
- Added `parent_hash`, `state_root_hash`, `finalization_status`, `bonds_map` to blocks table
- Added `deployment_type` to deployments table
- Added `block_validators` table for validator-block relationships
- Extended validator `name` field to VARCHAR(160) to accommodate public keys

## [1.0.0] - 2025-08-05

### Added
- Initial release of ASI-Chain Indexer
- Real-time block synchronization from RChain nodes
- PostgreSQL storage with optimized indexes
- REV transfer extraction from Rholang deployments
- Validator tracking and bond management
- Complete REST API for data access:
  - `/health` - Basic health check
  - `/ready` - Database and node connectivity check
  - `/status` - Detailed indexer status
  - `/metrics` - Prometheus metrics endpoint
  - `/api/blocks` - List blocks with pagination
  - `/api/blocks/{number}` - Get specific block with details
  - `/api/deployments` - List deployments with filtering
  - `/api/deployments/{id}` - Get specific deployment
  - `/api/transfers` - List REV transfers with filtering
  - `/api/validators` - List all validators
- Docker deployment with automatic database setup
- Asynchronous HTTP client with retry logic
- Configurable sync intervals and batch sizes
- Database migrations for schema management
- Comprehensive test suite

### Performance
- Memory usage: ~60MB (indexer) + ~30MB (database)
- CPU usage: <0.1% during normal operation
- API response time: <10ms for all endpoints
- Processes up to 50 blocks per batch

### Known Limitations
- RChain API only returns most recent ~50 blocks
- Cannot access historical blocks beyond the API window
- Must maintain continuous operation for complete history

### Fixed
- Database field lengths for validator public keys (VARCHAR(160))
- Metrics endpoint charset issue in content_type
- SQL query placeholders for asyncpg compatibility ($1 style)
- JSON serialization for datetime objects
- Block data extraction from nested API response structure

### Security
- Read-only access to RChain node
- No private key handling
- Parameterized SQL queries
- Input validation on all API endpoints

## Future Releases

### Planned Features
- WebSocket support for real-time notifications
- Enhanced REV transfer pattern detection
- Historical block import functionality
- Enhanced analytics and reporting
- Multi-node support for redundancy
- Shard support for multi-shard networks