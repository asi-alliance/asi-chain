# Database Schema Reference

## 📊 Database Overview

ASI Chain uses PostgreSQL 14+ for persistent data storage with the following databases:

1. **asichain** - Main blockchain indexer database
2. **wallet_db** - Wallet service database (if deployed separately)
3. **faucet_db** - Faucet service database

## 🗄️ Main Database (asichain)

### Connection Details
```
Host: asi-indexer-db / localhost
Port: 5432
Database: asichain
User: indexer
Password: indexer_password
```

### Complete Schema (v2.1.1)

#### 1. blocks
Primary blockchain blocks table.

```sql
CREATE TABLE blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    parent_hash VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    validator VARCHAR(150),
    deployments_count INTEGER DEFAULT 0,
    justifications_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_blocks_timestamp (timestamp DESC),
    INDEX idx_blocks_validator (validator),
    INDEX idx_blocks_parent (parent_hash)
);
```

#### 2. deployments
Smart contract deployments and transactions.

```sql
CREATE TABLE deployments (
    deploy_id VARCHAR(64) PRIMARY KEY,
    block_number BIGINT REFERENCES blocks(block_number) ON DELETE CASCADE,
    deployer VARCHAR(150) NOT NULL,
    term TEXT,
    phlo_limit BIGINT,
    phlo_price BIGINT,
    cost BIGINT,
    error_message TEXT,
    system_error TEXT,
    sig VARCHAR(256),
    sig_algorithm VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_deployments_block (block_number),
    INDEX idx_deployments_deployer (deployer),
    INDEX idx_deployments_timestamp (timestamp DESC),
    INDEX idx_deployments_error (error_message IS NOT NULL)
);
```

#### 3. validator_bonds
Validator staking information per block.

```sql
CREATE TABLE validator_bonds (
    id SERIAL PRIMARY KEY,
    block_number BIGINT REFERENCES blocks(block_number) ON DELETE CASCADE,
    validator VARCHAR(150) NOT NULL,
    stake BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_validator_block (block_number, validator),
    INDEX idx_bonds_validator (validator),
    INDEX idx_bonds_block (block_number),
    INDEX idx_bonds_stake (stake DESC)
);
```

#### 4. balance_states
Account balance tracking.

```sql
CREATE TABLE balance_states (
    id SERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL,
    balance BIGINT NOT NULL,
    block_number BIGINT REFERENCES blocks(block_number),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_address (address),
    INDEX idx_balance_address (address),
    INDEX idx_balance_block (block_number),
    INDEX idx_balance_updated (last_updated DESC)
);
```

#### 5. epoch_transitions
Network epoch changes.

```sql
CREATE TABLE epoch_transitions (
    id SERIAL PRIMARY KEY,
    epoch_number INTEGER NOT NULL UNIQUE,
    start_block BIGINT REFERENCES blocks(block_number),
    end_block BIGINT REFERENCES blocks(block_number),
    validator_set JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_epoch_number (epoch_number),
    INDEX idx_epoch_blocks (start_block, end_block)
);
```

#### 6. indexer_metadata
Indexer synchronization state.

```sql
CREATE TABLE indexer_metadata (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default values
INSERT INTO indexer_metadata (key, value) VALUES 
    ('last_indexed_block', '0'),
    ('indexer_version', '2.1.1'),
    ('schema_version', '1'),
    ('network_id', 'asi-mainnet');
```

#### 7. events
System and blockchain events.

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    block_number BIGINT REFERENCES blocks(block_number),
    transaction_id VARCHAR(64),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_events_type (event_type),
    INDEX idx_events_block (block_number),
    INDEX idx_events_tx (transaction_id),
    INDEX idx_events_created (created_at DESC),
    INDEX idx_events_data_gin (data) -- GIN index for JSONB queries
);
```

#### 8. network_stats
Aggregated network statistics.

```sql
CREATE TABLE network_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE,
    total_blocks BIGINT DEFAULT 0,
    total_deployments BIGINT DEFAULT 0,
    total_validators INTEGER DEFAULT 0,
    total_stake BIGINT DEFAULT 0,
    active_addresses INTEGER DEFAULT 0,
    daily_deployments INTEGER DEFAULT 0,
    daily_blocks INTEGER DEFAULT 0,
    average_block_time REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_stats_date (stat_date DESC)
);
```

#### 9. address_transactions
Address transaction history for quick lookups.

```sql
CREATE TABLE address_transactions (
    id SERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL,
    deploy_id VARCHAR(64) REFERENCES deployments(deploy_id) ON DELETE CASCADE,
    block_number BIGINT REFERENCES blocks(block_number),
    transaction_type VARCHAR(20), -- 'sent', 'received', 'deploy'
    amount BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    INDEX idx_addr_tx_address (address),
    INDEX idx_addr_tx_deploy (deploy_id),
    INDEX idx_addr_tx_block (block_number),
    INDEX idx_addr_tx_time (timestamp DESC)
);
```

#### 10. sync_status
Multi-indexer synchronization tracking.

```sql
CREATE TABLE sync_status (
    indexer_id VARCHAR(50) PRIMARY KEY,
    last_processed_block BIGINT,
    status VARCHAR(20), -- 'syncing', 'synced', 'error', 'paused'
    error_message TEXT,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_sync_status (status),
    INDEX idx_sync_heartbeat (last_heartbeat DESC)
);
```

### Views

#### v_latest_validator_bonds
Current validator stakes.

```sql
CREATE VIEW v_latest_validator_bonds AS
SELECT DISTINCT ON (validator) 
    validator,
    stake,
    block_number
