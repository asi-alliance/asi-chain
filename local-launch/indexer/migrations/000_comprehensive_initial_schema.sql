-- Comprehensive Initial Schema for ASI-Chain Indexer
-- Version: 000 (Single Complete Migration)
-- Includes all enhancements: extended fields, balance tracking, network stats, epoch transitions

-- Enable extensions
create EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE BLOCKCHAIN TABLES
-- =============================================

-- Blocks table with all enhanced fields
create TABLE IF NOT EXISTS blocks
(
    block_number        BIGINT PRIMARY KEY,
    block_hash          VARCHAR(64) UNIQUE        NOT NULL,
    parent_hash         VARCHAR(64)               NOT NULL,
    timestamp           BIGINT                    NOT NULL,
    proposer            VARCHAR(160)              NOT NULL,
    state_hash          VARCHAR(64),
    state_root_hash     VARCHAR(64),
    pre_state_hash      VARCHAR(64),
    seq_num             INTEGER,
    sig                 VARCHAR(200),
    sig_algorithm       VARCHAR(20),
    shard_id            VARCHAR(20),
    extra_bytes         TEXT,
    version             INTEGER,
    deployment_count    INTEGER     DEFAULT 0,
    finalization_status VARCHAR(20) DEFAULT 'finalized',
    bonds_map           JSONB,
    justifications      JSONB,
    fault_tolerance     NUMERIC(5, 4),
    created_at          TIMESTAMP   DEFAULT NOW() NOT NULL
);

create index idx_blocks_hash on blocks (block_hash);
create index idx_blocks_timestamp on blocks (timestamp desc);
create index idx_blocks_proposer on blocks (proposer);
create index idx_blocks_created_at on blocks (created_at desc);
create index IF NOT EXISTS idx_blocks_hash_partial ON blocks (block_hash varchar_pattern_ops);

-- Deployments table with enhanced fields
create TABLE IF NOT EXISTS deployments
(
    deploy_id                VARCHAR(200) PRIMARY KEY,
    block_hash               VARCHAR(64)               NOT NULL REFERENCES blocks (block_hash) ON delete CASCADE,
    block_number             BIGINT                    NOT NULL REFERENCES blocks (block_number) ON delete CASCADE,
    deployer                 VARCHAR(200)              NOT NULL,
    term                     TEXT                      NOT NULL,
    timestamp                BIGINT                    NOT NULL,
    sig                      VARCHAR(200)              NOT NULL,
    sig_algorithm            VARCHAR(20) DEFAULT 'secp256k1',
    phlo_price               BIGINT      DEFAULT 1,
    phlo_limit               BIGINT      DEFAULT 1000000,
    phlo_cost                BIGINT      DEFAULT 0,
    valid_after_block_number BIGINT,
    errored                  BOOLEAN     DEFAULT FALSE,
    error_message            TEXT,
    deployment_type          VARCHAR(50),
    seq_num                  INTEGER,
    shard_id                 VARCHAR(20),
    status                   VARCHAR(20) DEFAULT 'included',
    created_at               TIMESTAMP   DEFAULT NOW() NOT NULL
);

create index idx_deployments_block_hash on deployments (block_hash);
create index idx_deployments_block_number on deployments (block_number);
create index idx_deployments_deployer on deployments (deployer);
create index idx_deployments_timestamp on deployments (timestamp desc);
create index idx_deployments_errored on deployments (errored);
create index IF NOT EXISTS idx_deployments_status ON deployments (status);
create index IF NOT EXISTS idx_deployments_deploy_id_partial ON deployments (deploy_id varchar_pattern_ops);
create index IF NOT EXISTS idx_deployments_deployer_partial ON deployments (deployer varchar_pattern_ops);
create index IF NOT EXISTS idx_deployments_type ON deployments (deployment_type);

