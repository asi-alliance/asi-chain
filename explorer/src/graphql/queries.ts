import { gql } from '@apollo/client';

// Fragments
export const BLOCK_FRAGMENT = gql`
  fragment BlockFragment on blocks {
    block_number
    block_hash
    parent_hash
    timestamp
    proposer
    deployment_count
    state_hash
    pre_state_hash
    state_root_hash
    bonds_map
    fault_tolerance
    finalization_status
    justifications
    seq_num
    shard_id
    sig
    sig_algorithm
    version
    extra_bytes
    created_at
  }
`;

export const DEPLOYMENT_FRAGMENT = gql`
  fragment DeploymentFragment on deployments {
    deploy_id
    deployer
    term
    timestamp
    deployment_type
    phlo_cost
    phlo_price
    phlo_limit
    valid_after_block_number
    status
    block_number
    block_hash
    seq_num
    shard_id
    sig
    sig_algorithm
    errored
    error_message
    created_at
  }
`;

export const TRANSFER_FRAGMENT = gql`
  fragment TransferFragment on transfers {
    id
    deploy_id
    from_address
    to_address
    amount_rev
    amount_dust
    status
    block_number
    created_at
  }
`;

export const VALIDATOR_FRAGMENT = gql`
  fragment ValidatorFragment on validators {
    public_key
    name
    status
    total_stake
    first_seen_block
    last_seen_block
    created_at
    updated_at
  }
`;

// Queries
export const GET_LATEST_BLOCKS = gql`
  ${BLOCK_FRAGMENT}
  ${DEPLOYMENT_FRAGMENT}
  query GetLatestBlocks($limit: Int = 10, $offset: Int = 0) {
    blocks(
      limit: $limit
      offset: $offset
      order_by: { block_number: desc }
    ) {
      ...BlockFragment
      deployments {
        ...DeploymentFragment
      }
    }
  }
`;

export const SEARCH_BLOCKS_BY_HASH = gql`
  ${BLOCK_FRAGMENT}
  query SearchBlocksByHash($search: String!, $limit: Int = 10, $offset: Int = 0) {
    blocks(
      limit: $limit
      offset: $offset
      order_by: { block_number: desc }
      where: {
        block_hash: { _ilike: $search }
      }
    ) {
      ...BlockFragment
    }
  }
`;

export const SEARCH_BLOCKS_BY_NUMBER = gql`
  ${BLOCK_FRAGMENT}
  query SearchBlocksByNumber($blockNumber: bigint!, $limit: Int = 10, $offset: Int = 0) {
    blocks(
      limit: $limit
      offset: $offset
      order_by: { block_number: desc }
      where: {
        block_number: { _eq: $blockNumber }
      }
    ) {
      ...BlockFragment
    }
  }
`;

export const GET_BLOCK_DETAILS = gql`
  ${BLOCK_FRAGMENT}
  ${DEPLOYMENT_FRAGMENT}
  ${TRANSFER_FRAGMENT}
  query GetBlockDetails($blockNumber: bigint!) {
    blocks(where: { block_number: { _eq: $blockNumber } }) {
      ...BlockFragment
      deployments {
        ...DeploymentFragment
        transfers {
          ...TransferFragment
        }
      }
    }
  }
`;

export const SEARCH_BLOCKS = gql`
  ${BLOCK_FRAGMENT}
  query SearchBlocks($hashPrefix: String!) {
    blocks(
      where: { block_hash: { _like: $hashPrefix } }
      limit: 10
      order_by: { block_number: desc }
    ) {
      ...BlockFragment
    }
  }
`;

export const GET_ALL_TRANSFERS = gql`
  ${TRANSFER_FRAGMENT}
  query GetAllTransfers($limit: Int = 50, $offset: Int = 0) {
    transfers(
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      ...TransferFragment
      deployment {
        deploy_id
        block_number
        timestamp
        errored
      }
    }
  }
`;

export const GET_LATEST_TRANSFERS = gql`
  ${TRANSFER_FRAGMENT}
  query GetLatestTransfers($limit: Int = 5) {
    transfers(
      limit: $limit
      order_by: { created_at: desc }
    ) {
      ...TransferFragment
    }
  }
`;

export const GET_LATEST_DEPLOYMENTS = gql`
  ${DEPLOYMENT_FRAGMENT}
  query GetLatestDeployments($limit: Int = 5) {
    deployments(
      limit: $limit
      order_by: { timestamp: desc }
    ) {
      ...DeploymentFragment
    }
  }
`;

