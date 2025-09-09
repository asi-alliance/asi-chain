import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Account, Transaction, Network, WalletState } from 'types/wallet';
import { RChainService } from 'services/rchain';
import { SecureStorage } from 'services/secureStorage';
import TransactionHistoryService from 'services/transactionHistory';

const defaultNetworks: Network[] = [
  {
    id: 'custom',
    name: 'Custom Network',
    url: 'http://13.251.66.61:40413',
    readOnlyUrl: 'http://13.251.66.61:40453',
    graphqlUrl: 'http://13.251.66.61:8080/v1/graphql',
    shardId: 'root',
  },
  {
    id: 'mainnet',
    name: 'Mainnet',
    url: process.env.REACT_APP_FIREFLY_MAINNET_URL || 'http://13.251.66.61:40413',
    readOnlyUrl: process.env.REACT_APP_FIREFLY_MAINNET_READONLY_URL || 'http://13.251.66.61:40453',
    graphqlUrl: process.env.REACT_APP_FIREFLY_GRAPHQL_URL || 'http://13.251.66.61:8080/v1/graphql',
    shardId: '',
  },
  {
    id: 'testnet',
    name: 'Testnet',
    url: process.env.REACT_APP_FIREFLY_TESTNET_URL || 'http://13.251.66.61:40413',
    readOnlyUrl: process.env.REACT_APP_FIREFLY_TESTNET_READONLY_URL || 'http://13.251.66.61:40453',
    graphqlUrl: process.env.REACT_APP_FIREFLY_GRAPHQL_URL || 'http://13.251.66.61:8080/v1/graphql',
    shardId: 'testnet6',
  },
  {
    id: 'local',
    name: 'Local Network',
    url: process.env.REACT_APP_FIREFLY_LOCAL_URL || 'http://localhost:40403',
    readOnlyUrl: process.env.REACT_APP_FIREFLY_LOCAL_READONLY_URL || 'http://localhost:40453',
    adminUrl: process.env.REACT_APP_FIREFLY_LOCAL_ADMIN_URL || 'http://localhost:40405',
    graphqlUrl: process.env.REACT_APP_FIREFLY_LOCAL_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
    shardId: 'root',
  },
];

// Storage key for networks
const NETWORKS_STORAGE_KEY = 'asi_wallet_networks';

// Load networks from localStorage or use defaults
const loadNetworks = (): Network[] => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultNetworks;
  }
  
  try {
    const stored = localStorage.getItem(NETWORKS_STORAGE_KEY);
    if (stored) {
      const networks = JSON.parse(stored) as Network[];
      // Merge with defaults to ensure all default networks exist
      const networkMap = new Map<string, Network>();
      
      // Add stored networks first (to preserve user modifications)
      networks.forEach(n => networkMap.set(n.id, n));
      
      // Add default networks only if not already present
      defaultNetworks.forEach(n => {
        if (!networkMap.has(n.id)) {
          networkMap.set(n.id, n);
        }
      });
      
      return Array.from(networkMap.values());
    }
  } catch (error) {
    console.error('Failed to load networks from localStorage:', error);
  }
  return defaultNetworks;
};

// Save networks to localStorage
const saveNetworks = (networks: Network[]) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  
  try {
    localStorage.setItem(NETWORKS_STORAGE_KEY, JSON.stringify(networks));
  } catch (error) {
    console.error('Failed to save networks to localStorage:', error);
  }
};

// Lazy load networks to avoid SSR issues
const getInitialNetworks = () => {
  // For initial state, just use defaults
  // The actual loading from localStorage will happen in a useEffect
  return defaultNetworks;
};

const initialNetworks = getInitialNetworks();

// Load accounts from secure storage (without private keys)
const loadAccountsFromSecureStorage = (): Account[] => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  
  try {
    const secureAccounts = SecureStorage.getEncryptedAccounts();
    return secureAccounts.map(acc => ({
      ...acc,
      privateKey: undefined,
    } as Account));
  } catch (error) {
    console.error('Failed to load accounts from secure storage:', error);
    return [];
  }
};

