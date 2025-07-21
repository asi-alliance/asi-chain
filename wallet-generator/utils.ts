import { secp256k1 } from "@noble/curves/secp256k1";
import { base16, base58 } from "@scure/base";
import { blake2bHex } from "blakejs";
import { keccak256 } from "js-sha3";
import { writeFileSync, appendFileSync } from "fs";

export const TOKENS = {
  firecap: {
    id: "000000",
    version: "00",
  },
};

interface Wallet {
  privateKey: Uint8Array;
  publicKey: string;
  address: string;
}

export function generateKeyAndAddress(): Wallet {
  const privateKey = secp256k1.utils.randomPrivateKey();
  
  /*
  const privateKeyString = "b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb";
  const privateKey = base16.decode(privateKeyString.toUpperCase());
  */

  const publicKey = secp256k1.getPublicKey(privateKey, false);
  const publicKeyHex = base16.encode(publicKey);

  // console.log("Public key:", publicKeyHex.toLowerCase());
  
  const publicKeyHash = keccak256(publicKey.slice(1)).slice(-40).toUpperCase();
  const ethHash = keccak256(base16.decode(publicKeyHash)).toUpperCase();
  const token = TOKENS.firecap.id;
  const version = TOKENS.firecap.version;
  const payload = `${token}${version}${ethHash}`;
  const payloadBytes = base16.decode(payload);
  const checksum = blake2bHex(payloadBytes, undefined, 32)
    .slice(0, 8)
    .toUpperCase();
  const revAddress = base58.encode(base16.decode(payload + checksum));
  
  return {
    privateKey: privateKey,
    publicKey: publicKeyHex.toLowerCase(),
    address: revAddress,
  };
}

export function printWallet(wallet: Wallet): void {
  console.log("Private Key:", base16.encode(wallet.privateKey).toLowerCase());
  console.log("Public Key:", wallet.publicKey)
  console.log("Address:", wallet.address);
}

export function generateAndPrintWallet(): Wallet {
  const wallet = generateKeyAndAddress();
  printWallet(wallet);
  saveWalletToFile(wallet)
  // saveWalletToJson(wallet)
  return wallet;
}

export function createWallet(): Wallet {
  const wallet = generateKeyAndAddress();
  return wallet;
}

export function saveWalletToFile(wallet: Wallet, filename?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `wallet_${timestamp}.txt`;
  const filepath = filename || defaultFilename;
  
  const walletData = {
    privateKey: base16.encode(wallet.privateKey).toLowerCase(),
    publicKey: wallet.publicKey,
    address: wallet.address,
    timestamp: new Date().toISOString()
  };
  
  const content = `Wallet Information
===================
Private Key: ${walletData.privateKey}
Public Key:  ${walletData.publicKey}
Address:     ${walletData.address}
Created:     ${walletData.timestamp}

`;
  
  try {
    writeFileSync(filepath, content, 'utf8');
    console.log(`Wallet saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Error saving wallet to file:', error);
    throw error;
  }
}

export function saveWalletToJson(wallet: Wallet, filename?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `wallet_${timestamp}.json`;
  const filepath = filename || defaultFilename;
  
  const walletData = {
    privateKey: base16.encode(wallet.privateKey).toLowerCase(),
    publicKey: wallet.publicKey,
    address: wallet.address,
    timestamp: new Date().toISOString()
  };
  
  try {
    writeFileSync(filepath, JSON.stringify(walletData, null, 2), 'utf8');
    console.log(`Wallet saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Error saving wallet to JSON file:', error);
    throw error;
  }
}

export function appendWalletToFile(wallet: Wallet, filename: string): void {
  const walletData = {
    privateKey: base16.encode(wallet.privateKey).toLowerCase(),
    publicKey: wallet.publicKey,
    address: wallet.address,
    timestamp: new Date().toISOString()
  };
  
  const content = `
Wallet Information (${walletData.timestamp})
===========================================
Private Key: ${walletData.privateKey}
Public Key:  ${walletData.publicKey}
Address:     ${walletData.address}

`;
  
  try {
    appendFileSync(filename, content, 'utf8');
    console.log(`Wallet appended to: ${filename}`);
  } catch (error) {
    console.error('Error appending wallet to file:', error);
    throw error;
  }
}

export function createAndSaveWallet(filename?: string): { wallet: Wallet, filepath: string } {
  const wallet = generateKeyAndAddress();
  const filepath = saveWalletToFile(wallet, filename);
  return { wallet, filepath };
}

export { Wallet };