FROM validator_bonds
ORDER BY validator, block_number DESC;
```

#### v_daily_statistics
Daily aggregated statistics.

```sql
CREATE VIEW v_daily_statistics AS
SELECT 
    DATE(timestamp) as date,
    COUNT(DISTINCT block_number) as blocks_count,
    COUNT(DISTINCT d.deploy_id) as deployments_count,
    COUNT(DISTINCT d.deployer) as active_addresses,
    AVG(EXTRACT(EPOCH FROM (b2.timestamp - b1.timestamp))) as avg_block_time
FROM blocks b1
LEFT JOIN blocks b2 ON b2.block_number = b1.block_number + 1
LEFT JOIN deployments d ON d.block_number = b1.block_number
GROUP BY DATE(timestamp);
```

#### v_address_summary
Address balance and activity summary.

```sql
CREATE VIEW v_address_summary AS
SELECT 
    a.address,
    COALESCE(bs.balance, 0) as balance,
    COUNT(DISTINCT at.deploy_id) as transaction_count,
    MAX(at.timestamp) as last_activity
FROM (
    SELECT DISTINCT address FROM address_transactions
    UNION
    SELECT DISTINCT address FROM balance_states
) a
LEFT JOIN balance_states bs ON bs.address = a.address
LEFT JOIN address_transactions at ON at.address = a.address
GROUP BY a.address, bs.balance;
```

### Functions and Triggers

#### update_updated_at()
Auto-update timestamp trigger.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blocks_updated_at
    BEFORE UPDATE ON blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

#### calculate_block_stats()
Calculate block statistics.

```sql
CREATE OR REPLACE FUNCTION calculate_block_stats(block_num BIGINT)
RETURNS TABLE(
    deployments_count INTEGER,
    total_cost BIGINT,
    unique_deployers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER,
        SUM(cost),
        COUNT(DISTINCT deployer)::INTEGER
    FROM deployments
    WHERE block_number = block_num;
END;
$$ LANGUAGE plpgsql;
```

### Indexes for Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_deployments_deployer_timestamp 
    ON deployments(deployer, timestamp DESC);

CREATE INDEX idx_blocks_validator_timestamp 
    ON blocks(validator, timestamp DESC);

CREATE INDEX idx_validator_bonds_validator_block 
    ON validator_bonds(validator, block_number DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_deployments_with_errors 
    ON deployments(block_number) 
    WHERE error_message IS NOT NULL;

CREATE INDEX idx_recent_blocks 
    ON blocks(timestamp) 
    WHERE timestamp > (CURRENT_TIMESTAMP - INTERVAL '7 days');
```

## 🔄 Migrations

### Migration Strategy

```bash
# Location of migrations
indexer/migrations/

# Migration files
000_comprehensive_initial_schema.sql  # Complete v2.1.1 schema
001_add_indexes.sql                  # Performance indexes
002_add_views.sql                    # Materialized views
003_add_functions.sql                # Stored procedures
```

### Running Migrations

```bash
# Automatic during deployment
cd indexer
./deploy.sh  # Runs migrations automatically

# Manual migration
docker exec -i asi-indexer-db psql -U indexer asichain < migrations/000_comprehensive_initial_schema.sql

# Check migration status
docker exec asi-indexer-db psql -U indexer asichain -c "SELECT * FROM indexer_metadata WHERE key='schema_version'"
```

### Rollback Procedures

```sql
-- Rollback to previous version
BEGIN;
-- Drop v2 additions
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS address_transactions CASCADE;
-- Update metadata
UPDATE indexer_metadata SET value='1' WHERE key='schema_version';
COMMIT;
```

## 🗄️ Faucet Database (faucet_db)

### Schema

```sql
CREATE TABLE faucet_requests (
    id SERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL,
    amount BIGINT NOT NULL,
    transaction_id VARCHAR(64),
    status VARCHAR(20) DEFAULT 'pending',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_faucet_address (address),
    INDEX idx_faucet_status (status),
    INDEX idx_faucet_created (created_at DESC)
);

CREATE TABLE faucet_config (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting table
CREATE TABLE rate_limits (
    identifier VARCHAR(150) PRIMARY KEY, -- IP or address
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_request TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🗄️ Wallet Database (wallet_db)

### Schema

```sql
-- User wallets
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL UNIQUE,
    encrypted_private_key TEXT,
    public_key VARCHAR(256),
    wallet_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_wallet_address (address)
);

