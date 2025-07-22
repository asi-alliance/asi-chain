-- REV Transfer Tracking SQL Queries for ASI-Chain Block Explorer

-- Create REV transfers table
CREATE TABLE IF NOT EXISTS rev_transfers (
    transfer_id         TEXT PRIMARY KEY,
    block_hash          TEXT NOT NULL,
    block_number        INTEGER NOT NULL,
    deploy_id           TEXT NOT NULL,
    from_address        TEXT NOT NULL,
    to_address          TEXT NOT NULL,
    amount              INTEGER NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',  -- 'success', 'failed', 'pending'
    error_message       TEXT,
    gas_cost            INTEGER DEFAULT 0,
    timestamp           INTEGER NOT NULL,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_hash) REFERENCES blocks (block_hash),
    FOREIGN KEY (deploy_id) REFERENCES deployments (deploy_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rev_transfers_from ON rev_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_rev_transfers_to ON rev_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_rev_transfers_block ON rev_transfers(block_number);
CREATE INDEX IF NOT EXISTS idx_rev_transfers_timestamp ON rev_transfers(timestamp);

-- View to identify potential REV transfers from deployments
CREATE VIEW potential_rev_transfers AS
SELECT 
    d.deploy_id,
    d.block_hash,
    b.block_number,
    d.deployer,
    d.term,
    d.timestamp,
    d.phlo_cost as gas_cost,
    d.errored,
    d.error_message
FROM deployments d
JOIN blocks b ON d.block_hash = b.block_hash
WHERE 
    d.term LIKE '%vault%transfer%' OR
    d.term LIKE '%RevVault%transfer%' OR
    d.term LIKE '%@vault!("transfer"%' OR
    d.term LIKE '%Vault!("transfer"%';

-- Get all REV transfers for a specific address (sent or received)
SELECT 
    t.*,
    b.created_at as block_time,
    CASE 
        WHEN t.from_address = ? THEN 'sent'
        WHEN t.to_address = ? THEN 'received'
    END as direction
FROM rev_transfers t
JOIN blocks b ON t.block_hash = b.block_hash
WHERE t.from_address = ? OR t.to_address = ?
ORDER BY t.timestamp DESC;

-- Get transfer summary for an address
SELECT 
    COUNT(CASE WHEN from_address = ? THEN 1 END) as sent_count,
    COUNT(CASE WHEN to_address = ? THEN 1 END) as received_count,
    COALESCE(SUM(CASE WHEN from_address = ? THEN amount END), 0) as total_sent,
    COALESCE(SUM(CASE WHEN to_address = ? THEN amount END), 0) as total_received,
    COALESCE(SUM(CASE WHEN from_address = ? THEN gas_cost END), 0) as total_gas_spent
FROM rev_transfers
WHERE status = 'success' AND (from_address = ? OR to_address = ?);

-- Get recent REV transfers (last 100)
SELECT 
    t.*,
    b.created_at as block_time,
    b.proposer_pub_key as block_proposer
FROM rev_transfers t
JOIN blocks b ON t.block_hash = b.block_hash
ORDER BY t.block_number DESC
LIMIT 100;

-- Get transfers by block
SELECT 
    t.*,
    d.deployer,
    d.term
FROM rev_transfers t
JOIN deployments d ON t.deploy_id = d.deploy_id
WHERE t.block_hash = ?
ORDER BY t.timestamp;

-- Get largest transfers in the last N blocks
SELECT 
    t.*,
    b.created_at as block_time
FROM rev_transfers t
JOIN blocks b ON t.block_hash = b.block_hash
WHERE t.block_number > (SELECT MAX(block_number) - ? FROM blocks)
    AND t.status = 'success'
ORDER BY t.amount DESC
LIMIT 20;

-- Daily transfer statistics
SELECT 
    DATE(datetime(timestamp/1000, 'unixepoch')) as date,
    COUNT(*) as transfer_count,
    SUM(amount) as total_volume,
    AVG(amount) as avg_transfer,
    MAX(amount) as max_transfer,
    COUNT(DISTINCT from_address) as unique_senders,
    COUNT(DISTINCT to_address) as unique_receivers,
    SUM(gas_cost) as total_gas
FROM rev_transfers
WHERE status = 'success'
GROUP BY date
ORDER BY date DESC;

-- Identify addresses with high transfer activity
SELECT 
    address,
    SUM(sent_count) as total_sent,
    SUM(received_count) as total_received,
    SUM(sent_amount) as total_sent_amount,
    SUM(received_amount) as total_received_amount
FROM (
    SELECT 
        from_address as address,
        COUNT(*) as sent_count,
        0 as received_count,
        SUM(amount) as sent_amount,
        0 as received_amount
    FROM rev_transfers
    WHERE status = 'success'
    GROUP BY from_address
    
    UNION ALL
    
    SELECT 
        to_address as address,
        0 as sent_count,
        COUNT(*) as received_count,
        0 as sent_amount,
        SUM(amount) as received_amount
    FROM rev_transfers
    WHERE status = 'success'
    GROUP BY to_address
) t
GROUP BY address
ORDER BY (total_sent + total_received) DESC
LIMIT 50;

-- Find potential REV transfers that haven't been processed yet
SELECT 
    d.deploy_id,
    d.block_hash,
    b.block_number,
    d.deployer,
    d.timestamp,
    SUBSTR(d.term, 1, 200) as term_preview
FROM deployments d
JOIN blocks b ON d.block_hash = b.block_hash
LEFT JOIN rev_transfers t ON d.deploy_id = t.deploy_id
WHERE t.transfer_id IS NULL
    AND (
        d.term LIKE '%vault%transfer%' OR
        d.term LIKE '%RevVault%transfer%'
    )
ORDER BY b.block_number DESC
LIMIT 100;

-- Migration helper: Extract transfer data from deployment terms
-- This helps parse existing deployments to populate rev_transfers table
SELECT 
    d.deploy_id,
    d.block_hash,
    b.block_number,
    d.deployer,
    d.term,
    d.timestamp,
    d.phlo_cost,
    d.errored,
    -- Extract potential to_address using regex-like patterns
    CASE 
        WHEN d.term LIKE '%"transfer", "%", %' THEN
            SUBSTR(
                d.term,
                INSTR(d.term, '"transfer", "') + 13,
                INSTR(SUBSTR(d.term, INSTR(d.term, '"transfer", "') + 13), '"') - 1
            )
        ELSE NULL
    END as potential_to_address,
    -- Extract potential amount (simplified, would need proper parsing)
    CASE
        WHEN d.term LIKE '%"transfer", %, %, %' THEN
            CAST(
                TRIM(
                    SUBSTR(
                        d.term,
                        INSTR(d.term, ', ') + 2,
                        INSTR(SUBSTR(d.term, INSTR(d.term, ', ') + 2), ',') - 1
                    )
                ) AS INTEGER
            )
        ELSE NULL
    END as potential_amount
FROM deployments d
JOIN blocks b ON d.block_hash = b.block_hash
WHERE 
    d.term LIKE '%transfer%'
    AND (d.term LIKE '%vault%' OR d.term LIKE '%Vault%')
ORDER BY b.block_number DESC;