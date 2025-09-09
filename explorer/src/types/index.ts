// GraphQL Types
export interface Block {
  block_number: number;
  block_hash: string;
  parent_hash: string;
  timestamp: number;
  proposer: string;
  deployment_count: number;
  state_hash?: string;
  pre_state_hash?: string;
  state_root_hash?: string;
  bonds_map?: any;
  fault_tolerance?: number;
  finalization_status?: string;
  justifications?: any[];
  seq_num?: number;
  shard_id?: string;
  sig?: string;
  sig_algorithm?: string;
  version?: number;
  extra_bytes?: string;
  created_at: string;
  deployments?: Deployment[];
  validator_bonds?: ValidatorBond[];
}

export interface Deployment {
  deploy_id: string;
  deployer: string;
  term: string;
  timestamp: number;
  deployment_type?: string;
  phlo_cost?: number;
  phlo_price?: number;
  phlo_limit?: number;
  valid_after_block_number?: number;
  status?: string;
  block_number?: number;
  block_hash?: string;
  seq_num?: number;
  shard_id?: string;
  sig?: string;
  sig_algorithm?: string;
  errored: boolean;
  error_message?: string;
  created_at: string;
  transfers?: Transfer[];
  block?: Block;
}

export interface Transfer {
  id: number;
  deploy_id?: string;
  from_address: string;
  to_address: string;
  amount_rev: number | string;
  amount_dust?: number;
  status: string;
  block_number?: number | string;
  created_at: string;
  deployment?: Deployment;
  block?: Block;
}

export interface GenesisFunding {
  id: string;
  wallet_address: string;
  amount_dust: number;
  amount_rev: number;
  status: 'genesis_funding';
  timestamp: number;
  deploy_id: string;
  created_at: string;
}

export interface Validator {
  public_key: string;
  name?: string;
  status?: string;
  total_stake?: number;
  first_seen_block?: number;
  last_seen_block?: number;
  created_at: string;
  updated_at?: string;
  validator_bonds?: ValidatorBond[];
}

export interface ValidatorBond {
  id?: number;
  block_number: number;
  stake: number;
  block_hash?: string;
  validator_public_key?: string;
  validator?: Validator;
  block?: Block;
}

export interface NetworkStats {
  id?: number;
  total_validators?: number;
  active_validators?: number;
  validators_in_quarantine?: number;
  consensus_participation?: number;
  consensus_status?: string;
  block_number?: number;
  timestamp?: number;
  // Legacy fields (may not be present)
  total_blocks?: number;
  avg_block_time_seconds?: number;
  earliest_block_time?: number;
  latest_block_time?: number;
}

export interface AggregateData {
  count: number;
  avg?: {
    phlo_cost?: number;
  };
  sum?: {
    amount_rev?: number;
    phlo_cost?: number;
  };
}

// Component Props
export interface SearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export interface BlockCardProps {
  block: Block;
  showDetails?: boolean;
}

export interface TransferCardProps {
  transfer: Transfer;
  showDetails?: boolean;
}

export interface ValidatorCardProps {
  validator: Validator;
  showDetails?: boolean;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

// Utility Types
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

// Route Types
export type RouteParams = {
  blockNumber?: string;
  address?: string;
  deployId?: string;
  validatorKey?: string;
};

// Theme Types
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Error Types
export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    path?: string;
  };
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}