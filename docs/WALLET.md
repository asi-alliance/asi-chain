# ASI Wallet v2 Documentation

## Table of Contents

1. [Overview](#overview)
2. [Installation Guide](#installation-guide)
3. [User Guide](#user-guide)
4. [Architecture](#architecture)
5. [Development](#development)
6. [API Reference](#api-reference)
7. [WalletConnect Integration](#walletconnect-integration)
8. [IDE Documentation](#ide-documentation)
9. [Security](#security)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

## Overview

ASI Wallet v2 is a secure, client-side cryptocurrency wallet for the RChain blockchain. It operates entirely in the browser without requiring backend servers, providing users with complete control over their private keys and funds.

### Key Features

- 🔐 **100% Client-Side**: No backend servers, complete user control
- 🌐 **Progressive Web App**: Works offline, installable on devices
- 🔗 **WalletConnect v2**: Connect to decentralized applications
- 💻 **Integrated IDE**: Write and deploy Rholang smart contracts
- 🎨 **Modern UI**: Responsive design with dark/light themes
- 🔒 **Secure**: AES encryption for local storage
- 📱 **QR Code Scanner**: Built-in scanner for easy address sharing
- 🔄 **Multi-Network Support**: Connect to different RChain networks
- 📊 **Transaction History**: Track all your transfers and deploys
- 🔑 **Multiple Account Management**: Create and manage multiple wallets

### Quick Links

- **Source Code**: `asi_wallet_v2/`
- **Latest Build**: Available in the `build/` directory after running `npm run build`
- **License**: MIT
- **Dependencies**: ~1,900+ npm packages (typical for modern React applications)

## Installation Guide

### Prerequisites

- **Node.js**: Version 14 or higher (recommended: 18+)
- **npm**: Version 6 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Browser**: Modern browser with Web Crypto API support (Chrome, Firefox, Safari, Edge)

### Getting the Code

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/asi-chain.git
   cd asi-chain/asi_wallet_v2
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

   This will install all required packages including:
   - React 18.x
   - Redux Toolkit
   - WalletConnect v2
   - crypto-js for encryption
   - styled-components for styling
   - Monaco Editor for the IDE

### Running Locally

1. **Start Development Server**:
   ```bash
   npm start
   ```
   The wallet will open at http://localhost:3000

2. **Environment Variables** (Optional):
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id
   REACT_APP_DEFAULT_NODE_URL=http://localhost:40401
   REACT_APP_DEFAULT_READONLY_URL=http://localhost:40403
   ```

### Building for Production

1. **Create Production Build**:
   ```bash
   npm run build
   ```

2. **Build Output**:
   The optimized production files will be in the `build/` directory:
   ```
   build/
   ├── index.html
   ├── static/
   │   ├── css/
   │   ├── js/
   │   └── media/
   └── manifest.json
   ```

3. **Test Production Build**:
   ```bash
   npm install -g serve
   serve -s build
   ```

### Quick Installation Script

For automated installation, you can use this script:

```bash
#!/bin/bash
# Quick install script for ASI Wallet v2

# Clone repository
git clone https://github.com/yourusername/asi-chain.git
cd asi-chain/asi_wallet_v2

# Install dependencies
npm install

# Build wallet
npm run build

# Start local server
npx serve -s build -l 5000

echo "ASI Wallet v2 is now running at http://localhost:5000"
```

## User Guide

### Getting Started

#### Creating Your First Wallet

1. **Open the Wallet**: Navigate to the wallet URL in your browser
2. **Set a Password**: Enter a strong password (this encrypts your wallet locally)
3. **Create Account**: Click "Create New Account"
4. **Save Your Keys**: 
   - **Private Key**: Save this securely - it's your access to funds
   - **Public Key**: This can be shared publicly
   - **REV Address**: Your RChain address for receiving funds

⚠️ **Important**: Never share your private key! The wallet encrypts and stores it locally.

#### Importing an Existing Account

1. **Click "Import Account"** from the dashboard
2. **Choose Import Method**:
   - **Private Key**: Full access to send and receive
   - **Address Only**: Watch-only mode for balance checking
3. **Enter Details**:
   - For private key: Enter the hex-encoded key
   - For address: Enter REV or ETH address
4. **Name Your Account**: Give it a memorable name

### Managing Your Wallet

#### Checking Balance

Your balance automatically updates when you:
- Select an account
- Complete a transaction
- Manually refresh (pull down on mobile)

Balance is shown in:
- **REV**: The main unit (1 REV = 100,000,000 base units)
- **Base Units**: Used internally for precision

#### Sending Funds

1. **Navigate to Send**:
   - Click "Send" from the dashboard
   - Or use the send button on account card

2. **Enter Transaction Details**:
   - **To Address**: REV address (starts with "1111")
   - **Amount**: In REV (e.g., "10.5")
   - **Note**: Optional memo for your records

3. **Review Transaction**:
   - Check recipient address carefully
   - Verify amount and fees
   - Current phlo price: 1 (minimum)

4. **Confirm and Send**:
   - Enter your password
   - Click "Send Transaction"
   - Wait for confirmation

5. **Track Status**:
   - View transaction hash
   - Monitor block inclusion
   - Check deploy status

#### Receiving Funds

1. **Share Your Address**:
   - Click "Receive" on account card
   - Copy address or show QR code
   - Share with sender

2. **Verify Receipt**:
   - Balance updates automatically
   - Check transaction history
   - View in block explorer

### Network Configuration

#### Available Networks

1. **Mainnet** (Default):
   - Production network
   - Real REV tokens
   - Higher security

2. **Testnet**:
   - For testing and development
   - Test REV available from faucets
   - Experimental features

3. **Local Network**:
   - For developers
   - Runs on localhost
   - Full control

#### Adding Custom Networks

1. **Go to Settings** → **Networks**
2. **Click "Add Network"**
3. **Enter Network Details**:
   ```
   Name: My Custom Network
   Validator URL: http://node.example.com:40401
   Read-Only URL: http://node.example.com:40403
   Admin URL: http://localhost:40402 (optional)
   ```
4. **Save and Connect**

### Advanced Features

#### Using the IDE

1. **Access IDE**: Click "IDE" in navigation
2. **Create New File**: Click "+" button
3. **Write Rholang Code**:
   ```rholang
   new helloWorld in {
     contract helloWorld(@name) = {
       new stdout(`rho:io:stdout`) in {
         stdout!(["Hello", name])
       }
     } |
     helloWorld!("ASI Wallet User")
   }
   ```
4. **Deploy Contract**:
   - Set phlo limit (gas)
   - Click "Deploy"
   - Sign with account

#### WalletConnect Integration

1. **Scan QR Code**: 
   - Click WalletConnect icon
   - Scan dApp QR code
   - Or paste connection URI

2. **Approve Connection**:
   - Review dApp details
   - Select accounts to expose
   - Confirm connection

3. **Handle Requests**:
   - Review transaction details
   - Approve or reject
   - Monitor in sessions

#### Security Best Practices

1. **Password Security**:
   - Use strong, unique password
   - Never share with anyone
   - Change if compromised

2. **Private Key Management**:
   - Store offline backups
   - Use hardware wallets (future)
   - Never enter on websites

3. **Transaction Verification**:
   - Always double-check addresses
   - Verify amounts carefully
   - Review phlo limits

4. **Session Management**:
   - Auto-logout after 15 minutes
   - Lock wallet when away
   - Clear data if needed

### Troubleshooting Common Issues

#### "Cannot Connect to Node"
- Check network settings
- Verify node URLs
- Try different network
- Check internet connection

#### "Invalid Password"
- Password is case-sensitive
- Check Caps Lock
- No password recovery (client-side)

#### "Transaction Failed"
- Check account balance
- Verify recipient address
- Increase phlo limit
- Wait and retry

#### "Balance Not Updating"
- Refresh manually
- Check network status
- Wait for block confirmation
- Try read-only node

## Architecture

### System Overview

ASI Wallet v2 is a completely client-side Progressive Web Application (PWA) built with React and TypeScript. It connects directly to RChain nodes without requiring any backend infrastructure.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   React UI  │  │ Redux Store  │  │  Service Workers (PWA) │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────┘ │
│         │                 │                                       │
│  ┌──────┴─────────────────┴───────────────────────────────────┐ │
│  │                    Service Layer                            │ │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐    │ │
│  │  │  RChain    │  │   Secure    │  │  WalletConnect   │    │ │
│  │  │  Service   │  │   Storage   │  │    Service       │    │ │
│  │  └────────────┘  └─────────────┘  └──────────────────┘    │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    External Services
         ┌───────────────────┴───────────────────┐
         │                                       │
    ┌────┴──────┐                    ┌──────────┴──────────┐
    │  RChain   │                    │  WalletConnect     │
    │   Nodes   │                    │   Relay Server     │
    └───────────┘                    └───────────────────┘
```

### Core Architecture Principles

1. **Client-Side Only**
   - No backend servers or databases
   - All processing happens in the browser
   - Private keys never leave the device
   - Direct blockchain communication

2. **Security First**
   - AES encryption for local storage
   - Password-based encryption using crypto-js
   - Secure random number generation
   - No external dependencies for crypto operations

3. **Progressive Web App**
   - Works offline for key management
   - Installable on desktop and mobile
   - Service worker for caching
   - Responsive design

4. **Zero Trust Architecture**
   - No backend servers or APIs
   - Client-side security for all cryptographic operations
   - Direct blockchain access (peer-to-peer)
   - Local data persistence with encrypted storage

5. **Static Deployment**
   - Can run from any static file server
   - No server-side logic required
   - Works from subdirectories
   - IPFS-compatible

### Component Architecture

#### Frontend Layer

```typescript
src/
├── components/          # Reusable UI components
│   ├── Button/
│   ├── Card/
│   ├── Layout/
│   └── WalletConnect/
├── pages/              # Route-based page components
│   ├── Dashboard/
│   ├── Send/
│   ├── IDE/
│   └── Settings/
├── hooks/              # Custom React hooks
├── styles/             # Global styles and themes
└── App.tsx            # Main application component
```

#### State Management

Using Redux Toolkit with feature-based slices:

```typescript
store/
├── authSlice.ts       # Authentication state
├── walletSlice.ts     # Wallet accounts and balances
├── themeSlice.ts      # UI theme preferences
└── walletConnectSlice.ts  # dApp connections
```

#### Service Layer

```typescript
services/
├── rchainService.ts   # Blockchain communication
├── secureStorage.ts   # Encrypted local storage
├── walletConnect.ts   # dApp connectivity
└── cryptoService.ts   # Cryptographic operations
```

### Data Flow

#### Account Creation
```
User Input → Password → Used as Encryption Key
                ↓
Generate Private Key → Derive Public Key → Derive Addresses
                ↓
Encrypt & Store Locally ← AES
```

#### Transaction Flow
```
User Input → Validate → Build Transaction → Sign with Private Key
                                              ↓
                                    Deploy to RChain Node
                                              ↓
                                    Monitor Block Creation
```

#### Balance Query
```
Request Balance → RChain Node (explore-deploy)
                        ↓
                  Parse Response
                        ↓
                  Update Redux Store → Update UI
```

### Security Architecture

#### Local Storage Encryption
- **Algorithm**: AES (via crypto-js)
- **Key Derivation**: Password-based encryption
- **Encryption Format**: OpenSSL-compatible format
- **Salt and IV**: Automatically handled by crypto-js

#### Key Management
```typescript
interface EncryptedVault {
  accounts: EncryptedAccount[];
  salt: string;
  iv: string;
  authTag: string;
}

interface EncryptedAccount {
  encryptedPrivateKey: string;
  publicKey: string;
  address: string;
  name: string;
}
```

#### Session Security
- Auto-logout after 15 minutes of inactivity (configurable)
- Memory cleanup on logout
- No sensitive data in Redux persist
- Explicit lock/unlock actions
- Activity-based timer reset

### Network Communication

#### RChain Integration
- **Protocol**: HTTP/gRPC
- **Endpoints**:
  - Deploy: Port 40401
  - Propose: Port 40402
  - Query: Port 40403
- **Node Types**:
  - **Validator Nodes**: State-changing operations (deploy, transfer)
  - **Read-Only Nodes**: Query operations (balance, explore) - lower load, faster responses
  - **Admin Nodes**: Local development (propose blocks) - local networks only

#### Request Structure
```typescript
interface DeployRequest {
  deployer: string;
  timestamp: number;
  nonce: string;
  sessionCode: string;
  paymentCode: string;
  gasPrice: number;
  gasLimit: number;
}
```

### Performance Optimizations

#### Code Splitting
- Lazy loading for IDE and complex features
- Route-based code splitting
- Separate vendor bundle
- Monaco editor lazy loading (separate chunk)

#### Caching Strategy
- Service worker for static assets
- Local storage for user preferences
- Memory cache for blockchain queries

#### Bundle Optimization
```javascript
// config-overrides.js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10
      },
      monaco: {
        test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
        name: 'monaco',
        priority: 20
      }
    }
  }
}
```

## Development

### Setting Up Development Environment

#### Prerequisites

- Node.js 14+ (recommended: 18+)
- npm 6+ or yarn
- Git
- Code editor (VS Code recommended)
- Browser with DevTools

#### Initial Setup

1. **Clone and Install**:
   ```bash
   git clone https://github.com/yourusername/asi-chain.git
   cd asi-chain/asi_wallet_v2
   npm install
   ```

2. **Environment Configuration**:
   Create `.env` file:
   ```env
   REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id
   REACT_APP_DEFAULT_NODE_URL=http://localhost:40401
   REACT_APP_DEFAULT_READONLY_URL=http://localhost:40403
   REACT_APP_DEFAULT_ADMIN_URL=http://localhost:40402
   ```

3. **Start Development Server**:
   ```bash
   npm start
   ```

### Development Commands

```bash
# Start development server
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Check TypeScript types
npm run type-check

# Lint code
npm run lint

# Format code
npm run format

# Build production bundle
npm run build

# Analyze bundle size
npm run analyze

# Deploy to GitHub Pages
npm run deploy:gh

# Deploy to IPFS
npm run deploy:ipfs
```

### Project Structure

```
asi_wallet_v2/
├── public/              # Static files
│   ├── index.html      # HTML template
│   └── manifest.json   # PWA manifest
├── src/                # Source code
│   ├── components/     # Reusable components
│   ├── pages/         # Page components
│   ├── services/      # Business logic
│   ├── store/         # Redux store
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Utilities
│   ├── types/         # TypeScript types
│   └── App.tsx        # Root component
├── config-overrides.js # Webpack config
├── tsconfig.json      # TypeScript config
└── package.json       # Dependencies
```

### Code Style Guidelines

#### TypeScript Best Practices

```typescript
// Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  balance: string;
}

// Use type for unions and aliases
type Status = 'idle' | 'loading' | 'success' | 'error';

// Use enums for constants
enum NetworkType {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
  Local = 'local'
}

// Always specify return types
function calculateFee(amount: string): string {
  return (parseFloat(amount) * 0.001).toString();
}

// Use generics for reusable components
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

#### React Component Patterns

```typescript
// Functional component with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  onClick,
  children
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      onClick={onClick}
    >
      {children}
    </StyledButton>
  );
};

// Custom hooks
export function useBalance(address: string) {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch balance logic
  }, [address]);
  
  return { balance, loading };
}
```

### Testing

#### Unit Testing

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Integration Testing

```typescript
// WalletService.test.ts
import { RChainService } from '../services/rchainService';

describe('RChain Service', () => {
  let service: RChainService;
  
  beforeEach(() => {
    service = new RChainService('http://localhost:40401');
  });
  
  it('fetches balance correctly', async () => {
    const balance = await service.getBalance('1111...');
    expect(balance).toMatch(/^\d+$/);
  });
});
```

### Debugging

#### Browser DevTools

1. **React DevTools**:
   - Install React DevTools extension
   - Inspect component tree
   - Monitor state changes

2. **Redux DevTools**:
   - Install Redux DevTools extension
   - Track actions and state
   - Time-travel debugging

3. **Network Tab**:
   - Monitor RChain API calls
   - Check request/response data
   - Identify performance issues

#### Debug Configuration

```javascript
// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  window.DEBUG = {
    logActions: true,
    logApiCalls: true,
    logCrypto: false // Sensitive!
  };
}
```

### Performance Optimization

#### React Performance

```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return calculateComplexValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components
const MemoizedComponent = React.memo(ExpensiveComponent);
```

#### Bundle Optimization

```javascript
// Lazy load routes
const IDE = lazy(() => import('./pages/IDE'));
const Settings = lazy(() => import('./pages/Settings'));

// Use dynamic imports
const loadWalletConnect = async () => {
  const { WalletConnectService } = await import('./services/walletConnect');
  return new WalletConnectService();
};
```

## API Reference

### RChain Service API

The RChainService class provides methods for interacting with the RChain blockchain.

#### Constructor

```typescript
new RChainService(
  nodeUrl: string,
  readOnlyUrl?: string,
  adminUrl?: string,
  shardId: string = 'root'
)
```

**Parameters:**
- `nodeUrl`: Validator node URL for state-changing operations
- `readOnlyUrl`: Read-only node URL for queries (optional, defaults to nodeUrl)
- `adminUrl`: Admin node URL for local development (optional)
- `shardId`: Shard identifier (default: 'root')

#### Methods

##### getBalance

```typescript
async getBalance(revAddress: string): Promise<string>
```

Retrieves the REV balance for a given address.

**Parameters:**
- `revAddress`: RChain address (format: "1111...")

**Returns:**
- Promise resolving to balance as string (in smallest unit)

**Example:**
```typescript
const balance = await rchain.getBalance("111112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS");
// Returns: "1000000000" (1 REV = 10^8 smallest units)
```

##### transfer

```typescript
async transfer(
  fromAddress: string,
  toAddress: string,
  amount: string,
  privateKey: string
): Promise<string>
```

Transfers REV tokens between addresses.

**Parameters:**
- `fromAddress`: Sender's REV address
- `toAddress`: Recipient's REV address
- `amount`: Amount in smallest units
- `privateKey`: Sender's private key (hex format)

**Returns:**
- Promise resolving to deploy ID

**Example:**
```typescript
const deployId = await rchain.transfer(
  "11111...", // from
  "11112...", // to
  "100000000", // 1 REV
  "abc123..." // private key
);
```

##### sendDeploy

```typescript
async sendDeploy(
  rholangCode: string,
  privateKey: string,
  phloLimit: number = 500000
): Promise<string>
```

Deploys arbitrary Rholang code.

**Parameters:**
- `rholangCode`: Rholang source code
- `privateKey`: Deployer's private key
- `phloLimit`: Maximum gas to consume (default: 500,000)

**Returns:**
- Promise resolving to deploy ID

##### exploreDeployData

```typescript
async exploreDeployData(rholangCode: string): Promise<any>
```

Executes Rholang code in read-only mode without creating a deploy.

**Parameters:**
- `rholangCode`: Rholang code to explore

**Returns:**
- Promise resolving to execution result

##### waitForDeployResult

```typescript
async waitForDeployResult(
  deployId: string,
  maxAttempts: number = 15
): Promise<DeployResult>
```

Polls for deploy result until found or timeout.

**Parameters:**
- `deployId`: Deploy ID to check
- `maxAttempts`: Maximum polling attempts (default: 15)

**Returns:**
- Promise resolving to deploy result with status

### Secure Storage API

The SecureStorage class handles encrypted storage of sensitive data.

#### Static Methods

##### encryptAccount

```typescript
static encryptAccount(
  account: Account,
  password: string
): EncryptedAccount
```

Encrypts an account with a password.

##### decryptAccount

```typescript
static decryptAccount(
  encryptedAccount: EncryptedAccount,
  password: string
): Account | null
```

Decrypts an account with a password.

##### saveAccounts

```typescript
static saveAccounts(accounts: EncryptedAccount[]): void
```

Saves encrypted accounts to localStorage.

##### getEncryptedAccounts

```typescript
static getEncryptedAccounts(): EncryptedAccount[]
```

Retrieves all encrypted accounts from storage.

### Crypto Utilities API

Cryptographic functions for key management and signing.

#### generateKeyPair

```typescript
function generateKeyPair(): KeyPair
```

Generates a new secp256k1 key pair.

**Returns:**
```typescript
interface KeyPair {
  privateKey: string  // Hex format
  publicKey: string   // Hex format
  ethAddress: string  // 0x prefixed
  revAddress: string  // Base58 encoded
}
```

#### signDeploy

```typescript
function signDeploy(
  deployData: Deploy,
  privateKey: string
): SignedDeploy
```

Signs a deploy with a private key.

### Redux Store API

State management using Redux Toolkit.

#### Store Structure

```typescript
interface RootState {
  wallet: WalletState
  auth: AuthState
  theme: ThemeState
  walletConnect: WalletConnectState
}
```

#### Wallet Slice Actions

```typescript
// Account management
addAccount(account: Account): void
removeAccount(accountId: string): void
updateAccount(account: Partial<Account>): void
selectAccount(accountId: string): void

// Network management
selectNetwork(networkId: string): void
addCustomNetwork(network: Network): void

// Balance updates
updateBalance(accountId: string, balance: string): void
```

### RChain Node HTTP API

Direct HTTP API endpoints exposed by RChain nodes.

#### Deploy Endpoints

##### POST /api/deploy

Submit a new deploy.

**Request Body:**
```json
{
  "data": {
    "term": "new x in { x!(1) }",
    "timestamp": 1634567890123,
    "phloPrice": 1,
    "phloLimit": 100000,
    "validAfterBlockNumber": 12345,
    "shardId": "root"
  },
  "sigAlgorithm": "secp256k1",
  "signature": "3044...",
  "deployer": "04..."
}
```

**Response:**
```
"3044..." // Deploy ID
```

##### GET /api/deploy/{deployId}

Get deploy status.

**Response:**
```json
{
  "blockHash": "1de605a6...",
  "blockNumber": 12346,
  "deployIndex": 0
}
```

#### Query Endpoints

##### POST /api/explore-deploy

Execute Rholang in read-only mode.

**Request Body:**
```
new return in { return!(42) }
```

**Response:**
```json
{
  "expr": [
    {
      "ExprInt": {
        "data": 42
      }
    }
  ]
}
```

## WalletConnect Integration

### Overview

ASI Wallet v2 supports WalletConnect v2 protocol, enabling secure connections between the wallet and decentralized applications (dApps). This allows users to interact with RChain dApps without exposing their private keys.

### Features

- **QR Code Scanning**: Built-in scanner for easy connection
- **Session Management**: View and manage active dApp connections
- **Transaction Approval**: Review and approve/reject dApp requests
- **Multi-Account Support**: Choose which accounts to expose to dApps
- **Custom RChain Methods**: Support for RChain-specific operations

### Setup for Developers

#### Getting WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy your Project ID
4. Add to your `.env` file:
   ```env
   REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

#### Initializing WalletConnect

```typescript
import { WalletConnectService } from './services/walletConnect';

const wcService = new WalletConnectService();
await wcService.initialize();
```

### Supported Methods

#### rchain_sendTransaction

Send RChain transactions.

**Request:**
```typescript
{
  method: 'rchain_sendTransaction',
  params: [{
    from: '1111...', // REV address
    to: '1112...',   // REV address
    value: '1000000000', // Amount in smallest units
    data: 'optional memo'
  }]
}
```

**Response:**
```typescript
{
  deployId: '3044...',
  status: 'sent'
}
```

#### rchain_getBalance

Get account balance.

**Request:**
```typescript
{
  method: 'rchain_getBalance',
  params: ['1111...'] // REV address
}
```

**Response:**
```typescript
{
  balance: '1000000000' // In smallest units
}
```

#### rchain_signMessage (Coming Soon)

Sign arbitrary messages.

**Request:**
```typescript
{
  method: 'rchain_signMessage',
  params: [{
    address: '1111...',
    message: 'Hello, RChain!'
  }]
}
```

### Integration Guide for dApp Developers

#### 1. Install WalletConnect Client

```bash
npm install @walletconnect/sign-client @walletconnect/utils
```

#### 2. Initialize Client

```typescript
import { SignClient } from '@walletconnect/sign-client';

const client = await SignClient.init({
  projectId: 'your_project_id',
  metadata: {
    name: 'Your dApp Name',
    description: 'Your dApp Description',
    url: 'https://yourdapp.com',
    icons: ['https://yourdapp.com/icon.png']
  }
});
```

#### 3. Create Connection

```typescript
const { uri, approval } = await client.connect({
  requiredNamespaces: {
    rchain: {
      methods: ['rchain_sendTransaction', 'rchain_getBalance'],
      chains: ['rchain:1'], // Mainnet
      events: []
    }
  }
});

// Display URI as QR code for wallet to scan
console.log('WalletConnect URI:', uri);

// Wait for wallet approval
const session = await approval();
```

#### 4. Send Requests

```typescript
// Send transaction
const result = await client.request({
  topic: session.topic,
  chainId: 'rchain:1',
  request: {
    method: 'rchain_sendTransaction',
    params: [{
      from: session.namespaces.rchain.accounts[0],
      to: '1112...',
      value: '1000000000'
    }]
  }
});
```

### User Flow

1. **dApp Displays QR Code**: 
   - dApp generates connection URI
   - Displays as QR code

2. **User Scans with Wallet**:
   - Opens WalletConnect scanner
   - Scans QR code
   - Reviews connection request

3. **Approve Connection**:
   - Select accounts to share
   - Approve or reject
   - Connection established

4. **Transaction Requests**:
   - dApp sends transaction
   - Wallet displays details
   - User approves/rejects
   - Result sent to dApp

### Security Considerations

1. **No Private Key Exposure**: Private keys never leave the wallet
2. **User Approval Required**: All transactions require explicit approval
3. **Session Management**: Users can disconnect at any time
4. **Account Selection**: Users choose which accounts to expose
5. **Request Validation**: All requests are validated before display

### Troubleshooting

#### Connection Issues

1. **QR Code Not Scanning**:
   - Ensure good lighting
   - Try manual URI paste
   - Check camera permissions

2. **Connection Timeout**:
   - Check internet connection
   - Verify WalletConnect relay is accessible
   - Try refreshing and regenerating QR

3. **Transaction Failures**:
   - Verify account has sufficient balance
   - Check network connectivity
   - Review phlo limits

#### Development Tips

1. **Use Testnet**: Test on testnet before mainnet
2. **Error Handling**: Implement proper error handling for rejected requests
3. **User Feedback**: Provide clear feedback for all operations
4. **Session Persistence**: Handle session reconnection on page refresh

## IDE Documentation

### Overview

The integrated development environment (IDE) in ASI Wallet v2 allows users to write, test, and deploy Rholang smart contracts directly from the wallet interface. It features syntax highlighting, file management, and direct blockchain deployment.

### Features

- **Monaco Editor**: VSCode's editor with Rholang syntax highlighting
- **File Management**: Create, edit, delete, and organize files
- **Folder Structure**: Organize contracts in folders
- **Import/Export**: Save work locally or load existing files
- **Direct Deployment**: Deploy contracts with one click
- **Syntax Highlighting**: Rholang-specific syntax coloring
- **Auto-Save**: Changes saved automatically to browser storage

### Getting Started with the IDE

#### Creating Your First Contract

1. **Open IDE**: Click "IDE" in the navigation menu
2. **Create New File**: Click the "+" button
3. **Name Your File**: Use `.rho` extension (e.g., `HelloWorld.rho`)
4. **Write Contract**:
   ```rholang
   new helloWorld, stdout(`rho:io:stdout`) in {
     contract helloWorld(@name) = {
       stdout!(["Hello", name])
     } |
     helloWorld!("RChain Developer")
   }
   ```
5. **Save**: Files auto-save as you type

#### File Management

##### Creating Files and Folders

```typescript
// File structure example
my-contracts/
├── tokens/
│   ├── MyToken.rho
│   └── TokenVault.rho
├── governance/
│   └── Voting.rho
└── HelloWorld.rho
```

- **New File**: Click "+" → Enter name with .rho extension
- **New Folder**: Click folder icon → Enter folder name
- **Move Files**: Drag and drop between folders
- **Rename**: Right-click → Rename
- **Delete**: Right-click → Delete (with confirmation)

##### Import/Export

**Importing Files**:
1. Click "Import" button
2. Select .rho file from computer
3. File added to current folder

**Exporting Files**:
1. Right-click on file
2. Select "Export"
3. File downloaded to computer

**Workspace Export**:
1. Click menu → "Export Workspace"
2. Downloads all files as JSON
3. Can be imported later

### Writing Rholang Contracts

#### Basic Contract Structure

```rholang
// Import statements (if needed)
new myContract in {
  
  // Contract definition
  contract myContract(@parameter) = {
    // Contract logic here
    new result in {
      result!(parameter)
    }
  } |
  
  // Contract invocation (for testing)
  myContract!("test")
}
```

#### Common Patterns

##### Token Contract Example

```rholang
new MakeMyToken, stdout(`rho:io:stdout`) in {
  
  contract MakeMyToken(@initialSupply, return) = {
    new tokenCh, mint, transfer, getBalance in {
      
      tokenCh!({
        "supply": initialSupply,
        "balances": {"creator": initialSupply}
      }) |
      
      contract mint(@amount, @to, result) = {
        for (@token <- tokenCh) {
          tokenCh!({
            "supply": token.get("supply") + amount,
            "balances": token.get("balances").set(to, 
              token.get("balances").getOrElse(to, 0) + amount)
          }) |
          result!(true)
        }
      } |
      
      contract transfer(@from, @to, @amount, result) = {
        for (@token <- tokenCh) {
          match token.get("balances").getOrElse(from, 0) >= amount {
            true => {
              tokenCh!({
                "supply": token.get("supply"),
                "balances": token.get("balances")
                  .set(from, token.get("balances").get(from) - amount)
                  .set(to, token.get("balances").getOrElse(to, 0) + amount)
              }) |
              result!(true)
            }
            false => {
              tokenCh!(token) |
              result!(false)
            }
          }
        }
      } |
      
      return!({
        "mint": bundle+{*mint},
        "transfer": bundle+{*transfer},
        "getBalance": bundle+{*getBalance}
      })
    }
  } |
  
  // Deploy the token
  new tokenReturn in {
    MakeMyToken!(1000000, *tokenReturn) |
    for (@token <- tokenReturn) {
      stdout!(["Token created:", token])
    }
  }
}
```

##### Registry Pattern

```rholang
new insertArbitrary(`rho:registry:insertArbitrary`), 
    stdout(`rho:io:stdout`) in {
  
  new myContract in {
    contract myContract(@data, return) = {
      stdout!(["Received:", data]) |
      return!("Success")
    } |
    
    // Register the contract
    insertArbitrary!(bundle+{*myContract}, *stdout)
  }
}
```

### Deploying Contracts

#### Deployment Process

1. **Write/Open Contract**: Ensure contract is ready
2. **Set Deploy Parameters**:
   - **Phlo Limit**: Gas limit (default: 500,000)
   - **Phlo Price**: Gas price (minimum: 1)
3. **Select Account**: Choose deploying account
4. **Deploy**:
   - Click "Deploy" button
   - Enter password
   - Confirm transaction
5. **Monitor Result**:
   - View deploy ID
   - Check status
   - See block inclusion

#### Deploy Configuration

```typescript
interface DeployConfig {
  phloLimit: number;      // Maximum gas
  phloPrice: number;      // Price per gas unit
  validAfterBlockNumber: number; // Current block number
  shardId: string;        // Usually "root"
}
```

#### Best Practices

1. **Test First**: Use explore-deploy for testing
2. **Set Reasonable Limits**: Don't set phlo too high
3. **Check Balance**: Ensure account has funds
4. **Monitor Network**: Check if nodes are synced
5. **Save Before Deploy**: Contracts auto-save, but verify

### Advanced Features

#### Syntax Highlighting

The IDE provides Rholang-specific syntax highlighting:

- **Keywords**: `new`, `for`, `contract`, `match`
- **Channels**: Highlighted differently from variables
- **Strings**: String literals in quotes
- **Numbers**: Numeric values
- **Comments**: `//` and `/* */` style comments

#### Code Templates

Quick templates for common patterns:

```rholang
// Channel template
new channelName in {
  channelName!(data)
}

// Contract template  
contract contractName(@param1, @param2, return) = {
  // Logic here
  return!(result)
}

// Pattern match template
match expression {
  pattern1 => { /* action1 */ }
  pattern2 => { /* action2 */ }
  _ => { /* default */ }
}
```

#### Keyboard Shortcuts

- **Save**: Ctrl/Cmd + S (auto-saves anyway)
- **Find**: Ctrl/Cmd + F
- **Replace**: Ctrl/Cmd + H
- **Comment**: Ctrl/Cmd + /
- **Format**: Shift + Alt + F (coming soon)

### Troubleshooting

#### Common Issues

1. **Contract Won't Deploy**:
   - Check syntax errors
   - Verify account balance
   - Increase phlo limit
   - Check network connection

2. **Files Not Saving**:
   - Check browser storage quota
   - Clear old files if needed
   - Export important work

3. **Syntax Highlighting Missing**:
   - Refresh the page
   - Check file has .rho extension
   - Clear browser cache

#### Performance Tips

1. **Large Files**: Split into smaller modules
2. **Many Files**: Use folders for organization
3. **Browser Storage**: Export and clear periodically
4. **Editor Performance**: Close unused tabs

### Integration with Wallet

The IDE integrates seamlessly with wallet features:

1. **Account Selection**: Deploy with any wallet account
2. **Balance Check**: See account balance before deploy
3. **Transaction History**: Track your deploys
4. **Network Selection**: Deploy to any configured network

## Security

### Overview

ASI Wallet v2 implements multiple layers of security to protect user funds and data. As a client-side wallet, security is paramount since users have full control and responsibility for their assets.

### Security Architecture

#### Client-Side Security Model

1. **No Backend Servers**:
   - Private keys never transmitted
   - No central point of failure
   - No user tracking or analytics
   - Complete user privacy

2. **Local Encryption**:
   - AES-256 encryption for storage
   - Password-based key derivation
   - Salted and hashed passwords
   - No plaintext storage

3. **Browser Security**:
   - Web Crypto API for operations
   - Secure random number generation
   - HTTPS required for crypto APIs
   - Content Security Policy

### Key Management

#### Private Key Security

1. **Generation**:
   ```typescript
   // Secure key generation using Web Crypto API
   const keyPair = await crypto.subtle.generateKey(
     {
       name: "ECDSA",
       namedCurve: "P-256"
     },
     true,
     ["sign", "verify"]
   );
   ```

2. **Storage**:
   - Never stored in plaintext
   - Encrypted with user password
   - Stored in browser localStorage
   - Cleared on logout

3. **Usage**:
   - Decrypted only when needed
   - Kept in memory minimally
   - Cleared after use
   - Never logged or displayed

#### Password Security

1. **Requirements**:
   - Minimum 8 characters
   - No maximum limit
   - Any character combination allowed
   - Strength indicator provided

2. **Protection**:
   - Never stored anywhere
   - Used to derive encryption key
   - PBKDF2 key derivation
   - Salt stored separately

3. **Best Practices**:
   - Use unique password
   - Use password manager
   - Change if compromised
   - Never share with anyone

### Encryption Details

#### AES Encryption

```typescript
// Encryption implementation
import CryptoJS from 'crypto-js';

function encrypt(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString();
}

function decrypt(encryptedData: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

#### Storage Format

```typescript
interface EncryptedStorage {
  version: number;
  accounts: EncryptedAccount[];
  settings: EncryptedSettings;
  checksum: string;
}

interface EncryptedAccount {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: number;
}
```

### Session Management

#### Auto-Logout

1. **Default Timer**: 15 minutes of inactivity
2. **Configurable**: Users can adjust in settings
3. **Activity Detection**: 
   - Mouse movement
   - Keyboard input
   - Transaction activity
4. **Secure Cleanup**:
   - Clear decrypted keys
   - Lock wallet state
   - Maintain encrypted storage

#### Manual Lock

Users can manually lock wallet:
- Instant lock button
- Keyboard shortcut (Ctrl+L)
- Before leaving computer
- Maintains session state

### Transaction Security

#### Transaction Validation

1. **Address Validation**:
   - Format checking
   - Checksum verification
   - Network compatibility
   - Visual confirmation

2. **Amount Validation**:
   - Balance checking
   - Decimal precision
   - Minimum amounts
   - Fee calculation

3. **Signing Process**:
   - Display full details
   - Require password
   - Show estimated fees
   - Confirm explicitly

#### Phishing Protection

1. **Address Verification**:
   - Show full address
   - Highlight differences
   - Recent addresses list
   - Address book feature

2. **Transaction Review**:
   - Clear amount display
   - Recipient verification
   - Fee estimation
   - Warning for large amounts

### Network Security

#### HTTPS Requirements

- All deployments must use HTTPS
- Required for Web Crypto API
- Prevents man-in-the-middle
- Ensures data integrity

#### API Security

1. **Node Communication**:
   - Direct node connection
   - No intermediary servers
   - TLS for node APIs
   - Certificate validation

2. **Request Validation**:
   - Input sanitization
   - Type checking
   - Size limits
   - Rate limiting

### WalletConnect Security

#### Connection Security

1. **Pairing Process**:
   - One-time use URIs
   - End-to-end encryption
   - Mutual authentication
   - Session expiration

2. **Request Handling**:
   - Display all details
   - Require user approval
   - Validate parameters
   - Sanitize inputs

3. **Session Management**:
   - View active sessions
   - Revoke access anytime
   - Auto-disconnect option
   - Session timeout

### Best Practices for Users

#### Account Security

1. **Backup Strategy**:
   - Export private keys
   - Store offline securely
   - Multiple backup copies
   - Test restore process

2. **Password Management**:
   - Use strong password
   - Unique for wallet
   - Store securely
   - Change periodically

3. **Device Security**:
   - Keep browser updated
   - Use antivirus software
   - Avoid public WiFi
   - Lock computer when away

#### Safe Usage

1. **Transaction Practices**:
   - Double-check addresses
   - Start with small amounts
   - Verify on explorer
   - Keep transaction records

2. **Avoiding Scams**:
   - Never share private keys
   - Verify website URLs
   - Ignore unsolicited offers
   - Research before trusting

3. **Recovery Preparation**:
   - Document recovery process
   - Store backups separately
   - Test recovery regularly
   - Keep software updated

### Security Audit Checklist

#### For Developers

- [ ] Code review completed
- [ ] Dependencies updated
- [ ] Security headers configured
- [ ] CSP policy implemented
- [ ] Input validation comprehensive
- [ ] Error messages sanitized
- [ ] Crypto implementation verified
- [ ] Storage encryption tested

#### For Users

- [ ] Strong password set
- [ ] Private keys backed up
- [ ] Recovery tested
- [ ] Browser updated
- [ ] HTTPS verified
- [ ] Address book used
- [ ] Transaction limits set
- [ ] Regular security review

### Incident Response

#### If Compromised

1. **Immediate Actions**:
   - Transfer funds to new wallet
   - Change all passwords
   - Review transaction history
   - Document the incident

2. **Investigation**:
   - Check for malware
   - Review browser extensions
   - Verify wallet source
   - Analyze access patterns

3. **Prevention**:
   - Create new wallet
   - Enhance security measures
   - Update all software
   - Review security practices

### Future Security Enhancements

1. **Hardware Wallet Support**: Integration with Ledger/Trezor
2. **Multi-Signature**: Require multiple approvals
3. **Biometric Authentication**: Fingerprint/Face ID
4. **2FA Options**: Additional authentication layer
5. **Secure Enclave**: Use platform security features
6. **WebAuthn Support**: Passwordless authentication

## Deployment

### Overview

ASI Wallet v2 can be deployed to any static hosting service since it's a client-side application. This guide covers various deployment options and best practices.

### Build Process

#### Prerequisites

- Node.js 14+ and npm 6+
- Git for version control
- Build environment with 4GB+ RAM
- WalletConnect Project ID

#### Building for Production

1. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/asi-chain.git
   cd asi-chain/asi_wallet_v2
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   # Create .env file
   echo "REACT_APP_WALLETCONNECT_PROJECT_ID=your_id" > .env
   ```

4. **Build Application**:
   ```bash
   npm run build
   ```

5. **Verify Build**:
   ```bash
   # Check build size
   du -sh build/
   
   # Test locally
   npx serve -s build
   ```

### Deployment Options

#### GitHub Pages

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json**:
   ```json
   {
     "homepage": "https://username.github.io/asi-wallet",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

4. **Access**: Visit `https://username.github.io/asi-wallet`

#### Netlify

1. **Manual Deploy**:
   - Build locally: `npm run build`
   - Drag `build` folder to Netlify
   - Get instant URL

2. **Git Integration**:
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = "build"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Environment Variables**:
   - Set in Netlify dashboard
   - Add `REACT_APP_WALLETCONNECT_PROJECT_ID`

#### Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Configuration**:
   ```json
   // vercel.json
   {
     "routes": [
       { "src": "/(.*)", "dest": "/index.html" }
     ]
   }
   ```

#### AWS S3 + CloudFront

1. **Build Application**:
   ```bash
   npm run build
   ```

2. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://asi-wallet-v2
   aws s3 website s3://asi-wallet-v2 \
     --index-document index.html \
     --error-document index.html
   ```

3. **Upload Files**:
   ```bash
   aws s3 sync build/ s3://asi-wallet-v2 \
     --delete \
     --cache-control max-age=31536000
   
   # HTML files with shorter cache
   aws s3 cp build/index.html s3://asi-wallet-v2/ \
     --cache-control max-age=300
   ```

4. **Configure CloudFront**:
   - Origin: S3 bucket
   - Default root: index.html
   - Error pages: 404 → /index.html
   - Enable compression

#### IPFS Deployment

1. **Install IPFS**:
   ```bash
   npm install -g ipfs
   ```

2. **Build with IPFS paths**:
   ```bash
   # Update package.json
   "homepage": "./",
   
   # Build
   npm run build
   ```

3. **Deploy to IPFS**:
   ```bash
   ipfs add -r build/
   # Note the hash
   
   # Pin the content
   ipfs pin add <hash>
   ```

4. **Access via Gateways**:
   - `https://ipfs.io/ipfs/<hash>`
   - `https://cloudflare-ipfs.com/ipfs/<hash>`

#### Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   # Build stage
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   
   # Serve stage
   FROM nginx:alpine
   COPY --from=build /app/build /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Nginx Configuration**:
   ```nginx
   server {
     listen 80;
     location / {
       root /usr/share/nginx/html;
       index index.html;
       try_files $uri $uri/ /index.html;
     }
     
     # Security headers
     add_header X-Frame-Options "SAMEORIGIN";
     add_header X-Content-Type-Options "nosniff";
     add_header X-XSS-Protection "1; mode=block";
   }
   ```

3. **Build and Run**:
   ```bash
   docker build -t asi-wallet-v2 .
   docker run -p 80:80 asi-wallet-v2
   ```

### Security Configuration

#### Headers Configuration

Add security headers for production:

```nginx
# nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss:;" always;
```

#### HTTPS Configuration

1. **Let's Encrypt**:
   ```bash
   certbot --nginx -d wallet.yourdomain.com
   ```

2. **CloudFlare**:
   - Enable "Full SSL/TLS"
   - Enable "Always Use HTTPS"
   - Set "SSL/TLS Edge Certificates"

### Post-Deployment

#### Verification Checklist

- [ ] Site loads correctly
- [ ] HTTPS is working
- [ ] All routes work (refresh test)
- [ ] WalletConnect functions
- [ ] Create test account
- [ ] Send test transaction
- [ ] IDE loads properly
- [ ] PWA installation works

#### Monitoring

1. **Uptime Monitoring**:
   - Use services like UptimeRobot
   - Monitor key endpoints
   - Set up alerts

2. **Error Tracking**:
   - Implement Sentry (optional)
   - Monitor console errors
   - Track failed transactions

3. **Analytics** (Optional):
   - Privacy-focused analytics
   - No personal data collection
   - Track usage patterns

#### Maintenance

1. **Regular Updates**:
   - Update dependencies monthly
   - Security patches immediately
   - Test before deploying

2. **Backup Strategy**:
   - Keep previous builds
   - Document deployment process
   - Maintain rollback capability

3. **Performance Optimization**:
   - Monitor bundle size
   - Optimize images
   - Enable caching
   - Use CDN for assets

### Deployment Scripts

#### Automated Deployment

```bash
#!/bin/bash
# deploy.sh

# Build
echo "Building application..."
npm run build

# Run tests
echo "Running tests..."
npm test -- --coverage --watchAll=false

# Deploy based on branch
if [ "$BRANCH" = "main" ]; then
  echo "Deploying to production..."
  npm run deploy:prod
elif [ "$BRANCH" = "staging" ]; then
  echo "Deploying to staging..."
  npm run deploy:staging
fi

echo "Deployment complete!"
```

#### Rollback Script

```bash
#!/bin/bash
# rollback.sh

# Keep last 5 builds
BACKUP_DIR="./backups"
CURRENT_BUILD="$BACKUP_DIR/build-$(date +%Y%m%d-%H%M%S)"

# Backup current
cp -r ./build "$CURRENT_BUILD"

# Rollback to previous
if [ -d "$BACKUP_DIR/previous" ]; then
  rm -rf ./build
  cp -r "$BACKUP_DIR/previous" ./build
  echo "Rolled back to previous build"
fi
```

## Troubleshooting

### Common Issues and Solutions

#### Installation Issues

##### Node Version Mismatch
**Problem**: Build fails with syntax errors or module issues.

**Solution**:
```bash
# Check Node version
node --version

# Use Node 14+ (recommended: 18+)
# Using nvm:
nvm install 18
nvm use 18
```

##### Dependency Installation Fails
**Problem**: `npm install` fails with errors.

**Solution**:
```bash
# Clear cache
npm cache clean --force

# Delete node_modules and package-lock
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Or use alternative:
npm install --legacy-peer-deps
```

#### Runtime Issues

##### Wallet Won't Load
**Problem**: Blank screen or loading forever.

**Checklist**:
1. Check browser console for errors
2. Clear browser cache and localStorage
3. Verify HTTPS is enabled
4. Check browser compatibility
5. Disable browser extensions

**Solution**:
```javascript
// Clear storage (in console)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

##### Cannot Connect to Node
**Problem**: "Failed to connect to RChain node" error.

**Solutions**:

1. **Check Node Status**:
   ```bash
   # Test node connectivity
   curl http://localhost:40401/api/status
   ```

2. **Verify URLs**:
   - Mainnet: `https://node.mainnet.rchain.coop:40401`
   - Testnet: `https://node.testnet.rchain.coop:40401`
   - Local: `http://localhost:40401`

3. **CORS Issues**:
   - Use HTTPS for production nodes
   - Configure CORS on local nodes
   - Use proxy for development

4. **Network Settings**:
   ```javascript
   // Custom network configuration
   {
     name: "Local",
     validatorUrl: "http://localhost:40401",
     readOnlyUrl: "http://localhost:40403",
     adminUrl: "http://localhost:40402"
   }
   ```

##### Balance Not Showing
**Problem**: Balance shows 0 or doesn't update.

**Debugging Steps**:
1. Verify correct network selected
2. Check address has funds on explorer
3. Try manual refresh
4. Test with explore-deploy

**Manual Balance Check**:
```rholang
new return, rl(`rho:registry:lookup`), RevVaultCh in {
  rl!(`rho:rchain:revVault`, *RevVaultCh) |
  for (@(_, RevVault) <- RevVaultCh) {
    @RevVault!("findOrCreate", "YOUR_ADDRESS", *return)
  }
}
```

#### Transaction Issues

##### Transaction Fails
**Problem**: Deploy fails or gets rejected.

**Common Causes**:
1. **Insufficient Balance**: Check account has enough REV
2. **Invalid Address**: Verify recipient address format
3. **Phlo Limit Too Low**: Increase gas limit
4. **Network Issues**: Node may be unsynced

**Debug Transaction**:
```typescript
// Check deploy status
const deployId = "your_deploy_id";
const response = await fetch(`${nodeUrl}/api/deploy/${deployId}`);
const status = await response.json();
console.log("Deploy status:", status);
```

##### Transaction Pending Forever
**Problem**: Transaction doesn't get included in block.

**Solutions**:
1. Wait for next block (can take time)
2. Check if finalizer is running
3. Verify node is synced
4. Try resubmitting

#### Account Issues

##### Forgot Password
**Problem**: Cannot access wallet due to forgotten password.

**Important**: There is NO password recovery for client-side wallets!

**Prevention**:
1. Export private keys when creating accounts
2. Store backups securely offline
3. Use password manager
4. Test recovery process

##### Cannot Import Private Key
**Problem**: Import fails with "Invalid private key" error.

**Checklist**:
1. Remove "0x" prefix if present
2. Ensure hex format (64 characters)
3. No spaces or special characters
4. Try importing as ETH address first

**Valid Formats**:
```javascript
// Private key (64 hex chars)
"a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890"

// ETH address (with 0x)
"0x1234567890123456789012345678901234567890"

// REV address
"1111K9MczqzZrBBn6Fr8rE2TmvMUitKvVDkKkNDH8Caget92jCVQvmieZ"
```

#### WalletConnect Issues

##### QR Code Won't Scan
**Problem**: Camera doesn't work or QR not recognized.

**Solutions**:
1. **Check Permissions**: Allow camera access
2. **Use HTTPS**: Camera API requires secure context
3. **Manual Entry**: Paste WC URI instead
4. **Different Browser**: Try Chrome/Firefox

##### Connection Drops
**Problem**: WalletConnect session disconnects.

**Common Causes**:
1. Network interruption
2. Session timeout
3. Relay server issues

**Fix**:
```typescript
// Reconnect manually
await walletConnectService.reconnect();

// Or disconnect and reconnect
await walletConnectService.disconnect(topic);
// Scan QR again
```

#### IDE Issues

##### Monaco Editor Not Loading
**Problem**: IDE shows blank or errors.

**Solutions**:
1. Clear browser cache
2. Check console for errors
3. Reload page (Ctrl+F5)
4. Verify enough storage space

##### Files Not Saving
**Problem**: Changes lost after reload.

**Causes**:
1. Storage quota exceeded
2. Private browsing mode
3. Browser restrictions

**Fix**:
```javascript
// Check storage usage
if (navigator.storage && navigator.storage.estimate) {
  const {usage, quota} = await navigator.storage.estimate();
  console.log(`Using ${usage} of ${quota} bytes`);
}
```

#### Performance Issues

##### Wallet Is Slow
**Problem**: UI laggy or unresponsive.

**Optimizations**:
1. Close unused tabs
2. Clear transaction history
3. Reduce number of accounts
4. Use modern browser
5. Check CPU/Memory usage

##### Build Size Too Large
**Problem**: Production build exceeds size limits.

**Solutions**:
```bash
# Analyze bundle
npm run analyze

# Optimize imports
# Bad: import _ from 'lodash'
# Good: import debounce from 'lodash/debounce'
```

### Error Messages Reference

#### "Invalid Password"
- Password is case-sensitive
- Check Caps Lock
- No spaces before/after

#### "Insufficient Balance"
- Need REV for transactions
- Account for phlo costs
- Check correct network

#### "Invalid Address Format"
- REV addresses start with "1111"
- ETH addresses start with "0x"
- Check for typos

#### "Network Error"
- Check internet connection
- Verify node is running
- Try different node URL

#### "Deploy Failed"
- Increase phlo limit
- Check Rholang syntax
- Verify account unlocked

### Browser-Specific Issues

#### Chrome/Brave
- Enable third-party cookies for WalletConnect
- Allow camera permissions
- Check for conflicting extensions

#### Firefox
- Enable WebAssembly if disabled
- Clear site data if issues persist
- Check privacy settings

#### Safari
- Enable cross-site tracking for WC
- Allow camera access
- Update to latest version

### Getting Help

1. **Check Documentation**: Review relevant sections
2. **Search Issues**: Check GitHub issues
3. **Community Support**: Join RChain Discord
4. **Debug Mode**: Enable console logging
5. **Report Bugs**: Open GitHub issue with details

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('DEBUG_MODE', 'true');
location.reload();

// View debug info
console.log(window.__DEBUG_INFO__);
```

## Contributing

Thank you for your interest in contributing to ASI Wallet v2! This document provides guidelines and instructions for contributing to the project.

### Getting Started

1. **Fork the Repository**: Fork the project on GitHub
2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/yourusername/asi-chain.git
   cd asi-chain/asi_wallet_v2
   ```
3. **Set Up Development Environment**: Follow the [Development](#development) section

### Development Process

#### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

#### 2. Make Your Changes
- Write clean, readable code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

#### 3. Commit Your Changes
Use clear, descriptive commit messages:
```bash
git commit -m "feat: Add new feature"
git commit -m "fix: Resolve issue with X"
git commit -m "docs: Update README"
```

#### 4. Push to Your Fork
```bash
git push origin feature/your-feature-name
```

#### 5. Create a Pull Request
- Open a PR from your fork to the main repository
- Provide a clear description of your changes
- Reference any related issues

### Code Style Guidelines

#### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

#### React Components
- Use functional components with hooks
- Keep components small and focused
- Use styled-components for styling
- Implement proper error boundaries

#### Example Component Structure
```typescript
import React from 'react';
import styled from 'styled-components';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  // Component logic here
  return (
    <Container>
      <Title>{title}</Title>
      <Button onClick={onAction}>Action</Button>
    </Container>
  );
};

const Container = styled.div`
  // Styles here
`;

const Title = styled.h2`
  // Styles here
`;
```

### Testing

#### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

#### Writing Tests
- Write unit tests for utility functions
- Write integration tests for services
- Test error cases and edge conditions

### Security Guidelines

1. **Never commit sensitive data** (private keys, passwords, API keys)
2. **Validate all user inputs**
3. **Use secure cryptographic functions** from established libraries
4. **Follow the principle of least privilege**
5. **Review dependencies** for known vulnerabilities

### Documentation

- Update README.md for significant changes
- Add JSDoc comments for public APIs
- Update the relevant documentation in `/docs/wallet/`
- Include examples for new features

### Pull Request Guidelines

#### Before Submitting
- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] ESLint passes (`npm run lint`)
- [ ] TypeScript has no errors (`npm run type-check`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

#### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] I have tested these changes locally
- [ ] I have added tests that prove my fix/feature works
- [ ] All new and existing tests pass

## Screenshots (if applicable)
Add screenshots for UI changes

## Additional Notes
Any additional information
```

### Reporting Issues

#### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and OS information
- Console errors (if any)

#### Feature Requests
Include:
- Clear description of the feature
- Use case and benefits
- Possible implementation approach
- Any mockups or examples

### Community

- Be respectful and constructive
- Help others when you can
- Share knowledge and learnings
- Follow the project's Code of Conduct

### License

By contributing to ASI Wallet v2, you agree that your contributions will be licensed under the MIT License.

### Questions?

If you have questions about contributing:
1. Check existing issues and discussions
2. Review the documentation
3. Open a new issue with the "question" label

Thank you for contributing to ASI Wallet v2!