-- Transfers table with extended address fields
create TABLE IF NOT EXISTS transfers
(
    id              BIGSERIAL PRIMARY KEY,
    deploy_id       VARCHAR(200)               NOT NULL REFERENCES deployments (deploy_id) ON delete CASCADE,
    block_number    BIGINT                     NOT NULL REFERENCES blocks (block_number) ON delete CASCADE,
    from_address    VARCHAR(150)               NOT NULL,
    from_public_key VARCHAR(150) DEFAULT NULL,
    to_address      VARCHAR(150)               NOT NULL,
    amount_dust     BIGINT                     NOT NULL,
    amount_asi      NUMERIC(20, 8)             NOT NULL,
    status          VARCHAR(20)  DEFAULT 'success',
    timestamp       BIGINT                     NOT NULL,
    created_at      TIMESTAMP    DEFAULT NOW() NOT NULL
);

create index idx_transfers_deploy_id on transfers (deploy_id);
create index idx_transfers_block_number on transfers (block_number desc);
create index idx_transfers_from on transfers (from_address);
create index idx_transfers_to on transfers (to_address);
create index idx_transfers_created_at on transfers (created_at desc);
create index IF NOT EXISTS idx_transfers_from_address ON transfers (from_address);
create index IF NOT EXISTS idx_transfers_to_address ON transfers (to_address);

-- =============================================
-- VALIDATOR AND STAKING TABLES
-- =============================================

-- Validators table with extended name field for full public keys
create TABLE IF NOT EXISTS validators
(
    public_key       VARCHAR(200) PRIMARY KEY,
    name             VARCHAR(160), -- Extended to accommodate full public keys
    total_stake      BIGINT      DEFAULT 0,
    first_seen_block BIGINT,
    last_seen_block  BIGINT,
    status           VARCHAR(20) DEFAULT 'bonded',
    created_at       TIMESTAMP   DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMP   DEFAULT NOW() NOT NULL
);

create index IF NOT EXISTS idx_validators_status ON validators (status);

-- Validator bonds table (flexible foreign key constraint)
create TABLE IF NOT EXISTS validator_bonds
(
    id                   BIGSERIAL PRIMARY KEY,
    block_hash           VARCHAR(64)  NOT NULL REFERENCES blocks (block_hash) ON delete CASCADE,
    block_number         BIGINT       NOT NULL REFERENCES blocks (block_number) ON delete CASCADE,
    validator_public_key VARCHAR(200) NOT NULL,
    stake                BIGINT       NOT NULL,
    UNIQUE (block_hash, validator_public_key)
);

create index idx_validator_bonds_block_number on validator_bonds (block_number);
create index idx_validator_bonds_validator on validator_bonds (validator_public_key);

-- Block validators junction table for tracking validators per block
create TABLE IF NOT EXISTS block_validators
(
    block_hash           VARCHAR(64) REFERENCES blocks (block_hash) ON delete CASCADE,
    validator_public_key VARCHAR(200),
    PRIMARY KEY (block_hash, validator_public_key)
);

-- =============================================
-- BALANCE TRACKING TABLES
-- =============================================

-- Balance states table for tracking bonded vs unbonded balances
create TABLE IF NOT EXISTS balance_states
(
    id                    BIGSERIAL PRIMARY KEY,
    address               VARCHAR(150)   NOT NULL,
    block_number          BIGINT         NOT NULL REFERENCES blocks (block_number) ON delete CASCADE,
    unbonded_balance_dust BIGINT         NOT NULL DEFAULT 0,
    unbonded_balance_asi  NUMERIC(20, 8) NOT NULL DEFAULT 0,
    bonded_balance_dust   BIGINT         NOT NULL DEFAULT 0,
    bonded_balance_asi    NUMERIC(20, 8) NOT NULL DEFAULT 0,
    total_balance_dust    BIGINT GENERATED ALWAYS AS (unbonded_balance_dust + bonded_balance_dust) STORED,
    total_balance_asi     NUMERIC(20, 8) GENERATED ALWAYS AS (unbonded_balance_asi + bonded_balance_asi) STORED,
    updated_at            TIMESTAMP               DEFAULT NOW() NOT NULL,
    UNIQUE (address, block_number)
);

