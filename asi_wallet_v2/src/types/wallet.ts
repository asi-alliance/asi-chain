export interface Account {
  id: string;
  name: string;
  address: string;
  revAddress: string;
  ethAddress: string;
  publicKey: string;
  privateKey?: string;
  balance: string;
  isMetamask?: boolean;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  deployId: string;
  from: string;
  to: string;
  amount: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  blockNumber?: number;
  error?: string;
}

export interface Deploy {
  term: string;
  phloLimit: number;
  phloPrice: number;
  validAfterBlockNumber: number;
  timestamp: number;
}

export interface Network {
  id: string;
  name: string;
  url: string;
  readOnlyUrl?: string;
  adminUrl?: string;
  graphqlUrl?: string;
  shardId?: string;
}

export interface WalletState {
  accounts: Account[];
  selectedAccount: Account | null;
  transactions: Transaction[];
  networks: Network[];
  selectedNetwork: Network;
  isLoading: boolean;
  error: string | null;
}