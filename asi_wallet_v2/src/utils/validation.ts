import validator from 'validator';
import { ethers } from 'ethers';

/**
 * Comprehensive input validation utilities
 */
export class ValidationService {
  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.utils.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate transaction amount
   */
  isValidAmount(amount: string): boolean {
    try {
      const value = parseFloat(amount);
      return !isNaN(value) && value > 0 && value <= 1000000;
    } catch {
      return false;
    }
  }

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  /**
   * Validate URL
   */
  isValidUrl(url: string): boolean {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  }

  /**
   * Validate and sanitize string input
   */
  sanitizeString(input: string, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Remove special characters that could be used for injection
    sanitized = sanitized.replace(/[<>'"`;()]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Validate password strength
   */
  isStrongPassword(password: string): boolean {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    });
  }

  /**
   * Validate phone number
   */
  isValidPhone(phone: string): boolean {
    return validator.isMobilePhone(phone);
  }

  /**
   * Validate JSON string
   */
  isValidJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate hex string
   */
  isValidHex(hex: string): boolean {
    return validator.isHexadecimal(hex);
  }

  /**
   * Validate private key
   */
  isValidPrivateKey(key: string): boolean {
    try {
      new ethers.Wallet(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rate limit check
   */
  checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const key = `rate_limit_${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get stored requests
    const stored = localStorage.getItem(key);
    let requests: number[] = stored ? JSON.parse(stored) : [];
    
    // Filter out old requests
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    requests.push(now);
    localStorage.setItem(key, JSON.stringify(requests));
    
    return true;
  }

  /**
   * Validate transaction object
   */
  validateTransaction(tx: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!tx.to || !this.isValidAddress(tx.to)) {
      errors.push('Invalid recipient address');
    }
    
    if (tx.from && !this.isValidAddress(tx.from)) {
      errors.push('Invalid sender address');
    }
    
    if (tx.value && !this.isValidAmount(tx.value)) {
      errors.push('Invalid transaction amount');
    }
    
    if (tx.data && !this.isValidHex(tx.data)) {
      errors.push('Invalid transaction data');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const validationService = new ValidationService();