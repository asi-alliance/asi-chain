# Blockchain Explorer Component Guide

## 🔍 Component Overview

The ASI Chain Explorer is a React 19 application that provides real-time blockchain data visualization using Apollo GraphQL Client with WebSocket subscriptions for live updates.

```
explorer/
├── src/
│   ├── components/         # React components
│   ├── pages/             # Route pages
│   ├── graphql/           # GraphQL queries & subscriptions
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── services/          # API services
│   ├── types/             # TypeScript definitions
│   └── styles/            # CSS modules & global styles
├── public/                # Static assets
├── archive/               # Non-essential files (moved)
└── deploy-docker.sh       # Automated deployment script
```

## 🏗️ Architecture

### Component Structure

```
App.tsx
├── ApolloProvider
│   └── GraphQL Client Configuration
├── Router
│   ├── Layout
│   │   ├── Header
│   │   │   ├── Logo
│   │   │   ├── SearchBar
│   │   │   └── NetworkStatus
│   │   ├── Navigation
│   │   └── Footer
│   └── Routes
│       ├── Home
│       │   ├── LatestBlocks
│       │   ├── RecentTransactions
│       │   └── NetworkStats
│       ├── Blocks
│       │   ├── BlockList
│       │   └── BlockDetails
│       ├── Transactions
│       │   ├── TransactionList
│       │   └── TransactionDetails
│       ├── Validators
│       │   ├── ValidatorList (v1.0.2 - deduplication fix)
│       │   └── ValidatorDetails
│       ├── Address
│       │   ├── AddressInfo
│       │   └── AddressTransactions
│       └── Statistics
│           └── NetworkDashboard
```

## 💻 Core Components

### 1. Block Components (`src/components/Blocks/`)

```typescript
// BlockList.tsx - Display blocks with real-time updates
const BlockList: React.FC = () => {
  const { data, loading, subscribeToMore } = useQuery(GET_BLOCKS);
  
  useEffect(() => {
    // Subscribe to new blocks
    const unsubscribe = subscribeToMore({
      document: BLOCK_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newBlock = subscriptionData.data.blocks[0];
        return {
          blocks: [newBlock, ...prev.blocks.slice(0, -1)]
        };
      }
    });
    return () => unsubscribe();
  }, [subscribeToMore]);
  
  return (
    <VirtualList
      items={data?.blocks || []}
      renderItem={(block) => <BlockItem {...block} />}
    />
  );
};

// BlockDetails.tsx - Detailed block view
interface BlockDetailsProps {
  blockNumber: number;
}

const BlockDetails: React.FC<BlockDetailsProps> = ({ blockNumber }) => {
  const { data, loading } = useQuery(GET_BLOCK_DETAILS, {
    variables: { blockNumber }
  });
  
  return (
    <Card>
      <h2>Block #{blockNumber}</h2>
      <DataGrid>
        <DataRow label="Hash" value={data?.block.hash} />
        <DataRow label="Timestamp" value={formatTime(data?.block.timestamp)} />
        <DataRow label="Validator" value={data?.block.validator} />
        <DataRow label="Deployments" value={data?.block.deployments_count} />
      </DataGrid>
      <DeploymentList deployments={data?.block.deployments} />
    </Card>
  );
};
```

### 2. Transaction Components (`src/components/Transactions/`)

```typescript
// TransactionList.tsx - Paginated transaction list
const TransactionList: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, loading, fetchMore } = useQuery(GET_TRANSACTIONS, {
    variables: { 
      limit: 50, 
      offset: (page - 1) * 50 
    }
  });
  
  const handleLoadMore = () => {
    fetchMore({
      variables: { offset: page * 50 },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          deployments: [...prev.deployments, ...fetchMoreResult.deployments]
        };
      }
    });
    setPage(page + 1);
  };
  
  return (
    <>
      <TransactionTable transactions={data?.deployments} />
      <LoadMoreButton onClick={handleLoadMore} disabled={loading} />
    </>
  );
};

// TransactionDetails.tsx - Single transaction view
const TransactionDetails: React.FC<{ deployId: string }> = ({ deployId }) => {
  const { data } = useQuery(GET_TRANSACTION, {
    variables: { deployId }
  });
  
  const tx = data?.deployment;
  
  return (
    <DetailView>
      <Section title="Transaction Information">
        <DataRow label="Deploy ID" value={tx?.deploy_id} copyable />
        <DataRow label="Block" value={tx?.block_number} link={`/block/${tx?.block_number}`} />
        <DataRow label="Deployer" value={tx?.deployer} link={`/address/${tx?.deployer}`} />
        <DataRow label="Cost" value={`${tx?.cost} REV`} />
        <DataRow label="Status" value={tx?.error_message ? 'Failed' : 'Success'} />
      </Section>
      
      {tx?.error_message && (
        <ErrorSection>
          <h3>Error</h3>
          <pre>{tx.error_message}</pre>
        </ErrorSection>
      )}
      
      <Section title="Rholang Code">
        <CodeBlock language="rholang">{tx?.term}</CodeBlock>
      </Section>
    </DetailView>
  );
};
```

