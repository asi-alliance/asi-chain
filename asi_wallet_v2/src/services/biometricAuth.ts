import { SecureStorage } from './secureStorage';

export interface BiometricCredential {
  id: string;
  publicKey: ArrayBuffer;
  counter: number;
  transports?: AuthenticatorTransport[];
  createdAt: Date;
  lastUsed?: Date;
  name: string;
}

export interface BiometricSettings {
  isEnabled: boolean;
  credentials: BiometricCredential[];
  requireBiometric: boolean;
  fallbackToPassword: boolean;
  maxRetries: number;
  lockoutDuration: number; // in minutes
  lastFailure?: Date;
  failedAttempts: number;
}

export interface BiometricCapabilities {
  isSupported: boolean;
  isAvailable: boolean;
  supportedAuthenticators: string[];
  platformAuthenticatorAvailable: boolean;
  conditionalMediationAvailable: boolean;
}

export class BiometricAuthService {
  private static readonly STORAGE_KEY = 'biometric_settings';
  private static readonly RP_ID = 'asi-chain.com'; // Replace with actual domain
  private static readonly RP_NAME = 'ASI Chain Wallet';
  private static readonly MAX_RETRIES = 3;
  private static readonly LOCKOUT_DURATION = 15; // minutes

  // Check if WebAuthn is supported and available
  public static async getCapabilities(): Promise<BiometricCapabilities> {
    const isSupported = window.PublicKeyCredential !== undefined;
    
    if (!isSupported) {
      return {
        isSupported: false,
        isAvailable: false,
        supportedAuthenticators: [],
        platformAuthenticatorAvailable: false,
        conditionalMediationAvailable: false
      };
    }

    try {
      const [
        platformAuthenticatorAvailable,
        conditionalMediationAvailable
      ] = await Promise.all([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        this.checkConditionalMediationSupport()
      ]);

      const supportedAuthenticators = [];
      if (platformAuthenticatorAvailable) {
        supportedAuthenticators.push('platform');
      }
      
      // Check for cross-platform authenticators (this is a heuristic)
      if (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Firefox')) {
        supportedAuthenticators.push('cross-platform');
      }

      return {
        isSupported: true,
        isAvailable: platformAuthenticatorAvailable || supportedAuthenticators.length > 0,
        supportedAuthenticators,
        platformAuthenticatorAvailable,
        conditionalMediationAvailable
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        isSupported: true,
        isAvailable: false,
        supportedAuthenticators: [],
        platformAuthenticatorAvailable: false,
        conditionalMediationAvailable: false
      };
    }
  }

  private static async checkConditionalMediationSupport(): Promise<boolean> {
    try {
      return (PublicKeyCredential as any).isConditionalMediationAvailable?.() || false;
    } catch {
      return false;
    }
  }

