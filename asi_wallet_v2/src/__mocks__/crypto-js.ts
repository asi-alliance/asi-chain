// Mock for crypto-js library
const CryptoJS = {
  AES: {
    encrypt: jest.fn((data: string, password: string) => ({
      toString: () => `encrypted_${data}_with_${password}`,
    })),
    decrypt: jest.fn((encryptedData: string, password: string) => {
      // Simulate decryption
      if (encryptedData.includes('encrypted_') && password) {
        const decrypted = encryptedData.replace('encrypted_', '').split('_with_')[0];
        return {
          toString: () => decrypted || '',
        };
      }
      return {
        toString: () => '',
      };
    }),
  },
  SHA256: jest.fn((value: string) => ({
    toString: () => `sha256_${value}`,
  })),
  enc: {
    Utf8: {
      parse: jest.fn((str: string) => str),
      stringify: jest.fn((str: string) => str),
    },
  },
};

export default CryptoJS;