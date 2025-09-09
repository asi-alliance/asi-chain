import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// Use environment variables for external services
const GRAPHQL_HTTP_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
const GRAPHQL_WS_URL = process.env.REACT_APP_GRAPHQL_WS_URL || 'ws://localhost:8080/v1/graphql';

// Admin secret for Hasura (production servers require this)
// Note: In production, this should be handled by a backend proxy for security
const HASURA_ADMIN_SECRET = process.env.REACT_APP_HASURA_ADMIN_SECRET || '';
const AUTH_TOKEN = process.env.REACT_APP_AUTH_TOKEN || '';

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_URL,
  headers: {
    ...(HASURA_ADMIN_SECRET && { 'x-hasura-admin-secret': HASURA_ADMIN_SECRET }),
    ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
  },
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: {
      headers: {
        ...(HASURA_ADMIN_SECRET && { 'x-hasura-admin-secret': HASURA_ADMIN_SECRET }),
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
      },
    },
  })
);

// Split between HTTP and WebSocket links
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

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      blocks: {
        keyFields: ['block_number'],
      },
      deployments: {
        keyFields: ['deploy_id'],
      },
      transfers: {
        keyFields: ['id'],
      },
      validators: {
        keyFields: ['public_key'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;