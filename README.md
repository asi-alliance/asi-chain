# ASI:Chain - Testnet
## Context and Overview

Testnet portal, detailed documentation and information about testnet is available at the link:

https://asi-testnet.singularitynet.io/

Please use the following credentials to access the developer portal:
login = "website_user"
password = "tYfrgWp4D5CyGM8U"

## Network Configuration

We have launched a custom blockchain based on F1R3FLY with the following node types:

* 1 Bootstrap Node

* 4 Validator Nodes

* 1 Observer Node

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Bootstrap  │ ──▶ │ Validator 1 │ ──▶ | Validator 2 │
│  (Genesis)  │     │             │     |             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Validator 3 │ ──▶ │ Validator 4 │ ──▶ │  Observer   │
│             │     │  (Extra)    │     │ (Read-only) │
└─────────────┘     └─────────────┘     └─────────────┘
```

Bootstrap Node

```
bootstrap: `rnode://138410b5da898936ec1dc13fafd4893950eb191b@44.198.8.24?protocol=40400&discovery=40404`
```

## Explorer

You can explore the chain via the testnet block explorer:
Link to explorer: http://44.198.8.24:5173/

⚠️ At the moment, access to validator nodes is only possible via this [guide](https://github.com/asi-alliance/asi-chain/blob/master/Become-ASI-Chain-Validator.md)

## External Validators Status

External validator joining is currently disabled and under testing. The connection with bonding process from external nodes is being validated. We're coordinating this work with the official F1R3FLY and MetaCycle teams.

Once stable support for external validators is enabled, we will:

* Update this documentation

* Provide additional step-by-step instructions to full setup from your side

* Open the network for bonding from outside nodes with new generated wallets

For advanced users who want to dive in early, we welcome your feedback. Stay tuned for updates as we finalize external validator onboarding!
