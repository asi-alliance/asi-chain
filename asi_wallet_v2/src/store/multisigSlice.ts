import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  MultisigWalletConfig, 
  MultisigTransaction, 
  MultisigActivity, 
  CreateMultisigWalletRequest,
  MultisigBalance,
  DeployMultisigRequest
} from '../types/multisig';
import { multisigWalletService } from '../services/multisigWallet';

export interface MultisigState {
  wallets: MultisigWalletConfig[];
  selectedWallet: MultisigWalletConfig | null;
  transactions: MultisigTransaction[];
  activities: MultisigActivity[];
  balances: MultisigBalance[];
  isLoading: boolean;
  isCreating: boolean;
  isDeploying: boolean;
  isSigning: boolean;
  isExecuting: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const initialState: MultisigState = {
  wallets: [],
  selectedWallet: null,
  transactions: [],
  activities: [],
  balances: [],
  isLoading: false,
  isCreating: false,
  isDeploying: false,
  isSigning: false,
  isExecuting: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const loadMultisigWallets = createAsyncThunk(
  'multisig/loadWallets',
  async (_, { rejectWithValue }) => {
    try {
      const wallets = await multisigWalletService.getAllWallets();
      return wallets;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load wallets');
    }
  }
);

export const createMultisigWallet = createAsyncThunk(
  'multisig/createWallet',
  async (request: CreateMultisigWalletRequest, { rejectWithValue }) => {
    try {
      const wallet = await multisigWalletService.createMultisigWallet(request);
      return wallet;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create wallet');
    }
  }
);

export const deployMultisigWallet = createAsyncThunk(
  'multisig/deployWallet',
  async ({ walletId, deployRequest }: { walletId: string; deployRequest?: DeployMultisigRequest }, { rejectWithValue }) => {
    try {
      const contractAddress = await multisigWalletService.deployMultisigWallet(walletId, deployRequest);
      const updatedWallet = await multisigWalletService.getWallet(walletId);
      return { contractAddress, wallet: updatedWallet };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to deploy wallet');
    }
  }
);

export const loadWalletDetails = createAsyncThunk(
  'multisig/loadWalletDetails',
  async (walletId: string, { rejectWithValue }) => {
    try {
      const [wallet, transactions, activities] = await Promise.all([
        multisigWalletService.getWallet(walletId),
        multisigWalletService.getWalletTransactions(walletId),
        multisigWalletService.getWalletActivity(walletId)
      ]);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      let balances: MultisigBalance[] = [];
      if (wallet.contractAddress) {
        balances = await multisigWalletService.getWalletBalance(wallet.contractAddress);
      }

      return { wallet, transactions, activities, balances };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load wallet details');
    }
  }
);

export const createMultisigTransaction = createAsyncThunk(
  'multisig/createTransaction',
  async (
    { walletId, to, value, data, title, description }: {
      walletId: string;
      to: string;
      value: string;
      data?: string;
      title?: string;
      description?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const transaction = await multisigWalletService.createTransaction(
        walletId,
        to,
        value,
        data,
        title,
        description
      );
      return transaction;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  }
);

export const signMultisigTransaction = createAsyncThunk(
  'multisig/signTransaction',
  async (transactionId: string, { rejectWithValue, dispatch }) => {
    try {
      const signature = await multisigWalletService.signTransaction(transactionId);
      
      // Reload transactions to get updated state
      // We'll need the wallet ID for this, so we'll fetch the transaction first
      // This is a simplified approach - in production you might want to optimize this
      
      return { transactionId, signature };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to sign transaction');
    }
  }
);

export const executeMultisigTransaction = createAsyncThunk(
  'multisig/executeTransaction',
  async (transactionId: string, { rejectWithValue }) => {
    try {
      const txHash = await multisigWalletService.executeTransaction(transactionId);
      return { transactionId, txHash };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to execute transaction');
    }
  }
);

export const deleteMultisigWallet = createAsyncThunk(
  'multisig/deleteWallet',
  async (walletId: string, { rejectWithValue }) => {
    try {
      await multisigWalletService.deleteWallet(walletId);
      return walletId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete wallet');
    }
  }
);

const multisigSlice = createSlice({
  name: 'multisig',
  initialState,
  reducers: {
    selectWallet: (state, action: PayloadAction<MultisigWalletConfig | null>) => {
      state.selectedWallet = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateWallet: (state, action: PayloadAction<MultisigWalletConfig>) => {
      const index = state.wallets.findIndex(w => w.id === action.payload.id);
      if (index >= 0) {
        state.wallets[index] = action.payload;
      }
      if (state.selectedWallet?.id === action.payload.id) {
        state.selectedWallet = action.payload;
      }
    },
    updateTransaction: (state, action: PayloadAction<MultisigTransaction>) => {
      const index = state.transactions.findIndex(tx => tx.id === action.payload.id);
      if (index >= 0) {
        state.transactions[index] = action.payload;
      }
    },
    addActivity: (state, action: PayloadAction<MultisigActivity>) => {
      state.activities.unshift(action.payload);
      // Keep only last 50 activities in state
      if (state.activities.length > 50) {
        state.activities.splice(50);
      }
    },
    resetState: (state) => {
      state.selectedWallet = null;
      state.transactions = [];
      state.activities = [];
      state.balances = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load wallets
      .addCase(loadMultisigWallets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMultisigWallets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.wallets = action.payload;
        state.lastUpdated = new Date();
      })
      .addCase(loadMultisigWallets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create wallet
      .addCase(createMultisigWallet.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createMultisigWallet.fulfilled, (state, action) => {
        state.isCreating = false;
        state.wallets.push(action.payload);
        state.selectedWallet = action.payload;
      })
      .addCase(createMultisigWallet.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      
      // Deploy wallet
      .addCase(deployMultisigWallet.pending, (state) => {
        state.isDeploying = true;
        state.error = null;
      })
      .addCase(deployMultisigWallet.fulfilled, (state, action) => {
        state.isDeploying = false;
        if (action.payload.wallet) {
          const index = state.wallets.findIndex(w => w.id === action.payload.wallet!.id);
          if (index >= 0) {
            state.wallets[index] = action.payload.wallet;
          }
          if (state.selectedWallet?.id === action.payload.wallet.id) {
            state.selectedWallet = action.payload.wallet;
          }
        }
      })
      .addCase(deployMultisigWallet.rejected, (state, action) => {
        state.isDeploying = false;
        state.error = action.payload as string;
      })
      
      // Load wallet details
      .addCase(loadWalletDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadWalletDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedWallet = action.payload.wallet;
        state.transactions = action.payload.transactions;
        state.activities = action.payload.activities;
        state.balances = action.payload.balances;
        state.lastUpdated = new Date();
      })
      .addCase(loadWalletDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create transaction
      .addCase(createMultisigTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMultisigTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions.unshift(action.payload);
      })
      .addCase(createMultisigTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Sign transaction
      .addCase(signMultisigTransaction.pending, (state) => {
        state.isSigning = true;
        state.error = null;
      })
      .addCase(signMultisigTransaction.fulfilled, (state, action) => {
        state.isSigning = false;
        // Update transaction in state would require additional logic
        // For now, we'll let the parent component handle reloading
      })
      .addCase(signMultisigTransaction.rejected, (state, action) => {
        state.isSigning = false;
        state.error = action.payload as string;
      })
      
      // Execute transaction
      .addCase(executeMultisigTransaction.pending, (state) => {
        state.isExecuting = true;
        state.error = null;
      })
      .addCase(executeMultisigTransaction.fulfilled, (state, action) => {
        state.isExecuting = false;
        const txIndex = state.transactions.findIndex(tx => tx.id === action.payload.transactionId);
        if (txIndex >= 0) {
          state.transactions[txIndex].status = 'executed';
          state.transactions[txIndex].transactionHash = action.payload.txHash;
          state.transactions[txIndex].executedAt = new Date();
        }
      })
      .addCase(executeMultisigTransaction.rejected, (state, action) => {
        state.isExecuting = false;
        state.error = action.payload as string;
      })
      
      // Delete wallet
      .addCase(deleteMultisigWallet.fulfilled, (state, action) => {
        state.wallets = state.wallets.filter(w => w.id !== action.payload);
        if (state.selectedWallet?.id === action.payload) {
          state.selectedWallet = null;
          state.transactions = [];
          state.activities = [];
          state.balances = [];
        }
      })
      .addCase(deleteMultisigWallet.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  selectWallet,
  clearError,
  updateWallet,
  updateTransaction,
  addActivity,
  resetState,
} = multisigSlice.actions;

export default multisigSlice.reducer;

// Selectors
export const selectMultisigState = (state: { multisig: MultisigState }) => state.multisig;

export const selectMultisigWallets = (state: { multisig: MultisigState }) => state.multisig.wallets;

export const selectSelectedMultisigWallet = (state: { multisig: MultisigState }) => state.multisig.selectedWallet;

export const selectMultisigTransactions = (state: { multisig: MultisigState }) => state.multisig.transactions;

export const selectPendingMultisigTransactions = (state: { multisig: MultisigState }) => 
  state.multisig.transactions.filter(tx => tx.status === 'pending' || tx.status === 'approved');

export const selectMultisigActivities = (state: { multisig: MultisigState }) => state.multisig.activities;

export const selectMultisigBalances = (state: { multisig: MultisigState }) => state.multisig.balances;

export const selectMultisigError = (state: { multisig: MultisigState }) => state.multisig.error;

export const selectIsMultisigLoading = (state: { multisig: MultisigState }) => state.multisig.isLoading;

export const selectIsCreatingMultisig = (state: { multisig: MultisigState }) => state.multisig.isCreating;

export const selectIsDeployingMultisig = (state: { multisig: MultisigState }) => state.multisig.isDeploying;