create index idx_balance_states_address on balance_states (address);
create index idx_balance_states_block on balance_states (block_number desc);
create index idx_balance_states_updated on balance_states (updated_at desc);

-- =============================================
-- NETWORK STATISTICS TABLES
-- =============================================

-- Epoch transitions table
create TABLE IF NOT EXISTS epoch_transitions
(
    id                BIGSERIAL PRIMARY KEY,
    epoch_number      BIGINT UNIQUE                       NOT NULL,
    start_block       BIGINT                              NOT NULL,
    end_block         BIGINT                              NOT NULL,
    active_validators INTEGER                             NOT NULL,
    quarantine_length INTEGER                             NOT NULL,
    timestamp         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

create index IF NOT EXISTS idx_epoch_transitions_epoch_number ON epoch_transitions (epoch_number);
create index IF NOT EXISTS idx_epoch_blocks ON epoch_transitions (start_block, end_block);

-- Network stats table
create TABLE IF NOT EXISTS network_stats
(
    id                       BIGSERIAL PRIMARY KEY,
    block_number             BIGINT                              NOT NULL,
    total_validators         INTEGER                             NOT NULL,
    active_validators        INTEGER                             NOT NULL,
    validators_in_quarantine INTEGER   DEFAULT 0,
    consensus_participation  NUMERIC(5, 2)                       NOT NULL,
    consensus_status         VARCHAR(20)                         NOT NULL,
    timestamp                TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

create index IF NOT EXISTS idx_network_stats_block_number ON network_stats (block_number);
create index IF NOT EXISTS idx_network_stats_timestamp ON network_stats (timestamp);

-- =============================================
-- INDEXER STATE TABLE
-- =============================================

-- Indexer state table
create TABLE IF NOT EXISTS indexer_state
(
    key        VARCHAR(50) PRIMARY KEY,
    value      TEXT                    NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert initial state
insert into indexer_state (key, value)
values ('last_indexed_block', '0'),
       ('indexer_version', '1.0.0'),
       ('schema_version', '000')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- Create a view for network statistics
create or replace view network_stats_view as
with block_times as (
    select block_number,
           timestamp,
           lag(timestamp) over (order by block_number asc) as prev_timestamp,
           proposer
    from blocks
    where block_number > 0
    order by block_number asc
    limit 100
)
select count(*) as total_blocks,
       avg(
               case
                   when prev_timestamp is not null
                       then (timestamp - prev_timestamp) / 1000.0
                   else null
                   end
       ) as avg_block_time_seconds,
       min(timestamp) as earliest_block_time,
       max(timestamp) as latest_block_time
from block_times;



-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Create function to update deployment count
create or replace function update_block_deployment_count()
    RETURNS trigger AS
$$
begin
    if TG_OP = 'INSERT' then
        update blocks
        set deployment_count = deployment_count + 1
        where block_hash = NEW.block_hash;
    elsif TG_OP = 'DELETE' then
        update blocks
        set deployment_count = deployment_count - 1
        where block_hash = OLD.block_hash;
    end if;
    return null;
end;
$$ LANGUAGE plpgsql;

-- Create trigger for deployment count
create trigger update_deployment_count
    after insert or delete
    on deployments
    for each row
EXECUTE function update_block_deployment_count();

-- Create function to notify on new blocks
create or replace function notify_new_block()
    RETURNS trigger AS
$$
begin
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
create trigger new_block_notify
    after insert
    on blocks
    for each row
EXECUTE function notify_new_block();

-- Create function to notify on new transfers
create or replace function notify_new_transfer()
    RETURNS trigger AS
$$
begin
    PERFORM pg_notify(
            'new_transfer',
            json_build_object(
                    'id', NEW.id,
                    'from_address', NEW.from_address,
                    'to_address', NEW.to_address,
                    'amount_asi', NEW.amount_asi,
                    'block_number', NEW.block_number
            )::text
            );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new transfer notifications
create trigger new_transfer_notify
    after insert
    on transfers
    for each row
EXECUTE function notify_new_transfer();

-- =============================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE blocks IS 'Core blockchain blocks with all enhanced fields for F1R3FLY/RChain';
COMMENT ON TABLE deployments IS 'Smart contract deployments with enhanced tracking and status';
COMMENT ON TABLE transfers IS 'ASI token transfers extracted from deployments';
COMMENT ON TABLE validators IS 'Network validators with extended name field for full public keys';
COMMENT ON TABLE validator_bonds IS 'Historical validator bonding states per block';
COMMENT ON TABLE balance_states IS 'Address balance tracking with bonded/unbonded separation';
COMMENT ON TABLE epoch_transitions IS 'Network epoch transitions and validator set changes';
COMMENT ON TABLE network_stats IS 'Network statistics captured at specific blocks';
COMMENT ON TABLE indexer_state IS 'Indexer operational state and configuration';

COMMENT ON COLUMN blocks.pre_state_hash IS 'Pre-state hash from enhanced block data';
COMMENT ON COLUMN blocks.justifications IS 'Full justifications data as JSONB';
COMMENT ON COLUMN blocks.fault_tolerance IS 'Fault tolerance metric for the block';
COMMENT ON COLUMN blocks.bonds_map IS 'Validator bonds map as JSONB';
COMMENT ON COLUMN deployments.status IS 'Deploy status: pending/included/error';
COMMENT ON COLUMN deployments.deployment_type IS 'Type classification for deployments';
COMMENT ON COLUMN validators.status IS 'Validator status: active/bonded/quarantine/inactive';
COMMENT ON COLUMN validators.name IS 'Validator name (can store full public key up to 160 chars)';
COMMENT ON COLUMN balance_states.total_balance_dust IS 'Auto-computed total balance in dust units';
COMMENT ON COLUMN balance_states.total_balance_asi IS 'Auto-computed total balance in ASI units';

--  for CSV reports
CREATE OR REPLACE VIEW public.tx_enriched_view AS
SELECT b.block_number ::bigint       AS block_number,
       b.block_hash ::varchar        AS block_hash,
       b.timestamp ::bigint          AS block_timestamp,
       b.proposer ::varchar          AS proposer,

       d.deploy_id ::varchar         AS deploy_id,
       d.deployer ::varchar          AS deployer,
       d.status ::varchar            AS deployment_status,
       d.deployment_type ::varchar   AS deployment_type,
       d.errored ::boolean           AS errored,
       d.phlo_price ::bigint         AS phlo_price,
       d.phlo_limit ::bigint         AS phlo_limit,
       d.phlo_cost ::bigint          AS phlo_cost,
       d.seq_num ::integer           AS seq_num,
       d.shard_id ::varchar          AS shard_id,

       t.id ::bigint                 AS transfer_id,
       t.from_address ::varchar      AS from_address,
       t.to_address ::varchar        AS to_address,
       t.amount_dust ::bigint        AS amount_dust,
       t.amount_asi ::numeric(20, 8) AS amount_asi,
       t.status ::varchar            AS transfer_status
FROM blocks b
         LEFT JOIN deployments d ON d.block_number = b.block_number
         LEFT JOIN transfers t ON t.deploy_id = d.deploy_id
LIMIT 0;

COMMENT ON VIEW public.tx_enriched_view IS
    'Schema holder for enriched tx rows (block + deployment + transfer). Used as a return type for Hasura-trackable functions.';

-- 2) Create the function that returns SETOF the VIEW type (trackable by Hasura).
CREATE OR REPLACE FUNCTION public.get_transactions_by_blocks(
    p_limit_blocks integer DEFAULT 5000, -- max number of blocks to include
    p_from_block bigint DEFAULT NULL, -- optional upper bound (inclusive)
    p_to_block bigint DEFAULT NULL -- optional lower bound (inclusive)
)
    RETURNS SETOF public.tx_enriched_view
    LANGUAGE sql
    STABLE
AS
$$
WITH block_scope AS (SELECT b.block_number, b.block_hash, b.timestamp, b.proposer
                     FROM blocks b
                     WHERE CASE
                               WHEN p_from_block IS NOT NULL AND p_to_block IS NOT NULL
                                   THEN b.block_number BETWEEN LEAST(p_from_block, p_to_block)
                                   AND GREATEST(p_from_block, p_to_block)
                               WHEN p_from_block IS NOT NULL
                                   THEN b.block_number <= p_from_block
                               WHEN p_to_block IS NOT NULL
                                   THEN b.block_number >= p_to_block
                               ELSE TRUE
                               END
                     ORDER BY b.block_number DESC
                     LIMIT COALESCE(p_limit_blocks, 5000))
SELECT bs.block_number,
       bs.block_hash,
       bs.timestamp AS block_timestamp,
       bs.proposer,

       d.deploy_id,
       d.deployer,
       d.status     AS deployment_status,
       d.deployment_type,
       d.errored,
       d.phlo_price,
       d.phlo_limit,
       d.phlo_cost,
       d.seq_num,
       d.shard_id,

       t.id         AS transfer_id,
       t.from_address,
       t.to_address,
       t.amount_dust,
       t.amount_asi,
       t.status     AS transfer_status
FROM block_scope bs
         LEFT JOIN deployments d ON d.block_number = bs.block_number
         LEFT JOIN transfers t ON t.deploy_id = d.deploy_id
ORDER BY bs.block_number DESC, d.seq_num NULLS LAST, t.id NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_transactions_by_blocks IS
    'Returns enriched transfer rows from up to N blocks. Returns SETOF a VIEW so Hasura can track it.';


-- =============================================
-- NETWORK PERFORMANCE METRICS (PRE-AGGREGATED)
-- =============================================

-- 1) Schema holder view for Hasura (composite type)
CREATE VIEW public.network_metrics_view AS
SELECT now()      AS bucket_start, -- timestamptz
       now()      AS bucket_end,   -- timestamptz
       0::numeric AS avg_block_time_seconds,
       0::numeric AS avg_tps,
       0::bigint  AS deployments_count,
       0::bigint  AS transfers_count
LIMIT 0;

COMMENT ON VIEW public.network_metrics_view IS
    'Schema holder for aggregated network performance metrics. Used by Hasura as the return type of get_network_metrics.';


-- 2) Pre-aggregated metrics table
CREATE TABLE IF NOT EXISTS public.network_metrics_buckets
(
    bucket_start       timestamptz PRIMARY KEY,
    bucket_end         timestamptz NOT NULL,
    avg_block_time_sec numeric,
    deployments_count  bigint      NOT NULL DEFAULT 0,
    transfers_count    bigint      NOT NULL DEFAULT 0
);

