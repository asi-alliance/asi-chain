import { configureStore } from '@reduxjs/toolkit';
import walletConnectReducer, {
  initializeWalletConnect,
  pairWithUri,
  approveSession,
  rejectSession,
  respondToRequest,
  rejectRequest,
  disconnectSession,
  setSessionProposal,
  addSessionRequest,
  removeSessionRequest,
  clearError,
} from '../walletConnectSlice';

// Mock walletConnect service
jest.mock('../../services/walletConnect', () => ({
  walletConnectService: {
    getInstance: jest.fn().mockReturnValue({
      init: jest.fn().mockResolvedValue([]),
      getPairings: jest.fn().mockReturnValue([]),
      getActiveSessions: jest.fn().mockReturnValue([]),
      connect: jest.fn().mockResolvedValue(undefined),
      approveSession: jest.fn().mockResolvedValue({ topic: 'test-topic' }),
      rejectSession: jest.fn().mockResolvedValue(undefined),
      approveRequest: jest.fn().mockResolvedValue(undefined),
      rejectRequest: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
    }),
  },
}));

describe('walletConnectSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: {
        walletConnect: walletConnectReducer,
      },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().walletConnect;
      expect(state.initialized).toBe(false);
      expect(state.initializing).toBe(false);
      expect(state.sessions).toEqual([]);
      expect(state.pendingProposal).toBeNull();
      expect(state.pendingRequests).toEqual([]);
      expect(state.connectedDapps).toEqual({});
      expect(state.isConnecting).toBe(false);
      expect(state.connectionUri).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('Initialization', () => {
    it('should initialize WalletConnect', async () => {
      const mockSessions = [
        {
          topic: 'session-1',
          expiry: Date.now() + 3600000,
          namespaces: {},
          acknowledged: true,
          controller: 'controller-key',
          self: { publicKey: 'self-key', metadata: {} },
          peer: { publicKey: 'peer-key', metadata: { name: 'Test dApp' } },
          requiredNamespaces: {},
        },
      ];

      const { walletConnectService } = require('../../services/walletConnect');
      walletConnectService.getInstance().init.mockResolvedValueOnce(mockSessions);

      await store.dispatch(initializeWalletConnect());

      const state = store.getState().walletConnect;
      expect(state.initialized).toBe(true);
      expect(state.initializing).toBe(false);
      expect(state.sessions).toEqual(mockSessions);
    });

    it('should handle initialization errors', async () => {
      const { walletConnectService } = require('../../services/walletConnect');
      walletConnectService.getInstance().init.mockRejectedValueOnce(new Error('Init failed'));

      await store.dispatch(initializeWalletConnect());

      const state = store.getState().walletConnect;
      expect(state.initialized).toBe(false);
      expect(state.error).toBe('Init failed');
    });
  });

  describe('Pairing', () => {
    it('should pair with URI', async () => {
      const uri = 'wc:test-uri';
      
      await store.dispatch(pairWithUri(uri));

      const state = store.getState().walletConnect;
      expect(state.isConnecting).toBe(false);
      
      const { walletConnectService } = require('../../services/walletConnect');
      expect(walletConnectService.getInstance().connect).toHaveBeenCalledWith(uri);
    });

    it('should handle pairing errors', async () => {
      const { walletConnectService } = require('../../services/walletConnect');
      walletConnectService.getInstance().connect.mockRejectedValueOnce(new Error('Connection failed'));

      await store.dispatch(pairWithUri('wc:test-uri'));

      const state = store.getState().walletConnect;
      expect(state.error).toBe('Connection failed');
      expect(state.isConnecting).toBe(false);
    });
  });

  describe('Session Management', () => {
    const mockProposal = {
      id: 123,
      params: {
        id: 123,
        proposer: {
          publicKey: 'test-public-key',
          metadata: {
            name: 'Test dApp',
            description: 'A test dApp',
            url: 'https://testdapp.com',
            icons: ['https://testdapp.com/icon.png'],
          },
        },
        requiredNamespaces: {},
      },
    };

    it('should set session proposal', () => {
      store.dispatch(setSessionProposal(mockProposal));
      
      const state = store.getState().walletConnect;
      expect(state.pendingProposal).toEqual(mockProposal);
    });

    it('should approve session', async () => {
      // Set proposal first
      store.dispatch(setSessionProposal(mockProposal));
      
      // Mock current account
      const mockState = {
        wallet: {
          currentAccount: {
            revAddress: '1111testaddress',
          },
        },
      };
      
      await store.dispatch(approveSession({ 
        proposal: mockProposal,
        accounts: ['1111testaddress'],
      }));

      const state = store.getState().walletConnect;
      expect(state.pendingProposal).toBeNull();
    });

    it('should reject session', async () => {
      store.dispatch(setSessionProposal(mockProposal));
      
      await store.dispatch(rejectSession(mockProposal));

      const state = store.getState().walletConnect;
      expect(state.pendingProposal).toBeNull();
    });

    it('should disconnect session', async () => {
      const topic = 'session-topic';
      
      await store.dispatch(disconnectSession(topic));

      const { walletConnectService } = require('../../services/walletConnect');
      expect(walletConnectService.getInstance().disconnect).toHaveBeenCalledWith(topic);
    });
  });

  describe('Request Management', () => {
    const mockRequest = {
      id: 1,
      topic: 'session-1',
      method: 'rchain_sendTransaction',
      params: {
        from: '1111testaddress',
        to: '1111recipient',
        amount: '100',
      },
    };

    it('should add session request', () => {
      store.dispatch(addSessionRequest(mockRequest));
      
      const state = store.getState().walletConnect;
      expect(state.pendingRequests).toHaveLength(1);
      expect(state.pendingRequests[0]).toEqual(mockRequest);
    });

    it('should remove session request', () => {
      // First add requests
      store.dispatch(addSessionRequest(mockRequest));
      store.dispatch(addSessionRequest({ ...mockRequest, id: 2 }));
      
      // Then remove one
      store.dispatch(removeSessionRequest(1));
      
      const state = store.getState().walletConnect;
      expect(state.pendingRequests).toHaveLength(1);
      expect(state.pendingRequests[0].id).toBe(2);
    });

    it('should respond to request', async () => {
      await store.dispatch(respondToRequest({
        topic: 'test-topic',
        response: { id: 1, result: 'success' },
      }));

      const { walletConnectService } = require('../../services/walletConnect');
      expect(walletConnectService.getInstance().approveRequest).toHaveBeenCalled();
    });

    it('should reject request', async () => {
      await store.dispatch(rejectRequest({
        id: 1,
        topic: 'test-topic',
        error: { code: 5000, message: 'User rejected' },
      }));

      const { walletConnectService } = require('../../services/walletConnect');
      expect(walletConnectService.getInstance().rejectRequest).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should clear error', () => {
      // First set an error
      store.dispatch(setSessionProposal(null));
      store.dispatch({
        type: 'walletConnect/pairWithUri/rejected',
        error: { message: 'Connection failed' },
      });
      
      let state = store.getState().walletConnect;
      expect(state.error).toBe('Connection failed');
      
      // Then clear it
      store.dispatch(clearError());
      
      state = store.getState().walletConnect;
      expect(state.error).toBeNull();
    });
  });
});