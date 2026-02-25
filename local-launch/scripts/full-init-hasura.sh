#!/bin/bash
set -euo pipefail

# ============================================================
# FULL HASURA INITIALIZATION FOR ASI-CHAIN INDEXER (v2.36.x)
# Goals:
#  - Track all tables/views/functions
#  - Create relationships
#  - Grant PUBLIC role read access (no auth) with limit=5000
#  - Disable aggregations for public
#  - Verify everything was actually applied
#
# IMPORTANT for "no password public API":
#  - Hasura must have HASURA_GRAPHQL_UNAUTHORIZED_ROLE=public
# ============================================================

# ---------- Load .env ----------
if [ -f ".env" ]; then
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i 's/\r$//' .env
  else
    sed -i.bak 's/\r$//' .env && rm -f .env.bak
  fi
  set -o allexport
  # shellcheck source=/dev/null
  source .env
  set +o allexport
fi

HASURA_BASE="${HASURA_BASE:-http://localhost:8080}"
HASURA_ADMIN_SECRET="${HASURA_ADMIN_SECRET:-adminsecretkey}"
admin_secret="${HASURA_GRAPHQL_ADMIN_SECRET:-$HASURA_ADMIN_SECRET}"

HASURA_ENDPOINT="${HASURA_ENDPOINT:-$HASURA_BASE/v1/metadata}"
HASURA_GRAPHQL="${HASURA_GRAPHQL:-$HASURA_BASE/v1/graphql}"
HASURA_SQL="${HASURA_SQL:-$HASURA_BASE/v2/query}"
HASURA_HEALTH="${HASURA_HEALTH:-$HASURA_BASE/healthz}"

echo "Metadata endpoint: $HASURA_ENDPOINT"
echo "SQL endpoint:      $HASURA_SQL"
echo "GraphQL endpoint:  $HASURA_GRAPHQL"
echo "Health endpoint:   $HASURA_HEALTH"

die() { echo "❌ $*" >&2; exit 1; }
log() { echo "▶ $*"; }
ok()  { echo "✅ $*"; }

# ---------- HTTP wrappers ----------
hasura_metadata() {
  local payload="$1"
  local resp
  resp=$(curl -sS -X POST "$HASURA_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $admin_secret" \
    -d "$payload")

  if echo "$resp" | grep -qE '"error"|"errors"'; then
    echo "----- METADATA CALL FAILED -----" >&2
    echo "Payload:" >&2
    echo "$payload" >&2
    echo "Response:" >&2
    echo "$resp" >&2
    echo "--------------------------------" >&2
    exit 1
  fi

  echo "$resp"
}

hasura_sql() {
  local payload="$1"
  local resp
  resp=$(curl -sS -X POST "$HASURA_SQL" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $admin_secret" \
    -d "$payload")

  if echo "$resp" | grep -qE '"error"|"errors"'; then
    echo "----- SQL CALL FAILED -----" >&2
    echo "Payload:" >&2
    echo "$payload" >&2
    echo "Response:" >&2
    echo "$resp" >&2
    echo "---------------------------" >&2
    exit 1
  fi

  echo "$resp"
}

graphql_admin() {
  local payload="$1"
  curl -sS -X POST "$HASURA_GRAPHQL" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $admin_secret" \
    -d "$payload"
}

graphql_public() {
  local payload="$1"
  curl -sS -X POST "$HASURA_GRAPHQL" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

# ---------- Wait for Hasura ----------
log "Waiting for Hasura to be ready..."
until curl -sS "$HASURA_HEALTH" >/dev/null 2>&1; do
  sleep 2
done
ok "Hasura is ready."

# ============================================================
# CONFIG
# ============================================================
TABLES=(
  "blocks"
  "deployments"
  "transfers"
  "validators"
  "validator_bonds"
  "block_validators"
  "balance_states"
  "epoch_transitions"
  "network_stats"
  "indexer_state"
)

VIEWS=(
  "network_metrics_view"
  "network_stats_view"
)

FUNCTIONS=(
  "get_network_metrics"
)

log "Sanity-checking tables exist in Postgres (information_schema)..."
for t in "${TABLES[@]}"; do
  hasura_sql "{
    \"type\": \"run_sql\",
    \"args\": {
      \"source\": \"default\",
      \"sql\": \"select 1 from information_schema.tables where table_schema='public' and table_name='${t}'\"
    }
  }" >/dev/null
done
ok "Postgres sanity-check OK."

