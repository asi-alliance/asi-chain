import { encrypt, decrypt, hashValue } from 'utils/encryption';
import { Account } from 'types/wallet';

export interface SecureAccount extends Omit<Account, 'privateKey'> {
  encryptedPrivateKey?: string;
  privateKey?: never; // Ensure privateKey is never stored
  derivationPath?: string;
  isHardwareWallet?: boolean;
}

export interface SecureStorageData {
  accounts: SecureAccount[];
  settings: {
    requirePasswordForTransaction: boolean;
    idleTimeout: number; // in minutes
  };
}

/**
 * Secure storage service for managing encrypted wallet data
 */
export class SecureStorage {
  private static readonly STORAGE_KEY = hashValue('asi_wallet_secure_v2');
  private static readonly SESSION_KEY = hashValue('asi_wallet_session_v2');
  private static readonly AUTH_KEY = hashValue('asi_wallet_auth_v2');
  private static readonly WALLET_CONNECT_KEY = hashValue('asi_wallet_connect_v2');

  /**
   * Save encrypted accounts to localStorage
   */
  static saveEncryptedAccounts(accounts: SecureAccount[]): void {
    try {
      const data = this.getStorageData();
      data.accounts = accounts;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save encrypted accounts:', error);
      throw new Error('Failed to save accounts');
    }
  }

  /**
   * Get all encrypted accounts from localStorage
   */
  static getEncryptedAccounts(): SecureAccount[] {
    try {
      const data = this.getStorageData();
      return data.accounts;
    } catch (error) {
      console.error('Failed to get encrypted accounts:', error);
      return [];
    }
  }

  /**
   * Encrypt and save a new account
   */
  static saveAccount(account: Account, password: string): SecureAccount {
    if (!account.privateKey) {
      throw new Error('Private key is required');
    }

    const encryptedPrivateKey = encrypt(account.privateKey, password);
    const { privateKey, ...accountWithoutKey } = account;
    const secureAccount: SecureAccount = {
      ...accountWithoutKey,
      encryptedPrivateKey
    };

    const accounts = this.getEncryptedAccounts();
    const existingIndex = accounts.findIndex(a => a.id === account.id);
    
    if (existingIndex >= 0) {
      accounts[existingIndex] = secureAccount;
    } else {
      accounts.push(secureAccount);
    }

    this.saveEncryptedAccounts(accounts);
    return secureAccount;
  }

  /**
   * Unlock an account with password
   */
  static unlockAccount(accountId: string, password: string): Account | null {
    const accounts = this.getEncryptedAccounts();
    const secureAccount = accounts.find(a => a.id === accountId);

    if (!secureAccount?.encryptedPrivateKey) {
      return null;
    }

    const privateKey = decrypt(secureAccount.encryptedPrivateKey, password);
    if (!privateKey) {
      return null;
    }

    const { encryptedPrivateKey, ...accountData } = secureAccount;
    const account: Account = {
      ...accountData,
      privateKey
    };

    // Store in session storage (will be cleared on browser close)
    this.storeInSession(accountId, account);

    return account;
  }

  /**
   * Check if any accounts exist
   */
  static hasAccounts(): boolean {
    return this.getEncryptedAccounts().length > 0;
  }

  /**
   * Get settings from storage
   */
  static getSettings(): SecureStorageData['settings'] {
    const data = this.getStorageData();
    return data.settings;
  }

