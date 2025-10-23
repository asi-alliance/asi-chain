# ASI Wallet v2 Component Guide

## 📱 Component Overview

ASI Wallet v2 is a modern, feature-rich cryptocurrency wallet built with React 18, TypeScript, and Redux Toolkit. It provides secure key management, WalletConnect v2 integration, and hardware wallet support.

```
asi_wallet_v2/
├── src/
│   ├── components/          # React components
│   ├── services/           # Business logic & blockchain interaction
│   ├── store/              # Redux state management
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript definitions
│   ├── assets/             # Images, fonts, icons
│   └── styles/             # Global styles and themes
├── public/                 # Static files
├── config/                 # Configuration files
└── scripts/                # Build and deployment scripts
```

## 🏗️ Architecture

### Component Hierarchy

```
App.tsx
├── Providers
│   ├── ReduxProvider
│   ├── ThemeProvider
│   ├── WalletConnectProvider
│   └── ErrorBoundary
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   ├── NetworkSelector
│   │   └── AccountMenu
│   ├── Sidebar
│   │   ├── WalletList
│   │   ├── QuickActions
│   │   └── Settings
│   └── Footer
└── Routes
    ├── Dashboard
    │   ├── BalanceCard
    │   ├── TransactionHistory
    │   ├── AssetList
    │   └── QuickStats
    ├── Send
    │   ├── RecipientInput
    │   ├── AmountInput
    │   ├── GasSettings
    │   └── ReviewModal
    ├── Receive
    │   ├── AddressDisplay
    │   ├── QRCode
    │   └── ShareOptions
    ├── WalletConnect
    │   ├── SessionList
    │   ├── ConnectionModal
    │   └── RequestHandler
    └── Settings
        ├── Security
        ├── Advanced
        └── About
```

## 💻 Core Components

### 1. Wallet Management (`src/components/Wallet/`)

```typescript
// WalletManager.tsx - Core wallet functionality
interface WalletState {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  isLocked: boolean;
  encryptedVault: string;
}

// Key features:
- Multi-wallet support
- Encrypted storage (AES-256-GCM)
- Mnemonic phrase generation (BIP39)
- Private key derivation (secp256k1)
- Address generation (REV format)
```

### 2. Balance Display (`src/components/Balance/`)

```typescript
// BalanceCard.tsx - Balance with caching
const BalanceCard: React.FC = () => {
  const balance = useBalance(address); // 15-second cache
  const price = usePrice('REV');
  
  // Global cache prevents API flooding
  // Cache key: address
  // TTL: 15 seconds
  // Invalidation: On transaction
}
```

### 3. Transaction Components (`src/components/Transaction/`)

```typescript
// TransactionForm.tsx - Send transactions
interface TransactionData {
  to: string;           // REV address
  amount: bigint;       // In smallest unit
  phloLimit: number;    // Gas limit
  phloPrice: number;    // Gas price
  deployer: string;     // Sender address
}

// TransactionHistory.tsx - Display past transactions
- Pagination support
- Real-time updates via GraphQL subscription
- Transaction status tracking
- Export to CSV
```

### 4. WalletConnect Integration (`src/components/WalletConnect/`)

```typescript
// WalletConnectProvider.tsx - WalletConnect v2
import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';

const core = new Core({
  projectId: process.env.REACT_APP_WC_PROJECT_ID,
  relayUrl: 'wss://relay.walletconnect.org'
});

// Features:
- Session management
- Request handling (sign, transaction)
- Event subscriptions
- QR code scanning
- Deep linking support
```

### 5. Hardware Wallet Support (`src/components/Hardware/`)

```typescript
// LedgerConnector.tsx - Ledger integration
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import AppEth from '@ledgerhq/hw-app-eth';

// TrezorConnector.tsx - Trezor integration
import TrezorConnect from '@trezor/connect-web';

// Features:
- Device detection
- Address derivation
- Transaction signing
- Firmware updates
- Multi-account support
```

## 🔧 Services Layer

### RChainService (`src/services/RChainService.ts`)

```typescript
class RChainService {
  private nodeUrl: string;
  private observerUrl: string;
  
  // Transaction submission (use validator)
  async sendTransaction(tx: Transaction): Promise<string> {
    // CRITICAL: Use validator node, not bootstrap!
    const response = await fetch(`${this.nodeUrl}/api/deploy`, {
      method: 'POST',
      body: JSON.stringify(tx)
    });
    return response.json();
  }
  
  // Balance queries (use observer)
  async getBalance(address: string): Promise<bigint> {
    // Use observer node for read operations
    const cached = balanceCache.get(address);
    if (cached) return cached;
    
    const balance = await this.queryBalance(address);
    balanceCache.set(address, balance, 15000); // 15s TTL
    return balance;
  }
  
  // Exploratory deploy (testing)
  async exploratoryDeploy(term: string): Promise<any> {
    // Use observer node
    return fetch(`${this.observerUrl}/api/explore-deploy`, {
      method: 'POST',
      body: JSON.stringify({ term })
    });
  }
}
```

### CryptoService (`src/services/CryptoService.ts`)