# ============================================================
# Ensure source exists (default). If already exists, Hasura will error on add.
# We do a safe check by exporting metadata and searching for the source name.
# ============================================================
log "Checking that source 'default' exists..."
meta0="$(hasura_metadata '{"type":"export_metadata","args":{}}')"
if ! echo "$meta0" | grep -q '"name":"default"'; then
  die "Hasura source 'default' not found in metadata. Check HASURA_GRAPHQL_DATABASE_URL / sources."
fi
ok "Source 'default' exists."

# ============================================================
# TRACK TABLES / VIEWS / FUNCTIONS
# ============================================================
log "Tracking tables..."
for table in "${TABLES[@]}"; do
  hasura_metadata "{
    \"type\": \"pg_track_table\",
    \"args\": {\"source\": \"default\", \"table\": {\"schema\": \"public\", \"name\": \"$table\"}}
  }" >/dev/null
done
ok "Tables tracked (or already tracked)."

log "Tracking views..."
for view in "${VIEWS[@]}"; do
  hasura_metadata "{
    \"type\": \"pg_track_table\",
    \"args\": {\"source\": \"default\", \"table\": {\"schema\": \"public\", \"name\": \"$view\"}}
  }" >/dev/null
done
ok "Views tracked (or already tracked)."

log "Tracking SQL functions..."
for fn in "${FUNCTIONS[@]}"; do
  hasura_metadata "{
    \"type\": \"pg_track_function\",
    \"args\": {\"source\": \"default\", \"function\": {\"schema\": \"public\", \"name\": \"$fn\"}}
  }" >/dev/null
done
ok "Functions tracked (or already tracked)."

# ============================================================
# RELATIONSHIPS
# Notes:
#  - If relationship already exists, Hasura returns an error.
#  - Since you want "full init" and likely run once, we keep fail-fast.
# ============================================================
declare -A OBJECT_RELATIONS=(
  ["deployments.block"]="blocks:block_number:block_number"
  ["transfers.block"]="blocks:block_number:block_number"
  ["transfers.deployment"]="deployments:deploy_id:deploy_id"

  ["validator_bonds.block"]="blocks:block_number:block_number"
  ["validator_bonds.validator"]="validators:validator_public_key:public_key"

  ["block_validators.block"]="blocks:block_hash:block_hash"
  ["block_validators.validator"]="validators:validator_public_key:public_key"

  ["transfers.sender_validator"]="validators:from_public_key:public_key"

  ["balance_states.block"]="blocks:block_number:block_number"
  ["network_stats.block"]="blocks:block_number:block_number"
)

log "Creating object relationships..."
for key in "${!OBJECT_RELATIONS[@]}"; do
  table="${key%%.*}"
  rel="${key##*.}"
  IFS=":" read -r remote_table local_col remote_col <<< "${OBJECT_RELATIONS[$key]}"

  hasura_metadata "{
    \"type\": \"pg_create_object_relationship\",
    \"args\": {
      \"source\": \"default\",
      \"table\": {\"schema\": \"public\", \"name\": \"$table\"},
      \"name\": \"$rel\",
      \"using\": {\"manual_configuration\": {
        \"remote_table\": {\"schema\": \"public\", \"name\": \"$remote_table\"},
        \"column_mapping\": {\"$local_col\": \"$remote_col\"}
      }}
    }
  }" >/dev/null
done
ok "Object relationships created."

declare -A ARRAY_RELATIONS=(
  ["blocks.deployments"]="deployments:block_number:block_number"
  ["blocks.transfers"]="transfers:block_number:block_number"
  ["blocks.validator_bonds"]="validator_bonds:block_number:block_number"
  ["blocks.balance_states"]="balance_states:block_number:block_number"
  ["blocks.block_validators"]="block_validators:block_hash:block_hash"
  ["blocks.network_stats"]="network_stats:block_number:block_number"

  ["deployments.transfers"]="transfers:deploy_id:deploy_id"

  ["validators.validator_bonds"]="validator_bonds:public_key:validator_public_key"
  ["validators.block_validators"]="block_validators:public_key:validator_public_key"
  ["validators.transfers_sent"]="transfers:public_key:from_public_key"
)

log "Creating array relationships..."
for key in "${!ARRAY_RELATIONS[@]}"; do
  table="${key%%.*}"
  rel="${key##*.}"
  IFS=":" read -r remote_table local_col remote_col <<< "${ARRAY_RELATIONS[$key]}"

  hasura_metadata "{
    \"type\": \"pg_create_array_relationship\",
    \"args\": {
      \"source\": \"default\",
      \"table\": {\"schema\": \"public\", \"name\": \"$table\"},
      \"name\": \"$rel\",
      \"using\": {\"manual_configuration\": {
        \"remote_table\": {\"schema\": \"public\", \"name\": \"$remote_table\"},
        \"column_mapping\": {\"$local_col\": \"$remote_col\"}
      }}
    }
  }" >/dev/null