### 3. Validator Components (`src/components/Validators/`)

```typescript
// ValidatorList.tsx - Fixed in v1.0.2 for deduplication
const ValidatorList: React.FC = () => {
  const { data } = useQuery(GET_VALIDATORS);
  
  // v1.0.2 FIX: Deduplicate validators
  const uniqueValidators = useMemo(() => {
    if (!data?.validator_bonds) return [];
    
    const validatorMap = new Map();
    data.validator_bonds.forEach(bond => {
      const existing = validatorMap.get(bond.validator);
      if (!existing || bond.block_number > existing.block_number) {
        validatorMap.set(bond.validator, bond);
      }
    });
    
    return Array.from(validatorMap.values());
  }, [data]);
  
  return (
    <ValidatorGrid>
      {uniqueValidators.map(validator => (
        <ValidatorCard key={validator.validator}>
          <h3>{truncateAddress(validator.validator)}</h3>
          <p>Stake: {formatREV(validator.stake)}</p>
          <p>Status: Active</p>
        </ValidatorCard>
      ))}
    </ValidatorGrid>
  );
};

// ValidatorDetails.tsx - Individual validator stats
const ValidatorDetails: React.FC<{ address: string }> = ({ address }) => {
  const { data: validatorData } = useQuery(GET_VALIDATOR_DETAILS, {
    variables: { address }
  });
  
  const { data: blocksData } = useQuery(GET_VALIDATOR_BLOCKS, {
    variables: { validator: address }
  });
  
  return (
    <Container>
      <ValidatorHeader>
        <h1>Validator Details</h1>
        <Address>{address}</Address>
      </ValidatorHeader>
      
      <StatsGrid>
        <StatCard title="Total Stake" value={formatREV(validatorData?.stake)} />
        <StatCard title="Blocks Proposed" value={blocksData?.blocks_aggregate.count} />
        <StatCard title="Success Rate" value="99.9%" />
        <StatCard title="Uptime" value="100%" />
      </StatsGrid>
      
      <Section title="Recent Blocks">
        <BlockTable blocks={blocksData?.blocks} />
      </Section>
    </Container>
  );
};
```

### 4. Search Component (`src/components/Search/`)

```typescript
// SearchBar.tsx - Universal search
const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    
    // Detect search type
    if (/^\d+$/.test(query)) {
      // Block number
      navigate(`/block/${query}`);
    } else if (/^[0-9a-f]{64}$/i.test(query)) {
      // Transaction hash
      navigate(`/transaction/${query}`);
    } else if (/^1111[1-9A-HJ-NP-Za-km-z]{30,}$/.test(query)) {
      // Address
      navigate(`/address/${query}`);
    } else {
      // General search
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  
  return (
    <SearchForm onSubmit={handleSearch}>
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by block, transaction, or address..."
      />
      <SearchButton type="submit">
        <SearchIcon />
      </SearchButton>
    </SearchForm>
  );
};
```

### 5. Statistics Dashboard (`src/components/Statistics/`)