```typescript
class CryptoService {
  // Wallet encryption (PBKDF2 + AES-256-GCM)
  async encryptWallet(wallet: Wallet, password: string): Promise<string> {
    const salt = crypto.randomBytes(32);
    const key = await pbkdf2(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    // ... encryption logic
  }
  
  // Key generation (secp256k1)
  generateKeyPair(): KeyPair {
    const privateKey = crypto.randomBytes(32);
    const publicKey = secp256k1.publicKeyCreate(privateKey);
    return { privateKey, publicKey };
  }
  
  // Address generation (REV format)
  generateAddress(publicKey: Buffer): string {
    const hash = blake2b(publicKey, null, 32);
    const payload = Buffer.concat([
      Buffer.from([0x00]), // Version byte
      hash.slice(0, 20)     // First 20 bytes
    ]);
    return bs58check.encode(payload);
  }
  
  // Transaction signing
  signTransaction(tx: Transaction, privateKey: Buffer): string {
    const hash = blake2b(serialize(tx));
    const signature = secp256k1.ecdsaSign(hash, privateKey);
    return signature.toString('hex');
  }
}
```

### StorageService (`src/services/StorageService.ts`)

```typescript
class StorageService {
  // Encrypted local storage
  private storage = window.localStorage;
  
  async saveEncrypted(key: string, data: any, password: string) {
    const encrypted = await encrypt(JSON.stringify(data), password);
    this.storage.setItem(key, encrypted);
  }
  
  async loadEncrypted(key: string, password: string) {
    const encrypted = this.storage.getItem(key);
    if (!encrypted) return null;
    const decrypted = await decrypt(encrypted, password);
    return JSON.parse(decrypted);
  }
  
  // Session storage for temporary data
  setSession(key: string, value: any) {
    sessionStorage.setItem(key, JSON.stringify(value));
  }
}
```

## 🗄️ State Management

### Redux Store Structure

```typescript
// store/index.ts
export interface RootState {
  wallet: WalletState;
  transactions: TransactionState;
  ui: UIState;
  cache: CacheState;
  walletConnect: WalletConnectState;
}

// store/slices/walletSlice.ts
const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    wallets: [],
    activeWallet: null,
    isLocked: true,
    balance: null,
    lastUpdated: null
  },
  reducers: {
    addWallet: (state, action) => {
      state.wallets.push(action.payload);
    },
    setActiveWallet: (state, action) => {
      state.activeWallet = action.payload;
    },
    updateBalance: (state, action) => {
      state.balance = action.payload;
      state.lastUpdated = Date.now();
    },
    lockWallet: (state) => {
      state.isLocked = true;
      state.activeWallet = null;
    }
  }
});
```

### Middleware

```typescript
// store/middleware/cacheMiddleware.ts
const cacheMiddleware: Middleware = store => next => action => {
  // Implement 15-second balance cache
  if (action.type === 'wallet/fetchBalance') {
    const cached = getCachedBalance(action.payload.address);
    if (cached && Date.now() - cached.timestamp < 1lt;15000) {
      return next({
        type: 'wallet/updateBalance',
        payload: cached.balance
      });
    }
  }
  return next(action);
};
```

## 🎨 UI/UX Features

### Theme System

```typescript
// themes/theme.ts
export const lightTheme = {
  colors: {
    primary: '#7FD67A',
    secondary: '#A8E6A3',
    background: '#FFFFFF',
    text: '#1A1A1A',
    error: '#FF5252',
    success: '#4CAF50'
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 700 },
    body: { fontSize: '1rem', fontWeight: 400 }
  }
};

export const darkTheme = {
  colors: {
    primary: '#7FD67A',
    secondary: '#A8E6A3',
    background: '#1A1A1A',
    text: '#FFFFFF',
    error: '#FF6B6B',
    success: '#51CF66'
  }
};
```

### Responsive Design

```scss
// styles/breakpoints.scss
$mobile: 320px;
$tablet: 768px;
$desktop: 1024px;
$widescreen: 1440px;

@mixin mobile {
  @media (max-width: #{$tablet - 1px}) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: #{$tablet}) and (max-width: #{$desktop - 1px}) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: #{$desktop}) {
    @content;
  }
}
```

## 🔐 Security Features

### 1. Biometric Authentication

```typescript
// hooks/useBiometricAuth.ts
const useBiometricAuth = () => {
  const authenticate = async () => {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: { name: 'ASI Wallet' },
        user: {
          id: new Uint8Array(16),
          name: user.email,
          displayName: user.name
        },
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        }
      }
    });
    return credential;
  };
};
```

### 2. Multi-Signature Support

```typescript
// components/MultiSig/MultiSigWallet.tsx
interface MultiSigConfig {
  owners: string[];
  required: number; // Required signatures
  pending: Transaction[];
}

const MultiSigWallet: React.FC = () => {
  // Collect signatures
  // Submit when threshold reached
  // Track pending transactions
};
```

### 3. Security Checks

