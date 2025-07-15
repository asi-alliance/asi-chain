---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

# hero:
#   name: "ASI Testnet"
#   text: "ASI Testnet docs"
#   tagline: My great project tagline
#   actions:
#     - theme: brand
#       text: Markdown Examples
#       link: /markdown-examples
#     - theme: alt
#       text: API Examples
#       link: /api-examples

# features:
#   - title: Feature A
#     details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
#   - title: Feature B
#     details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
#   - title: Feature C
#     details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
# ---
---

# ASI:Chain - Testnet
## Context and Overview

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

Validators

```bash
Validator #1: rnode://46412097b9895ccf786c84d8db3a91ec80762a8e@44.198.8.24?protocol=40410?discovery=40414
Validator #2: rnode://992703c92b5ea37e27256a687cdb68d8b182badf@44.198.8.24?protocol=40420&discovery=40424
Validator #3: rnode://67676f0954467aa3507f36fe801b8ec12370501@44.198.8.24?protocol=40430?discovery=40434
Validator #4: rnode://73992afad92256bcc914836c40decccdbd0048d4@44.198.8.24?protocol=40440?discovery=40444
```

## Explorer

You can explore the chain via the testnet block explorer:
Link to explorer: http://44.198.8.24:5173/

⚠️ At the moment, access to validator nodes is only possible via direct access to the machine, under the validator user.

## External Validators Status

External validator joining is currently disabled and under testing. The bonding and connection process from external machines is being validated. We're coordinating this work with the official F1R3FLY and MetaCycle teams.

Once stable support for external validators is enabled, we will:

* Update this documentation

* Provide additional step-by-step instructions

* Open the network for bonding from outside nodes

For advanced users who want to dive in early, we welcome your feedback. Stay tuned for updates as we finalize external validator onboarding!
