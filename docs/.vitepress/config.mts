import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "ASI Testnet docs",
  description: "ASI Testnet docs",
  themeConfig: {
    sidebar: [
      {
        text: 'Quick Start',
        collapsed: true,
        items: [
          { text: 'Quick Start Guide', link: '/quick-start/' },
          { text: 'Message Exchange Scenarios', link: '/quick-start/messages/' },
          { text: 'Common Errors', link: '/quick-start/troubleshooting/' },
        ]
      },
      {
        text: 'Node Image',
        collapsed: true,
        items: [
          { text: 'Node Image Source', link: '/node-image/' },
          { text: 'Validator Node Setup', link: '/node-image/validator/' },
        ]
      },
      {
        text: 'Wallet',
        collapsed: true,
        items: [
          { text: 'ASI:Chain Wallet Overview', link: '/wallet/' },
        ]
      },
      {
        text: 'YAML Configuration',
        collapsed: true,
        items: [
          { text: 'YAML File Source', link: '/yaml-configuration/' },
          { text: 'YAML Parameters & Examples', link: '/yaml-configuration/parameters/' },
        ]
      },
      {
        text: 'Network Access',
        collapsed: true,
        items: [
          { text: 'Explorer & RPC Endpoints', link: '/network-access/' },
          { text: 'RNode Address Generation', link: '/network-access/address-generation/' },
        ]
      },
      {
        text: 'Network Configuration',
        collapsed: true,
        items: [
          { text: 'Network Configuration Overview', link: '/network-configuration/' },
          { text: 'Network Nodes', link: '/network-configuration/network-nodes/' },
          { text: 'Network Parameters', link: '/network-configuration/parameters/' },
          { text: 'Network Topology', link: '/network-configuration/topology/' },
        ]
      },
      {
        text: 'Interaction Examples',
        collapsed: true,
        items: [
          { text: 'Interaction Scenarios', link: '/interaction-examples/' },
          { text: 'Simple Smart Contract', link: '/interaction-examples/smart-contracts/' },
          { text: 'View Block History', link: '/interaction-examples/block-history/' },
          { text: 'Check Balance', link: '/interaction-examples/balance-check/' },
        ]
      },
      {
        text: 'Faucet',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/faucet/' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/asi-alliance/asi-chain/' }
    ]
  }
})
