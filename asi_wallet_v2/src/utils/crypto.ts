import { ec as EC } from 'elliptic';
import { keccak256 } from 'js-sha3';
import { blake2bHex } from 'blakejs';

// Import bs58 - handling browser environment
import bs58 from 'bs58';

const secp256k1 = new EC('secp256k1');

export interface KeyPair {
  privateKey: string;
  publicKey: string;
  ethAddress: string;
  revAddress: string;
}

// REV address prefix as defined in RChain source
const prefix = { coinId: "000000", version: "00" };

// Helper functions for encoding/decoding
const decodeBase16 = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

const encodeBase16 = (bytes: Uint8Array): string => {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const encodeBase58 = (hex: string): string => {
  const bytes = decodeBase16(hex);
  return bs58.encode(Buffer.from(bytes));
};

// Generate new keypair
export const generateKeyPair = (): KeyPair => {
  try {
    const keyPair = secp256k1.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');
    const ethAddress = deriveEthAddress(publicKey);
    const revAddress = deriveRevAddress(ethAddress);

    return {
      privateKey,
      publicKey,
      ethAddress,
      revAddress
    };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error(`Failed to generate key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Derive ETH address from public key (like F1R3FLY wallet)
export const deriveEthAddress = (publicKey: string): string => {
  // Decode public key to bytes
  const pubKeyBytes = decodeBase16(publicKey);
  // Remove first byte and hash (matching f1r3wallet implementation)
  const hash = keccak256(pubKeyBytes.slice(1));
  // Take last 40 characters from hash (20 bytes)
  const ethAddress = hash.slice(-40);
  return `0x${ethAddress}`;
};

// Derive REV address from ETH address (exact F1R3FLY implementation)
export const deriveRevAddress = (ethAddress: string): string => {
  try {
    const ethAddr = ethAddress.replace(/^0x/, '');
    if (!ethAddr || ethAddr.length !== 40) {
      throw new Error('Invalid ETH address length');
    }

    // Hash ETH address with keccak256
    const ethAddrBytes = decodeBase16(ethAddr);
    const ethHash = keccak256(ethAddrBytes);

    // Add prefix with hash and calculate checksum (blake2b-256 hash)
    const payload = `${prefix.coinId}${prefix.version}${ethHash}`;
    const payloadBytes = decodeBase16(payload);
    const checksum = blake2bHex(payloadBytes, undefined, 32).slice(0, 8);

    // Return REV address
    return encodeBase58(`${payload}${checksum}`);
  } catch (error) {
    console.error('Error deriving REV address:', error);
    throw new Error(`Failed to derive REV address: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Import private key
export const importPrivateKey = (privateKey: string): KeyPair => {
  try {
    const keyPair = secp256k1.keyFromPrivate(privateKey, 'hex');
    const publicKey = keyPair.getPublic('hex');
    const ethAddress = deriveEthAddress(publicKey);
    const revAddress = deriveRevAddress(ethAddress);

    return {
      privateKey,
      publicKey,
      ethAddress,
      revAddress
    };
  } catch (error) {
    throw new Error('Invalid private key');
  }
};

// Validate and import ETH address
const isValidEthAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const importEthAddress = (ethAddress: string): Partial<KeyPair> => {
  if (!isValidEthAddress(ethAddress)) {
    throw new Error('Invalid Ethereum address');
  }

  const revAddress = deriveRevAddress(ethAddress);
  return {
    ethAddress,
    revAddress
  };
};

// Import REV address
export const importRevAddress = (revAddress: string): Partial<KeyPair> => {
  try {
    const decoded = bs58.decode(revAddress);
    const ethAddressBytes = decoded.slice(1, 21);
    const ethAddress = `0x${Buffer.from(ethAddressBytes).toString('hex')}`;
    
    return {
      ethAddress,
      revAddress
    };
  } catch (error) {
    throw new Error('Invalid REV address');
  }
};

// Helper class for protobuf-style binary writing
class BinaryWriter {
  private buffer: number[] = [];
  
  writeString(fieldNumber: number, value: string): void {
    if (value === '') return;
    
    const key = (fieldNumber << 3) | 2; // field number with wire type 2 (length-delimited)
    this.writeVarint(key);
    
    const bytes = new TextEncoder().encode(value);
    this.writeVarint(bytes.length);
    this.buffer.push(...Array.from(bytes));
  }
  
  writeInt64(fieldNumber: number, value: number): void {
    if (value === 0) return;
    
    const key = (fieldNumber << 3) | 0; // field number with wire type 0 (varint)
    this.writeVarint(key);
    this.writeVarint64(value);
  }
  
  private writeVarint(value: number): void {
    while (value > 0x7f) {
      this.buffer.push((value & 0x7f) | 0x80);
      value >>>= 7;
    }
    this.buffer.push(value);
  }
  
  private writeVarint64(value: number): void {
    // For numbers larger than 32 bits, we need to handle them properly
    // JavaScript bitwise operations only work on 32-bit integers
    // This is critical for timestamp values which are often > 2^32
    // Using division instead of >>> ensures correct encoding for 64-bit values
    while (value > 0x7f) {
      this.buffer.push((value & 0x7f) | 0x80);
      // Use division instead of bitwise shift for large numbers
      value = Math.floor(value / 128);
    }
    this.buffer.push(value);
  }
  
  getResultBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// Serialize deploy data in protobuf format (like F1R3FLY wallet)
const deployDataProtobufSerialize = (deployData: any): Uint8Array => {
  const { term, timestamp, phloPrice, phloLimit, validAfterBlockNumber, shardId = '' } = deployData;
  
  const writer = new BinaryWriter();
  
  // Write fields according to RChain protobuf schema
  // Field numbers from CasperMessage.proto:
  // term = 2, timestamp = 3, phloPrice = 7, phloLimit = 8, 
  // validAfterBlockNumber = 10, shardId = 11
  writer.writeString(2, term);
  writer.writeInt64(3, timestamp);
  writer.writeInt64(7, phloPrice);
  writer.writeInt64(8, phloLimit);
  writer.writeInt64(10, validAfterBlockNumber);
  writer.writeString(11, shardId);
  
  return writer.getResultBuffer();
};

// Sign deploy data (like F1R3FLY wallet)
export const signDeploy = (deployData: any, privateKey: string): any => {
  const keyPair = secp256k1.keyFromPrivate(privateKey, 'hex');
  
  // Serialize deploy data using protobuf format
  const deploySerialized = deployDataProtobufSerialize(deployData);
  
  // Hash with Blake2b-256 (32 bytes)
  const hashed = blake2bHex(deploySerialized, undefined, 32);
  const hashBytes = decodeBase16(hashed);
  
  // Sign with canonical DER format
  const sig = keyPair.sign(Array.from(hashBytes), { canonical: true });
  const sigDER = sig.toDER();
  
  // Get public key as array (uncompressed format)
  const publicKeyArray = keyPair.getPublic('array');
  const publicKeyBytes = new Uint8Array(publicKeyArray);
  
  return {
    ...deployData,
    deployer: encodeBase16(publicKeyBytes),
    sig: encodeBase16(new Uint8Array(sigDER)),
    sigAlgorithm: 'secp256k1'
  };
};