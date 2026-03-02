#!/bin/bash
set -e

COMPOSE_FILE="asi-local-launch.yml"
INDEXER_DELAY=290
CLEAN_DEPLOY=false

# --- Parse arguments ---
for arg in "$@"; do
  case $arg in
    --clean)
      CLEAN_DEPLOY=true
      shift
      ;;
  esac
done

# --- Optional clean deploy ---
if [ "$CLEAN_DEPLOY" = true ]; then
  echo "[WARNING]  Performing CLEAN deploy: stopping containers, removing volumes and images..."
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans || true

  echo "[INFO] Removing local images related to the project..."
  images=$(docker images --format "{{.Repository}}" | grep -E "indexer|hasura|postgres|asi-chain|asi-launch|explorer" || true)
  if [ -n "$images" ]; then
    echo "$images" | xargs docker rmi -f 2>/dev/null || true
  else
    echo "No project-related images found to remove."
  fi

  echo "[SUCCESS] Clean environment ready for fresh build."
  echo
fi

# --- Load .env if exists ---
if [ -f ".env" ]; then
  # Strip CR (cross-platform)
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

# --- Required environment variables ---
REQUIRED_VARS=(NODE_HOST HTTP_PORT GRPC_PORT HASURA_BASE HASURA_ADMIN_SECRET)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "[ERROR] Environment variable $var is not set or empty in .env"
    exit 1
  fi
done

echo "[SUCCESS] All required environment variables loaded from .env:"
for var in "${REQUIRED_VARS[@]}"; do
  echo "   • $var=${!var}"
done

echo ""
echo "=== Phase 1: Chain, postgres, hasura, bot, faucet, wallet (without indexer) ==="
docker compose -f "$COMPOSE_FILE" up -d --build

echo "--- Waiting for core containers to be up ---"

timeout=120
interval=4
elapsed=0

# Services started in phase 1 (without delayed profile)
CORE_SERVICES="bootstrap validator1 validator2 validator3 postgres hasura deployer-bot"

while true; do
  all_ready=true

  for svc in $CORE_SERVICES; do
    line=$(docker compose -f "$COMPOSE_FILE" ps "$svc" 2>/dev/null | awk 'NR==2')
    if [ -z "$line" ]; then
      all_ready=false
      continue
    fi
    if echo "$line" | grep -qE "Up|Exit 0"; then
      continue
    fi
    all_ready=false
  done

  if [ "$all_ready" = true ]; then
    echo "[SUCCESS] Core services are up (Up/Exit 0)"
    break
  fi

  elapsed=$((elapsed + interval))
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "[WARNING] Timeout waiting for services (>${timeout}s)"
    docker compose -f "$COMPOSE_FILE" ps
    break
  fi

  echo "Waiting for containers... (${elapsed}s)"
  sleep "$interval"
done

echo ""
echo "⏳ Waiting ${INDEXER_DELAY} seconds before starting indexer (validators need time to produce blocks)..."
for i in $(seq $INDEXER_DELAY -10 10); do
  echo "   ${i}s remaining..."
  sleep 10
done
sleep $((INDEXER_DELAY % 10))
echo "[OK] Delay complete."
echo ""

echo "=== Phase 2: Indexer + Explorer (delayed start) ==="
docker compose -f "$COMPOSE_FILE" --profile delayed up -d --build

echo "--- Waiting for indexer to be up ---"
sleep 15
if docker compose -f "$COMPOSE_FILE" ps indexer 2>/dev/null | grep -q "Up"; then
  echo "[SUCCESS] Indexer is running"
else
  echo "[WARNING] Indexer may still be starting. Check: docker compose -f $COMPOSE_FILE ps"
fi

echo ""
echo "--- Running Hasura configuration script ---"
if [ -f "./scripts/full-init-hasura.sh" ]; then
  chmod +x ./scripts/full-init-hasura.sh
  ./scripts/full-init-hasura.sh
else
  echo "[WARNING] ./scripts/full-init-hasura.sh not found, skipping."
fi

echo ""
echo "--- Running basic Hasura tests (PUBLIC) ---"

HASURA_BASE="${HASURA_BASE:-http://localhost:8080}"
HASURA_URL="${HASURA_URL:-$HASURA_BASE/v1/graphql}"

echo "Checking Hasura availability at $HASURA_URL..."
status_code=$(curl -s -o /dev/null -w "%{http_code}" "$HASURA_URL" 2>/dev/null || echo "000")

if echo "$status_code" | grep -qE "200|400"; then
  echo "[SUCCESS] Hasura endpoint reachable! (HTTP $status_code)"
else
  echo "[WARNING] Hasura not responding at $HASURA_URL (HTTP $status_code)"
  echo "--- Done (skipping tests) ---"
  exit 0
fi

# ------------------------------------------------------------
# PUBLIC select should PASS
# ------------------------------------------------------------
PUBLIC_SELECT_QUERY='{"query":"{ blocks(limit:1, order_by:{block_number:desc}) { block_number block_hash } }"}'

echo "▶ PUBLIC SELECT test (should PASS, no admin secret)..."
select_resp=$(curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -d "$PUBLIC_SELECT_QUERY")

if echo "$select_resp" | grep -q '"errors"'; then
  echo "[ERROR] PUBLIC SELECT failed (expected success). Response:"
  echo "$select_resp"
  exit 1
fi

echo "[SUCCESS] PUBLIC SELECT passed."
command -v jq >/dev/null 2>&1 && echo "$select_resp" | jq . || echo "$select_resp"

# ------------------------------------------------------------
# PUBLIC aggregate should FAIL (because allow_aggregations=false)
# ------------------------------------------------------------
PUBLIC_AGG_QUERY='{"query":"{ blocks_aggregate { aggregate { count } } }"}'

echo "▶ PUBLIC AGGREGATE test (should FAIL, allow_aggregations=false)..."
agg_resp=$(curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -d "$PUBLIC_AGG_QUERY")

if echo "$agg_resp" | grep -q '"errors"'; then
  echo "[SUCCESS] PUBLIC AGGREGATE correctly rejected."
  command -v jq >/dev/null 2>&1 && echo "$agg_resp" | jq . || echo "$agg_resp"
else
  echo "[ERROR] PUBLIC AGGREGATE unexpectedly succeeded (expected errors). Response:"
  echo "$agg_resp"
  exit 1
fi

echo ""
echo "--- Done! Full stack is running. ---"
echo "  Faucet:    http://localhost:3001/"
echo "  Wallet:    http://localhost:8000/"
echo "  Explorer:  http://localhost:4001/"
echo "  Hasura:    $HASURA_BASE/"
