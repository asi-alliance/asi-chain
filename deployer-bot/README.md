## Setup:
Setup IPs, ports and nodes' names in `bot.sh`

## Build:
```bash
docker build --tag deployer-bot:v3 .
```

## Run:
```bash
docker compose -f deployer.yml up -d
```