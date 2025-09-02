# Authentication & Security

## Overview

ASI Wallet v2 implements bank-level authentication with multiple security layers including 2FA (Two-Factor Authentication) and biometric authentication via WebAuthn.

## Two-Factor Authentication (2FA)

### TOTP Setup

Time-based One-Time Password (TOTP) authentication adds an extra security layer to your wallet.

#### Enable 2FA

```typescript
import { TwoFactorAuth } from '@asi-chain/wallet-v2';

const twoFA = new TwoFactorAuth();

// Generate secret and QR code
const setup = await twoFA.setupTOTP({
  userId: wallet.userId,
  appName: 'ASI Chain Wallet'
});

// Display QR code for user to scan
console.log('QR Code URL:', setup.qrCodeUrl);
console.log('Secret (backup):', setup.secret);

// User scans with Google Authenticator, Authy, etc.
// Then verify with code from their app
const verified = await twoFA.verifySetup(setup.secret, userCode);
```

#### Backup Codes

Generate backup codes for account recovery:

```typescript
// Generate 10 backup codes
const backupCodes = await twoFA.generateBackupCodes();

// Store securely (user should write these down)
backupCodes.forEach((code, index) => {
  console.log(`Backup Code ${index + 1}: ${code}`);
});
```

#### Login with 2FA

```typescript
// Standard login
const loginResult = await wallet.login(username, password);

if (loginResult.requires2FA) {
  // Prompt for 2FA code
  const code = await promptUser('Enter 2FA code:');
  
  // Verify 2FA
  const authenticated = await twoFA.verify(code);
  
  if (!authenticated) {
    throw new Error('Invalid 2FA code');
  }
}
```

## Biometric Authentication

### WebAuthn Implementation

ASI Wallet v2 supports fingerprint and face recognition through WebAuthn API.

#### Registration

```typescript
import { BiometricAuth } from '@asi-chain/wallet-v2';

const bioAuth = new BiometricAuth();

// Check if biometrics available
if (await bioAuth.isAvailable()) {
  // Register biometric credential
  const credential = await bioAuth.register({
    userId: wallet.userId,
    displayName: 'John Doe',
    authenticatorTypes: ['platform'] // Built-in biometric
  });
  
  // Store credential ID for future logins
  await wallet.storeBiometricCredential(credential.id);
}
```

#### Authentication

```typescript
// Quick biometric login
const bioLogin = await bioAuth.authenticate();

if (bioLogin.verified) {
  // User authenticated via fingerprint/face
  await wallet.unlock(bioLogin.credential);
} else {
  // Fall back to password
  await wallet.unlock(password);
}
```

### Supported Biometric Methods

| Platform | Fingerprint | Face ID | Windows Hello | Security Key |
|----------|------------|---------|---------------|--------------|
| iOS      | ✅ Touch ID | ✅ Face ID | ❌ | ✅ |
| Android  | ✅ | ✅ (device dependent) | ❌ | ✅ |
| Windows  | ✅ | ✅ | ✅ | ✅ |
| macOS    | ✅ Touch ID | ❌ | ❌ | ✅ |

## Multi-Factor Authentication Flow

Combine multiple authentication methods for maximum security:

```typescript
class SecureWalletAuth {
  async performSecureLogin(username: string, password: string) {
    // Step 1: Password verification
    const passwordValid = await this.verifyPassword(username, password);
    if (!passwordValid) throw new Error('Invalid credentials');
    
    // Step 2: Biometric verification (if enrolled)
    if (await this.hasBiometricEnrolled(username)) {
      const bioResult = await this.requestBiometric();
      if (!bioResult.verified) throw new Error('Biometric failed');
    }
    
    // Step 3: 2FA verification (if enabled)
    if (await this.has2FAEnabled(username)) {
      const code = await this.prompt2FACode();
      const valid = await this.verify2FA(username, code);
      if (!valid) throw new Error('Invalid 2FA code');
    }
    
    // All checks passed - create session
    return this.createSecureSession(username);
  }
}
```

## Security Best Practices

### Password Requirements
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- No common passwords (checked against haveibeenpwned)
- Regular password rotation reminders

### Session Management
```typescript
// Automatic session timeout
wallet.setSessionTimeout(15 * 60 * 1000); // 15 minutes

// Lock on idle
wallet.enableAutoLock({
  idleTime: 5 * 60 * 1000, // 5 minutes
  requireReauth: true
});

// Clear sensitive data on lock
wallet.on('lock', () => {
  wallet.clearSensitiveData();
});
```

### Rate Limiting
```typescript
// Prevent brute force attacks
const rateLimiter = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  
  async checkLimit(userId: string): Promise<boolean> {
    const attempts = await this.getAttempts(userId);
    return attempts < this.maxAttempts;
  }
};
```

## Recovery Options

### Account Recovery Flow

1. **Lost 2FA Device**
   ```typescript
   // Use backup code
   const recovered = await twoFA.recoverWithBackupCode(backupCode);
   ```

2. **Biometric Reset**
   ```typescript
   // Re-register biometric after device change
   await bioAuth.reset();
   await bioAuth.register(newCredentials);
   ```

3. **Complete Account Recovery**
   ```typescript
   // Multi-step verification
   const recovery = await wallet.startRecovery(email);
   
   // Verify email code
   await recovery.verifyEmail(emailCode);
   
   // Answer security questions
   await recovery.answerQuestions(answers);
   
   // Reset authentication methods
   await recovery.resetAuth();
   ```

## API Reference

### TwoFactorAuth Class

```typescript
interface TwoFactorAuth {
  setupTOTP(config: TOTPConfig): Promise<TOTPSetup>;
  verifySetup(secret: string, code: string): Promise<boolean>;
  verify(code: string): Promise<boolean>;
  generateBackupCodes(): Promise<string[]>;
  verifyBackupCode(code: string): Promise<boolean>;
  disable(): Promise<void>;
}
```

### BiometricAuth Class

```typescript
interface BiometricAuth {
  isAvailable(): Promise<boolean>;
  register(options: RegistrationOptions): Promise<Credential>;
  authenticate(): Promise<AuthenticationResult>;
  reset(): Promise<void>;
  listCredentials(): Promise<Credential[]>;
  removeCredential(id: string): Promise<void>;
}
```

## Troubleshooting

### Common Issues

1. **2FA Code Not Working**
   - Check device time synchronization
   - Ensure correct secret key
   - Try backup codes

2. **Biometric Not Available**
   - Check browser support (Chrome 67+, Safari 14+)
   - Verify HTTPS connection required
   - Check device capabilities

3. **Session Timeout**
   - Adjust timeout settings
   - Enable remember me option
   - Check network connectivity

## Security Audit

ASI Wallet v2 authentication has been audited for:
- ✅ OWASP compliance
- ✅ WebAuthn Level 2 specification
- ✅ TOTP RFC 6238 compliance
- ✅ Rate limiting implementation
- ✅ Session security

---