```typescript
// NetworkDashboard.tsx - Simplified in v1.0.2
const NetworkDashboard: React.FC = () => {
  const { data: statsData } = useQuery(GET_NETWORK_STATS);
  const { data: chartData } = useQuery(GET_CHART_DATA);
  
  return (
    <Dashboard>
      <MetricsRow>
        <MetricCard
          title="Total Blocks"
          value={statsData?.blocks_aggregate.count}
          change="+120 today"
        />
        <MetricCard
          title="Total Transactions"
          value={statsData?.deployments_aggregate.count}
          change="+1,234 today"
        />
        <MetricCard
          title="Active Validators"
          value={statsData?.validators_count}
          change="No change"
        />
        <MetricCard
          title="Network Stake"
          value={formatREV(statsData?.total_stake)}
          change="+1000 REV"
        />
      </MetricsRow>
      
      <ChartsGrid>
        <ChartCard title="Blocks Per Day">
          <LineChart data={chartData?.blocks_per_day} />
        </ChartCard>
        <ChartCard title="Transaction Volume">
          <AreaChart data={chartData?.tx_volume} />
        </ChartCard>
        <ChartCard title="Validator Performance">
          <BarChart data={chartData?.validator_stats} />
        </ChartCard>
        <ChartCard title="Network Activity">
          <HeatMap data={chartData?.activity_map} />
        </ChartCard>
      </ChartsGrid>
    </Dashboard>
  );
};
```

## 📡 GraphQL Integration

### Apollo Client Setup

```typescript
// apollo/client.ts
import { ApolloClient, InMemoryCache, split } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { HttpLink } from '@apollo/client/link/http';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({
  uri: process.env.REACT_APP_GRAPHQL_HTTP_URL,
  headers: {
    'x-hasura-admin-secret': process.env.REACT_APP_HASURA_SECRET
  }
});

const wsLink = new WebSocketLink({
  uri: process.env.REACT_APP_GRAPHQL_WS_URL,
  options: {
    reconnect: true,
    connectionParams: {
      headers: {
        'x-hasura-admin-secret': process.env.REACT_APP_HASURA_SECRET
      }
    }
  }
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          blocks: {
            keyArgs: false,
            merge(existing = [], incoming) {
              return [...incoming, ...existing];
            }
          }
        }
      }
    }
  })
});
```

### GraphQL Queries

```graphql
# graphql/queries/blocks.graphql
query GetBlocks($limit: Int!, $offset: Int) {
  blocks(
    limit: $limit
    offset: $offset
    order_by: { block_number: desc }
  ) {
    block_number
    block_hash
    timestamp
    validator
    deployments_count
  }
}

query GetBlockDetails($blockNumber: bigint!) {
  blocks_by_pk(block_number: $blockNumber) {
    block_number
    block_hash
    parent_hash
    timestamp
    validator
    deployments {
      deploy_id
      deployer
      cost
      error_message
    }
    validator_bonds {
      validator
      stake
    }
  }
}

# graphql/subscriptions/blocks.graphql
subscription NewBlocks {
  blocks(
    limit: 1
    order_by: { block_number: desc }
  ) {
    block_number
    block_hash
    timestamp
    validator
    deployments_count
  }
}
```

## 🎨 UI Components

### Design System

```typescript
// components/ui/Card.tsx
export const Card = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

// components/ui/Table.tsx
export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    background: ${props => props.theme.colors.primary}10;
    padding: 12px;
    text-align: left;
    font-weight: 600;
  }
  
  td {
    padding: 12px;
    border-bottom: 1px solid ${props => props.theme.colors.border};
  }
  
  tr:hover {
    background: ${props => props.theme.colors.hover};
  }
`;

// components/ui/Badge.tsx
interface BadgeProps {
  variant: 'success' | 'error' | 'warning' | 'info';
}

export const Badge = styled.span<BadgeProps>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  
  ${props => {
    switch (props.variant) {
      case 'success':
        return `
          background: #4CAF5020;
          color: #4CAF50;
        `;
      case 'error':
        return `
          background: #FF525220;
          color: #FF5252;
        `;
      default:
        return `
          background: #7FD67A20;
          color: #7FD67A;
        `;
    }
  }}
`;
```

### Charts with Recharts

