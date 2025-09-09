-- Initial schema for ASI-Chain Indexer
-- Version: 001

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    parent_hash VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    proposer VARCHAR(160) NOT NULL,
    state_hash VARCHAR(64),
    seq_num INTEGER,
    sig VARCHAR(200),
    sig_algorithm VARCHAR(20),
    shard_id VARCHAR(20),
    extra_bytes TEXT,
    version INTEGER,
    deployment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_blocks_hash ON blocks(block_hash);
CREATE INDEX idx_blocks_timestamp ON blocks(timestamp DESC);
CREATE INDEX idx_blocks_proposer ON blocks(proposer);
CREATE INDEX idx_blocks_created_at ON blocks(created_at DESC);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    deploy_id VARCHAR(200) PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL REFERENCES blocks(block_hash) ON DELETE CASCADE,
    block_number BIGINT NOT NULL REFERENCES blocks(block_number) ON DELETE CASCADE,
    deployer VARCHAR(200) NOT NULL,
    term TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    sig VARCHAR(200) NOT NULL,
    sig_algorithm VARCHAR(20) DEFAULT 'secp256k1',
    phlo_price BIGINT DEFAULT 1,
    phlo_limit BIGINT DEFAULT 1000000,
    phlo_cost BIGINT DEFAULT 0,
    valid_after_block_number BIGINT,
    errored BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_deployments_block_hash ON deployments(block_hash);
CREATE INDEX idx_deployments_block_number ON deployments(block_number);
CREATE INDEX idx_deployments_deployer ON deployments(deployer);
CREATE INDEX idx_deployments_timestamp ON deployments(timestamp DESC);
CREATE INDEX idx_deployments_errored ON deployments(errored);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
    id BIGSERIAL PRIMARY KEY,
    deploy_id VARCHAR(200) NOT NULL REFERENCES deployments(deploy_id) ON DELETE CASCADE,
    block_number BIGINT NOT NULL REFERENCES blocks(block_number) ON DELETE CASCADE,
    from_address VARCHAR(150) NOT NULL,
    to_address VARCHAR(150) NOT NULL,
    amount_dust BIGINT NOT NULL,
    amount_rev NUMERIC(20, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_transfers_deploy_id ON transfers(deploy_id);
CREATE INDEX idx_transfers_block_number ON transfers(block_number DESC);
CREATE INDEX idx_transfers_from ON transfers(from_address);
CREATE INDEX idx_transfers_to ON transfers(to_address);
CREATE INDEX idx_transfers_created_at ON transfers(created_at DESC);

-- Validators table
CREATE TABLE IF NOT EXISTS validators (
    public_key VARCHAR(200) PRIMARY KEY,
    name VARCHAR(50),
    total_stake BIGINT DEFAULT 0,
    first_seen_block BIGINT,
    last_seen_block BIGINT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Validator bonds table
CREATE TABLE IF NOT EXISTS validator_bonds (
    id BIGSERIAL PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL REFERENCES blocks(block_hash) ON DELETE CASCADE,
    block_number BIGINT NOT NULL REFERENCES blocks(block_number) ON DELETE CASCADE,
    validator_public_key VARCHAR(200) NOT NULL REFERENCES validators(public_key),
    stake BIGINT NOT NULL,
    UNIQUE(block_hash, validator_public_key)
);

CREATE INDEX idx_validator_bonds_block_number ON validator_bonds(block_number);
CREATE INDEX idx_validator_bonds_validator ON validator_bonds(validator_public_key);

-- Indexer state table
CREATE TABLE IF NOT EXISTS indexer_state (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert initial state
INSERT INTO indexer_state (key, value) VALUES
    ('last_indexed_block', '0'),
    ('indexer_version', '1.0.0'),
    ('schema_version', '001')
ON CONFLICT (key) DO NOTHING;

-- Create function to update deployment count
CREATE OR REPLACE FUNCTION update_block_deployment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE blocks 
        SET deployment_count = deployment_count + 1 
        WHERE block_hash = NEW.block_hash;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE blocks 
        SET deployment_count = deployment_count - 1 
        WHERE block_hash = OLD.block_hash;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deployment count
CREATE TRIGGER update_deployment_count
AFTER INSERT OR DELETE ON deployments
FOR EACH ROW EXECUTE FUNCTION update_block_deployment_count();

-- Create function to notify on new blocks
CREATE OR REPLACE FUNCTION notify_new_block()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_block',
        json_build_object(
            'block_number', NEW.block_number,
            'block_hash', NEW.block_hash,
            'timestamp', NEW.timestamp
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new block notifications
CREATE TRIGGER new_block_notify
AFTER INSERT ON blocks
FOR EACH ROW EXECUTE FUNCTION notify_new_block();

-- Create function to notify on new transfers
CREATE OR REPLACE FUNCTION notify_new_transfer()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_transfer',
        json_build_object(
            'id', NEW.id,
            'from_address', NEW.from_address,
            'to_address', NEW.to_address,
            'amount_rev', NEW.amount_rev,
            'block_number', NEW.block_number
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new transfer notifications
CREATE TRIGGER new_transfer_notify
AFTER INSERT ON transfers
FOR EACH ROW EXECUTE FUNCTION notify_new_transfer();

-- Balance states table for tracking bonded vs unbonded balances
CREATE TABLE IF NOT EXISTS balance_states (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(150) NOT NULL,
    block_number BIGINT NOT NULL REFERENCES blocks(block_number) ON DELETE CASCADE,
    unbonded_balance_dust BIGINT NOT NULL DEFAULT 0,
    unbonded_balance_rev NUMERIC(20, 8) NOT NULL DEFAULT 0,
    bonded_balance_dust BIGINT NOT NULL DEFAULT 0,
    bonded_balance_rev NUMERIC(20, 8) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(address, block_number)
);

CREATE INDEX idx_balance_states_address ON balance_states(address);
CREATE INDEX idx_balance_states_block ON balance_states(block_number DESC);
CREATE INDEX idx_balance_states_updated ON balance_states(updated_at DESC);