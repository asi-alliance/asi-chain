# ASI Chain Indexer Database Migrations

## Current Migration Strategy

This directory contains a **single comprehensive initial migration** that includes all necessary database schema components for the ASI Chain indexer.

### Active Migration

- **`000_comprehensive_initial_schema.sql`** - Complete database schema including:
  - Core blockchain tables (blocks, deployments, transfers)
  - Validator and staking tables with extended name fields (VARCHAR(160))
  - Balance tracking with bonded/unbonded separation
  - Network statistics and epoch transition tracking
  - All necessary indexes, triggers, and constraints
  - Documentation comments

### Migration History

Previous migration files have been moved to `backup_old_migrations/` for reference:

- `001_initial_schema.sql` - Original core tables
- `002_add_enhanced_tables.sql` - Added enhanced fields and statistics tables
- `003_add_block_details.sql` - Block details enhancements (redundant)
- `003_add_genesis_and_balance_tracking.sql` - Balance tracking (redundant) 
- `004_extend_validator_name.sql` - Extended validator name field (integrated)
- `002_fix_field_lengths.sql` - Field length fixes (integrated)

## For New Deployments

**Use only the comprehensive migration:**

```bash
# Apply the complete schema
psql -U indexer -d asichain -f 000_comprehensive_initial_schema.sql
```

## Schema Features

### Enhanced Tables
- **Extended validator names**: VARCHAR(160) to accommodate full public keys
- **JSONB fields**: bonds_map, justifications for rich data storage
- **Balance tracking**: Separate bonded/unbonded balance states
- **Network statistics**: Real-time consensus and validator metrics
- **Computed columns**: Auto-calculated total balances

### Performance Optimizations
- Comprehensive indexing strategy
- Partial indexes for pattern matching
- Optimized foreign key relationships
- Real-time notification triggers

### Compatibility
- Fully compatible with Hasura GraphQL auto-generation
- Supports all current indexer functionality
- Includes all enhancements from previous migrations
- Ready for production deployment

## Benefits of Single Migration Approach

1. **Simplified deployment**: One file contains everything
2. **No migration conflicts**: Eliminates dependency issues  
3. **Complete documentation**: All schema elements in one place
4. **Version clarity**: Clear schema version (000) for fresh deployments
5. **Backup preservation**: Historical migrations preserved for reference