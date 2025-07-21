# ASI:Chain - How you can connect to chain?

This instruction describes how you will be able to connect to the ASI:Chain and become a validator with our prepared wallets' keys.

We are working on allowing you to create your own wallets, and becomes a your validator with your wallets, but for now this feature is in development.

## System Requirements
- **RAM**: 16GB minimum (Docker Desktop needs 16GB allocated on macOS)
- **CPU**: 4+ cores
- **Storage**: 50GB free
- **Network**: Stable connection, no strict firewall

Software Requirments:

## Check versions
```bash
docker --version          # Need: 20.10+
docker compose version    # Need: 2.0+
java -version             # Need: OpenJDK 11 or 17
git --version             # Need: 2.0+
cargo --version           # Need: 1.70+
```

## macOS Setup
```bash
brew install openjdk@17 sbt rust
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export PATH="$JAVA_HOME/bin:$PATH"
```

## Ubuntu Setup
```bash
sudo apt update
sudo apt install -y openjdk-17-jdk sbt docker.io docker-compose
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Setup
Generate private and public keys

Use our wallet generator script to generate private and public keys for wallet

This keys are requirment for managing your wallet and validator node

See more in [instruction](https://github.com/asi-alliance/asi-chain/blob/master/wallet-generator/README.md)

>[!CAUTION]
> CONNECTION OF VALIDATORS WITH NEW WALLETS IS UNDER DEVELOPMENT.

>[!TIP]
> Connection with new wallets is currently not available, **use our prepared wallet keys sets from the [file](https://github.com/asi-alliance/asi-chain/blob/master/testnet-wallets.txt)**

Clone the repository

```bash
git clone https://github.com/asi-alliance/asi-chain.git
```

Change directory
```bash
cd asi-chain/chain
```

## 1. Setup `.env` file

Use `.env.example` as an example for your `.env` file.

Make the following changes:

`VALIDATOR_PRIVATE_KEY` — specify the validator's private key.

`VALIDATOR_HOST` — set the public IP address of the machine where this validator will be running.

> [!TIP]
> **Use our prepared wallet keys sets from the [file](https://github.com/asi-alliance/asi-chain/blob/master/testnet-wallets.txt)**

## 2. Setup `validator.yml`

Setup ports in the ports section or leave it by default:

```yml
...
ports:
  # Setup your node's ports here
  - "40400:40400"
  - "40401:40401"
  - "40402:40402"
  - "40403:40403"
  - "40404:40404"
  - "40405:40405"
...
```

## 3. Setup your `conf/validator.conf`

Replace these `validator-public-key` and `validator-private-key` in `casper` section of `conf/validator.conf` file with the current keys of the validator you're connecting to the network.

> [!TIP]
> **Use our prepared wallet keys sets from the [file](https://github.com/asi-alliance/asi-chain/blob/master/testnet-wallets.txt)**

And also configure the **ports** that were previously configured in `validator.yml`

## 4. Launch your validator node

Go to the directory `asi-chain/chain` and launch your validator node:

```bash
cd asi-chain/chain
```

```bash
sudo docker compose -f validator.yml up -d
```

Check logs and wait full sync of your node:
```bash
sudo docker logs validator -tail 20
```
And wait logs:
```
rnode.readonly  | 2025-07-04 14:50:53,964 [node-runner-24] INFO  coop.rchain.casper.engine.Initializing - Approved state for block Block #0 (b22fa19038...) with empty parents (supposedly genesis) is successfully restored.
rnode.readonly  | 2025-07-04 14:51:04,934 [node-runner-27] INFO  coop.rchain.casper.engine.Running$ - Received ForkChoiceTipRequest from rnode.validator2
rnode.readonly  | 2025-07-04 14:51:05,005 [node-runner-27] INFO  coop.rchain.casper.engine.Running$ - Sending tips [b22fa19038...] to rnode.validator2
rnode.readonly  | 2025-07-04 14:51:05,264 [node-runner-24] INFO  coop.rchain.casper.engine.Running$ - Received ForkChoiceTipRequest from rnode.bootstrap
rnode.readonly  | 2025-07-04 14:51:05,313 [node-runner-24] INFO  coop.rchain.casper.engine.Running$ - Sending tips [b22fa19038...] to rnode.bootstrap
rnode.readonly  | 2025-07-04 14:51:05,852 [node-runner-24] INFO  coop.rchain.casper.engine.Running$ - Received ForkChoiceTipRequest from rnode.validator1
rnode.readonly  | 2025-07-04 14:51:05,883 [node-runner-24] INFO  coop.rchain.casper.engine.Running$ - Sending tips [b22fa19038...] to rnode.validator1
rnode.readonly  | 2025-07-04 14:51:05,916 [node-runner-24] INFO  coop.rchain.casper.engine.Running$ - Received ForkChoiceTipRequest from rnode.validator3
rnode.readonly  | 2025-07-04 14:51:05,976 [node-runner-24] INFO  coop.rchain.casper.engine.Running$ - Sending tips [b22fa19038...] to rnode.validator3
```

This will indicate that the node has finished its synchronization with the network

## 5. Deploy contracts and propose blocks

```bash
cd asi-chain/chain
```

Deploy Hello World contract:

```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode \
    --grpc-host localhost \
    --grpc-port "40402 or your port" \
    deploy \
    --private-key "<PRIVATE-KEY>" \
    --phlo-limit 10000000 \
    --phlo-price 1 \
    --valid-after-block-number 0 \
    --shard-id root \
    "/opt/docker/examples/stdout.rho"
```

You should see a message like this:

```bash
Response: Success!
DeployId is: 304402206c435cee64d97d123f0c1b4552b3568698e64096a29fb50ec38f11a6c5f7758b022002e05322156bf5ed878ce20cef072cd8faf9e8bb15b58131f2fee06053b5d1c5
```

this means you have sent your first smart contract to ASI:Chain!


Propose new block to ASI:Chain with your contract:
```bash
sudo docker compose -f "validator.yml" exec "validator" /opt/docker/bin/rnode --grpc-host localhost --grpc-port "40402 or your port" propose
```

You should see a message like this:

```bash
Response: Success! Block 4dda69c62838e18abd3c131818e60110ac3caccc66ec05792cedb327a3bafff7 created and added.
```

this means you have proposed your first block to ASI:Chain!
