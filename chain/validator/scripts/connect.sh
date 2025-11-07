#!/bin/bash

FAUCET_REQUEST_LIMIT=2
BALANCE_REQUEST_LIMIT=300
BALANCE_REQUEST_DELAY=1
VALIDATOR_CHECK_LIMIT=10
VALIDATOR_CHECK_DELAY=60

cd /app/rust-client

# Get bootstrap host from bootstrap url
BOOTSTRAP_HOST=$(echo "$BOOTSTRAP" | cut -d"@" -f2 | cut -d"?" -f1)
echo "Bootstrap API: $BOOTSTRAP_HOST:$BOOTSTRAP_PUBLIC_GRPC_PORT"
echo "Observer API: $OBSERVER_HOST:$OBSERVER_INTERNAL_GRPC_PORT"

# Define function to check validator bonding status
is_validator_bonded() {
  local CMD_OUT=$(cargo run -q -- validator-status -k "$VALIDATOR_PUBLIC_KEY" -H "$OBSERVER_HOST" -p "$OBSERVER_INTERNAL_GRPC_PORT")
  if echo "$CMD_OUT" | grep "Bonded:" | grep -q "Yes" && \
     echo "$CMD_OUT" | grep "Active:" | grep -q "Yes"; then
    echo "$CMD_OUT"
    return 0
  else
    return 1
  fi
}

# Preliminary check if validator is already bonded
if is_validator_bonded; then
  echo "Validator is already bonded"
  exit 0
fi

# Check Wallet balance and top up from faucet if needed
BALANCE=$(curl -s "$FAUCET_API_URL/balance/$VALIDATOR_ADDRESS" | jq '.balance | tonumber')
LIMIT_I=$FAUCET_REQUEST_LIMIT
while [[ "$BALANCE" -lt "$STAKE" && $LIMIT_I -gt 0 ]]; do
  echo "Wallet Balance $BALANCE is not enough to stake $STAKE"
  echo "Requesting faucet for funds"
  ((LIMIT_I--))
  REQUEST_HEADERS="Content-Type: application/json"
  REQUEST_BODY="{\"to_address\": \"$VALIDATOR_ADDRESS\"}"
  RESPONSE=$(curl -s -X POST "$FAUCET_API_URL/transfer" -H "$REQUEST_HEADERS" -d "$REQUEST_BODY")
  DEPLOY_ID=$(echo "$RESPONSE" | jq '.deploy_id')
  if [[ -z "$DEPLOY_ID" || "$DEPLOY_ID" == "null" ]]; then
    RESPONSE_ERROR=$(echo "$RESPONSE" | jq '.error')
    RESPONSE_DETAILS=$(echo "$RESPONSE" | jq '.details')
    echo "Faucet responded with error: $RESPONSE_ERROR ($RESPONSE_DETAILS)"
  else
    echo "Request succeed, deploy id $DEPLOY_ID"
    BALANCE_=$(curl -s "$FAUCET_API_URL/balance/$VALIDATOR_ADDRESS" | jq '.balance | tonumber')
    LIMIT_J=$BALANCE_REQUEST_LIMIT
    while [[ "$BALANCE" -eq "$BALANCE_" && $LIMIT_J -gt 0 ]]; do
      echo "Waiting Wallet Balance update ($LIMIT_J)..."
      ((LIMIT_J--))
      sleep $BALANCE_REQUEST_DELAY
      BALANCE_=$(curl -s "$FAUCET_API_URL/balance/$VALIDATOR_ADDRESS" | jq '.balance | tonumber')
    done
    if [[ "$BALANCE" -eq "$BALANCE_" ]]; then
      echo "Unable to update balance"
    else
      echo "Balance updated to $BALANCE_"
      BALANCE=$BALANCE_
    fi
  fi
done

# Recheck that balance now is enough for stake
if [[ "$BALANCE" -ge "$STAKE" ]]; then
  echo "Wallet Balance $BALANCE is enough to stake $STAKE"
else
  echo "Wallet Balance $BALANCE is not enough to stake $STAKE"
  echo "Number of attempts to top up balance has exceeded the limit, please try manually, exiting..."
  exit 1
fi

# Check validator status and bond validator to the shard if needed
if is_validator_bonded; then
  echo "Validator bonded successfully"
  exit 0
else
  echo "Bonding Validator to the network"
  {
    cargo run -q -- bond-validator --stake "$STAKE" --private-key "$VALIDATOR_PRIVATE_KEY" -H "$BOOTSTRAP_HOST" -p "$BOOTSTRAP_PUBLIC_GRPC_PORT"
  } || {
    echo "Failed to bond validator"
    exit 1
  }
fi

# Recheck validator status
LIMIT_I=$VALIDATOR_CHECK_LIMIT
while [[ $LIMIT_I -gt 0 ]]; do
  echo "Waiting Validator to be bonded ($LIMIT_I)..."
  ((LIMIT_I--))
  sleep $VALIDATOR_CHECK_DELAY
  if is_validator_bonded; then
    echo "Validator bonded successfully"
    exit 0
  fi
done
echo "Number of attempts to bond has exceeded the limit, please check manually, exiting..."