// Create initial state with defensive defaults
const createInitialState = (): WalletState => {
  const networks = initialNetworks;
  const defaultNetwork = networks.find(n => n.id === 'custom') || networks[0];
  
  return {
    accounts: [], // Start with empty accounts, will be loaded later
    selectedAccount: null,
    transactions: [],
    networks: networks,
    selectedNetwork: defaultNetwork,
    isLoading: false,
    error: null,
  };
};

const initialState: WalletState = createInitialState();

export const fetchBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async ({ account, network }: { account: Account; network: Network }) => {
    const rchain = new RChainService(network.url, network.readOnlyUrl, network.adminUrl, network.shardId, network.graphqlUrl);
    const atomicBalance = await rchain.getBalance(account.revAddress);
    
    // Convert from atomic units to REV (divide by 100000000)
    const balance = (parseInt(atomicBalance) / 100000000).toString();
    
    return { accountId: account.id, balance };
  }
);

export const sendTransaction = createAsyncThunk(
  'wallet/sendTransaction',
  async ({
    from,
    to,
    amount,
    password,
    network,
  }: {
    from: Account;
    to: string;
    amount: string;
    password?: string;
    network: Network;
  }) => {
    // Get private key from unlocked account or decrypt with password
    let privateKey: string | undefined;
    
    // First try to get from session
    const unlockedAccount = SecureStorage.getUnlockedAccount(from.id);
    if (unlockedAccount?.privateKey) {
      privateKey = unlockedAccount.privateKey;
    } else if (password) {
      // Try to unlock with password
      const unlocked = SecureStorage.unlockAccount(from.id, password);
      if (unlocked?.privateKey) {
        privateKey = unlocked.privateKey;
      }
    }
    
    if (!privateKey) {
      throw new Error('Account is locked. Please provide password or unlock account first.');
    }
    
    const rchain = new RChainService(network.url, network.readOnlyUrl, network.adminUrl, network.shardId, network.graphqlUrl);
    
    // Convert amount to atomic units (REV has 8 decimal places)
    const atomicAmount = Math.floor(parseFloat(amount) * 100000000).toString();
    
    const deployId = await rchain.transfer(from.revAddress, to, atomicAmount, privateKey);
    
    const transaction: Transaction = {
      id: deployId,
      deployId,
      from: from.revAddress,
      to,
      amount,
      timestamp: new Date(),
      status: 'pending',
    };
    
    // Add to transaction history
    const historyTx = TransactionHistoryService.addTransaction({
      timestamp: new Date(),
      type: 'send',
      from: from.revAddress,
      to,
      amount: atomicAmount, // Store atomic amount
      deployId,
      status: 'pending',
      network: network.name
    });
    
    // Try to wait for confirmation (non-blocking) - wait up to 2 minutes
    rchain.waitForDeployResult(deployId, 24).then(result => {
      if (result.status === 'completed') {
        TransactionHistoryService.updateTransaction(historyTx.id, {
          status: 'confirmed',
          blockHash: result.blockHash,
          gasCost: result.cost?.toString()
        });
      } else if (result.status === 'errored' || result.status === 'system_error') {
        TransactionHistoryService.updateTransaction(historyTx.id, {
          status: 'failed'
        });
      }
    }).catch(error => {
      console.log('Could not get deploy result for transaction history:', error);
    });
    
    return transaction;
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    // Sync accounts from auth state - MERGE instead of replace
    syncAccounts: (state, action: PayloadAction<Account[]>) => {
      const newAccounts = action.payload.map(acc => ({
        ...acc,
        privateKey: undefined, // Never store private keys in wallet state
      }));
      
      // Merge new accounts with existing ones
      newAccounts.forEach(newAccount => {
        const existingIndex = state.accounts.findIndex(a => a.id === newAccount.id);
        if (existingIndex >= 0) {
          // Update existing account
          state.accounts[existingIndex] = newAccount;
        } else {
          // Add new account
          state.accounts.push(newAccount);
        }
      });
      
      // Update selected account if it exists in accounts
      if (state.selectedAccount) {
        const updated = state.accounts.find(a => a.id === state.selectedAccount!.id);
        if (updated) {
          state.selectedAccount = updated;
        } else {
          state.selectedAccount = state.accounts[0] || null;
        }
      } else if (state.accounts.length > 0) {
        state.selectedAccount = state.accounts[0];
      }
    },
    selectAccount: (state, action: PayloadAction<string>) => {
      const account = state.accounts.find(a => a.id === action.payload);
      if (account) {
        state.selectedAccount = account;
        // Save selected account ID to localStorage for persistence
        localStorage.setItem('selectedAccountId', action.payload);
      }
    },
    selectNetwork: (state, action: PayloadAction<string>) => {
      const network = state.networks.find(n => n.id === action.payload);
      if (network) {
        state.selectedNetwork = network;
      }
    },
    removeAccount: (state, action: PayloadAction<string>) => {
      // Remove from secure storage
      SecureStorage.removeAccount(action.payload);
      
      // Update state
      state.accounts = state.accounts.filter(a => a.id !== action.payload);
      if (state.selectedAccount?.id === action.payload) {
        state.selectedAccount = state.accounts[0] || null;
      }
    },
    updateAccountBalance: (state, action: PayloadAction<{ accountId: string; balance: string }>) => {
      const account = state.accounts.find(a => a.id === action.payload.accountId);
      if (account) {
        account.balance = action.payload.balance;
      }
      if (state.selectedAccount?.id === action.payload.accountId) {
        state.selectedAccount.balance = action.payload.balance;
      }
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
    updateNetwork: (state, action: PayloadAction<Network>) => {
      const index = state.networks.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        state.networks[index] = action.payload;
        // Update selected network if it's the one being edited
        if (state.selectedNetwork.id === action.payload.id) {
          state.selectedNetwork = action.payload;
        }
      }
      // Save to localStorage
      saveNetworks(state.networks);
    },
    addNetwork: (state, action: PayloadAction<Network>) => {
      // Generate a unique ID for the new network
      const timestamp = Date.now();
      const newNetwork = {
        ...action.payload,
        id: `custom-${timestamp}`
      };
      state.networks.push(newNetwork);
      // Save to localStorage
      saveNetworks(state.networks);
    },
    loadNetworksFromStorage: (state) => {
      const loadedNetworks = loadNetworks();
      state.networks = loadedNetworks;
      // Update selected network if it exists in loaded networks
      const selectedNetwork = loadedNetworks.find(n => n.id === state.selectedNetwork.id);
      if (selectedNetwork) {
        state.selectedNetwork = selectedNetwork;
      } else {
        state.selectedNetwork = loadedNetworks.find(n => n.id === 'custom') || loadedNetworks[0];
      }
    },
    loadAccountsFromStorage: (state) => {
      // Load accounts from SecureStorage
      try {
        const encryptedAccounts = SecureStorage.getEncryptedAccounts();
        const accounts = encryptedAccounts.map(acc => ({
          ...acc,
          privateKey: undefined, // Never store private keys in Redux state
        } as Account));
        
        state.accounts = accounts;
        
        // If there's a selected account ID in localStorage, restore it
        const selectedAccountId = localStorage.getItem('selectedAccountId');
        if (selectedAccountId && accounts.length > 0) {
          const selectedAccount = accounts.find(a => a.id === selectedAccountId);
          state.selectedAccount = selectedAccount || accounts[0];
        } else if (accounts.length > 0) {
          state.selectedAccount = accounts[0];
        }
      } catch (error) {
        console.error('Failed to load accounts from storage:', error);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        const account = state.accounts.find(a => a.id === action.payload.accountId);
        if (account) {
          account.balance = action.payload.balance;
        }
        if (state.selectedAccount?.id === action.payload.accountId) {
          state.selectedAccount.balance = action.payload.balance;
        }
        state.isLoading = false;
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch balance';
        state.isLoading = false;
      })
      .addCase(sendTransaction.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(sendTransaction.fulfilled, (state, action) => {
        state.transactions.unshift(action.payload);
        state.isLoading = false;
      })
      .addCase(sendTransaction.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to send transaction';
        state.isLoading = false;
      });
  },
});

export const {
  syncAccounts,
  selectAccount,
  selectNetwork,
  removeAccount,
  updateAccountBalance,
  addTransaction,
  clearError,
  updateNetwork,
  addNetwork,
  loadNetworksFromStorage,
  loadAccountsFromStorage,
} = walletSlice.actions;

export default walletSlice.reducer;