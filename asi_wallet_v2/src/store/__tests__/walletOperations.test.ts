import { configureStore } from '@reduxjs/toolkit';
import walletReducer, {
  fetchBalance,
  sendTransaction,
  updateAccountBalance,
  addTransaction,
} from '../walletSlice';
import { RChainService } from '../../services/rchain';
import { SecureStorage } from '../../services/secureStorage';

// Mock the services
jest.mock('../../services/rchain');
jest.mock('../../services/secureStorage');
jest.mock('../../services/transactionHistory', () => ({
  __esModule: true,
  default: {
    addTransaction: jest.fn((tx) => ({ ...tx, id: 'tx-123' })),
    updateTransaction: jest.fn(),
  },
}));

describe('Wallet Operations', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: {
        wallet: walletReducer,
      },
    });
  });

  describe('Balance Fetching', () => {
    it('should fetch and update account balance', async () => {
      const mockBalance = '1000000000'; // 10 REV in atomic units
      (RChainService.prototype.getBalance as jest.Mock).mockResolvedValue(mockBalance);

      const account = {
        id: 'acc1',
        name: 'Test Account',
        address: '0x123',
        ethAddress: '0x123',
        publicKey: 'pub1',
        revAddress: '111112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };

      const network = {
        id: 'testnet',
        name: 'Testnet',
        url: 'https://testnet.com',
        shardId: 'testnet',
      };

      await store.dispatch(fetchBalance({ account, network }));

      const state = store.getState().wallet;
      
      // Should have called RChain service
      expect(RChainService.prototype.getBalance).toHaveBeenCalledWith(account.revAddress);
      
      // Balance should be converted from atomic units to REV
      expect(state.isLoading).toBe(false);
    });

    it('should handle balance fetch errors', async () => {
      (RChainService.prototype.getBalance as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const account = {
        id: 'acc1',
        name: 'Test Account',
        address: '0x123',
        ethAddress: '0x123',
        publicKey: 'pub1',
        revAddress: '111112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };

      const network = {
        id: 'testnet',
        name: 'Testnet',
        url: 'https://testnet.com',
        shardId: 'testnet',
      };

      await store.dispatch(fetchBalance({ account, network }));

      const state = store.getState().wallet;
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Transaction Sending', () => {
    it('should send transaction with unlocked account', async () => {
      const mockDeployId = 'deploy-123';
      (RChainService.prototype.transfer as jest.Mock).mockResolvedValue(mockDeployId);
      (SecureStorage.getUnlockedAccount as jest.Mock).mockReturnValue({
        id: 'acc1',
        privateKey: 'private-key-123',
      });

      const from = {
        id: 'acc1',
        name: 'Test Account',
        address: '0x123',
        ethAddress: '0x123',
        publicKey: 'pub1',
        revAddress: '111112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };

      const network = {
        id: 'testnet',
        name: 'Testnet',
        url: 'https://testnet.com',
        shardId: 'testnet',
      };

      await store.dispatch(sendTransaction({
        from,
        to: '111113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
        amount: '10.5',
        network,
      }));

      // Should have called transfer with correct atomic amount
      expect(RChainService.prototype.transfer).toHaveBeenCalledWith(
        from.revAddress,
        '111113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
        '1050000000', // 10.5 REV * 100000000
        'private-key-123'
      );

      const state = store.getState().wallet;
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].deployId).toBe(mockDeployId);
    });

    it('should unlock account with password if not in session', async () => {
      const mockDeployId = 'deploy-456';
      (RChainService.prototype.transfer as jest.Mock).mockResolvedValue(mockDeployId);
      
      // First call returns null (not in session)
      (SecureStorage.getUnlockedAccount as jest.Mock).mockReturnValueOnce(null);
      
      // After unlock returns the account
      (SecureStorage.unlockAccount as jest.Mock).mockReturnValue({
        id: 'acc1',
        privateKey: 'unlocked-private-key',
      });

      const from = {
        id: 'acc1',
        name: 'Test Account',
        address: '0x123',
        ethAddress: '0x123',
        publicKey: 'pub1',
        revAddress: '111112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };

      const network = {
        id: 'testnet',
        name: 'Testnet',
        url: 'https://testnet.com',
        shardId: 'testnet',
      };

      await store.dispatch(sendTransaction({
        from,
        to: '111113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
        amount: '1',
        password: 'test-password',
        network,
      }));

      expect(SecureStorage.unlockAccount).toHaveBeenCalledWith('acc1', 'test-password');
      expect(RChainService.prototype.transfer).toHaveBeenCalled();
    });

    it('should fail if account is locked and no password provided', async () => {
      (SecureStorage.getUnlockedAccount as jest.Mock).mockReturnValue(null);
      (SecureStorage.unlockAccount as jest.Mock).mockReturnValue(null);

      const from = {
        id: 'acc1',
        name: 'Test Account',
        address: '0x123',
        ethAddress: '0x123',
        publicKey: 'pub1',
        revAddress: '111112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };

      const network = {
        id: 'testnet',
        name: 'Testnet',
        url: 'https://testnet.com',
        shardId: 'testnet',
      };

      const result = await store.dispatch(sendTransaction({
        from,
        to: '111113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
        amount: '1',
        network,
      }));

      expect(result.type).toContain('rejected');
      expect(RChainService.prototype.transfer).not.toHaveBeenCalled();
    });
  });

  describe('Account Balance Management', () => {
    it('should update account balance in state', () => {
      // First add some accounts
      store.dispatch({
        type: 'wallet/syncAccounts',
        payload: [
          {
            id: 'acc1',
            name: 'Account 1',
            balance: '0',
          },
          {
            id: 'acc2',
            name: 'Account 2',
            balance: '0',
          },
        ],
      });

      // Update balance
      store.dispatch(updateAccountBalance({
        accountId: 'acc1',
        balance: '123.45',
      }));

      const state = store.getState().wallet;
      const account = state.accounts.find(a => a.id === 'acc1');
      expect(account?.balance).toBe('123.45');
    });

    it('should update selected account balance', () => {
      // Add and select account
      store.dispatch({
        type: 'wallet/syncAccounts',
        payload: [
          {
            id: 'acc1',
            name: 'Account 1',
            balance: '0',
          },
        ],
      });

      store.dispatch({
        type: 'wallet/selectAccount',
        payload: 'acc1',
      });

      // Update balance
      store.dispatch(updateAccountBalance({
        accountId: 'acc1',
        balance: '999.99',
      }));

      const state = store.getState().wallet;
      expect(state.selectedAccount?.balance).toBe('999.99');
    });
  });

  describe('Transaction History', () => {
    it('should add transactions to state', () => {
      const transaction = {
        id: 'tx1',
        deployId: 'deploy1',
        from: '1111from',
        to: '1111to',
        amount: '50',
        timestamp: new Date().toISOString() as any,
        status: 'pending' as const,
      };

      store.dispatch(addTransaction(transaction));

      const state = store.getState().wallet;
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0]).toEqual(transaction);
    });

    it('should add new transactions at the beginning', () => {
      // Add first transaction
      store.dispatch(addTransaction({
        id: 'tx1',
        deployId: 'deploy1',
        from: '1111from',
        to: '1111to',
        amount: '10',
        timestamp: new Date('2024-01-01').toISOString() as any,
        status: 'completed',
      }));

      // Add second transaction
      store.dispatch(addTransaction({
        id: 'tx2',
        deployId: 'deploy2',
        from: '1111from',
        to: '1111to',
        amount: '20',
        timestamp: new Date('2024-01-02').toISOString() as any,
        status: 'pending',
      }));

      const state = store.getState().wallet;
      expect(state.transactions).toHaveLength(2);
      expect(state.transactions[0].id).toBe('tx2'); // Newer transaction first
      expect(state.transactions[1].id).toBe('tx1');
    });
  });
});