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
    - theme: sponsor
      text: Quick Start
      link: /quick-start/
    - theme: brand
      text: ASI Wallet
      link: http://184.73.0.34:3000
    - theme: alt
      text: View on GitHub
      link: https://github.com/asi-alliance/asi-chain
features:
  - icon: 🚀
    title: Quick Start Guide
    details: Step-by-step guide to connect to ASI:Chain network
    link: /quick-start/
  - icon: 🔐
    title: Wallet
    details: Access the ASI:Chain wallet for managing your tokens and transactions
    link: /wallet/
  - icon: 💧
    title: Faucet
    details: Get test ASI tokens for development and testing on the network
    link: /faucet/
  - icon: 🔍
    title: Explorer Network 1
    details: Original blockchain explorer for network data analysis and transaction monitoring
    link: http://44.198.8.24:5173/
  - icon: 🔬
    title: Explorer Network 2
    details: New enhanced blockchain explorer with improved features and performance
    link: http://54.175.6.183:5173/
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
- Block Explorer 1 (Original): [http://44.198.8.24:5173/](http://44.198.8.24:5173/)
- Block Explorer 2 (Enhanced): [http://54.175.6.183:5173/](http://54.175.6.183:5173/)
- Wallet: [http://184.73.0.34:3000](http://184.73.0.34:3000)
- Network: 1 Bootstrap + 4 Validators + 1 Observer

</div>

### Available Block Explorers
ASI:Chain provides two blockchain explorers for network monitoring:
- **Explorer Network 1 (Original)**: [http://44.198.8.24:5173/](http://44.198.8.24:5173/) - Stable version with core functionality
- **Explorer Network 2 (Enhanced)**: [http://54.175.6.183:5173/](http://54.175.6.183:5173/) - New version with improved features and performance optimizations

### Getting Started
Choose your path based on your needs:
1. **Want to validate blocks?** → [Set up a Validator Node](/node-image/validator/)
2. **Just exploring?** → [View Block Explorer 1](http://44.198.8.24:5173/) or [Block Explorer 2](http://54.175.6.183:5173/)
3. **Need to manage tokens?** → [Access the Wallet](http://184.73.0.34:3000)

### Quick Links
- [ASI:Chain Wallet](http://184.73.0.34:3000)
- [Explorer Network 1 (Original)](http://44.198.8.24:5173/)
- [Explorer Network 2 (Enhanced)](http://54.175.6.183:5173/)
- [Generate RNode Address](/network-access/address-generation/)
- [Network Parameters](/network-configuration/parameters/)
- [Deploy Your First Smart Contract](/interaction-examples/smart-contracts/)
- [Common Errors & Solutions](/quick-start/troubleshooting/)

### Support
For additional support and updates:
- GitHub: [asi-alliance/asi-chain](https://github.com/asi-alliance/asi-chain)