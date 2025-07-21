import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './walletSlice';
import themeReducer from './themeSlice';
import authReducer from './authSlice';
import walletConnectReducer from './walletConnectSlice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    theme: themeReducer,
    auth: authReducer,
    walletConnect: walletConnectReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['wallet/setAccounts', 'wallet/addAccount', 'auth/createAccountWithPassword/fulfilled', 'auth/importAccountWithPassword/fulfilled', 'auth/loginWithPassword/fulfilled', 'walletConnect/setSessionProposal', 'walletConnect/addSessionRequest'],
        ignoredPaths: ['wallet.accounts', 'wallet.selectedAccount', 'auth.unlockedAccounts', 'auth.lastActivity', 'walletConnect.pendingProposal', 'walletConnect.sessions', 'walletConnect.pendingRequests'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;