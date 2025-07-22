import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SecureStorage } from 'services/secureStorage';
import { Account } from 'types/wallet';
import { generateKeyPair, importPrivateKey, importEthAddress, importRevAddress } from 'utils/crypto';

export interface AuthState {
  isAuthenticated: boolean;
  hasAccounts: boolean;
  unlockedAccounts: Account[];
  requirePasswordForTransaction: boolean;
  idleTimeout: number; // in minutes
  lastActivity: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: SecureStorage.isAuthenticated(),
  hasAccounts: SecureStorage.hasAccounts(),
  unlockedAccounts: SecureStorage.getAllUnlockedAccounts(),
  requirePasswordForTransaction: SecureStorage.getSettings().requirePasswordForTransaction,
  idleTimeout: SecureStorage.getSettings().idleTimeout,
  lastActivity: Date.now(),
  isLoading: false,
  error: null,
};

// Create account with password
export const createAccountWithPassword = createAsyncThunk(
  'auth/createAccountWithPassword',
  async ({ name, password }: { name: string; password: string }) => {
    const keyPair = generateKeyPair();
    const account: Account = {
      id: Date.now().toString(),
      name,
      address: keyPair.revAddress,
      revAddress: keyPair.revAddress,
      ethAddress: keyPair.ethAddress,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      balance: '0',
      createdAt: new Date(),
    };

    // Check if this is the first account BEFORE saving
    const hadAccountsBefore = SecureStorage.hasAccounts();

    // Save encrypted account
    SecureStorage.saveAccount(account, password);
    
    // Only set authenticated if this is the first account
    if (!hadAccountsBefore) {
      SecureStorage.setAuthenticated(true);
    }

    return { account, isFirstAccount: !hadAccountsBefore };
  }
);

// Import account with password
export const importAccountWithPassword = createAsyncThunk(
  'auth/importAccountWithPassword',
  async ({ 
    name, 
    value, 
    type, 
    password 
  }: { 
    name: string; 
    value: string; 
    type: 'private' | 'public' | 'eth' | 'rev';
    password: string;
  }) => {
    let accountData;
    
    switch (type) {
      case 'private':
        accountData = importPrivateKey(value);
        break;
      case 'eth':
        accountData = importEthAddress(value);
        break;
      case 'rev':
        accountData = importRevAddress(value);
        break;
      default:
        throw new Error('Invalid import type');
    }
    
    const account: Account = {
      id: Date.now().toString(),
      name,
      address: accountData.revAddress!,
      revAddress: accountData.revAddress!,
      ethAddress: accountData.ethAddress!,
      publicKey: accountData.publicKey || '',
      privateKey: accountData.privateKey,
      balance: '0',
      createdAt: new Date(),
    };

    // Check if this is the first account BEFORE saving
    const hadAccountsBefore = SecureStorage.hasAccounts();
    
    // Save encrypted account
    if (account.privateKey) {
      SecureStorage.saveAccount(account, password);
    }
    
    // Only set authenticated if this is the first account
    if (!hadAccountsBefore) {
      SecureStorage.setAuthenticated(true);
    }

    return { account, isFirstAccount: !hadAccountsBefore };
  }
);

// Import from keyfile
export const importFromKeyfile = createAsyncThunk(
  'auth/importFromKeyfile',
  async ({ keyfileContent, name }: { keyfileContent: string; name: string }) => {
    const secureAccount = SecureStorage.importFromKeyfile(keyfileContent, name);
    return secureAccount;
  }
);

// Login with password
export const loginWithPassword = createAsyncThunk(
  'auth/loginWithPassword',
  async ({ password }: { password: string }) => {
    const accounts = SecureStorage.getEncryptedAccounts();
    const unlockedAccounts: Account[] = [];
    let hasValidPassword = false;

    for (const account of accounts) {
      const unlocked = SecureStorage.unlockAccount(account.id, password);
      if (unlocked) {
        unlockedAccounts.push(unlocked);
        hasValidPassword = true;
      }
    }

    if (!hasValidPassword) {
      throw new Error('Invalid password');
    }

    SecureStorage.setAuthenticated(true);
    return unlockedAccounts;
  }
);

// Unlock specific account
export const unlockAccount = createAsyncThunk(
  'auth/unlockAccount',
  async ({ accountId, password }: { accountId: string; password: string }) => {
    const account = SecureStorage.unlockAccount(accountId, password);
    if (!account) {
      throw new Error('Invalid password or account not found');
    }
    return account;
  }
);

// Export account keyfile
export const exportAccountKeyfile = createAsyncThunk(
  'auth/exportAccountKeyfile',
  async ({ accountId }: { accountId: string }) => {
    const keyfile = SecureStorage.exportAccount(accountId);
    if (!keyfile) {
      throw new Error('Account not found');
    }

    // Create and download file
    const blob = new Blob([keyfile], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asi-wallet-${accountId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { accountId, success: true };
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.unlockedAccounts = [];
      state.error = null;
      SecureStorage.clearSession();
      SecureStorage.setAuthenticated(false);
    },
    updateActivity: (state) => {
      state.lastActivity = Date.now();
      SecureStorage.updateLastActivity();
    },
    updateSettings: (state, action: PayloadAction<{
      requirePasswordForTransaction?: boolean;
      idleTimeout?: number;
    }>) => {
      if (action.payload.requirePasswordForTransaction !== undefined) {
        state.requirePasswordForTransaction = action.payload.requirePasswordForTransaction;
      }
      if (action.payload.idleTimeout !== undefined) {
        state.idleTimeout = action.payload.idleTimeout;
      }
      SecureStorage.updateSettings(action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
    checkAuthentication: (state) => {
      state.isAuthenticated = SecureStorage.isAuthenticated();
      state.hasAccounts = SecureStorage.hasAccounts();
      if (state.isAuthenticated) {
        state.unlockedAccounts = SecureStorage.getAllUnlockedAccounts();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create account
      .addCase(createAccountWithPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccountWithPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hasAccounts = true;
        // Only set authenticated if this was the first account
        if (action.payload.isFirstAccount) {
          state.isAuthenticated = true;
        }
        state.unlockedAccounts.push(action.payload.account);
      })
      .addCase(createAccountWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create account';
      })
      // Import account
      .addCase(importAccountWithPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importAccountWithPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hasAccounts = true;
        // Only set authenticated if this was the first account
        if (action.payload.isFirstAccount) {
          state.isAuthenticated = true;
        }
        state.unlockedAccounts.push(action.payload.account);
      })
      .addCase(importAccountWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to import account';
      })
      // Import keyfile
      .addCase(importFromKeyfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importFromKeyfile.fulfilled, (state) => {
        state.isLoading = false;
        state.hasAccounts = true;
      })
      .addCase(importFromKeyfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to import keyfile';
      })
      // Login
      .addCase(loginWithPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.unlockedAccounts = action.payload;
      })
      .addCase(loginWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Unlock account
      .addCase(unlockAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(unlockAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        const exists = state.unlockedAccounts.find(a => a.id === action.payload.id);
        if (!exists) {
          state.unlockedAccounts.push(action.payload);
        }
      })
      .addCase(unlockAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to unlock account';
      })
      // Export keyfile
      .addCase(exportAccountKeyfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(exportAccountKeyfile.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(exportAccountKeyfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to export keyfile';
      });
  },
});

export const {
  logout,
  updateActivity,
  updateSettings,
  clearError,
  checkAuthentication,
} = authSlice.actions;

export default authSlice.reducer;