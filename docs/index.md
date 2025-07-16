---
layout: home
title: ASI:Chain Documentation
description: Complete guide for ASI:Chain blockchain network setup and operations

hero:
  name: "ASI:Chain"
  text: "Blockchain Network Documentation"
  tagline: "Your comprehensive guide to joining and operating on the ASI:Chain network"
  image:
    # src: /asi-chain-logo.png
    alt: ASI:Chain
  actions:
    - theme: brand
      text: Quick Start
      link: /quick-start/
    - theme: alt
      text: View on GitHub
      link: https://github.com/asi-alliance/asi-chain

features:
  - icon: 🚀
    title: Quick Start Guide
    details: Step-by-step guide to connect to ASI:Chain network
    link: /quick-start/

  - icon: 🔍
    title: Explorer
    details: Learn about the blockchain explorer and how to interpret its data
    link: http://44.198.8.24:5173/

  - icon: 🖥️
    title: Node Image Source
    details: Learn about the Docker image used for ASI:Chain nodes and how to obtain it
    link: /node-image/
    
  - icon: 📋
    title: YAML Configuration
    details: Understand YAML configuration files and their parameters
    link: /yaml-configuration/
    
  - icon: 🌐
    title: Network Access
    details: Explorer address and RPC endpoints for network interaction
    link: /network-access/
    
  - icon: ⚙️
    title: Network Configuration
    details: Current network parameters, validator setup, and topology
    link: /network-configuration/
    
  - icon: 🔧
    title: Troubleshooting
    details: Common errors and solutions when setting up nodes
    link: /quick-start/troubleshooting/
    
  - icon: 💡
    title: Interaction Examples
    details: Practical examples of network interactions and smart contracts
    link: /interaction-examples/
---

## Welcome to ASI:Chain

ASI:Chain is a blockchain network based on F1R3FLY technology, designed for the ASI Alliance ecosystem. This documentation provides comprehensive guidance for:

- Setting up observer and validator nodes
- Understanding network configuration
- Interacting with the blockchain
- Deploying smart contracts
- Troubleshooting common issues

### Current Network Status

<div class="tip custom-block" style="padding-top: 8px">

**Testnet is Live!** 🟢

- Bootstrap Node: `rnode://138410b5da898936ec1dc13fafd4893950eb191b@44.198.8.24?protocol=40400&discovery=40404`
- Block Explorer: [http://44.198.8.24:5173/](http://44.198.8.24:5173/)
- Network: 1 Bootstrap + 4 Validators + 1 Observer

</div>

### Getting Started

Choose your path based on your needs:

1. **Want to validate blocks?** → [Set up a Validator Node](/node-image/validator/)
2. **Just exploring?** → [View the Block Explorer](http://44.198.8.24:5173/)

### Quick Links

- [Generate RNode Address](/network-access/address-generation/)
- [Network Parameters](/network-configuration/parameters/)
- [Deploy Your First Smart Contract](/interaction-examples/smart-contracts/)
- [Common Errors & Solutions](/quick-start/troubleshooting/)

### Support

For additional support and updates:
- GitHub: [asi-alliance/asi-chain](https://github.com/asi-alliance/asi-chain)