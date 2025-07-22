import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  checkAuthentication,
  loginWithPassword,
  logout,
  createAccountWithPassword,
  importAccountWithPassword,
  unlockAccountWithPassword,
  lockAccount,
} from '../authSlice';
import { SecureStorage } from '../../services/secureStorage';
import * as crypto from '../../utils/crypto';

// Mock dependencies
jest.mock('../../services/secureStorage');
jest.mock('../../utils/crypto');

describe('authSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks for SecureStorage
    (SecureStorage.getSettings as jest.Mock).mockReturnValue({
      requirePasswordForTransaction: true,
      idleTimeout: 15,
    });
    (SecureStorage.updateSettings as jest.Mock).mockImplementation(() => {});
    (SecureStorage.clearSession as jest.Mock).mockImplementation(() => {});
    (SecureStorage.hasAccounts as jest.Mock).mockReturnValue(false);
    (SecureStorage.isAuthenticated as jest.Mock).mockReturnValue(false);
    (SecureStorage.getAllUnlockedAccounts as jest.Mock).mockReturnValue([]);
    
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.hasAccounts).toBe(false);
      expect(state.unlockedAccounts).toEqual([]);
      expect(state.requirePasswordForTransaction).toBe(true);
      expect(state.idleTimeout).toBe(15);
      expect(state.lastActivity).toBeDefined();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Authentication', () => {
    it('should check authentication on app start', async () => {
      (SecureStorage.hasAccounts as jest.Mock).mockReturnValue(true);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        { id: 'acc1', name: 'Account 1' },
      ]);

      await store.dispatch(checkAuthentication());

      const state = store.getState().auth;
      expect(state.hasAccounts).toBe(true);
      expect(SecureStorage.hasAccounts).toHaveBeenCalled();
      expect(SecureStorage.getEncryptedAccounts).toHaveBeenCalled();
    });

    it('should handle no accounts case', async () => {
      (SecureStorage.hasAccounts as jest.Mock).mockReturnValue(false);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([]);

      await store.dispatch(checkAuthentication());

      const state = store.getState().auth;
      expect(state.hasAccounts).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login with correct password', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          name: 'Account 1',
          address: '0x123',
          ethAddress: '0x123',
          publicKey: 'pub1',
          revAddress: '1111',
        },
      ];

      (SecureStorage.verifyPassword as jest.Mock).mockReturnValue(true);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue(mockAccounts);

      const result = await store.dispatch(loginWithPassword('correct-password'));

      expect(result.type).toBe('auth/loginWithPassword/fulfilled');
      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.unlockedAccounts).toEqual(mockAccounts);
    });

    it('should reject login with incorrect password', async () => {
      (SecureStorage.verifyPassword as jest.Mock).mockReturnValue(false);

      const result = await store.dispatch(loginWithPassword('wrong-password'));

      expect(result.type).toBe('auth/loginWithPassword/rejected');
      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid password');
    });
  });

  describe('Account Creation', () => {
    it('should create a new account', async () => {
      const mockKeyPair = {
        privateKey: 'private123',
        publicKey: 'public123',
        ethAddress: '0x123',
        revAddress: '1111123',
      };

      (crypto.generateKeyPair as jest.Mock).mockReturnValue(mockKeyPair);
      (SecureStorage.saveAccount as jest.Mock).mockReturnValue({
        id: 'new-acc-id',
        name: 'New Account',
        ...mockKeyPair,
        privateKey: undefined,
        encryptedPrivateKey: 'encrypted',
      });
      (SecureStorage.savePasswordHash as jest.Mock).mockImplementation(() => {});

      const result = await store.dispatch(createAccountWithPassword({
        name: 'New Account',
        password: 'password123',
        isFirstAccount: true,
      }));

      expect(result.type).toBe('auth/createAccountWithPassword/fulfilled');
      expect(crypto.generateKeyPair).toHaveBeenCalled();
      expect(SecureStorage.saveAccount).toHaveBeenCalled();

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle account creation errors', async () => {
      (crypto.generateKeyPair as jest.Mock).mockImplementation(() => {
        throw new Error('Key generation failed');
      });

      const result = await store.dispatch(createAccountWithPassword({
        name: 'New Account',
        password: 'password123',
        isFirstAccount: true,
      }));

      expect(result.type).toBe('auth/createAccountWithPassword/rejected');
      const state = store.getState().auth;
      expect(state.error).toBe('Key generation failed');
    });
  });

  describe('Account Import', () => {
    it('should import account by private key', async () => {
      const mockAccount = {
        privateKey: 'imported-private-key',
        publicKey: 'imported-public',
        ethAddress: '0x456',
        revAddress: '1111456',
      };

      (crypto.importPrivateKey as jest.Mock).mockReturnValue(mockAccount);
      (SecureStorage.saveAccount as jest.Mock).mockReturnValue({
        id: 'imported-acc',
        name: 'Imported Account',
        ...mockAccount,
        privateKey: undefined,
        encryptedPrivateKey: 'encrypted',
      });

      const result = await store.dispatch(importAccountWithPassword({
        name: 'Imported Account',
        privateKey: 'imported-private-key',
        password: 'password123',
        isFirstAccount: false,
      }));

      expect(result.type).toBe('auth/importAccountWithPassword/fulfilled');
      expect(crypto.importPrivateKey).toHaveBeenCalledWith('imported-private-key');
    });

    it('should import watch-only account by address', async () => {
      const mockAddressInfo = {
        ethAddress: '0x789',
        revAddress: '1111789',
      };

      (crypto.importRevAddress as jest.Mock).mockReturnValue(mockAddressInfo);
      (SecureStorage.saveAccount as jest.Mock).mockReturnValue({
        id: 'watch-only-acc',
        name: 'Watch Only',
        address: '0x789',
        ethAddress: '0x789',
        revAddress: '1111789',
        isWatchOnly: true,
      });

      const result = await store.dispatch(importAccountWithPassword({
        name: 'Watch Only',
        address: '1111789',
        password: 'password123',
        isFirstAccount: false,
      }));

      expect(result.type).toBe('auth/importAccountWithPassword/fulfilled');
      expect(crypto.importRevAddress).toHaveBeenCalledWith('1111789');
    });

    it('should handle invalid private key', async () => {
      (crypto.importPrivateKey as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      const result = await store.dispatch(importAccountWithPassword({
        name: 'Invalid Import',
        privateKey: 'invalid-key',
        password: 'password123',
        isFirstAccount: false,
      }));

      expect(result.type).toBe('auth/importAccountWithPassword/rejected');
      const state = store.getState().auth;
      expect(state.error).toContain('Invalid private key');
    });
  });

  describe('Account Locking/Unlocking', () => {
    it('should unlock account with password', async () => {
      const mockUnlockedAccount = {
        id: 'acc1',
        name: 'Account 1',
        privateKey: 'unlocked-private-key',
        ethAddress: '0x123',
        revAddress: '1111',
      };

      (SecureStorage.unlockAccount as jest.Mock).mockReturnValue(mockUnlockedAccount);

      const result = await store.dispatch(unlockAccountWithPassword({
        accountId: 'acc1',
        password: 'password123',
      }));

      expect(result.type).toBe('auth/unlockAccountWithPassword/fulfilled');
      expect(SecureStorage.unlockAccount).toHaveBeenCalledWith('acc1', 'password123');
    });

    it('should handle unlock failure', async () => {
      (SecureStorage.unlockAccount as jest.Mock).mockReturnValue(null);

      const result = await store.dispatch(unlockAccountWithPassword({
        accountId: 'acc1',
        password: 'wrong-password',
      }));

      expect(result.type).toBe('auth/unlockAccountWithPassword/rejected');
    });

    it('should lock a specific account', () => {
      // First set up some unlocked accounts
      store.dispatch({
        type: 'auth/loginWithPassword/fulfilled',
        payload: [
          { id: 'acc1', name: 'Account 1' },
          { id: 'acc2', name: 'Account 2' },
        ],
      });

      // Lock one account
      store.dispatch(lockAccount('acc1'));

      const state = store.getState().auth;
      expect(state.unlockedAccounts).toHaveLength(1);
      expect(state.unlockedAccounts[0].id).toBe('acc2');
    });
  });

  describe('Logout', () => {
    it('should clear all data on logout', () => {
      // Setup authenticated state
      store.dispatch({
        type: 'auth/loginWithPassword/fulfilled',
        payload: [{ id: 'acc1', name: 'Account 1' }],
      });

      // Logout
      store.dispatch(logout());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.unlockedAccounts).toEqual([]);
      expect(SecureStorage.clearSession).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', () => {
      // Set an error
      store.dispatch({
        type: 'auth/loginWithPassword/rejected',
        error: { message: 'Some error' },
      });

      let state = store.getState().auth;
      expect(state.error).toBe('Some error');

      // Clear error
      store.dispatch({ type: 'auth/clearError' });

      state = store.getState().auth;
      expect(state.error).toBeNull();
    });
  });
});