  // Register a new biometric credential
  public static async registerCredential(
    userId: string,
    userName: string,
    credentialName: string = 'Default Biometric'
  ): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    try {
      const capabilities = await this.getCapabilities();
      if (!capabilities.isAvailable) {
        return { success: false, error: 'Biometric authentication is not available' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Convert userId to bytes
      const userIdBytes = new TextEncoder().encode(userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: this.RP_NAME,
          id: this.RP_ID,
        },
        user: {
          id: userIdBytes,
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'direct',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Failed to create credential' };
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      const biometricCredential: BiometricCredential = {
        id: credential.id,
        publicKey: response.getPublicKey()!,
        counter: response.getAuthenticatorData ? this.parseCounter(response.getAuthenticatorData()) : 0,
        transports: response.getTransports?.() as AuthenticatorTransport[],
        createdAt: new Date(),
        name: credentialName,
      };

      // Save credential
      const settings = await this.getSettings();
      settings.credentials.push(biometricCredential);
      settings.isEnabled = true;
      await this.saveSettings(settings);

      return { success: true, credential: biometricCredential };
    } catch (error) {
      console.error('Biometric registration failed:', error);
      
      let errorMessage = 'Registration failed';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'User denied biometric registration';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Biometric authentication not supported';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error during registration';
        } else {
          errorMessage = error.message;
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  // Authenticate using biometric credential
  public static async authenticate(
    challenge?: Uint8Array
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      const settings = await this.getSettings();
      
      if (!settings.isEnabled || settings.credentials.length === 0) {
        return { success: false, error: 'Biometric authentication not enabled' };
      }

      // Check if locked out
      if (await this.isLockedOut()) {
        return { success: false, error: 'Too many failed attempts. Please try again later.' };
      }

      // Use provided challenge or generate new one
      const authChallenge = challenge || new Uint8Array(32);
      if (!challenge) {
        crypto.getRandomValues(authChallenge);
      }

      const allowCredentials = settings.credentials.map(cred => ({
        id: this.base64UrlToArrayBuffer(cred.id),
        type: 'public-key' as const,
        transports: cred.transports,
      }));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: authChallenge,
        allowCredentials,
        timeout: 60000,
        userVerification: 'required',
        rpId: this.RP_ID,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        await this.recordFailedAttempt();
        return { success: false, error: 'Authentication failed' };
      }

      const response = assertion.response as AuthenticatorAssertionResponse;
      
      // Verify the assertion (simplified - in production, verify signature)
      const credentialId = assertion.id;
      const credential = settings.credentials.find(c => c.id === credentialId);
      
      if (!credential) {
        await this.recordFailedAttempt();
        return { success: false, error: 'Invalid credential' };
      }

      // Update credential usage
      credential.lastUsed = new Date();
      if (response.authenticatorData) {
        credential.counter = this.parseCounter(response.authenticatorData);
      }

      // Reset failed attempts
      settings.failedAttempts = 0;
      settings.lastFailure = undefined;
      
      await this.saveSettings(settings);

      return { success: true, credentialId };
    } catch (error) {
      await this.recordFailedAttempt();
      console.error('Biometric authentication failed:', error);
      
      let errorMessage = 'Authentication failed';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'User denied authentication';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Authentication was cancelled';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Biometric authentication not supported';
        } else {
          errorMessage = error.message;
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  // Check if user is currently locked out
  public static async isLockedOut(): Promise<boolean> {
    const settings = await this.getSettings();
    
    if (settings.failedAttempts < this.MAX_RETRIES) {
      return false;
    }

    if (!settings.lastFailure) {
      return false;
    }

    const lockoutEnd = new Date(settings.lastFailure);
    lockoutEnd.setMinutes(lockoutEnd.getMinutes() + this.LOCKOUT_DURATION);
    
    return new Date() < lockoutEnd;
  }

  // Get remaining lockout time in minutes
  public static async getRemainingLockoutTime(): Promise<number> {
    const settings = await this.getSettings();
    
    if (settings.failedAttempts < this.MAX_RETRIES || !settings.lastFailure) {
      return 0;
    }

    const lockoutEnd = new Date(settings.lastFailure);
    lockoutEnd.setMinutes(lockoutEnd.getMinutes() + this.LOCKOUT_DURATION);
    
    const now = new Date();
    if (now >= lockoutEnd) {
      return 0;
    }

    return Math.ceil((lockoutEnd.getTime() - now.getTime()) / (1000 * 60));
  }

  // Remove a specific credential
  public static async removeCredential(credentialId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings();
      const initialLength = settings.credentials.length;
      
      settings.credentials = settings.credentials.filter(c => c.id !== credentialId);
      
      if (settings.credentials.length === initialLength) {
        return { success: false, error: 'Credential not found' };
      }

      // Disable biometric auth if no credentials left
      if (settings.credentials.length === 0) {
        settings.isEnabled = false;
      }

      await this.saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove credential:', error);
      return { success: false, error: 'Failed to remove credential' };
    }
  }

  // Disable biometric authentication
  public static async disable(): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings();
      settings.isEnabled = false;
      settings.credentials = [];
      settings.failedAttempts = 0;
      settings.lastFailure = undefined;
      
      await this.saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      return { success: false, error: 'Failed to disable biometric authentication' };
    }
  }

  // Get current settings
  public static async getSettings(): Promise<BiometricSettings> {
    try {
      const settingsData = await SecureStorage.getItem(this.STORAGE_KEY);
      if (settingsData) {
        const parsed = JSON.parse(settingsData);
        
        // Convert date strings back to Date objects
        parsed.credentials.forEach((cred: any) => {
          cred.createdAt = new Date(cred.createdAt);
          if (cred.lastUsed) {
            cred.lastUsed = new Date(cred.lastUsed);
          }
          // Convert base64 publicKey back to ArrayBuffer
          if (typeof cred.publicKey === 'string') {
            cred.publicKey = this.base64ToArrayBuffer(cred.publicKey);
          }
        });
        
        if (parsed.lastFailure) {
          parsed.lastFailure = new Date(parsed.lastFailure);
        }
        
        return parsed;
      }
    } catch (error) {
      console.error('Failed to get biometric settings:', error);
    }

    // Return default settings
    return {
      isEnabled: false,
      credentials: [],
      requireBiometric: false,
      fallbackToPassword: true,
      maxRetries: this.MAX_RETRIES,
      lockoutDuration: this.LOCKOUT_DURATION,
      failedAttempts: 0,
    };
  }

  // Check if biometric authentication is enabled
  public static async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled && settings.credentials.length > 0;
  }

  // Get list of registered credentials
  public static async getCredentials(): Promise<BiometricCredential[]> {
    const settings = await this.getSettings();
    return settings.credentials;
  }

  // Private helper methods
  private static async saveSettings(settings: BiometricSettings): Promise<void> {
    // Convert ArrayBuffers to base64 for storage
    const serializable = {
      ...settings,
      credentials: settings.credentials.map(cred => ({
        ...cred,
        publicKey: this.arrayBufferToBase64(cred.publicKey)
      }))
    };
    
    await SecureStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
  }

  private static async recordFailedAttempt(): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.failedAttempts = (settings.failedAttempts || 0) + 1;
      settings.lastFailure = new Date();
      await this.saveSettings(settings);
    } catch (error) {
      console.error('Failed to record failed attempt:', error);
    }
  }

  private static parseCounter(authenticatorData: ArrayBuffer): number {
    // Extract counter from authenticator data (bytes 33-36)
    const view = new DataView(authenticatorData);
    return view.getUint32(33, false); // big-endian
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    // Convert base64url to base64
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return this.base64ToArrayBuffer(padded);
  }

  // Test biometric availability (useful for setup flows)
  public static async testBiometricAvailability(): Promise<{ available: boolean; error?: string }> {
    try {
      const capabilities = await this.getCapabilities();
      
      if (!capabilities.isSupported) {
        return { available: false, error: 'WebAuthn not supported' };
      }

      if (!capabilities.isAvailable) {
        return { available: false, error: 'No biometric authenticators available' };
      }

      // Test with a dummy registration to see if it would work
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: 'Test', id: this.RP_ID },
        user: {
          id: new Uint8Array(8),
          name: 'test',
          displayName: 'Test User',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 10000,
      };

      // We don't actually create the credential, just check if it's possible
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      return { available };
    } catch (error) {
      console.error('Biometric availability test failed:', error);
      return { available: false, error: 'Failed to test biometric availability' };
    }
  }
}

export default BiometricAuthService;