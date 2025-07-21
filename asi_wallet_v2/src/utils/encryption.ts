import CryptoJS from 'crypto-js';

/**
 * Encrypts a string value using AES encryption with a password
 * @param value - The string to encrypt
 * @param password - The password to use for encryption
 * @returns The encrypted string
 */
export const encrypt = (value: string, password: string): string => {
  if (!value) throw new Error('Cannot encrypt empty string');
  if (!password) throw new Error('Password is required for encryption');
  
  try {
    return CryptoJS.AES.encrypt(value, password).toString();
  } catch (error) {
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypts an encrypted string using AES decryption with a password
 * @param encryptedValue - The encrypted string
 * @param password - The password to use for decryption
 * @returns The decrypted string or undefined if decryption fails
 */
export const decrypt = (encryptedValue: string, password: string): string | undefined => {
  if (!encryptedValue || !password) return undefined;
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedValue, password);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    return decryptedString || undefined;
  } catch (error) {
    return undefined;
  }
};

/**
 * Validates password strength
 * @param password - The password to validate
 * @returns Object containing validation results
 */
export interface PasswordValidation {
  isValid: boolean;
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasDigit: boolean;
  hasSpecialChar: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordValidation => {
  const validation: PasswordValidation = {
    isValid: false,
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSpecialChar: /[&@^$#%*!?=_\-'<>~,.;:+()[\]{}/]/.test(password),
    errors: []
  };

  if (!validation.minLength) {
    validation.errors.push('Password must be at least 8 characters long');
  }
  if (!validation.hasUpperCase) {
    validation.errors.push('Password must contain at least one uppercase letter');
  }
  if (!validation.hasLowerCase) {
    validation.errors.push('Password must contain at least one lowercase letter');
  }
  if (!validation.hasDigit) {
    validation.errors.push('Password must contain at least one digit');
  }
  if (!validation.hasSpecialChar) {
    validation.errors.push('Password must contain at least one special character');
  }

  validation.isValid = validation.errors.length === 0;
  return validation;
};

/**
 * Generates a secure hash of a value (for storage keys)
 * @param value - The value to hash
 * @returns The SHA-256 hash
 */
export const hashValue = (value: string): string => {
  return CryptoJS.SHA256(value).toString();
};