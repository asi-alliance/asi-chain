import CryptoJS from 'crypto-js';
import { SecureStorage, SecureAccount } from './secureStorage';

export interface BackupData {
  version: string;
  timestamp: Date;
  accounts: EncryptedAccount[];
  settings: WalletSettings;
  multisigWallets?: any[];
  twoFactorBackup?: string; // encrypted 2FA backup data
  checksum: string;
}

export interface EncryptedAccount {
  address: string;
  name: string;
  encryptedPrivateKey: string;
  publicKey: string;
  derivationPath?: string;
  isHardwareWallet: boolean;
  createdAt: Date;
}

export interface WalletSettings {
  theme: string;
  network: string;
  autoLock: boolean;
  autoLockTime: number;
  notifications: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
}

export interface RecoveryPhrase {
  words: string[];
  entropy: string;
  checksum: string;
}

export interface BackupOptions {
  includeSettings: boolean;
  includeMultisig: boolean;
  includeTwoFactor: boolean;
  password?: string;
  recoveryPhrase?: boolean;
}

export interface RecoveryOptions {
  password?: string;
  recoveryPhrase?: string;
  restoreSettings: boolean;
  restoreMultisig: boolean;
  restoreTwoFactor: boolean;
}

export interface BackupMetadata {
  id: string;
  name: string;
  createdAt: Date;
  accountCount: number;
  hasSettings: boolean;
  hasMultisig: boolean;
  hasTwoFactor: boolean;
  size: number;
  checksum: string;
}

export class BackupRecoveryService {
  private static readonly BACKUP_VERSION = '2.0.0';
  private static readonly BACKUP_PREFIX = 'ASI_WALLET_BACKUP_';
  private static readonly RECOVERY_STORAGE_KEY = 'recovery_phrases';
  private static readonly BACKUP_METADATA_KEY = 'backup_metadata';

  // Create a comprehensive backup
  public static async createBackup(
    password: string,
    options: BackupOptions = {
      includeSettings: true,
      includeMultisig: true,
      includeTwoFactor: false // Exclude 2FA by default for security
    }
  ): Promise<{ success: boolean; backupData?: string; metadata?: BackupMetadata; error?: string }> {
    try {
      // Validate password
      if (!password || password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      // Gather wallet data
      const accounts = await this.getAccountsForBackup();
      if (accounts.length === 0) {
        return { success: false, error: 'No accounts found to backup' };
      }

      let settings: WalletSettings | undefined;
      let multisigWallets: any[] | undefined;
      let twoFactorBackup: string | undefined;

      if (options.includeSettings) {
        settings = await this.getWalletSettings();
      }

      if (options.includeMultisig) {
        multisigWallets = await this.getMultisigWallets();
      }

      if (options.includeTwoFactor) {
        twoFactorBackup = await this.getTwoFactorBackupData(password);
      }

      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date(),
        accounts,
        settings: settings || {} as WalletSettings,
        multisigWallets,
        twoFactorBackup,
        checksum: ''
      };

      // Calculate checksum
      const dataString = JSON.stringify(backupData);
      backupData.checksum = CryptoJS.SHA256(dataString).toString();

      // Encrypt the backup
      const encryptedBackup = this.encryptBackup(backupData, password);

      // Create metadata
      const metadata: BackupMetadata = {
        id: this.generateBackupId(),
        name: `Backup ${new Date().toLocaleDateString()}`,
        createdAt: new Date(),
        accountCount: accounts.length,
        hasSettings: !!settings,
        hasMultisig: !!multisigWallets && multisigWallets.length > 0,
        hasTwoFactor: !!twoFactorBackup,
        size: encryptedBackup.length,
        checksum: backupData.checksum
      };

      // Save metadata locally
      await this.saveBackupMetadata(metadata);

      return { 
        success: true, 
        backupData: encryptedBackup,
        metadata 
      };
    } catch (error) {
      console.error('Backup creation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Backup creation failed' 
      };
    }
  }

