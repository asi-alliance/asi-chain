export interface MultisigParticipant {
  address: string;
  name?: string;
  publicKey: string;
  isOwner: boolean;
}

export interface MultisigWalletConfig {
  id: string;
  name: string;
  description?: string;
  contractAddress?: string;
  participants: MultisigParticipant[];
  requiredSignatures: number;
  threshold: number; // minimum signatures required
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // address of creator
  status: 'pending' | 'deployed' | 'active' | 'disabled';
  network: string;
}

export interface MultisigTransaction {
  id: string;
  multisigWalletId: string;
  to: string;
  value: string;
  data?: string;
  nonce: number;
  gasLimit?: string;
  gasPrice?: string;
  signatures: MultisigSignature[];
  requiredSignatures: number;
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  executedAt?: Date;
  createdBy: string;
  title?: string;
  description?: string;
  transactionHash?: string;
}

export interface MultisigSignature {
  address: string;
  signature: string;
  signedAt: Date;
  publicKey?: string;
}

export interface MultisigProposal {
  id: string;
  multisigWalletId: string;
  type: 'transaction' | 'add_owner' | 'remove_owner' | 'change_threshold';
  title: string;
  description: string;
  proposedBy: string;
  createdAt: Date;
  expiresAt?: Date;
  votes: MultisigVote[];
  requiredVotes: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';
  data: any; // proposal-specific data
}

export interface MultisigVote {
  address: string;
  vote: 'approve' | 'reject';
  votedAt: Date;
  signature?: string;
}

export interface MultisigBalance {
  token: string;
  symbol: string;
  decimals: number;
  balance: string;
  usdValue?: string;
}

export interface MultisigActivity {
  id: string;
  multisigWalletId: string;
  type: 'transaction' | 'signature' | 'proposal' | 'deployment' | 'ownership_change';
  description: string;
  actor: string; // address of the person who performed the action
  timestamp: Date;
  transactionHash?: string;
  relatedId?: string; // ID of related transaction, proposal, etc.
  metadata?: Record<string, any>;
}

export interface CreateMultisigWalletRequest {
  name: string;
  description?: string;
  participants: Omit<MultisigParticipant, 'isOwner'>[];
  threshold: number;
  network: string;
}

export interface MultisigWalletStats {
  totalTransactions: number;
  pendingTransactions: number;
  totalValue: string;
  lastActivity?: Date;
  activeParticipants: number;
}

// Contract-related types
export interface MultisigContract {
  address: string;
  abi: any[];
  bytecode?: string;
  deployedAt?: Date;
  version: string;
}

export interface DeployMultisigRequest {
  owners: string[];
  threshold: number;
  gasLimit?: string;
  gasPrice?: string;
}

export interface MultisigContractCall {
  to: string;
  value: string;
  data: string;
  operation: 'call' | 'delegatecall' | 'create';
}

// Event types for real-time updates
export interface MultisigEvent {
  type: 'transaction_created' | 'transaction_signed' | 'transaction_executed' | 'proposal_created' | 'proposal_voted';
  walletId: string;
  data: any;
  timestamp: Date;
}

// Error types
export interface MultisigError {
  code: string;
  message: string;
  details?: any;
}

// API response types
export interface MultisigApiResponse<T> {
  success: boolean;
  data?: T;
  error?: MultisigError;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

// Storage types for local persistence
export interface MultisigLocalStorage {
  wallets: MultisigWalletConfig[];
  transactions: MultisigTransaction[];
  proposals: MultisigProposal[];
  lastSync: Date;
}

export type MultisigTransactionStatus = MultisigTransaction['status'];
export type MultisigWalletStatus = MultisigWalletConfig['status'];
export type MultisigProposalStatus = MultisigProposal['status'];