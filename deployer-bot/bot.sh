#!/bin/bash
set -o pipefail
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

DELAY_AFTER_DEPLOY=2
DELAY_AFTER_PROPOSE=3

ports=("<validator1_port>" "<validator2_port>" "<validator3_port>")
hosts=("validator1_host" "validator2_host" "validator3_host")
nodes=("validator1" "validator2" "validator3")

private_key="<private_key>"

mkdir -p logs
LOGFILE="logs/bot_report_$(date +%F_%H-%M).log"


echo "Bot started..."
echo "Logs streaming to $LOGFILE"
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
    deploy_out=$(cargo run -- deploy -f ./rho_examples/stdout.rho --private-key $private_key -H $host -p $port 2>&1)
    deploy_status=$?

    printf '%s' "$deploy_out" | tee -a "$LOGFILE"
    [[ $deploy_out == *$'\n' ]] || printf '\n' | tee -a "$LOGFILE"

    if [ $deploy_status -eq 0 ]; then
      echo -e "${GREEN}[SUCCESS] deploy on $node${NC}" | tee -a "$LOGFILE"
    else
      echo -e "${RED}[ERROR] deploy on $node${NC}"  | tee -a "$LOGFILE"
    fi

    echo
    echo | tee -a "$LOGFILE"

    sleep $DELAY_AFTER_DEPLOY

    # ----------------- PROPOSE ———————————————— #

    propose_out=$(cargo run -- propose --private-key $private_key -H $host -p $port 2>&1)
    propose_status=$?

    printf '%s' "$propose_out" | tee -a "$LOGFILE"
    [[ $propose_out == *$'\n' ]] || printf '\n' | tee -a "$LOGFILE"

    if [ $propose_status -eq 0 ]; then
      echo -e "${GREEN}[SUCCESS] propose on $node${NC}" | tee -a "$LOGFILE"
    else
      echo -e "${RED}[ERROR] propose on $node${NC}"  | tee -a "$LOGFILE"
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