-- 3) Index to accelerate range queries
CREATE INDEX IF NOT EXISTS idx_network_metrics_buckets_range
    ON public.network_metrics_buckets (bucket_start, bucket_end);


-- 4) Hybrid get_network_metrics:
--    - if buckets exist -> read from network_metrics_buckets (FAST)
--    - else             -> compute from raw tables (SLOW, original logic)
CREATE OR REPLACE FUNCTION public.get_network_metrics(
    p_range_hours integer DEFAULT 24,
    p_divisions integer DEFAULT 7
)
    RETURNS SETOF public.network_metrics_view
    LANGUAGE plpgsql
    STABLE
AS
$$
DECLARE
    v_have_buckets boolean;
BEGIN
    -- Are there any pre-aggregated buckets at all?
    SELECT EXISTS (SELECT 1 FROM public.network_metrics_buckets)
    INTO v_have_buckets;

    IF v_have_buckets THEN
        ----------------------------------------------------------------
        -- FAST PATH: only by network_metrics_buckets
        -- range_end and window are calculated by max(bucket_end), not by blocks
        ----------------------------------------------------------------
        RETURN QUERY
            WITH data_bounds AS (SELECT max(bucket_end) AS max_ts
                                 FROM public.network_metrics_buckets),
                 params AS (SELECT COALESCE(max_ts, now())                                                          AS range_end,
                                   (p_range_hours || ' hours')::interval                                            AS range_window,
                                   ((p_range_hours * 3600)::double precision / p_divisions || ' seconds')::interval AS bucket_step
                            FROM data_bounds),
                 bucket_ranges AS (SELECT gs                                                          AS bucket_index,
                                          (p.range_end - p.range_window) + (gs * p.bucket_step)       AS bucket_start,
                                          (p.range_end - p.range_window) + ((gs + 1) * p.bucket_step) AS bucket_end
                                   FROM params p,
                                        generate_series(0, p_divisions - 1) AS gs),
                 raw AS (SELECT b.bucket_start,
                                b.bucket_end,
                                b.avg_block_time_sec,
                                b.deployments_count,
                                b.transfers_count
                         FROM public.network_metrics_buckets b,
                              params p
                         WHERE b.bucket_start >= p.range_end - p.range_window
                           AND b.bucket_end <= p.range_end),
                 agg AS (SELECT br.bucket_start,
                                br.bucket_end,
                                AVG(r.avg_block_time_sec)        AS avg_block_time_seconds,
                                SUM(r.deployments_count)::bigint AS deployments_count,
                                SUM(r.transfers_count)::bigint   AS transfers_count
                         FROM bucket_ranges br
                                  LEFT JOIN raw r
                                            ON r.bucket_start >= br.bucket_start
                                                AND r.bucket_end <= br.bucket_end
                         GROUP BY br.bucket_start, br.bucket_end)
            SELECT bucket_start,
                   bucket_end,
                   COALESCE(avg_block_time_seconds, 0)    AS avg_block_time_seconds,
                   COALESCE(deployments_count, 0::bigint)
                       / GREATEST(EXTRACT(EPOCH FROM (bucket_end - bucket_start)), 1)
                                                          AS avg_tps,
                   COALESCE(deployments_count, 0::bigint) AS deployments_count,
                   COALESCE(transfers_count, 0::bigint)   AS transfers_count
            FROM agg
            ORDER BY bucket_start;

    ELSE
        ----------------------------------------------------------------
        -- SLOW PATH: the old "ideal" implementation of raw tables
        ----------------------------------------------------------------
        RETURN QUERY
            WITH data_bounds AS (SELECT GREATEST(
                                                COALESCE((SELECT max(to_timestamp(timestamp / 1000.0)) FROM blocks),
                                                         '-infinity'::timestamptz),
                                                COALESCE(
                                                        (SELECT max(to_timestamp(timestamp / 1000.0)) FROM deployments),
                                                        '-infinity'::timestamptz),
                                                COALESCE((SELECT max(to_timestamp(timestamp / 1000.0)) FROM transfers),
                                                         '-infinity'::timestamptz)
                                        ) AS max_ts),
                 params AS (SELECT COALESCE(max_ts + interval '1 second', now())                                    AS range_end,
                                   (p_range_hours || ' hours')::interval                                            AS range_window,
                                   ((p_range_hours * 3600)::double precision / p_divisions || ' seconds')::interval AS bucket_step
                            FROM data_bounds),
                 bucket_ranges AS (SELECT gs                                                          AS bucket_index,
                                          (p.range_end - p.range_window) + (gs * p.bucket_step)       AS bucket_start,
                                          (p.range_end - p.range_window) + ((gs + 1) * p.bucket_step) AS bucket_end
                                   FROM params p,
                                        generate_series(0, p_divisions - 1) AS gs),
                 block_times AS (SELECT b.block_number,
                                        (b.timestamp - LAG(b.timestamp) OVER (ORDER BY b.timestamp)) / 1000.0 AS block_time_sec,
                                        to_timestamp(b.timestamp / 1000.0)                                    AS ts
                                 FROM blocks b),
                 block_agg AS (SELECT br.bucket_start,
                                      AVG(bt.block_time_sec) AS avg_block_time_sec
                               FROM bucket_ranges br
                                        LEFT JOIN block_times bt
                                                  ON bt.ts >= br.bucket_start
                                                      AND bt.ts < br.bucket_end
                               GROUP BY br.bucket_start),
                 deployments_agg AS (SELECT br.bucket_start,
                                            COUNT(d.deploy_id) AS deployments_count
                                     FROM bucket_ranges br
                                              LEFT JOIN deployments d
                                                        ON to_timestamp(d.timestamp / 1000.0) >= br.bucket_start
                                                            AND to_timestamp(d.timestamp / 1000.0) < br.bucket_end
                                     GROUP BY br.bucket_start),
                 transfers_agg AS (SELECT br.bucket_start,
                                          COUNT(t.id) AS transfers_count
                                   FROM bucket_ranges br
                                            LEFT JOIN transfers t
                                                      ON to_timestamp(t.timestamp / 1000.0) >= br.bucket_start
                                                          AND to_timestamp(t.timestamp / 1000.0) < br.bucket_end
                                   GROUP BY br.bucket_start)
            SELECT br.bucket_start,
                   br.bucket_end,
                   COALESCE(ba.avg_block_time_sec, 0) AS avg_block_time_seconds,
                   COALESCE(d.deployments_count, 0)
                       / GREATEST(EXTRACT(EPOCH FROM (br.bucket_end - br.bucket_start)), 1)
                                                      AS avg_tps,
                   COALESCE(d.deployments_count, 0)   AS deployments_count,
                   COALESCE(t.transfers_count, 0)     AS transfers_count
            FROM bucket_ranges br
                     LEFT JOIN block_agg ba ON ba.bucket_start = br.bucket_start
                     LEFT JOIN deployments_agg d ON d.bucket_start = br.bucket_start
                     LEFT JOIN transfers_agg t ON t.bucket_start = br.bucket_start
            ORDER BY br.bucket_start;
    END IF;
