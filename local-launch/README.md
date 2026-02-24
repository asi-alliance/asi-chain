# ASI Chain — Local Infrastructure Launch

This guide explains how to launch the full **ASI Chain** local infrastructure stack using Docker Compose.

Repository:  
https://github.com/asi-alliance/asi-chain  

---

# Overview

The `asi-local-launch.yml` configuration boots the complete local environment in the correct dependency order.

## Infrastructure Components

### Chain (Shard)
- Bootstrap
- Validator1 (dev-mode for observer)
- Validator2
- Validator3

### Faucet
- faucet-backend
- faucet-frontend

### Explorer
- postgres (indexer database)
- indexer-backend
- metrics-cron
- hasura
- explorer-frontend

### Wallet
- wallet-frontend  
  (depends on validator1, indexer-backend)

### Bot
- deployer-bot  
  (depends on validator1)

---

# Installation & Setup

## 0. Clone the Repository

```bash
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain
cd local-launch
```

## 1. Configure Environment Files

Rename all .env.local files to .env in the following locations:


`/.env.local`
`bot/.env.local`
`explorer/.env.local`
`faucet/backend/.env.local`
`faucet/frontend/.env.local`
`wallet/.env.local`


After renaming, the structure should be:

`.env`
`bot/.env`
`explorer/.env`
`faucet/backend/.env`
`faucet/frontend/.env`
`wallet/.env`


## 2. Start the Infrastructure

**Recommended:** Use the unified launch script (starts chain first, then indexer after 360s delay):

```bash
./launch.sh
```

Or with clean deploy (removes volumes and images):

```bash
./launch.sh --clean
```

**Alternative:** Start everything at once (indexer may need manual restart if chain isn't ready):

```bash
docker compose -f asi-local-launch.yml --profile delayed up -d
```

Without `--profile delayed`, indexer and explorer-frontend won't start (chain, postgres, hasura, etc. will run).


This will start:


* Shard (bootstrap + validators + observer)


* Bot


* Faucet


* Wallet


* Explorer + Indexer



## Applications Available Locally

After successful startup, the services will be accessible at:


Faucet → http://localhost:3001/

Wallet → http://localhost:8000/

Explorer → http://localhost:4001/


## Stopping the Environment

```bash
docker stop $(docker ps -aq) && docker rm $(docker ps -aq)
```

Delete chain data folder:


```bash
rm -rf <path-to-repo>/asi-chain/local-launch/chain/data
```


## Restart containers

```bash
docker compose -f asi-local-launch.yml up -d
```