```typescript
// components/charts/LineChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BlocksChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="blocks" 
          stroke="#7FD67A" 
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

## 🔧 Services & Utilities

### API Service

```typescript
// services/ExplorerAPI.ts
class ExplorerAPI {
  private baseURL: string;
  
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:9090';
  }
  
  async getNetworkStats(): Promise<NetworkStats> {
    const response = await fetch(`${this.baseURL}/stats`);
    return response.json();
  }
  
  async searchGlobal(query: string): Promise<SearchResults> {
    const response = await fetch(`${this.baseURL}/search?q=${encodeURIComponent(query)}`);
    return response.json();
  }
  
  async exportTransactions(address: string, format: 'csv' | 'json'): Promise<Blob> {
    const response = await fetch(
      `${this.baseURL}/export/${address}?format=${format}`
    );
    return response.blob();
  }
}
```

### Utility Functions

```typescript
// utils/format.ts
export const formatREV = (amount: string | number): string => {
  const rev = BigInt(amount) / BigInt(100000000);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  }).format(Number(rev)) + ' REV';
};

export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 6lt;60000) return 'Just now';
  if (diff < 3lt;3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 8lt;86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString();
};

export const truncateAddress = (address: string, chars = 8): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const copyToClipboard = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard!');
};
```

## 🚀 Performance Optimizations

### 1. Virtual Scrolling

```typescript
// components/VirtualBlockList.tsx
import { VariableSizeList } from 'react-window';

const VirtualBlockList: React.FC<{ blocks: Block[] }> = ({ blocks }) => {
  const getItemSize = () => 60; // Fixed height for blocks
  
  return (
    <VariableSizeList
      height={600}
      itemCount={blocks.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <BlockRow block={blocks[index]} />
        </div>
      )}
    </VariableSizeList>
  );
};
```

### 2. Query Optimization

```typescript
// hooks/useBlocksQuery.ts
const useBlocksQuery = (page: number) => {
  return useQuery(GET_BLOCKS, {
    variables: { 
      limit: 50, 
      offset: (page - 1) * 50 
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true
  });
};
```

### 3. Subscription Management

```typescript
// hooks/useBlockSubscription.ts
const useBlockSubscription = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  
  useSubscription(BLOCK_SUBSCRIPTION, {
    onData: ({ data }) => {
      if (data?.data?.blocks?.[0]) {
        setBlocks(prev => {
          const newBlocks = [data.data.blocks[0], ...prev];
          return newBlocks.slice(0, 100); // Keep only latest 100
        });
      }
    }
  });
  
  return blocks;
};
```

## 🧪 Testing

### Component Tests

```typescript
// __tests__/components/BlockList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';

const mocks = [
  {
    request: {
      query: GET_BLOCKS,
      variables: { limit: 50, offset: 0 }
    },
    result: {
      data: {
        blocks: [
          { block_number: 1000, validator: 'validator1', timestamp: '2025-09-10' }
        ]
      }
    }
  }
];

describe('BlockList', () => {
  it('renders blocks correctly', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <BlockList />
      </MockedProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('validator1')).toBeInTheDocument();
    });
  });
});
```

## 🐛 Known Issues & Fixes

### v1.0.2 Fixes

```typescript
// Issue: Validator duplication (showing 6 instead of 3)
// Fix: Deduplicate validators by address
const uniqueValidators = Array.from(
  new Map(validators.map(v => [v.address, v])).values()
);

// Issue: Complex statistics page
// Fix: Simplified to Network Dashboard only
// Removed: Detailed analytics, Historical charts

// Issue: Slow initial load
// Fix: Implement progressive loading
const { data, loading, fetchMore } = useQuery(GET_BLOCKS, {
  variables: { limit: 20 }, // Start with fewer items
  notifyOnNetworkStatusChange: true
});
```

## 📦 Deployment

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

### Deployment Script

```bash
#!/bin/bash
# deploy-docker.sh
case "$1" in
  start)
    docker run -d --name asi-explorer -p 3001:80 asi-explorer:latest
    ;;
  rebuild)
    docker stop asi-explorer
    docker rm asi-explorer
    docker build -t asi-explorer:latest .
    docker run -d --name asi-explorer -p 3001:80 asi-explorer:latest
    ;;
  status)
    docker ps | grep asi-explorer
    ;;
  logs)
    docker logs asi-explorer --tail 50 -f
    ;;
  stop)
    docker stop asi-explorer
    docker rm asi-explorer
    ;;
esac
```

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Component Version**: 1.0.2