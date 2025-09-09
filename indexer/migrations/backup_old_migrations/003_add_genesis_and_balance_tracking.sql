-- Migration 003: Add genesis transfers and balance tracking
-- This migration adds support for tracking genesis transfers and bonded/unbonded balances

-- Extend address field lengths to support validator public keys (130+ chars)
ALTER TABLE transfers ALTER COLUMN from_address TYPE VARCHAR(150);
ALTER TABLE transfers ALTER COLUMN to_address TYPE VARCHAR(150);

-- Create table for tracking bonded vs unbonded balances
CREATE TABLE IF NOT EXISTS balance_states (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL,
    block_number BIGINT NOT NULL,
    unbonded_balance_dust BIGINT NOT NULL DEFAULT 0,
    unbonded_balance_rev NUMERIC(20, 8) NOT NULL DEFAULT 0,
    bonded_balance_dust BIGINT NOT NULL DEFAULT 0,
    bonded_balance_rev NUMERIC(20, 8) NOT NULL DEFAULT 0,
    total_balance_dust BIGINT GENERATED ALWAYS AS (unbonded_balance_dust + bonded_balance_dust) STORED,
    total_balance_rev NUMERIC(20, 8) GENERATED ALWAYS AS (unbonded_balance_rev + bonded_balance_rev) STORED,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(address, block_number)
);

-- Create indexes for balance_states
CREATE INDEX IF NOT EXISTS idx_balance_states_address ON balance_states(address);
CREATE INDEX IF NOT EXISTS idx_balance_states_block ON balance_states(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_balance_states_updated ON balance_states(updated_at DESC);

-- Add new deployment types for genesis transactions
-- This will be handled by the indexer code, no schema changes needed

-- Add foreign key constraint for balance_states to blocks
ALTER TABLE balance_states 
ADD CONSTRAINT balance_states_block_number_fkey 
FOREIGN KEY (block_number) REFERENCES blocks(block_number) ON DELETE CASCADE;