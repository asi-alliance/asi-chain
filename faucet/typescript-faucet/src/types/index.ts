export interface Deploy {
  term: string;
  phloLimit: number;
  phloPrice: number;
  validAfterBlockNumber: number;
  timestamp: number;
  shardId?: string;
}

export interface SignedDeploy extends Deploy {
  deployer: string;
  sig: string;
  sigAlgorithm: string;
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
  ethAddress: string;
  revAddress: string;
}

export interface FaucetRequest {
  id?: number;
  address: string;
  amount: number;
  deployId?: string;
  ipAddress: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'failed';
}

export interface DailyLimit {
  address: string;
  date: string;
  totalAmount: number;
  requestCount: number;
}

export interface FaucetStats {
  balance: number;
  distributed: number;
  status: 'online' | 'offline';
  totalRequests?: number;
  pendingRequests?: number;
}

export interface FaucetConfig {
  privateKey: string;
  faucetAmount: number;
  validatorUrl: string;
  readOnlyUrl: string;
  graphqlUrl?: string;
  phloLimit: number;
  phloPrice: number;
  maxRequestsPerDay: number;
  maxRequestsPerHour: number;
  databasePath: string;
}

export type TransferResult = 
  | {
      success: true;
      deployId: string;
      message: string;
    }
  | {
      success: false;
      error: string;
    };