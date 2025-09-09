import { ethers } from 'ethers';

// Hardware wallet integrations
interface HardwareWalletProvider {
  connect(): Promise<string[]>;
  signTransaction(address: string, tx: any): Promise<string>;
  signMessage(address: string, message: string): Promise<string>;
  disconnect(): Promise<void>;
}

/**
 * Ledger wallet integration
 */
export class LedgerWallet implements HardwareWalletProvider {
  private transport: any = null;
  private app: any = null;

  async connect(): Promise<string[]> {
    try {
      // Dynamic import for Ledger libraries
      const TransportWebUSB = (await import('@ledgerhq/hw-transport-webusb')).default;
      const AppEth = (await import('@ledgerhq/hw-app-eth')).default;
      
      this.transport = await TransportWebUSB.create();
      this.app = new AppEth(this.transport);
      
      // Get first address
      const result = await this.app.getAddress("44'/60'/0'/0/0");
      return [result.address];
    } catch (error) {
      console.error('Ledger connection failed:', error);
      throw new Error('Failed to connect to Ledger device');
    }
  }

  async signTransaction(address: string, tx: any): Promise<string> {
    if (!this.app) throw new Error('Ledger not connected');
    
    try {
      const serializedTx = ethers.utils.serializeTransaction(tx);
      const signature = await this.app.signTransaction("44'/60'/0'/0/0", serializedTx);
      
      return ethers.utils.serializeTransaction(tx, {
        r: '0x' + signature.r,
        s: '0x' + signature.s,
        v: signature.v
      });
    } catch (error) {
      console.error('Ledger signing failed:', error);
      throw new Error('Failed to sign transaction with Ledger');
    }
  }

  async signMessage(address: string, message: string): Promise<string> {
    if (!this.app) throw new Error('Ledger not connected');
    
    try {
      const result = await this.app.signPersonalMessage("44'/60'/0'/0/0", Buffer.from(message).toString('hex'));
      return '0x' + result.r + result.s + result.v.toString(16);
    } catch (error) {
      console.error('Ledger message signing failed:', error);
      throw new Error('Failed to sign message with Ledger');
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.app = null;
    }
  }
}

/**
 * Trezor wallet integration
 */
export class TrezorWallet implements HardwareWalletProvider {
  private trezor: any = null;

  async connect(): Promise<string[]> {
    try {
      // Dynamic import for Trezor Connect
      const TrezorConnect = (await import('@trezor/connect-web')).default;
      
      await TrezorConnect.init({
        lazyLoad: true,
        manifest: {
          email: 'contact@asi-chain.com',
          appUrl: 'https://wallet.asi-chain.com',
          appName: 'ASI Wallet'
        }
      });

      const result = await TrezorConnect.ethereumGetAddress({
        path: "m/44'/60'/0'/0/0"
      });

      if (result.success) {
        return [result.payload.address];
      } else {
        throw new Error(result.payload.error);
      }
    } catch (error) {
      console.error('Trezor connection failed:', error);
      throw new Error('Failed to connect to Trezor device');
    }
  }

  async signTransaction(address: string, tx: any): Promise<string> {
    try {
      const TrezorConnect = (await import('@trezor/connect-web')).default;
      
      const result = await TrezorConnect.ethereumSignTransaction({
        path: "m/44'/60'/0'/0/0",
        transaction: {
          to: tx.to,
          value: tx.value,
          gasPrice: tx.gasPrice,
          gasLimit: tx.gasLimit,
          nonce: tx.nonce,
          data: tx.data || '0x',
          chainId: tx.chainId
        }
      });

      if (result.success) {
        return ethers.utils.serializeTransaction(tx, {
          r: result.payload.r,
          s: result.payload.s,
          v: parseInt(result.payload.v)
        });
      } else {
        throw new Error(result.payload.error);
      }
    } catch (error) {
      console.error('Trezor signing failed:', error);
      throw new Error('Failed to sign transaction with Trezor');
    }
  }

  async signMessage(address: string, message: string): Promise<string> {
    try {
      const TrezorConnect = (await import('@trezor/connect-web')).default;
      
      const result = await TrezorConnect.ethereumSignMessage({
        path: "m/44'/60'/0'/0/0",
        message: message
      });

      if (result.success) {
        return result.payload.signature;
      } else {
        throw new Error(result.payload.error);
      }
    } catch (error) {
      console.error('Trezor message signing failed:', error);
      throw new Error('Failed to sign message with Trezor');
    }
  }

  async disconnect(): Promise<void> {
    const TrezorConnect = (await import('@trezor/connect-web')).default;
    TrezorConnect.dispose();
  }
}

/**
 * Hardware wallet manager
 */
export class HardwareWalletManager {
  private providers = new Map<string, HardwareWalletProvider>();
  private activeProvider: string | null = null;

  constructor() {
    this.providers.set('ledger', new LedgerWallet());
    this.providers.set('trezor', new TrezorWallet());
  }

  async connectWallet(type: 'ledger' | 'trezor'): Promise<string[]> {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Unsupported wallet type: ${type}`);
    }

    const addresses = await provider.connect();
    this.activeProvider = type;
    return addresses;
  }

  async signTransaction(tx: any): Promise<string> {
    if (!this.activeProvider) {
      throw new Error('No hardware wallet connected');
    }

    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error('Active provider not found');
    }

    return provider.signTransaction(tx.from, tx);
  }

  async signMessage(address: string, message: string): Promise<string> {
    if (!this.activeProvider) {
      throw new Error('No hardware wallet connected');
    }

    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error('Active provider not found');
    }

    return provider.signMessage(address, message);
  }

  async disconnect(): Promise<void> {
    if (this.activeProvider) {
      const provider = this.providers.get(this.activeProvider);
      if (provider) {
        await provider.disconnect();
      }
      this.activeProvider = null;
    }
  }

  getActiveProvider(): string | null {
    return this.activeProvider;
  }

  getSupportedWallets(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const hardwareWalletManager = new HardwareWalletManager();