END;
$$;


COMMENT ON FUNCTION public.get_network_metrics IS
    'Hybrid implementation: uses pre-aggregated network_metrics_buckets when available, falls back to raw aggregation (blocks/deployments/transfers) otherwise.';

-- =============================================
-- CRON-FRIENDLY REFRESH FOR PRE-AGGREGATED METRICS
-- =============================================
CREATE OR REPLACE FUNCTION public.refresh_network_metrics_buckets(
    p_lookback_hours integer DEFAULT 720, -- how much history we keep in buckets (30 days by default)
    p_bucket_seconds integer DEFAULT 600 -- the size of one bucket in seconds (10 minutes by default)
)
    RETURNS void
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_max_ts      timestamptz;
    v_range_end   timestamptz;
    v_range_start timestamptz;
BEGIN
    -- 1) We find the maximum time for blocks/deployments/transfers
    SELECT GREATEST(
                   COALESCE((SELECT max(to_timestamp(timestamp / 1000.0)) FROM blocks),
                            '-infinity'::timestamptz),
                   COALESCE((SELECT max(to_timestamp(timestamp / 1000.0)) FROM deployments),
                            '-infinity'::timestamptz),
                   COALESCE((SELECT max(to_timestamp(timestamp / 1000.0)) FROM transfers),
                            '-infinity'::timestamptz)
           )
    INTO v_max_ts;

    -- If there is no data at all, we exit
    IF v_max_ts IS NULL OR v_max_ts = '-infinity'::timestamptz THEN
        RETURN;
    END IF;

    -- range_end as in the old function: max_ts + 1 sec
    v_range_end := v_max_ts + interval '1 second';
    v_range_start := v_range_end - (p_lookback_hours || ' hours')::interval;

    -- 2) Do not count the old buckets:
    -- we start from the end of the ones that have already been counted in order to count only the "tail".
    SELECT GREATEST(
                   v_range_start,
                   COALESCE(max(bucket_end), v_range_start)
           )
    INTO v_range_start
    FROM public.network_metrics_buckets
    WHERE bucket_end > v_range_start;

    -- If you have caught up with range_end, there is nothing to do.
    IF v_range_start >= v_range_end THEN
        RETURN;
    END IF;

    WITH
        -- 3) Generate new buckets from v_range_start to v_range_end
        bucket_ranges AS (SELECT gs                                                            AS bucket_index,
                                 v_range_start
                                     + (gs * (p_bucket_seconds || ' seconds')::interval)       AS bucket_start,
                                 v_range_start
                                     + ((gs + 1) * (p_bucket_seconds || ' seconds')::interval) AS bucket_end
                          FROM generate_series(
                                       0,
                                       FLOOR(EXTRACT(EPOCH FROM (v_range_end - v_range_start))
                                           / p_bucket_seconds
                                       )::int
                               ) AS gs),

        -- 4) We count block_time_sec once for the range
        block_times AS (SELECT b.block_number,
                               (b.timestamp - LAG(b.timestamp) OVER (ORDER BY b.timestamp)) / 1000.0 AS block_time_sec,
                               to_timestamp(b.timestamp / 1000.0)                                    AS ts
                        FROM blocks b
                        WHERE to_timestamp(b.timestamp / 1000.0) >= v_range_start
                          AND to_timestamp(b.timestamp / 1000.0) < v_range_end),

        block_agg AS (SELECT br.bucket_start,
                             br.bucket_end,
                             AVG(bt.block_time_sec) AS avg_block_time_sec
                      FROM bucket_ranges br
                               LEFT JOIN block_times bt
                                         ON bt.ts >= br.bucket_start
                                             AND bt.ts < br.bucket_end
                      GROUP BY br.bucket_start, br.bucket_end),

        deployments_agg AS (SELECT br.bucket_start,
                                   br.bucket_end,
                                   COUNT(d.deploy_id) AS deployments_count
                            FROM bucket_ranges br
                                     LEFT JOIN deployments d
                                               ON to_timestamp(d.timestamp / 1000.0) >= br.bucket_start
                                                   AND to_timestamp(d.timestamp / 1000.0) < br.bucket_end
                            GROUP BY br.bucket_start, br.bucket_end),

        transfers_agg AS (SELECT br.bucket_start,
                                 br.bucket_end,
                                 COUNT(t.id) AS transfers_count
                          FROM bucket_ranges br
                                   LEFT JOIN transfers t
                                             ON to_timestamp(t.timestamp / 1000.0) >= br.bucket_start
                                                 AND to_timestamp(t.timestamp / 1000.0) < br.bucket_end
                          GROUP BY br.bucket_start, br.bucket_end)

    -- 5) UPSERT in pre-aggregated table
    INSERT
    INTO public.network_metrics_buckets AS b (bucket_start,
                                              bucket_end,
                                              avg_block_time_sec,
                                              deployments_count,
                                              transfers_count)
    SELECT br.bucket_start,
           br.bucket_end,
           ba.avg_block_time_sec,
           COALESCE(da.deployments_count, 0) AS deployments_count,
           COALESCE(ta.transfers_count, 0)   AS transfers_count
    FROM bucket_ranges br
             LEFT JOIN block_agg ba ON ba.bucket_start = br.bucket_start AND ba.bucket_end = br.bucket_end
             LEFT JOIN deployments_agg da ON da.bucket_start = br.bucket_start AND da.bucket_end = br.bucket_end
             LEFT JOIN transfers_agg ta ON ta.bucket_start = br.bucket_start AND ta.bucket_end = br.bucket_end
    ON CONFLICT (bucket_start) DO UPDATE
        SET bucket_end         = EXCLUDED.bucket_end,
            avg_block_time_sec = EXCLUDED.avg_block_time_sec,
            deployments_count  = EXCLUDED.deployments_count,
            transfers_count    = EXCLUDED.transfers_count;
END;
$$;

COMMENT ON FUNCTION public.refresh_network_metrics_buckets IS
    'Incrementally fills/updates network_metrics_buckets for the last N hours with fixed bucket size.';
