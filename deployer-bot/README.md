# ASI:Chain - Deployer Bot: Setup & Run

## Step 1: Setup
Setup bot's settings in `.env`. Use `.env.example` for reference.

## Step 2: Build
```bash
docker build --tag deployer-bot:latest .
```

## Step 3: Run
```bash
docker compose -f deployer.yml up -d
```

# Change settings (Optional)

## Step 1: Change bot settings in env

If need to change any settings:

```bash
vim .env
```

## Step 2: Restart bot via compose
```bash
docker compose -f deployer.yml down
# Apply new .env file settings
docker compose -f deployer.yml up -d
```

## Step 3: Check bot logs
docker logs -f deployer
