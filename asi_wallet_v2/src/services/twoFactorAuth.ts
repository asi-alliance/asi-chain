import * as speakeasy from 'speakeasy';
import { SecureStorage } from './secureStorage';

export interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  issuer: string;
  label: string;
}

export interface TwoFactorBackupCodes {
  codes: string[];
  createdAt: Date;
  usedCodes: string[];
}

export interface TwoFactorSettings {
  isEnabled: boolean;
  method: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
  email?: string;
  backupCodes?: TwoFactorBackupCodes;
  lastUsed?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
}

export class TwoFactorAuthService {
  private static readonly STORAGE_KEY = 'twofa_settings';
  private static readonly SECRET_KEY = 'twofa_secret';
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly CODE_WINDOW = 2; // Allow codes from 2 time windows (±30 seconds)

  // Generate a new 2FA secret
  public static generateSecret(userIdentifier: string): TwoFactorSecret {
    const secret = speakeasy.generateSecret({
      name: `ASI Wallet (${userIdentifier})`,
      issuer: 'ASI Chain Wallet',
      length: 32
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url || '',
      manualEntryKey: secret.base32,
      issuer: 'ASI Chain Wallet',
      label: `ASI Wallet (${userIdentifier})`
    };
  }

  // Verify a TOTP code
  public static verifyTOTP(token: string, secret: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: this.CODE_WINDOW
      });
    } catch (error) {
      console.error('TOTP verification failed:', error);
      return false;
    }
  }

  // Generate backup codes
  public static generateBackupCodes(): TwoFactorBackupCodes {
    const codes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }

    return {
      codes,
      createdAt: new Date(),
      usedCodes: []
    };
  }

  // Verify backup code
  public static async verifyBackupCode(code: string): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      if (!settings.backupCodes) {
        return false;
      }

      const normalizedCode = code.trim().toUpperCase();
      const isValidCode = settings.backupCodes.codes.includes(normalizedCode);
      const isUsedCode = settings.backupCodes.usedCodes.includes(normalizedCode);

      if (isValidCode && !isUsedCode) {
        // Mark code as used
        settings.backupCodes.usedCodes.push(normalizedCode);
        await this.saveSettings(settings);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Backup code verification failed:', error);
      return false;
    }
  }

  // Enable 2FA
  public static async enable2FA(
    secret: string,
    verificationCode: string,
    method: 'totp' | 'sms' | 'email' = 'totp',
    contactInfo?: string
  ): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      // Verify the setup code first
      if (!this.verifyTOTP(verificationCode, secret)) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      const settings: TwoFactorSettings = {
        isEnabled: true,
        method,
        backupCodes,
        failedAttempts: 0,
        ...(method === 'sms' && { phoneNumber: contactInfo }),
        ...(method === 'email' && { email: contactInfo })
      };

      // Save settings and secret
      await this.saveSettings(settings);
      await SecureStorage.setItem(this.SECRET_KEY, secret);

      return { 
        success: true, 
        backupCodes: backupCodes.codes 
      };
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enable 2FA' 
      };
    }
  }

  // Disable 2FA
  public static async disable2FA(verificationCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings();
      if (!settings.isEnabled) {
        return { success: false, error: '2FA is not enabled' };
      }

      // Verify code before disabling
      const isValid = await this.verifyCode(verificationCode);
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Clear all 2FA data
      await SecureStorage.removeItem(this.STORAGE_KEY);
      await SecureStorage.removeItem(this.SECRET_KEY);

      return { success: true };
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to disable 2FA' 
      };
    }
  }

  // Verify any 2FA code (TOTP or backup)
  public static async verifyCode(code: string): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      if (!settings.isEnabled) {
        return false; // 2FA not enabled
      }

      // Check if account is locked
      if (settings.lockedUntil && new Date() < new Date(settings.lockedUntil)) {
        return false;
      }

      let isValid = false;

      // Try TOTP first
      if (settings.method === 'totp') {
        const secret = await SecureStorage.getItem(this.SECRET_KEY);
        if (secret) {
          isValid = this.verifyTOTP(code, secret);
        }
      }

      // If TOTP failed, try backup code
      if (!isValid) {
        isValid = await this.verifyBackupCode(code);
      }

      if (isValid) {
        // Reset failed attempts and update last used
        settings.failedAttempts = 0;
        settings.lastUsed = new Date();
        if (settings.lockedUntil) {
          delete settings.lockedUntil;
        }
        await this.saveSettings(settings);
        return true;
      } else {
        // Increment failed attempts
        settings.failedAttempts = (settings.failedAttempts || 0) + 1;
        
        // Lock account if too many failed attempts
        if (settings.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          settings.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
        }
        
        await this.saveSettings(settings);
        return false;
      }
    } catch (error) {
      console.error('Code verification failed:', error);
      return false;
    }
  }

  // Get current 2FA settings
  public static async getSettings(): Promise<TwoFactorSettings> {
    try {
      const settingsData = await SecureStorage.getItem(this.STORAGE_KEY);
      if (settingsData) {
        const parsed = JSON.parse(settingsData);
        // Convert date strings back to Date objects
        if (parsed.backupCodes?.createdAt) {
          parsed.backupCodes.createdAt = new Date(parsed.backupCodes.createdAt);
        }
        if (parsed.lastUsed) {
          parsed.lastUsed = new Date(parsed.lastUsed);
        }
        if (parsed.lockedUntil) {
          parsed.lockedUntil = new Date(parsed.lockedUntil);
        }
        return parsed;
      }
    } catch (error) {
      console.error('Failed to get 2FA settings:', error);
    }

    // Return default settings
    return {
      isEnabled: false,
      method: 'totp',
      failedAttempts: 0
    };
  }

  // Check if 2FA is enabled
  public static async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  // Check if account is locked due to failed attempts
  public static async isLocked(): Promise<{ locked: boolean; unlockTime?: Date }> {
    const settings = await this.getSettings();
    
    if (settings.lockedUntil && new Date() < new Date(settings.lockedUntil)) {
      return { 
        locked: true, 
        unlockTime: new Date(settings.lockedUntil) 
      };
    }

    return { locked: false };
  }

  // Get remaining backup codes
  public static async getRemainingBackupCodes(): Promise<string[]> {
    const settings = await this.getSettings();
    if (!settings.backupCodes) {
      return [];
    }

    return settings.backupCodes.codes.filter(
      code => !settings.backupCodes!.usedCodes.includes(code)
    );
  }

  // Generate new backup codes (requires verification)
  public static async regenerateBackupCodes(verificationCode: string): Promise<{ success: boolean; codes?: string[]; error?: string }> {
    try {
      const isValid = await this.verifyCode(verificationCode);
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      const settings = await this.getSettings();
      if (!settings.isEnabled) {
        return { success: false, error: '2FA is not enabled' };
      }

      const newBackupCodes = this.generateBackupCodes();
      settings.backupCodes = newBackupCodes;
      
      await this.saveSettings(settings);

      return { 
        success: true, 
        codes: newBackupCodes.codes 
      };
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to regenerate backup codes' 
      };
    }
  }

  // Update contact information
  public static async updateContactInfo(
    newContactInfo: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isValid = await this.verifyCode(verificationCode);
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      const settings = await this.getSettings();
      if (!settings.isEnabled) {
        return { success: false, error: '2FA is not enabled' };
      }

      if (settings.method === 'sms') {
        settings.phoneNumber = newContactInfo;
      } else if (settings.method === 'email') {
        settings.email = newContactInfo;
      }

      await this.saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to update contact info:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update contact info' 
      };
    }
  }

  // Private helper methods
  private static async saveSettings(settings: TwoFactorSettings): Promise<void> {
    await SecureStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  // Simulate SMS sending (in production, integrate with SMS service)
  public static async sendSMSCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store temporarily for verification (in production, this would be sent via SMS)
      await SecureStorage.setItem('temp_sms_code', code);
      
      console.log(`SMS Code for ${phoneNumber}: ${code}`); // For testing
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to send SMS code' 
      };
    }
  }

  // Simulate email sending (in production, integrate with email service)
  public static async sendEmailCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store temporarily for verification (in production, this would be sent via email)
      await SecureStorage.setItem('temp_email_code', code);
      
      console.log(`Email Code for ${email}: ${code}`); // For testing
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to send email code' 
      };
    }
  }

  // Verify SMS/Email code (for testing purposes)
  public static async verifyTempCode(code: string, type: 'sms' | 'email'): Promise<boolean> {
    try {
      const storedCode = await SecureStorage.getItem(`temp_${type}_code`);
      if (storedCode === code) {
        await SecureStorage.removeItem(`temp_${type}_code`);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

export default TwoFactorAuthService;