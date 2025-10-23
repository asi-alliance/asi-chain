# Documentation Site Component Guide

## 📚 Component Overview

The ASI Chain Documentation Site is built with Docusaurus 3.8.1, providing versioned documentation, search capabilities, and PWA support for the entire ecosystem.

```
docs-site/
├── docs/                      # Documentation content
│   ├── intro.md             # Getting started
│   ├── tutorials/           # Step-by-step guides
│   ├── api/                 # API documentation
│   └── reference/           # Technical reference
├── blog/                     # Blog posts
├── src/
│   ├── components/          # React components
│   ├── pages/              # Custom pages
│   ├── css/                # Styling
│   └── theme/              # Theme customization
├── static/                  # Static assets
├── docusaurus.config.js     # Main configuration
├── sidebars.js             # Sidebar navigation
└── versions.json           # Version management
```

## 🏗️ Architecture

### Docusaurus Structure

```
Build Process:
  MDX Files → React Components → Static HTML
  
Features:
  - Versioning support
  - i18n ready
  - Search (Algolia/Local)
  - PWA support
  - Dark mode
  - Live code blocks
  - SEO optimized
```

## 💻 Configuration

### Main Configuration (`docusaurus.config.js`)

```javascript
const config = {
  title: 'ASI Chain Documentation',
  tagline: 'Blockchain Infrastructure for Decentralized AI',
  favicon: 'img/favicon.ico',
  url: 'https://docs.asichain.io',
  baseUrl: '/',
  
  organizationName: 'asi-alliance',
  projectName: 'asi-chain-docs',
  
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/asi-alliance/asi-chain/tree/main/docs-site/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          versions: {
            current: {
              label: 'Next',
              path: 'next',
            },
          },
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/asi-alliance/asi-chain/tree/main/docs-site/',
          blogSidebarCount: 10,
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} ASI Alliance`,
          },
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  
  themeConfig: {
    image: 'img/asi-chain-social.png',
    navbar: {
      title: 'ASI Chain',
      logo: {
        alt: 'ASI Chain Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left'
        },
        {
          href: 'https://github.com/asi-alliance/asi-chain',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/asi-chain',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/asi_chain',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/asi-alliance/asi-chain',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ASI Alliance. Built with Docusaurus.`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
      additionalLanguages: ['rust', 'scala', 'python', 'typescript'],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_API_KEY',
      indexName: 'asi_chain_docs',
      contextualSearch: true,
    },
  },
  
  plugins: [
    [
      '@docusaurus/plugin-pwa',
      {
        offlineModeActivationStrategies: [
          'appInstalled',
          'standalone',
          'queryString',
        ],
        pwaHead: [
          {
            tagName: 'link',
            rel: 'icon',
            href: '/img/logo.png',
          },
          {
            tagName: 'link',
            rel: 'manifest',
            href: '/manifest.json',
          },
          {
            tagName: 'meta',
            name: 'theme-color',
            content: '#7FD67A',
          },
        ],
      },
    ],
    [
      '@docusaurus/plugin-ideal-image',
      {
        quality: 70,
        max: 1030,
        min: 640,
        steps: 2,
        disableInDev: false,
      },
    ],
  ],
};

module.exports = config;
```

### Sidebar Configuration (`sidebars.js`)

```javascript
module.exports = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'intro',
        'installation',
        'quick-start',
        'concepts',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/first-transaction',
        'tutorials/deploy-contract',
        'tutorials/run-node',
        'tutorials/build-dapp',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/blockchain',
        'concepts/consensus',
        'concepts/rholang',
        'concepts/validators',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/rest',
        'api/graphql',
        'api/grpc',
        'api/websocket',
      ],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'contracts/introduction',
        'contracts/syntax',
        'contracts/patterns',
        'contracts/testing',
      ],
    },
    {
      type: 'category',
      label: 'Tools',
      items: [
        'tools/wallet',
        'tools/explorer',
        'tools/cli',
        'tools/sdk',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker',
        'deployment/kubernetes',
        'deployment/aws',
        'deployment/monitoring',
      ],
    },
  ],
};
```

## 📝 Content Structure

### Documentation Pages

```markdown
---
id: intro
title: Introduction to ASI Chain
sidebar_label: Introduction
slug: /
---

# Introduction to ASI Chain

ASI Chain is a blockchain infrastructure designed for decentralized AI applications.

## Features

- **Process Calculus**: Rholang smart contracts
- **Parallel Execution**: True concurrent processing
- **AI-Optimized**: Built for AI workloads

## Getting Started

### Docker Deployment

```bash
docker run -d asi-chain/node
```

### From Source Deployment

```bash
git clone https://github.com/asi-alliance/asi-chain
cd asi-chain
./scripts/deploy-f1r3fly-k8s.sh
```

:::tip
Use the Docker method for quick testing
:::

:::caution
Never use bootstrap node for transactions
:::

## Live Demo

import BrowserOnly from '@docusaurus/BrowserOnly';

