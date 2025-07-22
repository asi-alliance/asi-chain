-- Create a view to extract REV transfers from deployments
CREATE VIEW IF NOT EXISTS rev_transfers AS
WITH parsed_transfers AS (
  SELECT 
    d.deploy_id,
    d.block_hash,
    b.block_number,
    d.deployer,
    d.term,
    -- Find the match pattern
    INSTR(REPLACE(d.term, '\n', ' '), 'match (') as match_start,
    d.phlo_cost,
    d.errored,
    d.error_message,
    d.created_at
  FROM deployments d
  JOIN blocks b ON d.block_hash = b.block_hash
  WHERE d.term LIKE '%RevVault%' 
    AND d.term LIKE '%transfer%'
    AND d.term LIKE '%match (%'
)
SELECT 
  deploy_id,
  block_hash,
  block_number,
  deployer,
  -- Extract addresses and amount using the match pattern
  TRIM(SUBSTR(
    SUBSTR(term, match_start + 7), 
    2,
    INSTR(SUBSTR(term, match_start + 7), '",') - 3
  )) as from_address,
  TRIM(SUBSTR(
    SUBSTR(term, match_start + 7),
    INSTR(SUBSTR(term, match_start + 7), '", "') + 4,
    INSTR(SUBSTR(SUBSTR(term, match_start + 7), INSTR(SUBSTR(term, match_start + 7), '", "') + 4), '",') - 1
  )) as to_address,
  CAST(TRIM(SUBSTR(
    SUBSTR(term, match_start + 7),
    INSTR(SUBSTR(term, match_start + 7), ', ') + 2,
    INSTR(SUBSTR(term, match_start + 7), ')') - INSTR(SUBSTR(term, match_start + 7), ', ') - 2
  )) AS INTEGER) as amount,
  phlo_cost,
  errored,
  error_message,
  created_at
FROM parsed_transfers
WHERE match_start > 0;