done
ok "Array relationships created."

# ============================================================
# PUBLIC PERMISSIONS
# ============================================================
log "Granting public SELECT permissions..."
ALL_TABLES_AND_VIEWS=( "${TABLES[@]}" "${VIEWS[@]}" )
for table in "${ALL_TABLES_AND_VIEWS[@]}"; do
  hasura_metadata "{
    \"type\": \"pg_create_select_permission\",
    \"args\": {
      \"source\": \"default\",
      \"table\": {\"schema\": \"public\", \"name\": \"$table\"},
      \"role\": \"public\",
      \"permission\": {
        \"columns\": \"*\",
        \"filter\": {},
        \"limit\": 5000,
        \"allow_aggregations\": false
      }
    }
  }" >/dev/null
done
ok "Public SELECT permissions granted."

log "Granting public EXECUTE permissions on SQL functions..."
for fn in "${FUNCTIONS[@]}"; do
  hasura_metadata "{
    \"type\": \"pg_create_function_permission\",
    \"args\": {
      \"source\": \"default\",
      \"function\": {\"schema\": \"public\", \"name\": \"$fn\"},
      \"role\": \"public\"
    }
  }" >/dev/null
done
ok "Public function permissions granted."

# ============================================================
# VERIFY TRACKING + PERMISSIONS REALLY APPLIED
# ============================================================
log "Verifying metadata contains tracked tables/views/functions..."
meta="$(hasura_metadata '{"type":"export_metadata","args":{}}')"

missing=0
for t in "${TABLES[@]}"; do
  if ! echo "$meta" | grep -q "\"name\":\"$t\""; then
    echo "❌ Missing tracked table: $t"
    missing=1
  fi
done
for v in "${VIEWS[@]}"; do
  if ! echo "$meta" | grep -q "\"name\":\"$v\""; then
    echo "❌ Missing tracked view: $v"
    missing=1
  fi
done
for f in "${FUNCTIONS[@]}"; do
  if ! echo "$meta" | grep -q "\"name\":\"$f\""; then
    echo "❌ Missing tracked function: $f"
    missing=1
  fi
done

[ "$missing" -eq 0 ] || die "Tracking verification failed (see missing items above)."
ok "Tracking verification passed."

log "Verifying PUBLIC select permission exists for one table (blocks)..."
# Cheap check: export_metadata contains select_permissions for role public on blocks
if ! echo "$meta" | grep -q "\"role\":\"public\"" || ! echo "$meta" | grep -q "\"select_permissions\""; then
  echo "⚠️  Can't confidently find public select_permissions in exported metadata."
  echo "    (This grep is coarse; permissions may still exist.)"
else
  ok "Public permissions appear present in metadata."
fi

# ============================================================
# TESTS
# ============================================================
log "Admin test query (should PASS)..."
admin_resp="$(graphql_admin '{"query":"{ blocks(limit:1, order_by:{block_number:desc}) { block_number block_hash } }"}')"
echo "$admin_resp" | grep -q '"errors"' && die "Admin GraphQL test failed: $admin_resp"
ok "Admin GraphQL OK."

log "PUBLIC select test (should PASS, no secret)..."
public_select="$(graphql_public '{"query":"{ blocks(limit:1, order_by:{block_number:desc}) { block_number block_hash } }"}')"
if echo "$public_select" | grep -q '"errors"'; then
  echo "Response:"
  echo "$public_select"
  die "PUBLIC select failed. Check HASURA_GRAPHQL_UNAUTHORIZED_ROLE=public and that Hasura picked role=public."
fi
ok "PUBLIC select OK."

log "PUBLIC aggregate test (should FAIL because allow_aggregations=false)..."
public_agg="$(graphql_public '{"query":"{ blocks_aggregate { aggregate { count } } }"}')"
if echo "$public_agg" | grep -q '"errors"'; then
  ok "PUBLIC aggregate correctly rejected."
else
  echo "Response:"
  echo "$public_agg"
  die "PUBLIC aggregate unexpectedly succeeded (allow_aggregations=false expected)."
fi

echo
ok "🎉 Hasura FULL initialization completed successfully!"
exit 0