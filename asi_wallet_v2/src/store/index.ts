import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './walletSlice';
import themeReducer from './themeSlice';
import authReducer from './authSlice';
import walletConnectReducer from './walletConnectSlice';
import hardwareWalletReducer from './hardwareWalletSlice';
import multisigReducer from './multisigSlice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    theme: themeReducer,
    auth: authReducer,
    walletConnect: walletConnectReducer,
    hardwareWallet: hardwareWalletReducer,
    multisig: multisigReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['wallet/setAccounts', 'wallet/addAccount', 'auth/createAccountWithPassword/fulfilled', 'auth/importAccountWithPassword/fulfilled', 'auth/loginWithPassword/fulfilled', 'walletConnect/setSessionProposal', 'walletConnect/addSessionRequest', 'hardwareWallet/sign/fulfilled', 'multisig/createWallet/fulfilled', 'multisig/loadWalletDetails/fulfilled'],
        ignoredPaths: ['wallet.accounts', 'wallet.selectedAccount', 'auth.unlockedAccounts', 'auth.lastActivity', 'walletConnect.pendingProposal', 'walletConnect.sessions', 'walletConnect.pendingRequests', 'hardwareWallet.accounts', 'hardwareWallet.selectedAccount', 'multisig.wallets', 'multisig.selectedWallet', 'multisig.transactions', 'multisig.lastUpdated'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;