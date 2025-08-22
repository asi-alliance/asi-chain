#!/bin/sh

ENV_FILE_GLOBAL="/home/node/.env"
ENV_FILE="/home/node/.env.tmp"
ENV_LIST="VALIDATOR_HOST VALIDATOR_PRIVATE_KEY VALIDATOR_PUBLIC_KEY VALIDATOR_ADDRESS"
WALLET_GENERATOR="/home/node/wallet-generator"
CONFIG_DIR="/home/node/conf"

# Copy env file to update (sed cannot update "volumed" env file)
cp $ENV_FILE_GLOBAL $ENV_FILE
# Ensure that we have newline at the end of the file
echo >> $ENV_FILE
# Initialize pre-defined env list
for ENV in $ENV_LIST; do
  export $ENV
done

# Read variables from env file
while IFS='=' read -r KEY VALUE; do
  # Skip comments and empty lines
  if [[ -n "$KEY" && "$KEY" != \#* ]]; then
    export "$KEY"="$VALUE"
    if ! echo "$ENV_LIST" | grep -q "$KEY"; then
      ENV_LIST="$ENV_LIST $KEY"
    fi
    echo "Found env $KEY=$VALUE"
  fi
done < $ENV_FILE

UPDATE_LIST=""

echo "Set up Validator Host"
if [ -z $VALIDATOR_HOST ]; then
  VALIDATOR_HOST=$(curl -s ifconfig.me)
  echo "Found Host $VALIDATOR_HOST"
  UPDATE_LIST="$UPDATE_LIST VALIDATOR_HOST"
else
  echo "Validator Host already configured"
fi

echo "Set up Validator Wallet"
if [ -z $VALIDATOR_PRIVATE_KEY ] && [ -z $VALIDATOR_PUBLIC_KEY ] && [ -z $VALIDATOR_ADDRESS ]; then
  WALLET_FILE=$(npm --prefix $WALLET_GENERATOR run generate | grep -oE "wallet_[0-9TZ-]+\.txt")
  cp $WALLET_GENERATOR/$WALLET_FILE $CONFIG_DIR/$WALLET_FILE
  echo "Generated wallet $WALLET_FILE"
  VALIDATOR_PRIVATE_KEY=$(cat $CONFIG_DIR/$WALLET_FILE | grep "Private Key" | cut -d":" -f2 | xargs)
  VALIDATOR_PUBLIC_KEY=$(cat $CONFIG_DIR/$WALLET_FILE | grep "Public Key" | cut -d":" -f2 | xargs)
  VALIDATOR_ADDRESS=$(cat $CONFIG_DIR/$WALLET_FILE | grep "Address" | cut -d":" -f2 | xargs)
  UPDATE_LIST="$UPDATE_LIST VALIDATOR_PRIVATE_KEY VALIDATOR_PUBLIC_KEY VALIDATOR_ADDRESS"
else
  if [ -n "$VALIDATOR_PRIVATE_KEY" ] && [ -n "$VALIDATOR_PUBLIC_KEY" ] && [ -n "$VALIDATOR_ADDRESS" ]; then
    echo "Validator Wallet already configured"
  else
    echo "WARNING: Validator Wallet cannot be further configured as some of the data is already filled in"
    echo "HINT: Make sure that envs VALIDATOR_PRIVATE_KEY VALIDATOR_PUBLIC_KEY VALIDATOR_ADDRESS are empty" \
         "or configured properly"
  fi
fi

# Write variables into env file
for ENV in $UPDATE_LIST; do
  VALUE=$(printenv $ENV)
  if grep -q "^$ENV=" "$ENV_FILE"; then
    # Use sed to replace the line
    sed -i "s|^$ENV=.*|$ENV=$VALUE|" "$ENV_FILE"
    echo "Updated env $ENV=$VALUE"
  else
    echo "$ENV=$VALUE" >> "$ENV_FILE"
    echo "Appended env $ENV=$VALUE"
  fi
done

# Update "volumed" env file
sed -i"" "/./,/^$/!d" "$ENV_FILE"  # remove empty lines
echo "$(cat $ENV_FILE)" > $ENV_FILE_GLOBAL
