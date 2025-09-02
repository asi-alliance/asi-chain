import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { hardwareWalletManager } from '../services/hardwareWallet';

export interface HardwareWalletAccount {
  address: string;
  derivationPath: string;
  balance?: string;
  index: number;
}

export interface HardwareWalletState {
  isConnected: boolean;
  connectedDevice: 'ledger' | 'trezor' | null;
  accounts: HardwareWalletAccount[];
  selectedAccount: HardwareWalletAccount | null;
  isConnecting: boolean;
  isSigning: boolean;
  error: string | null;
  connectionStep: 'idle' | 'detecting' | 'connecting' | 'fetching-accounts' | 'connected';
  supportedDevices: string[];
}

const initialState: HardwareWalletState = {
  isConnected: false,
  connectedDevice: null,
  accounts: [],
  selectedAccount: null,
  isConnecting: false,
  isSigning: false,
  error: null,
  connectionStep: 'idle',
  supportedDevices: hardwareWalletManager.getSupportedWallets(),
};

// Async thunks
export const connectHardwareWallet = createAsyncThunk(
  'hardwareWallet/connect',
  async (deviceType: 'ledger' | 'trezor', { rejectWithValue }) => {
    try {
      const addresses = await hardwareWalletManager.connectWallet(deviceType);
      
      // Create accounts with derived information
      const accounts: HardwareWalletAccount[] = addresses.map((address, index) => ({
        address,
        derivationPath: `m/44'/60'/0'/0/${index}`,
        index,
      }));

      return {
        deviceType,
        accounts,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Connection failed');
    }
  }
);

export const fetchAdditionalAccounts = createAsyncThunk(
  'hardwareWallet/fetchAdditionalAccounts',
  async (startIndex: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { hardwareWallet: HardwareWalletState };
      const { connectedDevice } = state.hardwareWallet;
      
      if (!connectedDevice) {
        throw new Error('No hardware wallet connected');
      }

      // For now, return mock additional accounts
      // In production, this would fetch actual accounts from the device
      const additionalAccounts: HardwareWalletAccount[] = [];
      for (let i = startIndex; i < startIndex + 5; i++) {
        additionalAccounts.push({
          address: `0x${Math.random().toString(16).substr(2, 40)}`,
          derivationPath: `m/44'/60'/0'/0/${i}`,
          index: i,
        });
      }

      return additionalAccounts;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch accounts');
    }
  }
);

export const signWithHardwareWallet = createAsyncThunk(
  'hardwareWallet/sign',
  async (
    { transaction, messageData }: { transaction?: any; messageData?: { address: string; message: string } },
    { rejectWithValue }
  ) => {
    try {
      if (transaction) {
        return await hardwareWalletManager.signTransaction(transaction);
      } else if (messageData) {
        return await hardwareWalletManager.signMessage(messageData.address, messageData.message);
      } else {
        throw new Error('No transaction or message provided');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Signing failed');
    }
  }
);

export const disconnectHardwareWallet = createAsyncThunk(
  'hardwareWallet/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      await hardwareWalletManager.disconnect();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Disconnection failed');
    }
  }
);

const hardwareWalletSlice = createSlice({
  name: 'hardwareWallet',
  initialState,
  reducers: {
    selectAccount: (state, action: PayloadAction<HardwareWalletAccount>) => {
      state.selectedAccount = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateAccountBalance: (state, action: PayloadAction<{ address: string; balance: string }>) => {
      const account = state.accounts.find(acc => acc.address === action.payload.address);
      if (account) {
        account.balance = action.payload.balance;
      }
      if (state.selectedAccount?.address === action.payload.address) {
        state.selectedAccount.balance = action.payload.balance;
      }
    },
    resetConnection: (state) => {
      state.isConnected = false;
      state.connectedDevice = null;
      state.accounts = [];
      state.selectedAccount = null;
      state.connectionStep = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect hardware wallet
      .addCase(connectHardwareWallet.pending, (state) => {
        state.isConnecting = true;
        state.error = null;
        state.connectionStep = 'detecting';
      })
      .addCase(connectHardwareWallet.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.isConnected = true;
        state.connectedDevice = action.payload.deviceType;
        state.accounts = action.payload.accounts;
        state.selectedAccount = action.payload.accounts[0] || null;
        state.connectionStep = 'connected';
        state.error = null;
      })
      .addCase(connectHardwareWallet.rejected, (state, action) => {
        state.isConnecting = false;
        state.error = action.payload as string;
        state.connectionStep = 'idle';
      })
      
      // Fetch additional accounts
      .addCase(fetchAdditionalAccounts.pending, (state) => {
        state.connectionStep = 'fetching-accounts';
      })
      .addCase(fetchAdditionalAccounts.fulfilled, (state, action) => {
        state.accounts = [...state.accounts, ...action.payload];
        state.connectionStep = 'connected';
      })
      .addCase(fetchAdditionalAccounts.rejected, (state, action) => {
        state.error = action.payload as string;
        state.connectionStep = 'connected';
      })
      
      // Sign with hardware wallet
      .addCase(signWithHardwareWallet.pending, (state) => {
        state.isSigning = true;
        state.error = null;
      })
      .addCase(signWithHardwareWallet.fulfilled, (state) => {
        state.isSigning = false;
      })
      .addCase(signWithHardwareWallet.rejected, (state, action) => {
        state.isSigning = false;
        state.error = action.payload as string;
      })
      
      // Disconnect hardware wallet
      .addCase(disconnectHardwareWallet.fulfilled, (state) => {
        state.isConnected = false;
        state.connectedDevice = null;
        state.accounts = [];
        state.selectedAccount = null;
        state.connectionStep = 'idle';
        state.error = null;
      })
      .addCase(disconnectHardwareWallet.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { 
  selectAccount, 
  clearError, 
  updateAccountBalance, 
  resetConnection 
} = hardwareWalletSlice.actions;

export default hardwareWalletSlice.reducer;

// Selectors
export const selectHardwareWalletState = (state: { hardwareWallet: HardwareWalletState }) => 
  state.hardwareWallet;

export const selectIsHardwareWalletConnected = (state: { hardwareWallet: HardwareWalletState }) => 
  state.hardwareWallet.isConnected;

export const selectConnectedHardwareDevice = (state: { hardwareWallet: HardwareWalletState }) => 
  state.hardwareWallet.connectedDevice;

export const selectHardwareWalletAccounts = (state: { hardwareWallet: HardwareWalletState }) => 
  state.hardwareWallet.accounts;

export const selectSelectedHardwareAccount = (state: { hardwareWallet: HardwareWalletState }) => 
  state.hardwareWallet.selectedAccount;

export const selectHardwareWalletError = (state: { hardwareWallet: HardwareWalletState }) => 
  state.hardwareWallet.error;

export const selectHardwareWalletConnectionStep = (state: { hardwareWallet: HardwareWalletState }) => 
  state.hardwareWallet.connectionStep;