_Interactive demo component would be rendered here in the browser._
```

### Custom Components

```tsx
// src/components/DemoComponent.tsx
import React, { useState } from 'react';
import CodeBlock from '@theme/CodeBlock';

export default function DemoComponent() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState('');
  
  const runCode = async () => {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setResult(data.output);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };
  
  return (
    <div className="demo-container">
      <h3>Try Rholang</h3>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter Rholang code..."
        rows={10}
      />
      <button onClick={runCode}>Run</button>
      {result && (
        <CodeBlock language="text">{result}</CodeBlock>
      )}
    </div>
  );
}
```

### Custom Pages

```tsx
// src/pages/playground.tsx
import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Playground() {
  const {siteConfig} = useDocusaurusContext();
  
  return (
    <Layout
      title="Rholang Playground"
      description="Interactive Rholang editor">
      <main>
        <div className="container">
          <h1>Rholang Playground</h1>
          <RholangEditor />
        </div>
      </main>
    </Layout>
  );
}
```

## 🎨 Styling

### Custom CSS (`src/css/custom.css`)

```css
:root {
  --ifm-color-primary: #7FD67A;
  --ifm-color-primary-dark: #6BC766;
  --ifm-color-primary-darker: #5CB857;
  --ifm-color-primary-darkest: #4DA948;
  --ifm-color-primary-light: #93E58E;
  --ifm-color-primary-lighter: #A2F49D;
  --ifm-color-primary-lightest: #B1FFAC;
  
  --ifm-code-font-size: 95%;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] {
  --ifm-color-primary: #7FD67A;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.3);
}

.hero {
  background: linear-gradient(135deg, #7FD67A 0%, #4DA948 100%);
  color: white;
}

.button--primary {
  background-color: var(--ifm-color-primary);
  border-color: var(--ifm-color-primary);
}

.button--primary:hover {
  background-color: var(--ifm-color-primary-dark);
  border-color: var(--ifm-color-primary-dark);
}

/* Code blocks */
.prism-code {
  font-family: 'JetBrains Mono', monospace;
}

/* Admonitions */
.admonition-tip {
  border-left-color: #7FD67A;
}

.admonition-caution {
  border-left-color: #FFA500;
}

.admonition-danger {
  border-left-color: #FF5252;
}
```

## 🔍 Search Integration

### Algolia DocSearch

```javascript
// docusaurus.config.js
themeConfig: {
  algolia: {
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_SEARCH_API_KEY',
    indexName: 'asi_chain',
    contextualSearch: true,
    searchParameters: {},
    searchPagePath: 'search',
  },
}
```

### Local Search Plugin

```javascript
// Alternative to Algolia
plugins: [
  [
    '@easyops-cn/docusaurus-search-local',
    {
      hashed: true,
      language: ['en'],
      highlightSearchTermsOnTargetPage: true,
      explicitSearchResultPath: true,
    },
  ],
]
```

## 📱 PWA Configuration

### Manifest (`static/manifest.json`)

```json
{
  "name": "ASI Chain Documentation",
  "short_name": "ASI Docs",
  "theme_color": "#7FD67A",
  "background_color": "#ffffff",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "img/logo-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "img/logo-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🚀 Deployment

### Docker Build

```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Deployment Commands

```bash
# Build for production
npm run build

# Serve locally
npm run serve

# Deploy to GitHub Pages
npm run deploy

# Deploy to production
docker build -t asi-docs:latest .
docker run -d -p 3003:80 asi-docs:latest

# Deploy to S3
aws s3 sync build/ s3://docs.asichain.io --delete
aws cloudfront create-invalidation --distribution-id ABCD1234 --paths "/*"
```

## 🌍 Internationalization

### Adding Translations

```javascript
// docusaurus.config.js
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'zh', 'ja', 'ko'],
  localeConfigs: {
    en: { label: 'English' },
    zh: { label: '中文' },
    ja: { label: '日本語' },
    ko: { label: '한국어' },
  },
}
```

### Translation Files

```
i18n/
├── en/
│   ├── docusaurus-theme-classic/
│   └── docusaurus-plugin-content-docs/
├── zh/
│   ├── docusaurus-theme-classic/
│   └── docusaurus-plugin-content-docs/
```

## 🧪 Testing

### Build Testing

```bash
# Test build
npm run build

# Check for broken links
npm run build && npm run serve
# Then use a link checker tool

# Lighthouse audit
npx lighthouse http://localhost:3000 --view
```

## 📋 Content Guidelines

### Writing Style
- Clear and concise
- Use active voice
- Include code examples
- Add diagrams where helpful
- Keep paragraphs short

### Markdown Features
- Use admonitions (:::tip, :::caution)
- Include code blocks with syntax highlighting
- Add tabs for multiple options
- Use tables for structured data
- Include images with alt text

### SEO Best Practices
- Descriptive page titles
- Meta descriptions
- Proper heading hierarchy
- Internal linking
- Sitemap generation

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Docusaurus Version**: 3.8.1