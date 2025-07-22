import { configureStore } from '@reduxjs/toolkit';
import walletReducer, {
  updateNetwork,
  addNetwork,
  loadNetworksFromStorage,
  selectNetwork,
  syncAccounts,
} from '../walletSlice';
import { Network, Account } from '../../types/wallet';

describe('walletSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Clear localStorage before each test
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    (window.localStorage.setItem as jest.Mock).mockClear();
    
    store = configureStore({
      reducer: {
        wallet: walletReducer,
      },
    });
  });

  describe('Network Persistence', () => {
    it('should save updated networks to localStorage', () => {
      const updatedNetwork: Network = {
        id: 'testnet',
        name: 'Modified Testnet',
        url: 'https://custom-testnet.com',
        readOnlyUrl: 'https://custom-testnet-ro.com',
        shardId: 'testnet',
      };

      store.dispatch(updateNetwork(updatedNetwork));

      // Check that localStorage.setItem was called
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'asi_wallet_networks',
        expect.any(String)
      );

      // Parse and verify the saved data
      const savedData = JSON.parse(
        (window.localStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      const savedNetwork = savedData.find((n: Network) => n.id === 'testnet');
      expect(savedNetwork).toMatchObject({
        name: 'Modified Testnet',
        url: 'https://custom-testnet.com',
      });
    });

    it('should add new custom networks with unique IDs', () => {
      const newNetwork: Network = {
        id: '', // Should be assigned by the action
        name: 'My Custom Network',
        url: 'https://my-network.com',
        readOnlyUrl: 'https://my-network-ro.com',
        shardId: 'custom',
      };

      store.dispatch(addNetwork(newNetwork));

      const state = store.getState().wallet;
      const addedNetwork = state.networks.find(
        n => n.name === 'My Custom Network' && n.id.startsWith('custom-')
      );

      expect(addedNetwork).toBeDefined();
      expect(addedNetwork?.id).toMatch(/^custom-\d+$/);
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should load networks from localStorage on initialization', () => {
      const storedNetworks = [
        {
          id: 'custom',
          name: 'Modified Custom Network',
          url: 'http://modified.local:40403',
          readOnlyUrl: 'http://modified.local:40453',
          shardId: 'root',
        },
        {
          id: 'custom-1234567890',
          name: 'Saved Custom Network',
          url: 'https://saved-network.com',
          readOnlyUrl: 'https://saved-network-ro.com',
          shardId: 'saved',
        },
      ];

      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(storedNetworks)
      );

      store.dispatch(loadNetworksFromStorage());

      const state = store.getState().wallet;
      
      // Should have loaded custom networks
      expect(state.networks.find(n => n.id === 'custom-1234567890')).toBeDefined();
      
      // Should preserve modifications to default networks
      const customNetwork = state.networks.find(n => n.id === 'custom');
      expect(customNetwork?.name).toBe('Modified Custom Network');
      
      // Should still have default networks
      expect(state.networks.find(n => n.id === 'mainnet')).toBeDefined();
      expect(state.networks.find(n => n.id === 'testnet')).toBeDefined();
    });

    it('should handle localStorage errors gracefully', () => {
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw when saving
      expect(() => {
        store.dispatch(updateNetwork({
          id: 'mainnet',
          name: 'Updated Mainnet',
          url: 'https://mainnet.com',
          shardId: '',
        }));
      }).not.toThrow();
    });
  });

  describe('Network Selection', () => {
    it('should select a network by ID', () => {
      store.dispatch(selectNetwork('testnet'));
      
      const state = store.getState().wallet;
      expect(state.selectedNetwork.id).toBe('testnet');
    });

    it('should update selected network when it is modified', () => {
      // First select a network
      store.dispatch(selectNetwork('testnet'));
      
      // Then update it
      const updatedNetwork: Network = {
        id: 'testnet',
        name: 'Updated Testnet',
        url: 'https://new-testnet.com',
        shardId: 'testnet',
      };
      store.dispatch(updateNetwork(updatedNetwork));
      
      const state = store.getState().wallet;
      expect(state.selectedNetwork.name).toBe('Updated Testnet');
      expect(state.selectedNetwork.url).toBe('https://new-testnet.com');
    });
  });

  describe('Account Management', () => {
    it('should sync accounts without private keys', () => {
      const accounts: Account[] = [
        {
          id: 'acc1',
          name: 'Test Account',
          address: '0x123',
          ethAddress: '0x123',
          publicKey: 'pubkey123',
          revAddress: '1111123',
          privateKey: 'SHOULD_BE_REMOVED',
          balance: '100',
        },
      ];

      store.dispatch(syncAccounts(accounts));
      
      const state = store.getState().wallet;
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].privateKey).toBeUndefined();
      expect(state.selectedAccount?.privateKey).toBeUndefined();
    });
  });
});