-- Migration: Add additional block details and search capabilities
-- Date: 2025-01-05

-- Add new columns to blocks table
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS parent_hash VARCHAR(64);
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS state_root_hash VARCHAR(64);
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS finalization_status VARCHAR(20) DEFAULT 'finalized';
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS bonds_map JSONB;

-- Create block_validators junction table for tracking validators per block
CREATE TABLE IF NOT EXISTS block_validators (
    block_hash VARCHAR(64) REFERENCES blocks(block_hash) ON DELETE CASCADE,
    validator_public_key VARCHAR(160),
    PRIMARY KEY (block_hash, validator_public_key)
);

-- Add deployment type classification
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(50);

-- Add indexes for partial search capabilities
CREATE INDEX IF NOT EXISTS idx_blocks_hash_partial ON blocks(block_hash varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_deployments_deploy_id_partial ON deployments(deploy_id varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_deployments_deployer_partial ON deployments(deployer varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_deployments_type ON deployments(deployment_type);

-- Add address indexes to transfers for wallet transaction history
CREATE INDEX IF NOT EXISTS idx_transfers_from_address ON transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_transfers_to_address ON transfers(to_address);

-- Create a view for network statistics
CREATE OR REPLACE VIEW network_stats AS
WITH block_times AS (
    SELECT 
        block_number,
        timestamp,
        LAG(timestamp) OVER (ORDER BY block_number DESC) as prev_timestamp,
        proposer
    FROM blocks
    WHERE block_number > 0
    ORDER BY block_number DESC
    LIMIT 100
)
SELECT 
    COUNT(*) as total_blocks,
    AVG(CASE 
        WHEN prev_timestamp IS NOT NULL 
        THEN (prev_timestamp - timestamp) / 1000.0  -- Convert to seconds
        ELSE NULL 
    END) as avg_block_time_seconds,
    MIN(timestamp) as earliest_block_time,
    MAX(timestamp) as latest_block_time
FROM block_times;