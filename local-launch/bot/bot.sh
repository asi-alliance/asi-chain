#!/bin/bash
set -o pipefail
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

IFS=',' read -ra ports <<< "${VALIDATOR_PORTS}"
IFS=',' read -ra hosts <<< "${VALIDATOR_HOSTS}"
IFS=',' read -ra nodes <<< "${VALIDATOR_NODES}"
DELAY_AFTER_DEPLOY="${DELAY_AFTER_DEPLOY}"
DELAY_AFTER_PROPOSE="${DELAY_AFTER_PROPOSE}"
private_key="${PRIVATE_KEY}"

echo "======== Deployer-bot: Configuration ========="
echo "Ports: ${ports[@]}"
echo "Hosts: ${hosts[@]}"
echo "Nodes: ${nodes[@]}"
echo "Private key: ${private_key}"
echo "Delay after deploy: ${DELAY_AFTER_DEPLOY} seconds"
echo "Delay after propose: ${DELAY_AFTER_PROPOSE} seconds"
echo "=============================================="


mkdir -p logs
LOGFILE="logs/bot_report_$(date +%F_%H-%M).log"
echo "[$(date +"%Y-%m-%d %H:%M:%S")] Awaiting ASI:Chain to be ready to create blocks..."
echo "[$(date +"%Y-%m-%d %H:%M:%S")] Bot started... in 260 seconds"
# Custom delay (only for this implementation) to await ASI:Chain to be ready for local launch
sleep 260
echo "[$(date +"%Y-%m-%d %H:%M:%S")] Logs streaming to $LOGFILE"
echo ""
while true; do
  for i in "${!nodes[@]}"; do
    host="${hosts[$i]}"
    port="${ports[$i]}"
    node="${nodes[$i]}"
    echo "=========================================================="
    echo "Working with $node: (node: $i, host: $host, port: $port)"
    echo "=========================================================="
    # ----------------- DEPLOY ———————————————— #
    deploy_out=$(cargo run -- deploy -f ./rho_examples/stdout.rho --private-key $private_key -H $host --grpc-port $port 2>&1)
    deploy_status=$?
    printf '%s' "$deploy_out" | tee -a "$LOGFILE"
    [[ $deploy_out == *$'\n' ]] || printf '\n' | tee -a "$LOGFILE"
    if [ $deploy_status -eq 0 ]; then
      echo -e "[$(date +"%Y-%m-%d %H:%M:%S")] ${GREEN}[SUCCESS] deploy on $node${NC}" | tee -a "$LOGFILE"
    else
      echo -e "[$(date +"%Y-%m-%d %H:%M:%S")] ${RED}[ERROR] deploy on $node${NC}"  | tee -a "$LOGFILE"
    fi
    echo
    echo | tee -a "$LOGFILE"
    sleep $DELAY_AFTER_DEPLOY
    # ----------------- PROPOSE ———————————————— #
    propose_out=$(cargo run -- propose --private-key $private_key -H $host --grpc-port $port 2>&1)
    propose_status=$?
    printf '%s' "$propose_out" | tee -a "$LOGFILE"
    [[ $propose_out == *$'\n' ]] || printf '\n' | tee -a "$LOGFILE"
    if [ $propose_status -eq 0 ]; then
      echo -e "[$(date +"%Y-%m-%d %H:%M:%S")] ${GREEN}[SUCCESS] propose on $node${NC}" | tee -a "$LOGFILE"
    else
      echo -e "[$(date +"%Y-%m-%d %H:%M:%S")] ${RED}[ERROR] propose on $node${NC}"  | tee -a "$LOGFILE"
    fi
    echo
    echo | tee -a "$LOGFILE"
    sleep $DELAY_AFTER_PROPOSE
  done
  echo "========================================="
  echo "Cycle end. Starting new..."
  echo "========================================="
  echo ""
done
