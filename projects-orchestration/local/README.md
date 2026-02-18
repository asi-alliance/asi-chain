# ASI-LAUNCH

Local launch of all ASI-Chain infrastructure (blockchain, faucet, explorer, wallet, bot) in order from `lasi-launch.yml`


## Apps

1. **Chain**: Bootstrap → Validator1 → Validator2 → Validator3 → Observer  
2. **Faucet**: faucet-db → faucet-backend → faucet-frontend  
3. **Explorer**: postgres (indexer) → indexer-backend → metrics-cron, hasura → explorer-frontend  
4. **Wallet**: wallet-frontend (depends on validator1, observer, indexer-backend)  
5. **Bot**: deployer-bot (depends on validator1, observer)


## Apps deployed

http://localhost:8000/ - wallet
http://localhost:3001/ - faucet
http://localhost:4001/ - explorer


## Start 

```bash
docker compose -f asi-launch.yml up -d
```



