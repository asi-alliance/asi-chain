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
      label: '🚀 Team Onboarding',
      collapsed: false,
      items: [
        'onboarding/README',
        'onboarding/OVERVIEW',
        'onboarding/DEVELOPMENT-SETUP',
        'onboarding/SECURITY-CREDENTIALS',
        'onboarding/ARCHITECTURE',
        'onboarding/PRODUCTION-INFRASTRUCTURE',
        'onboarding/WALLET-GUIDE',
        'onboarding/EXPLORER-GUIDE',
        'onboarding/INDEXER-GUIDE',
        'onboarding/FAUCET-GUIDE',
        'onboarding/DOCS-SITE-GUIDE',
        'onboarding/DEPLOYMENT-PROCEDURES',
        'onboarding/OPERATIONS-RUNBOOK',
        'onboarding/TROUBLESHOOTING',
        'onboarding/EMERGENCY-PROCEDURES',
        'onboarding/API-REFERENCE',
        'onboarding/DATABASE-SCHEMA',
        'onboarding/MONITORING-ALERTS',
        'onboarding/HANDOVER',
      ],
    },
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
    {
      type: 'category',
      label: '📚 Archive (Old Docs)',
      collapsed: true,
      items: [
        'archive/index',
        'archive/API',
        'archive/BENCHMARKS',
        'archive/F1R3FLY_DEPLOYMENT_GUIDE',
        'archive/REPO_OPERATIONS_AND_MAINTENANCE',
        'archive/ASIP_PROCESS',
        'archive/ASI_BRAND_GUIDELINES',
        'archive/PRODUCTION_CHECKLIST',
        {
          type: 'category',
          label: 'Deployment',
          items: [
            'archive/deployment/lightsail_fullstack/AWS_LIGHTSAIL_DEPLOYMENT',
            'archive/deployment/lightsail_fullstack/AWS_LIGHTSAIL_EXPLORER_DEPLOYMENT',
            'archive/deployment/lightsail_fullstack/AWS_LIGHTSAIL_FAUCET_DEPLOYMENT',
            'archive/deployment/lightsail_fullstack/AWS_LIGHTSAIL_INDEXER_DEPLOYMENT',
            'archive/deployment/lightsail_fullstack/AWS_LIGHTSAIL_WALLET_DEPLOYMENT',
            'archive/deployment/lightsail_fullstack/AWS_LIGHTSAIL_DOCS_DEPLOYMENT',
            'archive/deployment/AWS_PRODUCTION_DEPLOYMENT_GUIDE',
            'archive/deployment/KUBERNETES_PRODUCTION_RUNBOOK',
          ],
        },
        {
          type: 'category',
          label: 'Monitoring',
          items: [
            'archive/monitoring/PRODUCTION_MONITORING_GUIDE',
          ],
        },
        {
          type: 'category',
          label: 'Operations',
          items: [
            'archive/operations/PRODUCTION_TROUBLESHOOTING_GUIDE',
          ],
        },
        {
          type: 'category',
          label: 'Security',
          items: [
            'archive/security/PRODUCTION_SECURITY_OPERATIONS_GUIDE',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