  // Restore from backup
  public static async restoreFromBackup(
    encryptedBackup: string,
    password: string,
    options: RecoveryOptions = {
      restoreSettings: true,
      restoreMultisig: true,
      restoreTwoFactor: false
    }
  ): Promise<{ success: boolean; restoredData?: BackupData; error?: string }> {
    try {
      // Decrypt backup
      const backupData = this.decryptBackup(encryptedBackup, password);
      if (!backupData) {
        return { success: false, error: 'Invalid password or corrupted backup data' };
      }

      // Verify checksum
      const { checksum, ...dataForChecksum } = backupData;
      const calculatedChecksum = CryptoJS.SHA256(JSON.stringify(dataForChecksum)).toString();
      
      if (calculatedChecksum !== backupData.checksum) {
        return { success: false, error: 'Backup data integrity check failed' };
      }

      // Verify version compatibility
      if (!this.isVersionCompatible(backupData.version)) {
        return { success: false, error: `Backup version ${backupData.version} is not compatible` };
      }

      // Restore accounts
      await this.restoreAccounts(backupData.accounts);

      // Restore settings if requested
      if (options.restoreSettings && backupData.settings) {
        await this.restoreWalletSettings(backupData.settings);
      }

      // Restore multisig wallets if requested
      if (options.restoreMultisig && backupData.multisigWallets) {
        await this.restoreMultisigWallets(backupData.multisigWallets);
      }

      // Restore 2FA data if requested and available
      if (options.restoreTwoFactor && backupData.twoFactorBackup) {
        await this.restoreTwoFactorData(backupData.twoFactorBackup, password);
      }

      return { success: true, restoredData: backupData };
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Backup restoration failed' 
      };
    }
  }

  // Generate recovery phrase
  public static async generateRecoveryPhrase(): Promise<{ success: boolean; phrase?: RecoveryPhrase; error?: string }> {
    try {
      // Generate 12-word mnemonic (industry standard)
      const wordList = await this.getBIP39Wordlist();
      const entropy = new Uint8Array(16); // 128 bits = 12 words
      crypto.getRandomValues(entropy);

      const words = this.entropyToMnemonic(entropy, wordList);
      const checksum = this.calculateMnemonicChecksum(words);

      const phrase: RecoveryPhrase = {
        words,
        entropy: Array.from(entropy).map(b => b.toString(16).padStart(2, '0')).join(''),
        checksum
      };

      // Store encrypted recovery phrase
      await this.storeRecoveryPhrase(phrase);

      return { success: true, phrase };
    } catch (error) {
      console.error('Recovery phrase generation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate recovery phrase' 
      };
    }
  }

  // Validate recovery phrase
  public static validateRecoveryPhrase(words: string[]): { valid: boolean; error?: string } {
    try {
      if (words.length !== 12) {
        return { valid: false, error: 'Recovery phrase must be exactly 12 words' };
      }

      // Validate against BIP39 wordlist (simplified validation)
      const normalizedWords = words.map(w => w.toLowerCase().trim());
      
      // Check checksum
      const calculatedChecksum = this.calculateMnemonicChecksum(normalizedWords);
      const storedPhrase = this.getStoredRecoveryPhrase();
      
      if (storedPhrase && calculatedChecksum !== storedPhrase.checksum) {
        return { valid: false, error: 'Invalid recovery phrase checksum' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Failed to validate recovery phrase' };
    }
  }

  // Recover from phrase
  public static async recoverFromPhrase(
    words: string[],
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = this.validateRecoveryPhrase(words);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Derive accounts from recovery phrase
      const accounts = await this.deriveAccountsFromPhrase(words, newPassword);
      
      // Clear existing data
      await this.clearWalletData();
      
      // Restore accounts
      await this.restoreAccounts(accounts);

      return { success: true };
    } catch (error) {
      console.error('Recovery from phrase failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Recovery failed' 
      };
    }
  }

  // Export backup to file
  public static async exportBackupToFile(
    backupData: string,
    metadata: BackupMetadata
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.BACKUP_PREFIX}${metadata.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Backup export failed:', error);
      return { 
        success: false, 
        error: 'Failed to export backup file' 
      };
    }
  }

  // Import backup from file
  public static async importBackupFromFile(file: File): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      if (!file.name.startsWith(this.BACKUP_PREFIX)) {
        return { success: false, error: 'Invalid backup file format' };
      }

      const text = await file.text();
      
      // Basic validation
      if (!text.startsWith('U2FsdGVkX1')) { // CryptoJS encrypted format
        return { success: false, error: 'Invalid backup file content' };
      }

      return { success: true, data: text };
    } catch (error) {
      console.error('Backup import failed:', error);
      return { 
        success: false, 
        error: 'Failed to read backup file' 
      };
    }
  }

  // Get backup metadata list
  public static async getBackupHistory(): Promise<BackupMetadata[]> {
    try {
      const metadataJson = await SecureStorage.getItem(this.BACKUP_METADATA_KEY);
      if (metadataJson) {
        const metadata = JSON.parse(metadataJson);
        return metadata.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get backup history:', error);
      return [];
    }
  }

  // Private helper methods
  private static encryptBackup(data: BackupData, password: string): string {
    const dataString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(dataString, password).toString();
  }

  private static decryptBackup(encryptedData: string, password: string): BackupData | null {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const dataString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!dataString) {
        return null;
      }

      const data = JSON.parse(dataString);
      
      // Convert date strings back to Date objects
      data.timestamp = new Date(data.timestamp);
      data.accounts.forEach((account: any) => {
        account.createdAt = new Date(account.createdAt);
      });

      return data;
    } catch (error) {
      console.error('Backup decryption failed:', error);
      return null;
    }
  }

  private static async getAccountsForBackup(): Promise<EncryptedAccount[]> {
    try {
      // Get accounts from secure storage
      const accountsData = await SecureStorage.getEncryptedAccounts();
      return accountsData
        .filter(account => account.encryptedPrivateKey) // Only include accounts with encrypted keys
        .map(account => ({
          address: account.address,
          name: account.name || 'Unnamed Account',
          encryptedPrivateKey: account.encryptedPrivateKey!,
          publicKey: account.publicKey,
          derivationPath: account.derivationPath,
          isHardwareWallet: account.isHardwareWallet || false,
          createdAt: account.createdAt || new Date()
        }));
    } catch (error) {
      console.error('Failed to get accounts for backup:', error);
      return [];
    }
  }

  private static async getWalletSettings(): Promise<WalletSettings> {
    // Get settings from various stores
    return {
      theme: 'light', // Default values - replace with actual settings
      network: 'mainnet',
      autoLock: true,
      autoLockTime: 15,
      notifications: true,
      biometricEnabled: false,
      twoFactorEnabled: false
    };
  }

  private static async getMultisigWallets(): Promise<any[]> {
    try {
      const walletsData = await SecureStorage.getItem('multisig_wallets_list');
      return walletsData ? JSON.parse(walletsData) : [];
    } catch (error) {
      console.error('Failed to get multisig wallets:', error);
      return [];
    }
  }

  private static async getTwoFactorBackupData(password: string): Promise<string | undefined> {
    try {
      const twoFactorData = await SecureStorage.getItem('twofa_settings');
      if (twoFactorData) {
        return CryptoJS.AES.encrypt(twoFactorData, password).toString();
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get 2FA backup data:', error);
      return undefined;
    }
  }

  private static async restoreAccounts(accounts: EncryptedAccount[]): Promise<void> {
    for (const account of accounts) {
      await SecureStorage.storeEncryptedAccount({
        id: account.address, // Use address as ID if not present
        address: account.address,
        name: account.name,
        encryptedPrivateKey: account.encryptedPrivateKey,
        publicKey: account.publicKey,
        balance: '0',
        revAddress: account.address, // Use address as fallback
        ethAddress: account.address,
        derivationPath: account.derivationPath,
        isHardwareWallet: account.isHardwareWallet,
        createdAt: account.createdAt
      } as SecureAccount);
    }
  }

  private static async restoreWalletSettings(settings: WalletSettings): Promise<void> {
    // Restore settings to respective stores
    console.log('Restoring wallet settings:', settings);
    // Implementation would update theme, network, etc.
  }

  private static async restoreMultisigWallets(wallets: any[]): Promise<void> {
    await SecureStorage.setItem('multisig_wallets_list', JSON.stringify(wallets));
  }

  private static async restoreTwoFactorData(encryptedData: string, password: string): Promise<void> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const dataString = decrypted.toString(CryptoJS.enc.Utf8);
      await SecureStorage.setItem('twofa_settings', dataString);
    } catch (error) {
      console.error('Failed to restore 2FA data:', error);
    }
  }

  private static isVersionCompatible(version: string): boolean {
    // Simple version compatibility check
    const [major] = version.split('.');
    const [currentMajor] = this.BACKUP_VERSION.split('.');
    return major === currentMajor;
  }

  private static generateBackupId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    try {
      const existing = await this.getBackupHistory();
      existing.push(metadata);
      
      // Keep only last 20 backups
      const limited = existing.slice(-20);
      
      await SecureStorage.setItem(this.BACKUP_METADATA_KEY, JSON.stringify(limited));
    } catch (error) {
      console.error('Failed to save backup metadata:', error);
    }
  }

  private static async getBIP39Wordlist(): Promise<string[]> {
    // Simplified BIP39 wordlist - in production, use the full list
    return [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      // ... (full wordlist would have 2048 words)
    ];
  }

  private static entropyToMnemonic(entropy: Uint8Array, wordList: string[]): string[] {
    // Simplified entropy to mnemonic conversion
    // In production, use proper BIP39 implementation
    const words: string[] = [];
    for (let i = 0; i < 12; i++) {
      const index = entropy[i] % wordList.length;
      words.push(wordList[index]);
    }
    return words;
  }

  private static calculateMnemonicChecksum(words: string[]): string {
    return CryptoJS.SHA256(words.join(' ')).toString();
  }

  private static async storeRecoveryPhrase(phrase: RecoveryPhrase): Promise<void> {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(phrase), 'recovery_key').toString();
    await SecureStorage.setItem(this.RECOVERY_STORAGE_KEY, encrypted);
  }

  private static getStoredRecoveryPhrase(): RecoveryPhrase | null {
    // This is a simplified implementation
    // In production, properly handle storage and retrieval
    return null;
  }

  private static async deriveAccountsFromPhrase(words: string[], password: string): Promise<EncryptedAccount[]> {
    // Simplified account derivation from recovery phrase
    // In production, use proper BIP44 derivation
    const accounts: EncryptedAccount[] = [];
    
    for (let i = 0; i < 1; i++) { // Generate first account
      const privateKey = CryptoJS.SHA256(words.join(' ') + i.toString()).toString();
      const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, password).toString();
      
      accounts.push({
        address: '0x' + CryptoJS.SHA256(privateKey).toString().slice(0, 40),
        name: `Recovered Account ${i + 1}`,
        encryptedPrivateKey,
        publicKey: '0x' + CryptoJS.SHA256(privateKey + 'public').toString(),
        derivationPath: `m/44'/60'/0'/0/${i}`,
        isHardwareWallet: false,
        createdAt: new Date()
      });
    }
    
    return accounts;
  }

  private static async clearWalletData(): Promise<void> {
    // Clear existing wallet data before recovery
    const keysToRemove = [
      'encrypted_accounts',
      'multisig_wallets_list',
      'twofa_settings',
      'biometric_settings'
    ];
    
    for (const key of keysToRemove) {
      await SecureStorage.removeItem(key);
    }
  }
}

export default BackupRecoveryService;