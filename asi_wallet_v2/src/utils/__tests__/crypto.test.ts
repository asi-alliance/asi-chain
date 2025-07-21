// Mock dependencies before any imports
const mockGenKeyPair = jest.fn();
const mockKeyFromPrivate = jest.fn();

jest.mock('elliptic', () => ({
  ec: jest.fn().mockImplementation(() => ({
    genKeyPair: mockGenKeyPair,
    keyFromPrivate: mockKeyFromPrivate,
  })),
}));

jest.mock('js-sha3', () => ({
  keccak256: jest.fn().mockImplementation((data) => {
    // Return a consistent hash for testing
    return '1234567890123456789012345678901234567890123456789012345678901234';
  }),
}));

jest.mock('blakejs', () => ({
  blake2bHex: jest.fn().mockImplementation(() => '12345678'),
}));

jest.mock('bs58', () => ({
  encode: jest.fn().mockImplementation(() => '1111mockRevAddress'),
  decode: jest.fn().mockImplementation(() => Buffer.alloc(21, 1)),
}));

import * as crypto from '../crypto';

describe('Crypto Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Key Generation', () => {
    it('should generate a valid key pair', () => {
      const mockKeyPair = {
        getPrivate: jest.fn().mockReturnValue('abcdef1234567890'),
        getPublic: jest.fn().mockReturnValue('04' + '1234'.repeat(32)),
      };
      mockGenKeyPair.mockReturnValue(mockKeyPair);

      const keyPair = crypto.generateKeyPair();

      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('ethAddress');
      expect(keyPair).toHaveProperty('revAddress');
      expect(keyPair.ethAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(mockGenKeyPair).toHaveBeenCalled();
    });
  });

  describe('Import Functions', () => {
    it('should import account from private key', () => {
      const privateKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const mockKeyPair = {
        getPublic: jest.fn().mockReturnValue('04' + '1234'.repeat(32)),
      };
      mockKeyFromPrivate.mockReturnValue(mockKeyPair);

      const account = crypto.importPrivateKey(privateKeyHex);

      expect(account.privateKey).toBe(privateKeyHex);
      expect(account).toHaveProperty('publicKey');
      expect(account).toHaveProperty('ethAddress');
      expect(account).toHaveProperty('revAddress');
      expect(mockKeyFromPrivate).toHaveBeenCalledWith(privateKeyHex, 'hex');
    });

    it('should import ETH address', () => {
      const ethAddress = '0x1234567890123456789012345678901234567890';
      
      const result = crypto.importEthAddress(ethAddress);

      expect(result.ethAddress).toBe(ethAddress);
      expect(result).toHaveProperty('revAddress');
      expect(result.revAddress).toBe('1111mockRevAddress');
    });

    it('should throw error for invalid ETH address', () => {
      const invalidAddress = 'not-an-address';

      expect(() => crypto.importEthAddress(invalidAddress)).toThrow('Invalid Ethereum address');
    });

    it('should import REV address', () => {
      const revAddress = '1111testRevAddress';
      const bs58 = require('bs58');
      
      // Mock decode to return proper structure
      bs58.decode.mockReturnValue(Buffer.concat([
        Buffer.from([0x00]), // prefix
        Buffer.from('0101010101010101010101010101010101010101', 'hex') // eth address
      ]));
      
      const result = crypto.importRevAddress(revAddress);

      expect(result.revAddress).toBe(revAddress);
      expect(result).toHaveProperty('ethAddress');
      expect(result.ethAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('Address Derivation', () => {
    it('should derive ETH address from public key', () => {
      const publicKey = '04' + '1234'.repeat(32);
      
      const ethAddress = crypto.deriveEthAddress(publicKey);
      
      expect(ethAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(ethAddress).toBe('0x3456789012345678901234567890123456789012');
    });

    it('should derive REV address from ETH address', () => {
      const ethAddress = '0x1234567890123456789012345678901234567890';
      
      const revAddress = crypto.deriveRevAddress(ethAddress);
      
      expect(revAddress).toBe('1111mockRevAddress');
      
      const bs58 = require('bs58');
      expect(bs58.encode).toHaveBeenCalled();
    });
  });

  describe('Transaction Signing', () => {
    it('should sign deploy data', () => {
      const deployData = {
        term: 'new x in { x!("test") }',
        timestamp: Date.now(),
        phloPrice: 1,
        phloLimit: 100000,
        validAfterBlockNumber: 0,
      };
      const privateKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      const mockSignature = {
        toDER: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
      };
      const mockKeyPair = {
        sign: jest.fn().mockReturnValue(mockSignature),
      };
      mockKeyFromPrivate.mockReturnValue(mockKeyPair);
      
      const signature = crypto.signDeploy(deployData, privateKey);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(mockKeyFromPrivate).toHaveBeenCalledWith(privateKey, 'hex');
      expect(mockKeyPair.sign).toHaveBeenCalled();
    });
  });
});