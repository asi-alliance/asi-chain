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

Explorer → http://localhost:4001/

Wallet → http://localhost:8000/


## Stopping the Environment

```bash
docker stop $(docker ps -aq) && docker rm $(docker ps -aq)
```

Delete chain data folder(always, when you restart the chain):


```bash
rm -rf <path-to-repo>/asi-chain/local-launch/chain/data
```


## Restart containers

```bash
docker compose -f asi-local-launch.yml up -d
```


## Indexer troubleshooting

Use these steps when the indexer fails to sync, reports connection errors, or shows stale/empty data.

### 1. Restart the indexer only

Restarts the indexer container without touching the database. Use when the indexer lost connection to the node or is stuck.

```bash
docker compose -f asi-local-launch.yml restart indexer
```

### 2. Reset indexer state (clean database)

Use when the indexer schema or data is corrupted, or you need a full re-sync from block 0. **This deletes all indexed data** (blocks, deployments, transfers, etc.).

```bash
# Stop all services and remove the Postgres volume (run from local-launch/)
docker compose -f asi-local-launch.yml down
docker volume rm local-launch_postgres_data 2>/dev/null || true

# Bring the stack back up (Postgres will re-run migrations; indexer starts after delay if using launch.sh)
./launch.sh
```

To only remove the Postgres volume without stopping other services:

```bash
docker compose -f asi-local-launch.yml stop indexer postgres hasura metrics-cron
docker volume rm local-launch_postgres_data 2>/dev/null || true
docker compose -f asi-local-launch.yml up -d
```

Volume name may differ by project; list volumes with `docker volume ls | grep postgres`.