-- Transaction history cache
CREATE TABLE transaction_cache (
    id SERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL,
    transaction_data JSONB,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_tx_cache_address (address),
    INDEX idx_tx_cache_expires (expires_at)
);

-- User preferences
CREATE TABLE user_preferences (
    wallet_address VARCHAR(150) PRIMARY KEY,
    preferences JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Database Maintenance

### Backup Procedures

```bash
# Full backup
docker exec asi-indexer-db pg_dump -U indexer asichain > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker exec asi-indexer-db pg_dump -U indexer -Fc asichain > backup_$(date +%Y%m%d).dump

# Backup specific tables
docker exec asi-indexer-db pg_dump -U indexer -t blocks -t deployments asichain > blocks_deployments.sql

# Scheduled backup (crontab)
0 2 * * * docker exec asi-indexer-db pg_dump -U indexer -Fc asichain > /backup/asichain_$(date +\%Y\%m\%d).dump
```

### Restore Procedures

```bash
# Restore from SQL
docker exec -i asi-indexer-db psql -U indexer asichain < backup.sql

# Restore from compressed dump
docker exec -i asi-indexer-db pg_restore -U indexer -d asichain < backup.dump

# Restore specific tables
docker exec -i asi-indexer-db psql -U indexer asichain < blocks_deployments.sql
```

### Performance Optimization

```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex tables
REINDEX TABLE blocks;
REINDEX TABLE deployments;

-- Update statistics
ANALYZE blocks;
ANALYZE deployments;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Monitoring Queries

```sql
-- Active connections
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'asichain';

-- Long running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Table statistics
SELECT 
    relname,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Database size
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

## 🔗 Hasura GraphQL Relationships

### Automatic Setup (v2.1.1)
Relationships are configured automatically during deployment.

### Manual Configuration
If needed, relationships can be set up manually:

```graphql
# blocks -> deployments (one-to-many)
blocks.deployments = deployments.block_number -> blocks.block_number

# blocks -> validator_bonds (one-to-many)
blocks.validator_bonds = validator_bonds.block_number -> blocks.block_number

# deployments -> blocks (many-to-one)
deployments.block = deployments.block_number -> blocks.block_number

# validator_bonds -> blocks (many-to-one)
validator_bonds.block = validator_bonds.block_number -> blocks.block_number
```

### Testing Relationships

```bash
# Test GraphQL relationships
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{
    "query": "{ blocks(limit: 1) { block_number deployments { deploy_id } validator_bonds { stake } } }"
  }'
```

## 📊 Data Retention Policies

### Retention Rules
- **Blocks**: Permanent retention
- **Deployments**: Permanent retention
- **Events**: 90 days for non-critical events
- **network_stats**: Aggregate monthly after 30 days
- **sync_status**: 7 days for heartbeat data
- **transaction_cache**: 24 hours

### Cleanup Scripts

```sql
-- Clean old events
DELETE FROM events 
WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '90 days')
AND event_type NOT IN ('critical', 'security', 'validator_change');

-- Clean old cache
DELETE FROM transaction_cache 
WHERE expires_at < CURRENT_TIMESTAMP;

-- Archive old statistics
INSERT INTO network_stats_monthly (year, month, data)
SELECT 
    EXTRACT(YEAR FROM stat_date),
    EXTRACT(MONTH FROM stat_date),
    jsonb_agg(row_to_json(ns))
FROM network_stats ns
WHERE stat_date < (CURRENT_DATE - INTERVAL '30 days')
GROUP BY EXTRACT(YEAR FROM stat_date), EXTRACT(MONTH FROM stat_date);

DELETE FROM network_stats 
WHERE stat_date < (CURRENT_DATE - INTERVAL '30 days');
```

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Schema Version**: 2.1.1