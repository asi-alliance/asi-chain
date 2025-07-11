# ASI:Chain - How you can connect to chain?

This instruction describes how you will be able to connect to the ASI:Chain blockchain network when this feature becomes available.
Stay tuned for updates as we finalize external validator onboarding!

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

Clone the repository

```bash
git clone https://github.com/F1R3FLY-io/f1r3fly.git
```

Change directory
```bash
cd docker
```

Next step: Setup observer node:

In `docker` directory edit `observer.yml` file

You need line:
`--bootstrap=rnode://138410b5da898936ec1dc13fafd4893950eb191b@$BOOTSTRAP_HOST?protocol=40400&discovery=40404`

change it to our `BOOTSTRAP_HOST` but now it's under construction

Setup `.env` file in `/docker/` directory:
```bash
cd ..
check that directory is /docker/
```

Edit `.env` file:
Change param `READONLY_HOST` to your public IP address

Add in file your generated private-key and host of your server:
```
VALIDATOR_HOST=<YOUR_IP_ADDRESS>
VALIDATOR_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
```

You should create own `validator.conf` in directory `./docker/conf`

```bash
cd conf
```

Create your own `validator.conf` using one of validator's config files as example

You just need to change some parameters in your `validator.conf` file:

You need line:
`--bootstrap=rnode://138410b5da898936ec1dc13fafd4893950eb191b@$BOOTSTRAP_HOST?protocol=40400&discovery=40404`

change it to our `BOOTSTRAP_HOST` but now it's under construction

```
api-server {
  ...
  host = <IP ADDRESS OF YOUR VALIDATOR>
  or use .env file but comment host here
  ...
}
casper {
   ...
   validator-public-key = <YOUR PUBLIC KEY>
   validator-private-key = <YOUR PRIVATE KEY>
   ...
}
```
also setup all ports

After everything have been set up - you are ready to launch validator and connect it to our network.

Create your own `validator.yml` using one of validator's config files as example

You just need to change some parameters in your `validator.yml` file:

Rename $VALIDATOR_HOST to your validator name and path
```
...
container_name: $VALIDATOR_HOST
...
...
volumes:
      - ./data/$VALIDATOR_HOST:/var/lib/rnode/
      - ./conf/validator.conf:/var/lib/rnode/rnode.conf
      - ./conf/validator.certificate.pem:/var/lib/rnode/node.certificate.pem
      - ./conf/validator.key.pem:/var/lib/rnode/node.key.pem
      - ./conf/logback.xml:/var/lib/rnode/logback.xml
...
```

1. You need launch validator node and connect to our shard.

```bash
docker compose -f validator.yml up -d
```

Check logs of observer:
```bash
docker compose -f validator.yml logs -f
```

You should see smth like this:
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

2. Set bond via CLI with private key from `conf/validator.conf`

Go to terminal with CLI and launch command:
```bash
cargo run -- bond-validator --private-key <YOU_PRIVATE_KEY>
```

You should see:
```
Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.34s
     Running `target/debug/node_cli bond-validator --private-key <YOU_PRIVATE_KEY>`
🔗 Bonding new validator to the network
💰 Stake amount: 50000000000000 REV
🚀 Deploying bonding transaction...
✅ Bonding deploy successful!
⏱️  Deploy time: 229.72ms
🆔 Deploy ID: Success!
DeployId is: 3045022100b4a835effb0941fc755957878498b71f2ac761738f6346e7f8683f2a560a55e60220767e77a99850dc6ddaaf9c9f883950a06708a16cf6c63fd503da107b43e41f67
```

3. After set bond you need wait for a few minutes and launch your validator

Use example `validator.yml` file from any validator

Return to terminal where opened `f1r3fly/docker` directory and run command
```bash
docker compose -f validator.yml up -d
```

After a few minutes you should see in logs of your validator:
```
rnode.validator4  | 2025-06-15 15:21:10,660 [node-runner-32] INFO  coop.rchain.node.runtime.ServersInstances$ - Listening for traffic on rnode://73992afad92256bcc914836c40decccdbd0048d4@rnode.validator4?protocol=40400&discovery=40404.
rnode.validator4  | 2025-06-15 15:21:10,853 [node-runner-28] INFO  coop.rchain.comm.transport.GrpcTransportClient - Creating new channel to peer rnode://de6eed5d00cf080fc587eeb412cb31a75fd10358@52.119.8.109?protocol=40400&discovery=40404
rnode.validator4  | 2025-06-15 15:21:15,941 [node-runner-28] INFO  coop.rchain.comm.transport.GrpcTransportClient - Creating new channel to peer rnode://992703c92b5ea37e27256a687cdb68d8b182badf@rnode.validator2?protocol=40400&discovery=40404
rnode.validator4  | 2025-06-15 15:21:16,063 [node-runner-28] INFO  coop.rchain.comm.transport.GrpcTransportClient - Creating new channel to peer rnode://138410b5da898936ec1dc13fafd4893950eb191b@rnode.bootstrap?protocol=40400&discovery=40404
rnode.validator4  | 2025-06-15 15:21:16,153 [node-runner-28] INFO  coop.rchain.comm.transport.GrpcTransportClient - Creating new channel to peer rnode://46412097b9895ccf786c84d8db3a91ec80762a8e@rnode.validator1?protocol=40400&discovery=40404
rnode.validator4  | 2025-06-15 15:21:16,269 [node-runner-29] INFO  coop.rchain.comm.transport.GrpcTransportClient - Creating new channel to peer rnode://67676f0954467aa3507f36fe801b8ec12370501d@rnode.validator3?protocol=40400&discovery=40404

Responded to protocol handshake request from rnode://46412097b9895ccf786c84d8db3a91ec80762a8e@rnode.validator1?protocol=40400&discovery=40404
rnode.readonly  | 2025-06-15 07:52:02,821 [node-runner-27] INFO  coop.rchain.comm.rp.Connect$ - Peers: 4 or more
```

Contract deploy:
```bash
# Deploy to validator
./target/release/node_cli deploy \
  -f ../rholang/examples/stdout.rho -p 40412
```
