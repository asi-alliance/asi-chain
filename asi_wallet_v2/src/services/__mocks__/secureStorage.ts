import { Account } from 'types/wallet';

export class SecureStorage {
  static hasAccounts = jest.fn(() => false);
  static getEncryptedAccounts = jest.fn(() => []);
  static getAllUnlockedAccounts = jest.fn(() => []);
  static isAuthenticated = jest.fn(() => false);
  static getSettings = jest.fn(() => ({
    requirePasswordForTransaction: true,
    idleTimeout: 15,
  }));
  static updateSettings = jest.fn();
  static saveSettings = jest.fn();
  static clearSession = jest.fn();
  static clearAll = jest.fn();
  static savePasswordHash = jest.fn();
  static hasPasswordHash = jest.fn(() => false);
  static verifyPassword = jest.fn(() => false);
  static saveAccount = jest.fn();
  static unlockAccount = jest.fn();
  static removeAccount = jest.fn();
  static saveEncryptedAccounts = jest.fn();
  static setSessionData = jest.fn();
  static getSessionData = jest.fn();
  static exportAccount = jest.fn();
  static importFromKeyfile = jest.fn();
  static getUnlockedAccount = jest.fn();
  static clearAccountFromSession = jest.fn();
  static setAuthenticated = jest.fn();
  static updateLastActivity = jest.fn();
  static getLastActivity = jest.fn(() => Date.now());
  
  // Instance methods for WalletConnect
  async getItem(key: string): Promise<string | null> {
    return null;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    return;
  }
  
  async removeItem(key: string): Promise<void> {
    return;
  }
  
  async getKeys(): Promise<string[]> {
    return [];
  }
}