export const GET_ADDRESS_TRANSFERS = gql`
  ${TRANSFER_FRAGMENT}
  query GetAddressTransfers($address: String!, $limit: Int = 20) {
    transfers(
      where: {
        _or: [
          { from_address: { _eq: $address } }
          { to_address: { _eq: $address } }
        ]
      }
      limit: $limit
      order_by: { created_at: desc }
    ) {
      ...TransferFragment
    }
  }
`;

export const GET_ACTIVE_VALIDATORS = gql`
  ${VALIDATOR_FRAGMENT}
  query GetActiveValidators {
    validators(order_by: { total_stake: desc }) {
      ...ValidatorFragment
    }
    # Get validator bonds separately since there's no relationship
    validator_bonds(order_by: { block_number: desc }, limit: 100) {
      validator_public_key
      stake
      block_number
    }
    # Get recent blocks to count proposers client-side
    blocks(limit: 1000, order_by: { block_number: desc }) {
      block_number
      proposer
    }
  }
`;

export const GET_NETWORK_STATS = gql`
  query GetNetworkStats {
    network_stats(limit: 1, order_by: {id: desc}) {
      id
      total_validators
      active_validators
      validators_in_quarantine
      consensus_participation
      consensus_status
      block_number
      timestamp
    }
  }
`;

export const GET_DEPLOYMENTS_BY_TYPE = gql`
  query GetDeploymentsByType {
    deployments_aggregate(group_by: deployment_type) {
      aggregate {
        count
        avg {
          phlo_cost
        }
        sum {
          phlo_cost
        }
      }
      nodes {
        deployment_type
      }
    }
  }
`;

// Subscriptions
export const SUBSCRIBE_TO_NEW_BLOCKS = gql`
  ${BLOCK_FRAGMENT}
  ${DEPLOYMENT_FRAGMENT}
  subscription SubscribeToNewBlocks($limit: Int = 5) {
    blocks(
      limit: $limit
      order_by: { block_number: desc }
    ) {
      ...BlockFragment
      deployments {
        ...DeploymentFragment
      }
    }
  }
`;

export const SUBSCRIBE_TO_NEW_TRANSFERS = gql`
  ${TRANSFER_FRAGMENT}
  subscription SubscribeToNewTransfers($limit: Int = 10) {
    transfers(
      limit: $limit
      order_by: { created_at: desc }
    ) {
      ...TransferFragment
    }
  }
`;

export const SUBSCRIBE_TO_NETWORK_ACTIVITY = gql`
  subscription SubscribeToNetworkActivity {
    blocks(limit: 1, order_by: { block_number: desc }) {
      block_number
      timestamp
      deployment_count
    }
    transfers(limit: 1, order_by: { created_at: desc }) {
      id
      amount_rev
      created_at
    }
  }
`;

export const SUBSCRIBE_TO_NETWORK_STATS = gql`
  subscription SubscribeToNetworkStats {
    network_stats {
      total_blocks
      avg_block_time_seconds
      earliest_block_time
      latest_block_time
    }
    blocks_aggregate {
      aggregate {
        count
        max {
          block_number
        }
      }
    }
    deployments_aggregate {
      aggregate {
        count
        avg {
          phlo_cost
        }
      }
    }
    deployments_aggregate_failed: deployments_aggregate(where: {errored: {_eq: true}}) {
      aggregate {
        count
      }
    }
    transfers_aggregate {
      aggregate {
        count
        sum {
          amount_rev
        }
        avg {
          amount_rev
        }
      }
    }
    transfers_aggregate_failed: transfers_aggregate(where: {status: {_neq: "success"}}) {
      aggregate {
        count
      }
    }
    validators_aggregate {
      aggregate {
        count
      }
    }
    validator_bonds_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const SUBSCRIBE_TO_NEW_DEPLOYMENTS = gql`
  ${DEPLOYMENT_FRAGMENT}
  subscription SubscribeToNewDeployments($limit: Int = 20) {
    deployments(
      limit: $limit
      order_by: { created_at: desc }
    ) {
      ...DeploymentFragment
    }
  }
`;

// Genesis Funding Query
export const GET_GENESIS_FUNDING_DEPLOYMENT = gql`
  query GetGenesisFundingDeployment {
    deployments(
      where: {
        deploy_id: {_eq: "3045022100f39285089f6e50247620e71b79161ddc371c94e453f6bc12afd78bfe857640dd0220614965bda9c405816d6b5c7af9ad415149593a08e763835b621769059402524e"}
      }
    ) {
      deploy_id
      term
      timestamp
      deployment_type
      created_at
      block_number
    }
  }
`;

// Indexer Status Query
export const GET_INDEXER_STATUS = gql`
  query GetIndexerStatus {
    blocks(order_by: { block_number: desc }, limit: 1) {
      block_number
      timestamp
    }
  }
`;