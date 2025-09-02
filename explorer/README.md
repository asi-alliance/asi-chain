# ASI Chain Explorer

## Overview

The ASI Chain Explorer is a web-based blockchain explorer for viewing and analyzing ASI Chain transactions, blocks, and network statistics.

## Status

🚧 **Implementation Pending** 🚧

The explorer frontend is currently under development. The infrastructure and backend services are ready:

- ✅ GraphQL API via Hasura (Port 8080)
- ✅ Indexer service with real-time data
- ✅ PostgreSQL database with full blockchain data
- ⏳ React 19 frontend (pending implementation)
- ⏳ Apollo GraphQL client integration (pending)

## Planned Features

- Block explorer with detailed block information
- Transaction viewer with input/output details
- Validator dashboard with staking information
- Network statistics and charts
- Smart contract interaction interface
- Search functionality for blocks, transactions, and addresses
- Real-time updates via GraphQL subscriptions

## Technology Stack

- **Frontend**: React 19, TypeScript
- **State Management**: Apollo Client
- **API**: GraphQL via Hasura
- **Styling**: Styled Components
- **Charts**: Recharts or D3.js
- **Build Tool**: Vite or Next.js

## Development

To start development on the explorer:

```bash
cd explorer
npm install
npm run dev
```

## API Access

The explorer connects to the following endpoints:

- **GraphQL**: http://localhost:8080/v1/graphql
- **REST API**: http://localhost:9090/api/v1

## Contributing

Please see the main [Contributing Guide](../CONTRIBUTING.md) for details on how to contribute to the explorer development.