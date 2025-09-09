-- Migration to add enhanced tables for Rust CLI indexer

-- Add new columns to blocks table
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS state_root_hash VARCHAR(64);
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS pre_state_hash VARCHAR(64);
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS finalization_status VARCHAR(20) DEFAULT 'finalized';
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS bonds_map JSONB;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS justifications JSONB;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS fault_tolerance NUMERIC(5,4);

-- Add new columns to deployments table
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(50);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS seq_num INTEGER;
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS shard_id VARCHAR(20);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'included';
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- Add status column to validators table
ALTER TABLE validators ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'bonded';
CREATE INDEX IF NOT EXISTS idx_validators_status ON validators(status);

-- Create epoch_transitions table
CREATE TABLE IF NOT EXISTS epoch_transitions (
    id BIGSERIAL PRIMARY KEY,
    epoch_number BIGINT UNIQUE NOT NULL,
    start_block BIGINT NOT NULL,
    end_block BIGINT NOT NULL,
    active_validators INTEGER NOT NULL,
    quarantine_length INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_epoch_transitions_epoch_number ON epoch_transitions(epoch_number);
CREATE INDEX IF NOT EXISTS idx_epoch_blocks ON epoch_transitions(start_block, end_block);

-- Create network_stats table
CREATE TABLE IF NOT EXISTS network_stats (
    id BIGSERIAL PRIMARY KEY,
    block_number BIGINT NOT NULL,
    total_validators INTEGER NOT NULL,
    active_validators INTEGER NOT NULL,
    validators_in_quarantine INTEGER DEFAULT 0,
    consensus_participation NUMERIC(5,2) NOT NULL,
    consensus_status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_network_stats_block_number ON network_stats(block_number);
CREATE INDEX IF NOT EXISTS idx_network_stats_timestamp ON network_stats(timestamp);

-- Add comment about enhanced indexer
COMMENT ON TABLE epoch_transitions IS 'Track epoch transitions and validator set changes';
COMMENT ON TABLE network_stats IS 'Network statistics captured at specific blocks';
COMMENT ON COLUMN blocks.pre_state_hash IS 'Pre-state hash from enhanced block data';
COMMENT ON COLUMN blocks.justifications IS 'Full justifications data as JSONB';
COMMENT ON COLUMN blocks.fault_tolerance IS 'Fault tolerance metric for the block';
COMMENT ON COLUMN deployments.status IS 'Deploy status: pending/included/error';
COMMENT ON COLUMN validators.status IS 'Validator status: active/bonded/quarantine/inactive';

-- Drop validator foreign key constraint to allow flexible syncing
ALTER TABLE validator_bonds DROP CONSTRAINT IF EXISTS validator_bonds_validator_public_key_fkey;