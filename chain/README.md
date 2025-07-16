# ASI:Chain - Become chain validator

1. For full setup and launch, follow the [guide](https://github.com/asi-alliance/asi-chain/blob/master/Become-ASI-Chain-Validator.md)

2. Launch your own chain validator node:

```bash
docker compose -f validator.yml up -d
```

3. Check your node status:

```bash
docker compose <CONTRAINER_ID> logs -f
```
