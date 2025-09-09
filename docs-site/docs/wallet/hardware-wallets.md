# Hardware Wallet Integration

## Overview

ASI Chain Wallet v2 now supports enterprise-grade hardware wallet integration, providing institutional-level security for digital assets.

## Supported Hardware Wallets

### Ledger
- **Models**: Ledger Nano S, Nano X, Nano S Plus
- **Connection**: USB and Bluetooth (Nano X)
- **Supported Operations**: 
  - Transaction signing
  - Message signing
  - Address derivation
  - Multi-signature participation

### Trezor
- **Models**: Trezor One, Trezor Model T
- **Connection**: USB
- **Supported Operations**:
  - Transaction signing
  - Message signing
  - Address derivation
  - Multi-signature participation

## Setup Guide

### Prerequisites
1. Hardware wallet device
2. Latest firmware installed
3. ASI Chain app installed on device (if applicable)
4. USB connection or Bluetooth enabled

### Connection Process

```typescript
// Initialize hardware wallet connection
import { HardwareWalletService } from '@asi-chain/wallet-v2';

const hwService = new HardwareWalletService();

// Connect to Ledger
const ledger = await hwService.connectLedger();

// Connect to Trezor
const trezor = await hwService.connectTrezor();
```

### Transaction Signing

```typescript
// Sign transaction with hardware wallet
const transaction = {
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
  value: '1000000000000000000', // 1 ASI
  gasLimit: 21000,
  gasPrice: '20000000000'
};

// Sign with Ledger
const signedTx = await ledger.signTransaction(transaction);

// Sign with Trezor
const signedTx = await trezor.signTransaction(transaction);
```

## Multi-Signature Support

ASI Wallet v2 integrates with Gnosis Safe for multi-signature functionality:

```typescript
// Create multi-sig wallet with hardware signers
const multiSig = await hwService.createMultiSig({
  signers: [
    { type: 'ledger', path: "m/44'/60'/0'/0/0" },
    { type: 'trezor', path: "m/44'/60'/0'/0/0" },
    { type: 'metamask', address: '0x...' }
  ],
  threshold: 2, // Require 2 of 3 signatures
  network: 'asi-mainnet'
});
```

## Security Features

### Secure Communication
- All communication with hardware wallets is encrypted
- No private keys ever leave the device
- Transaction details displayed on device screen for verification

### Address Verification
```typescript
// Verify address on device screen
await ledger.displayAddress("m/44'/60'/0'/0/0");
// User confirms address matches on device
```

### Backup and Recovery
- Hardware wallet recovery phrases stored offline
- Support for BIP39/BIP44 standards
- Derivation path customization

## Best Practices

1. **Always Verify on Device**: Check transaction details on hardware wallet screen
2. **Keep Firmware Updated**: Regular firmware updates for security patches
3. **Secure Recovery Phrase**: Never enter recovery phrase on computer
4. **Use Passphrase**: Additional security layer with custom passphrase
5. **Test Small Amounts**: Verify setup with small test transactions first

## Troubleshooting

### Connection Issues
- Ensure latest wallet firmware
- Check USB cable connection
- Verify browser permissions for USB/Bluetooth
- Try different USB port

### Signing Failures
- Confirm correct network selected
- Verify sufficient gas fees
- Check derivation path settings
- Ensure device is unlocked

### Browser Compatibility
- Chrome/Brave: Full support
- Firefox: USB support only
- Safari: Limited support, use Chrome
- Mobile: Bluetooth support for Ledger Nano X

## API Reference

### HardwareWalletService

```typescript
interface HardwareWalletService {
  connectLedger(): Promise<LedgerDevice>;
  connectTrezor(): Promise<TrezorDevice>;
  
  getAccounts(device: HardwareDevice): Promise<string[]>;
  signTransaction(device: HardwareDevice, tx: Transaction): Promise<SignedTransaction>;
  signMessage(device: HardwareDevice, message: string): Promise<string>;
  
  createMultiSig(config: MultiSigConfig): Promise<MultiSigWallet>;
  participateInMultiSig(wallet: MultiSigWallet, tx: Transaction): Promise<void>;
}
```

## Integration Example

```javascript
// Complete hardware wallet integration example
import { ASIWallet } from '@asi-chain/wallet-v2';

async function setupHardwareWallet() {
  const wallet = new ASIWallet();
  
  try {
    // Connect hardware wallet
    const hw = await wallet.connectHardwareWallet('ledger');
    
    // Get accounts
    const accounts = await hw.getAccounts();
    console.log('Available accounts:', accounts);
    
    // Select account
    await wallet.selectAccount(accounts[0]);
    
    // Sign and send transaction
    const tx = await wallet.sendTransaction({
      to: '0x...',
      value: '1000000000000000000'
    });
    
    console.log('Transaction sent:', tx.hash);
  } catch (error) {
    console.error('Hardware wallet error:', error);
  }
}
```

## Support

For hardware wallet support:
- GitHub Issues: [ASI Chain Wallet](https://github.com/asi-alliance/asi-chain/issues)
- Discord: #hardware-wallets channel
- Documentation: [ASI Chain Docs](https://docs.asi-chain.io)

---
