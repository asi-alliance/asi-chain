# ASI Chain Documentation Site

This is the official documentation site for ASI Chain, built using [Docusaurus](https://docusaurus.io/) v3.8.1.

**Live Site:** https://13.251.66.61  
**Auto-Deployment:** Enabled via GitHub Actions

## Installation

```bash
npm install
```

## Local Development

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

### Automatic Deployment (Recommended)

Simply push changes to the main branch and GitHub Actions will automatically deploy to the AWS Lightsail server.

### Manual Deployment

```bash
./deployment/quick-deploy.sh
```

## Technical Writer Guide

See [TECHNICAL_WRITER_GUIDE.md](./TECHNICAL_WRITER_GUIDE.md) for instructions on how to update documentation without technical knowledge.

## GitHub Actions Setup

See [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) for CI/CD configuration details.