```typescript
// utils/security.ts
export const validateAddress = (address: string): boolean => {
  // REV address format validation
  const regex = /^[1-9A-HJ-NP-Za-km-z]{34,}$/;
  return regex.test(address) && verifyChecksum(address);
};

export const sanitizeInput = (input: string): string => {
  // Prevent XSS and injection
  return DOMPurify.sanitize(input);
};

export const checkPhishing = async (url: string): Promise<boolean> => {
  // Check against phishing database
  const response = await fetch('/api/phishing-check', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
  return response.json();
};
```

## 🧪 Testing

### Unit Tests

```typescript
// __tests__/services/CryptoService.test.ts
describe('CryptoService', () => {
  describe('generateAddress', () => {
    it('should generate valid REV address', () => {
      const keyPair = cryptoService.generateKeyPair();
      const address = cryptoService.generateAddress(keyPair.publicKey);
      expect(address).toMatch(/^1111[1-9A-HJ-NP-Za-km-z]{30,}$/);
    });
  });
  
  describe('encryptWallet', () => {
    it('should encrypt and decrypt wallet data', async () => {
      const wallet = { privateKey: 'test', address: 'test' };
      const password = 'SecurePassword123!';
      const encrypted = await cryptoService.encryptWallet(wallet, password);
      const decrypted = await cryptoService.decryptWallet(encrypted, password);
      expect(decrypted).toEqual(wallet);
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/Transaction.test.tsx
describe('Transaction Flow', () => {
  it('should complete transaction from start to finish', async () => {
    render(<App />);
    
    // Navigate to send
    fireEvent.click(screen.getByText('Send'));
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Recipient'), {
      target: { value: '1111...' }
    });
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '10' }
    });
    
    // Submit
    fireEvent.click(screen.getByText('Review'));
    fireEvent.click(screen.getByText('Confirm'));
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText('Transaction sent')).toBeInTheDocument();
    });
  });
});
```

## 🚀 Performance Optimizations

### 1. Code Splitting

```typescript
// App.tsx - Lazy loading routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Send = lazy(() => import('./pages/Send'));
const WalletConnect = lazy(() => import('./pages/WalletConnect'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/send" element={<Send />} />
        <Route path="/wallet-connect" element={<WalletConnect />} />
      </Routes>
    </Suspense>
  );
}
```

### 2. Memoization

```typescript
// hooks/useBalance.ts
const useBalance = (address: string) => {
  return useMemo(() => {
    // Expensive balance calculation
    return calculateBalance(address);
  }, [address]);
};

// components/TransactionList.tsx
const TransactionList = memo(({ transactions }) => {
  // Only re-render when transactions change
  return transactions.map(tx => <TransactionItem key={tx.id} {...tx} />);
});
```

### 3. Virtual Scrolling

```typescript
// components/VirtualList.tsx
import { VariableSizeList } from 'react-window';

const VirtualTransactionList = ({ transactions }) => {
  return (
    <VariableSizeList
      height={600}
      itemCount={transactions.length}
      itemSize={() => 80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <TransactionItem {...transactions[index]} />
        </div>
      )}
    </VariableSizeList>
  );
};
```

## 📦 Build Configuration

### Webpack Configuration

```javascript
// config-overrides.js (react-app-rewired)
module.exports = {
  webpack: (config, env) => {
    // Add polyfills for Node.js modules
    config.resolve.fallback = {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer')
    };
    
    // Optimize bundle size
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        }
      }
    };
    
    return config;
  }
};
```

### Environment Variables

```bash
# .env.production
REACT_APP_API_URL=http://13.251.66.61:9090
REACT_APP_GRAPHQL_URL=http://13.251.66.61:8080/v1/graphql
REACT_APP_NODE_URL=http://13.251.66.61:40413
REACT_APP_OBSERVER_URL=http://13.251.66.61:40453
REACT_APP_WC_PROJECT_ID=your_walletconnect_project_id
REACT_APP_CACHE_TTL=15000
```

## 🐛 Common Issues & Solutions

### Issue: Balance not updating
```typescript
// Solution: Clear cache and force refresh
balanceCache.clear();
await fetchBalance(address, { force: true });
```

### Issue: WalletConnect connection fails
```typescript
// Solution: Check project ID and relay URL
const core = new Core({
  projectId: process.env.REACT_APP_WC_PROJECT_ID,
  relayUrl: 'wss://relay.walletconnect.org'
});
```

### Issue: Hardware wallet not detected
```typescript
// Solution: Check USB permissions and browser support
if (!navigator.usb) {
  throw new Error('WebUSB not supported');
}
await navigator.usb.requestDevice({ filters: [] });
```

## 📋 Development Checklist

### Before Starting
- [ ] Review existing wallet code
- [ ] Understand REV address format
- [ ] Learn Rholang basics
- [ ] Set up local F1R3FLY node

### During Development
- [ ] Follow existing patterns
- [ ] Maintain TypeScript types
- [ ] Write unit tests
- [ ] Update documentation
- [ ] Check bundle size

### Before Deployment
- [ ] Run all tests
- [ ] Check security vulnerabilities
- [ ] Verify environment variables
- [ ] Test on production data
- [ ] Update version number

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Component Version**: 2.2.0