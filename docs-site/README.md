# ASI Chain Documentation Site

This is the official documentation site for ASI Chain, built using [Docusaurus](https://docusaurus.io/) v3.8.1.

**Live Site:** http://13.251.66.61:3003  
**Status:** ✅ Deployed  
**Platform:** AWS Lightsail (Docker)  
**Auto-Deployment:** Enabled via GitHub Actions

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build locally
npm run serve
```

## Docker Deployment

The documentation site is containerized for easy deployment:

```bash
# Build Docker image
docker-compose build

# Run locally
docker-compose up -d

# Access at http://localhost:3003
```

## Production Deployment

### AWS Lightsail Deployment (Current)

The site is deployed on AWS Lightsail using Docker:

- **URL:** http://13.251.66.61:3003
- **Container:** asi-docs
- **Port:** 3003
- **Architecture:** Multi-stage Docker build (Node.js for building, Nginx for serving)

### Automatic Deployment (GitHub Actions)

Simply push changes to the main branch and GitHub Actions will automatically deploy to the AWS Lightsail server.

### Manual Deployment

```bash
# Option 1: Quick deploy script
./deployment/quick-deploy.sh

# Option 2: Docker deployment
docker-compose build --no-cache
docker-compose up -d
```

For detailed deployment instructions, see [AWS_LIGHTSAIL_DOCS_DEPLOYMENT.md](../AWS_LIGHTSAIL_DOCS_DEPLOYMENT.md)

## Technical Writer Guide

See [TECHNICAL_WRITER_GUIDE.md](./TECHNICAL_WRITER_GUIDE.md) for instructions on how to update documentation without technical knowledge.

## GitHub Actions Setup

See [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) for CI/CD configuration details.
