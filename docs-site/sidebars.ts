import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/connect-network',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/f1r3fly-node',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/guide',
        'development/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'smart-contracts/rholang-guide',
        'smart-contracts/first-contract',
        'smart-contracts/testing',
        'smart-contracts/casper-consensus',
      ],
    },
    {
      type: 'category',
      label: 'API',
      items: [
        'api/reference',
        'api/overview',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker-guide',
        'deployment/f1r3fly-deployment',
        'deployment/docker-config-changes',
        'deployment/aws-lightsail',
        'deployment/server-specs',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'operations/repository-ops',
        'operations/runbook',
        'operations/artifacts',
      ],
    },
    {
      type: 'category',
      label: 'Monitoring',
      items: [
        'monitoring/stack',
        'monitoring/network-status',
        'monitoring/metrics-exporter',
        'monitoring/stress-testing',
      ],
    },
    {
      type: 'category',
      label: 'Performance',
      items: [
        'performance/tuning-guide',
        'performance/benchmarks',
      ],
    },
    {
      type: 'category',
      label: 'Tools',
      items: [
        'tools/rust-client',
        'tools/rust-client-tests',
        'tools/operational-scripts',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: [
        'troubleshooting/common-issues',
        'troubleshooting/autopropose-fix',
      ],
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance/asip-process',
        'governance/brand-guidelines',
      ],
    },
  ],
};

export default sidebars;
