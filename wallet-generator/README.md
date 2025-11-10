# ASI Chain: Wallet Generator

← [Back to Main README](../README.md)

TypeScript utility for generating cryptographically secure wallet key sets for ASI Chain using the secp256k1 elliptic curve algorithm.

For configuration details, see [Configuration Guide](../CONFIGURATION.md#security-best-practices).

---

## Overview

This utility generates a complete set of cryptographic keys compatible with ASI Chain:
- **Private Key** - Used for signing transactions (keep secure!)
- **Public Key** - Derived from private key, used for verification
- **Address** - Blockchain address for receiving tokens (Base58Check encoded)

**Algorithm:** secp256k1 (same as Bitcoin and Ethereum)  
**Encoding:** Hexadecimal for keys, Base58Check for addresses

---

## Requirements

- **Node.js** 20.0.0 or higher
- **npm** 9.0.0 or higher

Install Node.js:
- **Linux:** https://nodejs.org/en/download/package-manager
- **macOS:** `brew install node@20`
- **Windows:** https://nodejs.org/en/download

---

## Quick Start

### Install Dependencies

```bash
cd wallet-generator
npm install
```

### Generate Wallet

```bash
npm run generate
```

**Example Output:**
```
Private Key: b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb
Public Key: 0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c
Address: 1111LAd2PWaHsw84gxarNx99YVK2aZhCThhrPsWTV7cs1BPcvHftP
Wallet saved to: wallet_2025-11-01T13-24-58-185Z.txt
```

**Important:** 
- Keys are displayed once in the terminal
- A backup file is automatically created: `wallet_<timestamp>.txt`
- Store the backup file in secure storage immediately
- Never commit wallet files to version control

---

## Key Format

**Private Key:**
- Format: 64-character hexadecimal string
- Example: `b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb`
- Length: 32 bytes (256 bits)
- Encoding: Lowercase hexadecimal

**Public Key:**
- Format: 130-character hexadecimal string (uncompressed)
- Example: `0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c`
- Prefix: `04` (indicates uncompressed key)
- Length: 65 bytes (520 bits)

**Address:**
- Format: Base58Check encoded string
- Example: `1111LAd2PWaHsw84gxarNx99YVK2aZhCThhrPsWTV7cs1BPcvHftP`
- Prefix: `1111` (ASI Chain address identifier)
- Length: Variable (typically 49-50 characters)

---

## Dependencies

From [package.json](package.json):

| Package | Version | Purpose |
|---------|---------|---------|
| @noble/curves | 1.4.0 | Elliptic curve cryptography (secp256k1) |
| @scure/base | 1.1.6 | Base encoding utilities (Base58) |
| blakejs | 1.2.1 | BLAKE2b hashing algorithm |
| js-sha3 | 0.9.3 | Keccak-256 hashing |
| js-sha256 | 0.11.0 | SHA-256 hashing |
| TypeScript | 5.4.5 | Type-safe JavaScript compilation |

**Development Dependencies:**
- ts-node 10.9.2 - TypeScript execution
- @types/node 20.12.7 - Node.js type definitions
- eslint 8.57.0 - Code linting
- prettier 3.2.5 - Code formatting

---

## Security Best Practices

### Private Key Security

**Never:**
- Commit private keys to version control (.git)
- Share private keys via email or messaging
- Store private keys in plain text on shared systems
- Reuse private keys across different environments

**Always:**
- Store backup files in encrypted storage
- Use different keys for testnet and mainnet
- Keep multiple secure backups in different locations
- Use hardware security modules (HSM) for production

### Backup Storage

**Recommended Storage:**
- Encrypted USB drives (offline storage)
- Hardware wallets (Ledger, Trezor)
- Encrypted cloud storage with 2FA
- Physical paper backups in secure locations

**File Permissions:**
```bash
chmod 600 wallet_*.txt
```

### Key Recovery

**Important:** If you lose your private key, there is no way to recover it. Your tokens will be permanently inaccessible. Always maintain secure backups.

---

## Usage in Configuration

The generated keys can be used in various ASI Chain components:

**Validator Configuration ([CONFIGURATION.md](../CONFIGURATION.md#validator-configuration)):**
```bash
VALIDATOR_PRIVATE_KEY=b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb
VALIDATOR_PUBLIC_KEY=0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c
VALIDATOR_ADDRESS=1111LAd2PWaHsw84gxarNx99YVK2aZhCThhrPsWTV7cs1BPcvHftP
```

**Deployer Bot Configuration:**
```bash
PRIVATE_KEY=b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb
```

---

## Technical Details

### Key Generation Process

1. Generate 32 random bytes using cryptographically secure random number generator
2. Verify the generated number is within the valid secp256k1 range
3. Derive public key from private key using elliptic curve point multiplication
4. Hash public key using BLAKE2b-256 and Keccak-256
5. Encode address using Base58Check with ASI Chain prefix

### Cryptographic Algorithms

**secp256k1:**
- Elliptic curve used by Bitcoin and Ethereum
- Domain parameters: y² = x³ + 7 over a 256-bit prime field
- Provides 128-bit security level

**BLAKE2b-256:**
- Cryptographic hash function optimized for 64-bit platforms
- Faster than SHA-3 with similar security properties
- 256-bit output

**Keccak-256:**
- SHA-3 finalist (pre-standardization version)
- Used in Ethereum and many blockchain systems
- 256-bit output

---

## Troubleshooting

**"Module not found" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript compilation errors:**
```bash
npm install -D typescript@5.4.5 ts-node@10.9.2
```

**Node version too old:**
```bash
node --version
# Should show 20.0.0 or higher
# Update Node.js if necessary
```

---

## Additional Resources

**Related Documentation:**
- [Configuration Guide](../CONFIGURATION.md) - Using generated keys
- [Development Guide](../DEVELOPMENT.md) - Building and running
- [Validator Setup](../chain/validator/README.md) - External validator configuration

**External Links:**
- [secp256k1 Specification](https://www.secg.org/sec2-v2.pdf)
- [Base58Check Encoding](https://en.bitcoin.it/wiki/Base58Check_encoding)
- [BLAKE2 Specification](https://www.blake2.net/)
