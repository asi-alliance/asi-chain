import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { SessionTypes, ProposalTypes } from '@walletconnect/types';
import { walletConnectService, SignRequest } from '../services/walletConnect';

export interface DappInfo {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export interface WalletConnectState {
  initialized: boolean;
  initializing: boolean; // Add this line
  sessions: SessionTypes.Struct[];
  pendingProposal: ProposalTypes.Struct | null;
  pendingRequests: SignRequest[];
  connectedDapps: Record<string, DappInfo>;
  isConnecting: boolean;
  connectionUri: string | null;
  error: string | null;
}

const initialState: WalletConnectState = {
  initialized: false,
  initializing: false, // Add this line
  sessions: [],
  pendingProposal: null,
  pendingRequests: [],
  connectedDapps: {},
  isConnecting: false,
  connectionUri: null,
  error: null,
};

// Async thunks
// Global initialization promise to prevent race conditions
let initializationPromise: Promise<SessionTypes.Struct[]> | null = null;

export const initializeWalletConnect = createAsyncThunk(
  'walletConnect/initialize',
  async (_, { getState }) => {
    console.log('[Redux] initializeWalletConnect thunk called');
    
    // If already initializing, return the existing promise
    if (initializationPromise) {
      console.log('[Redux] Already initializing, returning existing promise');
      return initializationPromise;
    }
    
    // Check if already initialized
    const state = getState() as { walletConnect: WalletConnectState };
    console.log('[Redux] Current state:', { 
      initialized: state.walletConnect.initialized, 
      initializing: state.walletConnect.initializing 
    });
    
    if (state.walletConnect.initialized) {
      console.log('[Redux] Already initialized, returning existing sessions');
      return state.walletConnect.sessions;
    }
    
    // Create initialization promise
    initializationPromise = (async () => {
      try {
        console.log('[Redux] Starting WalletConnect initialization...');
        await walletConnectService.initialize();
        const sessions = walletConnectService.getActiveSessions();
        console.log('[Redux] WalletConnect initialized successfully, sessions:', sessions);
        return sessions;
      } finally {
        // Clear the promise when done
        initializationPromise = null;
      }
    })();
    
    return initializationPromise;
  }
);

export const pairWithUri = createAsyncThunk(
  'walletConnect/pair',
  async (uri: string, { getState, rejectWithValue }) => {
    try {
      // Wait for service to be ready
      await walletConnectService.waitForReady();
      await walletConnectService.pair(uri);
      return uri;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to pair with dApp');
    }
  }
);

export const approveSession = createAsyncThunk(
  'walletConnect/approveSession',
  async ({ proposal, address }: { proposal: ProposalTypes.Struct; address: string }) => {
    const topic = await walletConnectService.approveSession(proposal, address);
    const sessions = walletConnectService.getActiveSessions();
    return { topic, sessions };
  }
);

export const rejectSession = createAsyncThunk(
  'walletConnect/rejectSession',
  async (id: number) => {
    await walletConnectService.rejectSession(id);
  }
);

export const respondToRequest = createAsyncThunk(
  'walletConnect/respondToRequest',
  async ({ topic, id, response }: { topic: string; id: number; response: any }) => {
    await walletConnectService.respondToRequest(topic, id, response);
    return id;
  }
);

export const rejectRequest = createAsyncThunk(
  'walletConnect/rejectRequest',
  async ({ topic, id, message }: { topic: string; id: number; message?: string }) => {
    await walletConnectService.rejectRequest(topic, id, message);
    return id;
  }
);

export const disconnectSession = createAsyncThunk(
  'walletConnect/disconnect',
  async (topic: string) => {
    try {
      await walletConnectService.disconnect(topic);
    } catch (error) {
      console.error('Error disconnecting session:', error);
      // Even if disconnect fails, we should clean up the UI state
    }
    return topic;
  }
);

const walletConnectSlice = createSlice({
  name: 'walletConnect',
  initialState,
  reducers: {
    setSessionProposal: (state, action: PayloadAction<ProposalTypes.Struct | null>) => {
      state.pendingProposal = action.payload;
    },
    addSessionRequest: (state, action: PayloadAction<SignRequest>) => {
      state.pendingRequests.push(action.payload);
    },
    removeSessionRequest: (state, action: PayloadAction<number>) => {
      state.pendingRequests = state.pendingRequests.filter(req => req.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize
    builder
      .addCase(initializeWalletConnect.pending, (state) => {
        state.initializing = true;
        state.error = null;
      })
      .addCase(initializeWalletConnect.fulfilled, (state, action) => {
        state.initializing = false;
        state.initialized = true;
        state.sessions = action.payload;
        // Build connected dapps from sessions
        state.connectedDapps = {};
        action.payload.forEach(session => {
          if (session.peer.metadata) {
            state.connectedDapps[session.topic] = {
              name: session.peer.metadata.name,
              description: session.peer.metadata.description,
              url: session.peer.metadata.url,
              icons: session.peer.metadata.icons,
            };
          }
        });
      })
      .addCase(initializeWalletConnect.rejected, (state, action) => {
        state.initializing = false;
        state.error = action.error.message || 'Failed to initialize WalletConnect';
      });

    // Pair
    builder
      .addCase(pairWithUri.pending, (state, action) => {
        state.isConnecting = true;
        state.connectionUri = action.meta.arg;
        state.error = null;
      })
      .addCase(pairWithUri.fulfilled, (state) => {
        state.isConnecting = false;
      })
      .addCase(pairWithUri.rejected, (state, action) => {
        state.isConnecting = false;
        state.connectionUri = null;
        state.error = action.error.message || 'Failed to pair with dApp';
      });

    // Approve session
    builder
      .addCase(approveSession.fulfilled, (state, action) => {
        state.pendingProposal = null;
        state.sessions = action.payload.sessions;
        // Update connected dapps
        action.payload.sessions.forEach(session => {
          if (session.peer.metadata) {
            state.connectedDapps[session.topic] = {
              name: session.peer.metadata.name,
              description: session.peer.metadata.description,
              url: session.peer.metadata.url,
              icons: session.peer.metadata.icons,
            };
          }
        });
      })
      .addCase(approveSession.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to approve session';
      });

    // Reject session
    builder
      .addCase(rejectSession.fulfilled, (state) => {
        state.pendingProposal = null;
      });

    // Respond to request
    builder
      .addCase(respondToRequest.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter(req => req.id !== action.payload);
      });

    // Reject request
    builder
      .addCase(rejectRequest.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter(req => req.id !== action.payload);
      });

    // Disconnect
    builder
      .addCase(disconnectSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter(session => session.topic !== action.payload);
        delete state.connectedDapps[action.payload];
      });
  },
});

export const { setSessionProposal, addSessionRequest, removeSessionRequest, clearError } = walletConnectSlice.actions;
export default walletConnectSlice.reducer;