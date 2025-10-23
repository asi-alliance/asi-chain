-- Migration to fix field lengths for validator keys
-- Version: 002

-- Increase proposer field length to accommodate full validator public keys
ALTER TABLE blocks ALTER COLUMN proposer TYPE VARCHAR(160);

-- Increase deployer field length
ALTER TABLE deployments ALTER COLUMN deployer TYPE VARCHAR(160);

-- Increase validator public key fields
ALTER TABLE validators ALTER COLUMN public_key TYPE VARCHAR(160);
ALTER TABLE validator_bonds ALTER COLUMN validator_public_key TYPE VARCHAR(160);

-- Increase deploy_id and sig fields to be safe
ALTER TABLE deployments ALTER COLUMN deploy_id TYPE VARCHAR(160);
ALTER TABLE deployments ALTER COLUMN sig TYPE VARCHAR(160);
ALTER TABLE blocks ALTER COLUMN sig TYPE VARCHAR(160);
ALTER TABLE transfers ALTER COLUMN deploy_id TYPE VARCHAR(160);

-- Update schema version
UPDATE indexer_state SET value = '002', updated_at = NOW() WHERE key = 'schema_version';