  /**
   * Update settings
   */
  static updateSettings(settings: Partial<SecureStorageData['settings']>): void {
    const data = this.getStorageData();
    data.settings = { ...data.settings, ...settings };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Store unlocked account in session
   */
  private static storeInSession(accountId: string, account: Account): void {
    const sessionData = this.getSessionData();
    sessionData[accountId] = account;
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  }

  /**
   * Get unlocked account from session
   */
  static getUnlockedAccount(accountId: string): Account | null {
    const sessionData = this.getSessionData();
    return sessionData[accountId] || null;
  }

  /**
   * Get all unlocked accounts from session
   */
  static getAllUnlockedAccounts(): Account[] {
    const sessionData = this.getSessionData();
    return Object.values(sessionData);
  }

  /**
   * Clear specific account from session
   */
  static clearAccountFromSession(accountId: string): void {
    const sessionData = this.getSessionData();
    delete sessionData[accountId];
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  }

  /**
   * Clear all session data
   */
  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.AUTH_KEY);
  }

  /**
   * Set authentication state
   */
  static setAuthenticated(isAuthenticated: boolean): void {
    if (isAuthenticated) {
      sessionStorage.setItem(this.AUTH_KEY, 'true');
      this.updateLastActivity();
    } else {
      sessionStorage.removeItem(this.AUTH_KEY);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return sessionStorage.getItem(this.AUTH_KEY) === 'true';
  }

  /**
   * Update last activity timestamp
   */
  static updateLastActivity(): void {
    sessionStorage.setItem('lastActivity', Date.now().toString());
  }

  /**
   * Get last activity timestamp
   */
  static getLastActivity(): number {
    const timestamp = sessionStorage.getItem('lastActivity');
    return timestamp ? parseInt(timestamp, 10) : Date.now();
  }

  /**
   * Remove an account completely
   */
  static removeAccount(accountId: string): void {
    const accounts = this.getEncryptedAccounts();
    const filtered = accounts.filter(a => a.id !== accountId);
    this.saveEncryptedAccounts(filtered);
    this.clearAccountFromSession(accountId);
  }

  /**
   * Export account as encrypted JSON
   */
  static exportAccount(accountId: string): string | null {
    const accounts = this.getEncryptedAccounts();
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) return null;

    const exportData = {
      version: 1,
      type: 'asi-wallet-keyfile',
      address: account.address,
      revAddress: account.revAddress,
      ethAddress: account.ethAddress,
      encryptedPrivateKey: account.encryptedPrivateKey,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import account from encrypted JSON
   */
  static importFromKeyfile(keyfileContent: string, name: string): SecureAccount {
    try {
      const data = JSON.parse(keyfileContent);
      
      if (data.type !== 'asi-wallet-keyfile') {
        throw new Error('Invalid keyfile format');
      }

      const account: SecureAccount = {
        id: Date.now().toString(),
        name,
        address: data.address || data.revAddress,
        revAddress: data.revAddress,
        ethAddress: data.ethAddress,
        publicKey: '', // Will be derived when unlocked
        encryptedPrivateKey: data.encryptedPrivateKey,
        balance: '0',
        createdAt: new Date()
      };

      const accounts = this.getEncryptedAccounts();
      accounts.push(account);
      this.saveEncryptedAccounts(accounts);

      return account;
    } catch (error) {
      throw new Error('Failed to import keyfile: Invalid format');
    }
  }

  /**
   * Get storage data with defaults
   */
  private static getStorageData(): SecureStorageData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to parse storage data:', error);
    }

    return {
      accounts: [],
      settings: {
        requirePasswordForTransaction: false,
        idleTimeout: 15
      }
    };
  }

  /**
   * Get session data
   */
  private static getSessionData(): Record<string, Account> {
    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to parse session data:', error);
    }
    return {};
  }

  /**
   * Instance methods for WalletConnect storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const data = localStorage.getItem(`${SecureStorage.WALLET_CONNECT_KEY}_${key}`);
      return data;
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(`${SecureStorage.WALLET_CONNECT_KEY}_${key}`, value);
    } catch (error) {
      console.error('Failed to set item:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${SecureStorage.WALLET_CONNECT_KEY}_${key}`);
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    }
  }

  async getKeys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  /**
   * Static methods for general storage operations
   */
  static async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(hashValue(key), value);
  }

  static async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(hashValue(key));
  }

  static async removeItem(key: string): Promise<void> {
    localStorage.removeItem(hashValue(key));
  }

  /**
   * Store encrypted account (alternative method name)
   */
  static async storeEncryptedAccount(account: SecureAccount): Promise<void> {
    const accounts = this.getEncryptedAccounts();
    const existingIndex = accounts.findIndex(a => a.id === account.id || a.address === account.address);
    
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    
    this.saveEncryptedAccounts(accounts);
  }

  /**
   * Save WalletConnect data
   */
  static saveWalletConnectData(data: any): void {
    localStorage.setItem(this.WALLET_CONNECT_KEY, JSON.stringify(data));
  }

  /**
   * Get WalletConnect data
   */
  static getWalletConnectData(): any {
    const data = localStorage.getItem(this.WALLET_CONNECT_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clear all WalletConnect data
   */
  static clearWalletConnectData(): void {
    localStorage.removeItem(this.WALLET_CONNECT_KEY);
  }

  /**
   * Clear all storage
   */
  static clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.WALLET_CONNECT_KEY);
    this.clearSession();
  }
}