#!/bin/bash
set -o pipefail
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

containers=("boot" "validator1" "validator2" "validator3")
ports=("40402" "40412" "40422" "40432")
hosts=("ipaddress" "ipaddress" "ipaddress" "ipaddress")
propose_hosts=("ipaddress" "ipaddress" "ipaddress" "ipaddress")
private_key="<PRIVATE-KEY>"

mkdir -p logs
LOGFILE="logs/bot_report_$(date +%F_%H-%M).log"


echo "Bot started..."
echo "Logs streaming to $LOGFILE"
echo ""

# block number for vabn
block_number=0

while true; do
  for i in "${!containers[@]}"; do
    container="${containers[$i]}"
    port="${ports[$i]}"
    host="${hosts[$i]}"
    propose_host="${propose_hosts[$i]}"

    echo "=========================================================="
    echo "Working with container: $container (host: $host, port: $port)"
    echo "=========================================================="

    # ----------------–– DEPLOY ————————————————
    echo "[$(date '+%F %T')] DEPLOY on $container (vabn=$block_number)" | tee -a "$LOGFILE"

    deploy_out=$(sudo docker compose -f shard.yml exec "$container" /opt/docker/bin/rnode \
               --grpc-host "$host" --grpc-port "$port" deploy \
               --private-key "$private_key" --phlo-limit 10000000 --phlo-price 1 \
               --shard-id root --valid-after-block-number "$block_number" \
               /opt/docker/examples/stdout.rho 2>&1)
    deploy_status=$?

    printf '%s' "$deploy_out" | tee -a "$LOGFILE"
    [[ $deploy_out == *$'\n' ]] || printf '\n' | tee -a "$LOGFILE"

    if [ $deploy_status -eq 0 ]; then
      echo -e "${GREEN}[SUCCESS] deploy on $container${NC}" | tee -a "$LOGFILE"
    else
      echo -e "${RED}[ERROR] deploy on $container${NC}"  | tee -a "$LOGFILE"
    fi

    echo
    echo | tee -a "$LOGFILE"
    sleep 5

    # ----------------–– PROPOSE ————————————————
    echo "[$(date '+%F %T')] PROPOSE on $container" | tee -a "$LOGFILE"

    propose_out=$(sudo docker compose -f shard.yml exec "$container" /opt/docker/bin/rnode \
                --grpc-host "$propose_host" --grpc-port "$port" propose 2>&1)
    propose_status=$?

    printf '%s' "$propose_out" | tee -a "$LOGFILE"
    [[ $propose_out == *$'\n' ]] || printf '\n' | tee -a "$LOGFILE"

    if [ $propose_status -eq 0 ]; then
      echo -e "${GREEN}[SUCCESS] propose on $container${NC}" | tee -a "$LOGFILE"
      ((block_number++))
    else
      echo -e "${RED}[ERROR] propose on $container${NC}" | tee -a "$LOGFILE"
    fi

    echo
    echo | tee -a "$LOGFILE"
    sleep 5
    echo "Work ended with $container"
    echo ""

  done

  echo "========================================="
  echo "Cycle end. Starting new..."
  echo "========================================="
  echo ""
done
