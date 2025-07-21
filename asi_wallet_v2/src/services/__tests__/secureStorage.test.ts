import { SecureStorage } from '../secureStorage';
import * as encryption from '../../utils/encryption';

// Mock the encryption utilities
jest.mock('../../utils/encryption', () => ({
  encrypt: jest.fn((data: string, password: string) => `encrypted_${data}_with_${password}`),
  decrypt: jest.fn((data: string, password: string) => {
    if (data.includes('encrypted_') && data.includes(`_with_${password}`)) {
      return data.replace('encrypted_', '').replace(`_with_${password}`, '');
    }
    throw new Error('Decryption failed');
  }),
  hashValue: jest.fn((value: string) => `hashed_${value}`),
}));

describe('SecureStorage', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset localStorage mock
    (window.localStorage.getItem as jest.Mock).mockClear();
    (window.localStorage.setItem as jest.Mock).mockClear();
    (window.localStorage.removeItem as jest.Mock).mockClear();
    (window.localStorage.clear as jest.Mock).mockClear();
    
    // Mock sessionStorage too as it's used by unlockAccount
    const sessionStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });
  });

  describe('Account Storage', () => {
    it('should save encrypted accounts to localStorage', () => {
      const accounts = [
        {
          id: 'acc1',
          name: 'Account 1',
          address: '0x123',
          ethAddress: '0x123',
          publicKey: 'pub1',
          revAddress: '1111',
          encryptedPrivateKey: 'encrypted_key1',
        },
        {
          id: 'acc2',
          name: 'Account 2',
          address: '0x456',
          ethAddress: '0x456',
          publicKey: 'pub2',
          revAddress: '1112',
          encryptedPrivateKey: 'encrypted_key2',
        },
      ];

      SecureStorage.saveEncryptedAccounts(accounts);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'hashed_asi_wallet_secure_v2',
        expect.stringContaining('"accounts":')
      );

      // Verify the structure of saved data
      const savedData = JSON.parse(
        (window.localStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.accounts).toHaveLength(2);
      expect(savedData.accounts[0].id).toBe('acc1');
      expect(savedData.accounts[1].id).toBe('acc2');
    });

    it('should retrieve encrypted accounts from localStorage', () => {
      const mockData = {
        accounts: [
          {
            id: 'acc1',
            name: 'Account 1',
            address: '0x123',
            ethAddress: '0x123',
            publicKey: 'pub1',
            revAddress: '1111',
            encryptedPrivateKey: 'encrypted_key1',
          },
        ],
        settings: {
          requirePasswordForTransaction: true,
          idleTimeout: 15,
        },
      };

      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(mockData)
      );

      const accounts = SecureStorage.getEncryptedAccounts();
      
      expect(window.localStorage.getItem).toHaveBeenCalledWith('hashed_asi_wallet_secure_v2');
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('acc1');
    });

    it('should return empty array if no accounts exist', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

      const accounts = SecureStorage.getEncryptedAccounts();
      
      expect(accounts).toEqual([]);
    });

    it('should handle corrupted localStorage data', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      const accounts = SecureStorage.getEncryptedAccounts();
      
      expect(accounts).toEqual([]);
    });
  });

  describe('Account Management', () => {
    it('should encrypt and save a new account', () => {
      const account = {
        id: 'new-acc',
        name: 'New Account',
        address: '0x789',
        ethAddress: '0x789',
        publicKey: 'pub789',
        revAddress: '1113',
        privateKey: 'secret-private-key',
      };

      const password = 'test-password';
      
      // Mock existing accounts
      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ accounts: [], settings: {} })
      );

      const savedAccount = SecureStorage.saveAccount(account, password);

      expect(encryption.encrypt).toHaveBeenCalledWith('secret-private-key', password);
      expect(savedAccount.encryptedPrivateKey).toBe('encrypted_secret-private-key_with_test-password');
      expect(savedAccount.privateKey).toBeUndefined();
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should remove account by ID', () => {
      const mockData = {
        accounts: [
          {
            id: 'acc1',
            name: 'Account 1',
            address: '0x123',
            ethAddress: '0x123',
            publicKey: 'pub1',
            revAddress: '1111',
            encryptedPrivateKey: 'encrypted_key1',
          },
          {
            id: 'acc2',
            name: 'Account 2',
            address: '0x456',
            ethAddress: '0x456',
            publicKey: 'pub2',
            revAddress: '1112',
            encryptedPrivateKey: 'encrypted_key2',
          },
        ],
        settings: {},
      };

      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(mockData)
      );

      SecureStorage.removeAccount('acc1');

      const savedData = JSON.parse(
        (window.localStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.accounts).toHaveLength(1);
      expect(savedData.accounts[0].id).toBe('acc2');
    });
  });

  describe('Account Unlocking', () => {
    it('should unlock account with correct password', () => {
      // Mock existing accounts in storage
      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({
          accounts: [{
            id: 'acc1',
            name: 'Account 1',
            address: '0x123',
            ethAddress: '0x123',
            publicKey: 'pub1',
            revAddress: '1111',
            encryptedPrivateKey: 'encrypted_privatekey123_with_password123',
          }],
          settings: {},
        })
      );

      // Mock successful decryption
      (encryption.decrypt as jest.Mock).mockReturnValue('privatekey123');

      const unlocked = SecureStorage.unlockAccount('acc1', 'password123');

      expect(unlocked).not.toBeNull();
      expect(unlocked?.privateKey).toBe('privatekey123');
      expect(encryption.decrypt).toHaveBeenCalledWith(
        'encrypted_privatekey123_with_password123',
        'password123'
      );
    });

    it('should return null for incorrect password', () => {
      // Mock existing accounts in storage
      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({
          accounts: [{
            id: 'acc1',
            name: 'Account 1',
            address: '0x123',
            ethAddress: '0x123',
            publicKey: 'pub1',
            revAddress: '1111',
            encryptedPrivateKey: 'encrypted_data',
          }],
          settings: {},
        })
      );

      (encryption.decrypt as jest.Mock).mockReturnValue(null);

      const unlocked = SecureStorage.unlockAccount('acc1', 'wrong-password');
      
      expect(unlocked).toBeNull();
    });
  });

  describe('Authentication', () => {
    it('should set and check authentication state', () => {
      // Set authenticated
      SecureStorage.setAuthenticated(true);
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'hashed_asi_wallet_auth_v2',
        'true'
      );

      // Check authentication
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue('true');
      const isAuthenticated = SecureStorage.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });

    it('should clear authentication state', () => {
      SecureStorage.setAuthenticated(false);

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('hashed_asi_wallet_auth_v2');
    });
  });

  describe('Settings Management', () => {
    it('should update and retrieve settings', () => {
      const settings = {
        requirePasswordForTransaction: false,
        idleTimeout: 30,
      };
      
      // Mock existing data
      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ accounts: [], settings: { requirePasswordForTransaction: true, idleTimeout: 15 } })
      );

      SecureStorage.updateSettings(settings);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'hashed_asi_wallet_secure_v2',
        expect.stringContaining('"requirePasswordForTransaction":false')
      );

      // Test retrieval
      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ accounts: [], settings })
      );

      const retrieved = SecureStorage.getSettings();
      expect(retrieved.idleTimeout).toBe(30);
      expect(retrieved.requirePasswordForTransaction).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should update last activity', () => {
      const beforeTime = Date.now();
      SecureStorage.updateLastActivity();
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'lastActivity',
        expect.any(String)
      );
      
      const callArg = (window.sessionStorage.setItem as jest.Mock).mock.calls[0][1];
      const timestamp = parseInt(callArg, 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should get last activity', () => {
      const mockTime = '1234567890';
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(mockTime);
      
      const lastActivity = SecureStorage.getLastActivity();
      expect(lastActivity).toBe(1234567890);
    });

    it('should clear session data', () => {
      SecureStorage.clearSession();

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('hashed_asi_wallet_session_v2');
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('hashed_asi_wallet_auth_v2');
    });
  });
});