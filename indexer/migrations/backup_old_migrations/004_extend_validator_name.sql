-- Migration 004: Extend validator name field to accommodate full public keys
-- This removes hardcoded validator names and uses public keys directly

ALTER TABLE validators ALTER COLUMN name TYPE VARCHAR(160);

-- Update existing records to use public key as name
UPDATE validators SET name = public_key WHERE name != public_key;