-- ASI Chain Database Security Initialization
-- This script sets up secure database users, roles, and permissions

-- Create database and users with minimal privileges
CREATE DATABASE asichain;

-- Create roles with specific permissions
CREATE ROLE asi_read_only;
CREATE ROLE asi_write_access;
CREATE ROLE asi_admin;

-- Grant basic permissions to roles
GRANT CONNECT ON DATABASE asichain TO asi_read_only;
GRANT CONNECT ON DATABASE asichain TO asi_write_access;
GRANT CONNECT ON DATABASE asichain TO asi_admin;

-- Switch to asichain database
\c asichain;

-- Create schemas for better organization
CREATE SCHEMA IF NOT EXISTS blockchain;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set up Row Level Security policies
CREATE ROLE asi_indexer_user LOGIN;
CREATE ROLE asi_explorer_user LOGIN;
CREATE ROLE asi_hasura_user LOGIN;

-- Grant schema permissions
GRANT USAGE ON SCHEMA blockchain TO asi_read_only;
GRANT USAGE ON SCHEMA blockchain TO asi_write_access;
GRANT ALL ON SCHEMA blockchain TO asi_admin;

GRANT USAGE ON SCHEMA analytics TO asi_read_only;
GRANT USAGE ON SCHEMA analytics TO asi_write_access;

GRANT USAGE ON SCHEMA audit TO asi_admin;

-- Create secure functions for sensitive operations
CREATE OR REPLACE FUNCTION audit.log_access(
    table_name TEXT,
    operation TEXT,
    user_id TEXT DEFAULT current_user,
    ip_address INET DEFAULT inet_client_addr()
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit.access_log (
        timestamp,
        table_name,
        operation,
        user_id,
        ip_address
    ) VALUES (
        NOW(),
        table_name,
        operation,
        user_id,
        ip_address
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.access_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ip_address INET,
    session_id TEXT DEFAULT current_setting('application_name', true)
);

-- Create security constraints
CREATE TABLE IF NOT EXISTS audit.security_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT NOT NULL,
    user_id TEXT,
    ip_address INET,
    details JSONB
);

-- Set up Row Level Security for sensitive tables
CREATE TABLE IF NOT EXISTS blockchain.blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash TEXT NOT NULL UNIQUE,
    parent_hash TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    validator TEXT,
    transactions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on blocks table
ALTER TABLE blockchain.blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for different access levels
CREATE POLICY blocks_read_policy ON blockchain.blocks
    FOR SELECT TO asi_read_only, asi_write_access, asi_explorer_user
    USING (true);

CREATE POLICY blocks_write_policy ON blockchain.blocks
    FOR INSERT TO asi_write_access, asi_indexer_user
    WITH CHECK (true);

-- Create secure view for public access
CREATE VIEW blockchain.public_blocks AS
SELECT 
    block_number,
    block_hash,
    parent_hash,
    timestamp,
    validator,
    transactions_count
FROM blockchain.blocks;

-- Grant permissions on views
GRANT SELECT ON blockchain.public_blocks TO asi_explorer_user;

-- Create encrypted storage for sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function for encrypted storage
CREATE OR REPLACE FUNCTION blockchain.store_encrypted_data(
    sensitive_data TEXT,
    encryption_key TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(sensitive_data::bytea, encryption_key, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for encrypted retrieval
CREATE OR REPLACE FUNCTION blockchain.retrieve_encrypted_data(
    encrypted_data TEXT,
    encryption_key TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), encryption_key, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create backup and maintenance roles
CREATE ROLE asi_backup LOGIN;
GRANT SELECT ON ALL TABLES IN SCHEMA blockchain TO asi_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO asi_backup;

-- Revoke unnecessary permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Set up connection limits per user
ALTER ROLE asi_indexer_user CONNECTION LIMIT 10;
ALTER ROLE asi_explorer_user CONNECTION LIMIT 20;
ALTER ROLE asi_hasura_user CONNECTION LIMIT 15;
ALTER ROLE asi_backup CONNECTION LIMIT 2;

-- Create indexes for security monitoring
CREATE INDEX idx_access_log_timestamp ON audit.access_log(timestamp);
CREATE INDEX idx_access_log_user_id ON audit.access_log(user_id);
CREATE INDEX idx_access_log_ip_address ON audit.access_log(ip_address);
CREATE INDEX idx_security_events_timestamp ON audit.security_events(timestamp);
CREATE INDEX idx_security_events_severity ON audit.security_events(severity);

-- Create security monitoring function
CREATE OR REPLACE FUNCTION audit.check_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
    failed_attempts INTEGER;
    ip_addr INET;
BEGIN
    ip_addr := inet_client_addr();
    
    -- Check for multiple failed login attempts
    SELECT COUNT(*) INTO failed_attempts
    FROM audit.security_events
    WHERE event_type = 'FAILED_LOGIN'
        AND ip_address = ip_addr
        AND timestamp > NOW() - INTERVAL '15 minutes';
    
    IF failed_attempts >= 5 THEN
        INSERT INTO audit.security_events (
            event_type,
            severity,
            description,
            ip_address,
            details
        ) VALUES (
            'BRUTE_FORCE_DETECTED',
            'HIGH',
            'Multiple failed login attempts detected',
            ip_addr,
            jsonb_build_object('failed_attempts', failed_attempts)
        );
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA blockchain GRANT SELECT ON TABLES TO asi_read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA blockchain GRANT SELECT, INSERT, UPDATE ON TABLES TO asi_write_access;
ALTER DEFAULT PRIVILEGES IN SCHEMA blockchain GRANT ALL ON TABLES TO asi_admin;

-- Create secure password policy function
CREATE OR REPLACE FUNCTION audit.validate_password_strength(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check minimum length
    IF length(password) < 12 THEN
        RETURN FALSE;
    END IF;
    
    -- Check for uppercase letter
    IF password !~ '[A-Z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for lowercase letter
    IF password !~ '[a-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for digit
    IF password !~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for special character
    IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Final security notes
COMMENT ON DATABASE asichain IS 'ASI Chain blockchain database with comprehensive security controls';
COMMENT ON SCHEMA blockchain IS 'Core blockchain data with Row Level Security enabled';
COMMENT ON SCHEMA audit IS 'Security auditing and monitoring schema';
COMMENT ON TABLE audit.access_log IS 'Comprehensive access logging for security monitoring';
COMMENT ON TABLE audit.security_events IS 'Security event tracking and alerting';

-- Recommend running these commands after setup:
-- 1. Set strong passwords for all users
-- 2. Configure SSL certificates
-- 3. Set up regular backups with encryption
-- 4. Configure monitoring for audit tables
-- 5. Test Row Level Security policies