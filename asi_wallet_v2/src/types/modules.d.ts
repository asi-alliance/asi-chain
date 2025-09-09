declare module 'speakeasy' {
  export interface GenerateSecretOptions {
    name?: string;
    issuer?: string;
    length?: number;
    symbols?: boolean;
    otpauth_url?: boolean;
    qr_codes?: boolean;
  }

  export interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
    qr_code_ascii?: string;
    qr_code_hex?: string;
    qr_code_base32?: string;
  }

  export interface TotpOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token?: string;
    window?: number;
    time?: number;
    step?: number;
  }

  export function generateSecret(options?: GenerateSecretOptions): GeneratedSecret;
  export function totp(options: TotpOptions): string;
  
  export namespace totp {
    export function verify(options: TotpOptions & { token: string }): boolean;
    export function verifyDelta(options: TotpOptions & { token: string }): { delta: number } | undefined;
  }
}

declare module 'validator' {
  export function isEmail(str: string): boolean;
  export function isMobilePhone(str: string, locale?: string): boolean;
  export function isAlphanumeric(str: string): boolean;
  export function isLength(str: string, options?: { min?: number; max?: number }): boolean;
  export function matches(str: string, pattern: RegExp): boolean;
  export function isHexadecimal(str: string): boolean;
  export function isJSON(str: string): boolean;
  export function isURL(str: string, options?: any): boolean;
  export function escape(str: string): string;
  export function isStrongPassword(str: string, options?: {
    minLength?: number;
    minLowercase?: number;
    minUppercase?: number;
    minNumbers?: number;
    minSymbols?: number;
    returnScore?: boolean;
    pointsPerUnique?: number;
    pointsPerRepeat?: number;
    pointsForContainingLower?: number;
    pointsForContainingUpper?: number;
    pointsForContainingNumber?: number;
    pointsForContainingSymbol?: number;
  }): boolean;
  
  const validator: {
    isEmail: typeof isEmail;
    isMobilePhone: typeof isMobilePhone;
    isAlphanumeric: typeof isAlphanumeric;
    isLength: typeof isLength;
    matches: typeof matches;
    isHexadecimal: typeof isHexadecimal;
    isJSON: typeof isJSON;
    isURL: typeof isURL;
    escape: typeof escape;
    isStrongPassword: typeof isStrongPassword;
  };
  
  export default validator;
}