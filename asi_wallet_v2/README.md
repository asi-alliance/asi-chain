# ASI Wallet v2 - DApp Connect Edition

A modern, secure, and fully decentralized wallet for the RChain network, featuring WalletConnect integration for seamless dApp connectivity, an integrated Rholang IDE, and enhanced deployment tracking.

[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![WalletConnect](https://img.shields.io/badge/WalletConnect-v2-blue.svg)](https://walletconnect.com/)

## 📚 Documentation

Comprehensive documentation is available in the [ASI Wallet Documentation](../docs/WALLET.md).

Quick links:
- **[Complete Wallet Guide](../docs/WALLET.md)** - All documentation in one place
- **[Installation](../docs/WALLET.md#installation-guide)** - Setup and deployment
- **[User Guide](../docs/WALLET.md#user-guide)** - How to use the wallet
- **[Architecture](../docs/WALLET.md#architecture)** - Technical design
- **[API Reference](../docs/WALLET.md#api-reference)** - Developer API
- **[WalletConnect](../docs/WALLET.md#walletconnect-integration)** - dApp connectivity
- **[Development](../docs/WALLET.md#development)** - Contributing guide

## 🐳 Docker Quick Start

Run the wallet instantly with Docker:

```bash
# Start the wallet
docker-compose up -d

# Access at http://localhost:3000
```

See [DOCKER_README.md](./DOCKER_README.md) for detailed Docker deployment instructions.

## 🚀 Key Features

### 100% Client-Side Architecture
- **No Backend Required**: Runs entirely in your browser
- **Direct Blockchain Connection**: Peer-to-peer connection to RChain nodes
- **Local Encrypted Storage**: All data encrypted with AES-256 in browser
- **Static Hosting**: Deploy to GitHub Pages, IPFS, or any web server
- **Offline Capable**: PWA with service worker support

### 🔗 WalletConnect Integration
- **Multiple Connection Methods**: QR code, URI paste, deep links
- **Session Management**: Handle multiple dApp connections
- **Transaction Approval**: Review and sign dApp transactions
- **Auto-Reconnect**: Persistent sessions across refreshes

### 💼 Advanced Account Management
- **Multi-Account Support**: Create and manage multiple accounts
- **Quick Account Switcher**: Fast account switching with real-time balance updates
- **Import Options**: Private key, ETH address, or REV address
- **Watch-Only Accounts**: Monitor addresses without private keys
- **Encrypted Export**: Backup accounts with password protection
- **Hardware Wallet Ready**: Architecture supports future integration

### 💸 Enhanced Transaction Features
- **Smart Routing**: Automatic node selection for operations
- **Real-Time Status**: Track deployment inclusion in blocks
- **Gas Optimization**: Accurate gas cost estimation
- **Transaction Confirmation**: Secure confirmation dialogs for all operations
- **Transaction History**: Comprehensive local transaction log with export
- **Batch Operations**: Queue multiple transactions

### 💻 Integrated Development Environment
- **Monaco Editor**: Professional code editor with Rholang support
- **Syntax Highlighting**: Custom Rholang language support
- **File Management**: Create, edit, and organize contracts
- **Direct Deployment**: Deploy contracts with confirmation dialogs
- **Import/Export**: Share workspaces and contracts
- **Console Output**: Real-time deployment feedback
- **Seamless Authentication**: No password re-entry for authenticated users

### 🎨 Modern User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Themes**: Automatic or manual theme switching
- **Real-Time Updates**: Live balance and status updates
- **Intuitive Navigation**: Clean, modern interface
- **Accessibility**: WCAG 2.1 compliant

## 🏃 Quick Start

### Prerequisites

- Node.js 14.0.0 or higher (recommended: 18+)
- npm 6.0.0 or higher
- Git
- A WalletConnect Project ID (free from [WalletConnect Cloud](https://cloud.walletconnect.com))

### Installation

```bash
# Clone the repository (GitLab)
git clone https://gitlab.com/asi-build/asi-chain.git
cd asi-chain/asi_wallet_v2

# Install dependencies with legacy peer deps flag
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env
# Edit .env and add your WalletConnect Project ID
# Get your free Project ID from https://cloud.walletconnect.com

# Start development server
npm start
```

> **Important**: Use `npm install --legacy-peer-deps` to handle peer dependency conflicts

The wallet will be available at [http://localhost:3000](http://localhost:3000).

> **Note**: You may see ESLint warnings about unused variables and React Hook dependencies during startup. These are code quality warnings and don't affect the wallet's functionality.

> **Note**: To test WalletConnect features, see the [Testing WalletConnect Integration](#-testing-walletconnect-integration) section below.

### Production Build

```bash
# Build for production
npm run build

# Test production build locally
npm run serve

# Deploy to GitHub Pages
npm run deploy:gh

# Deploy to IPFS (requires IPFS node)
npm run deploy:ipfs
```

The production build will be in the `build/` directory, ready for deployment to any static hosting service.

## 🚨 Known Issues & Notes

### Development Environment
1. **npm vulnerabilities**: You may see security warnings during `npm install`. These are common in JavaScript projects and generally safe for development. Run `npm audit` for details.
2. **ESLint warnings**: The development server shows warnings about React Hooks and unused variables. These don't prevent the wallet from functioning.
3. **Deprecation warnings**: Some packages show deprecation notices. This is normal in the JavaScript ecosystem.

### Production Considerations
- Address critical security vulnerabilities before deploying to production
- Test thoroughly with your specific RChain network configuration
- Generate your own WalletConnect Project ID for production use

### Recent Updates (August 2025)
- **Fixed**: Webpack module resolution for `process/browser` polyfill
- **Fixed**: TypeScript theme typing with styled-components
- **Fixed**: QRCode import to use named export from react-qr-code
- **Added**: Missing SecureStorage static methods for storage operations
- **Added**: Type declarations for speakeasy and validator modules
- **Removed**: Unused backend code (rateLimiter.ts) from frontend
- **Updated**: Installation instructions to use `--legacy-peer-deps`

### Previous Updates (July 2025)
- **Fixed**: Network settings persistence issue (#12) - Custom networks now save correctly
- **Added**: Comprehensive test suite with 62.88% store coverage
- **Improved**: Build configuration to exclude test files from production
- **Documentation**: Added DEVELOPMENT_WORK_REPORT.md and FINAL_TEST_REPORT.md

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   React UI      │  │ Redux Store  │  │ Local Storage │  │
│  │  Components     │  │    State     │  │  (Encrypted)  │  │
│  └────────┬────────┘  └──────┬───────┘  └───────┬───────┘  │
│           │                   │                   │          │
│  ┌────────▼───────────────────▼──────────────────▼───────┐  │
│  │              Service Layer (TypeScript)                │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ • RChain Service  • Crypto Service  • Storage Service │  │
│  │ • WalletConnect   • IDE Service     • Key Management  │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                   Network Layer (HTTPS)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼──────┐
   │ Validator│      │ Read-Only  │     │   Admin    │
   │   Node   │      │    Node    │     │   Node     │
   └──────────┘      └────────────┘     └────────────┘
                        RChain Network
```

## 🔐 Security Features

### Encryption
- **AES-256-GCM**: Military-grade encryption for private keys
- **PBKDF2**: Key derivation with 100,000 iterations
- **Random Salt/IV**: Unique per encryption operation
- **Memory Cleanup**: Keys cleared after use

### Access Control
- **Password Protection**: Required for all sensitive operations
- **Session Timeout**: Automatic lock after 15 minutes
- **No Recovery**: Lost passwords cannot be recovered
- **Local Only**: No cloud backup or recovery

### Network Security
- **HTTPS Only**: All connections encrypted
- **Direct Connection**: No proxy servers
- **Certificate Validation**: Verify node authenticity
- **CORS Protection**: Prevent cross-origin attacks

## 🛠️ Development

### Development Prerequisites
- Node.js 14+ (recommended: 18+)
- npm 6+ or yarn
- Git for version control
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Tech Stack
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Redux Toolkit**: State management
- **Styled Components**: Styling
- **Monaco Editor**: Code editing
- **Web3 Libraries**: Blockchain interaction
- **WalletConnect v2**: dApp connectivity protocol

### Project Structure
```
asi_wallet_v2/
├── src/              # Main wallet source code
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── services/     # Business logic services
│   ├── store/        # Redux store and slices
│   ├── utils/        # Utility functions
│   └── __tests__/    # Test files
├── public/           # Static assets
├── scripts/          # Build and deployment scripts
├── test-dapp-rchain/ # WalletConnect testing dApp
├── coverage/         # Test coverage reports
└── docs/             # Documentation (see ../docs/WALLET.md)
```

### Commands

```bash
# Development
npm start              # Start dev server (default port 3000)
PORT=3001 npm start   # Start on custom port
npm test              # Run tests in watch mode
npm test -- --coverage # Run tests with coverage report
npm run lint          # Lint code
npm run type-check    # TypeScript checking

# Building
npm run build         # Production build
npm run analyze       # Bundle analysis

# Testing
npm test -- --watchAll=false         # Run all tests once
npm test -- --coverage --watchAll=false  # Generate coverage report
npm test Dashboard    # Run specific test file

# Deployment
npm run deploy:gh     # Deploy to GitHub Pages
npm run deploy:ipfs   # Deploy to IPFS
```

## 📈 Recent Improvements

### Testing Framework (July 2025)
- ✅ **Comprehensive Test Suite**: Added Jest and React Testing Library
- ✅ **62.88% Store Coverage**: Exceeded 50% target for Redux store modules
- ✅ **Component Testing**: Full test coverage for Dashboard, Send, and Settings
- ✅ **Mock Infrastructure**: Created reusable mock modules for complex services

### Network Persistence Fix (Issue #12)
- ✅ **Persistent Settings**: Network configurations now survive page reloads
- ✅ **LocalStorage Integration**: Automatic synchronization with Redux store
- ✅ **Custom Networks**: Fixed "Add Custom Network" functionality
- ✅ **Seamless Experience**: Network changes are instantly saved

### Security & User Experience Enhancements
- ✅ **Authentication Security**: Fixed authentication bypass vulnerability
- ✅ **Transaction Confirmations**: Added confirmation dialogs for all operations
- ✅ **Account Switching**: Quick account switcher with dynamic balance updates
- ✅ **Seamless Deployment**: Removed redundant password prompts for authenticated users

### Enhanced Deployment Tracking
- ✅ Real-time block inclusion verification
- ✅ Accurate gas cost reporting
- ✅ Detailed deployment status messages
- ✅ Graceful error handling

### IDE Improvements
- ✅ Consistent example contracts
- ✅ Better error messages
- ✅ Deployment confirmation modals
- ✅ Enhanced console output

### Network Optimization
- ✅ Intelligent request routing
- ✅ Separate read/write operations
- ✅ Network-specific configurations
- ✅ Connection retry logic

## 🧪 Testing

### Running Tests

```bash
# Run tests in watch mode (development)
npm test

# Run all tests once
npm test -- --watchAll=false

# Generate coverage report
npm test -- --coverage --watchAll=false

# Run specific test file
npm test Dashboard
npm test walletSlice

# Run tests matching pattern
npm test -- --testNamePattern="should persist"
```

### Test Coverage

Current coverage metrics:
- **Store Modules**: 62.88% (Target: 50%) ✅
- **Services**: 17.59%
- **Components**: Varies (Settings: 94.87%)

View detailed coverage report:
```bash
npm test -- --coverage --watchAll=false
# Open coverage/lcov-report/index.html in browser
```

### Testing WalletConnect Integration

The project includes a test dApp in the `test-dapp-rchain/` directory for testing WalletConnect functionality:

### Running the Test dApp

```bash
# Terminal 1: Run the wallet
cd asi_wallet_v2
PORT=3002 npm start

# Terminal 2: Run the test dApp
cd asi_wallet_v2/test-dapp-rchain
npm install
npm run dev
```

The test dApp will be available at http://localhost:3003

### Test dApp Features
- **Connection Testing**: QR code and URI-based wallet connection
- **Transaction Testing**: Send test transactions with custom Rholang code
- **Message Signing**: Test cryptographic message signing
- **Balance Queries**: Verify balance checking functionality

For detailed usage, see [test-dapp-rchain/README.md](test-dapp-rchain/README.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../docs/wallet/contributing.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔧 Quick Troubleshooting

### Installation Issues
- **Memory error during build**: `export NODE_OPTIONS=--max_old_space_size=4096`
- **Port already in use**: Kill the process using port 3000 or use `PORT=3001 npm start`
- **Dependencies won't install**: Delete `node_modules` and `package-lock.json`, then retry with `npm install --legacy-peer-deps`
- **Module resolution errors**: Ensure `config-overrides.js` has proper webpack polyfills
- **TypeScript errors**: Check `src/types/modules.d.ts` for missing type declarations

### Runtime Issues
- **Blank screen**: Check browser console for errors, ensure JavaScript is enabled
- **Network errors**: Verify RChain node is running and CORS is configured
- **WalletConnect not working**: Ensure `.env` has valid Project ID

For detailed troubleshooting, see [docs/wallet/troubleshooting.md](../docs/wallet/troubleshooting.md)

## 🙏 Acknowledgments

- **RChain Community**: For the blockchain infrastructure
- **F1R3FLY Wallet**: For inspiration and reference implementation
- **WalletConnect**: For the excellent dApp connectivity protocol
- **Open Source Community**: All the libraries and tools that make this possible

## 📞 Support

- **Documentation**: Check our comprehensive [docs](../docs/wallet/)
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join the RChain/ASI community channels

---

**Remember**: This is a decentralized wallet with no backend. You control your keys and data. With great power comes great responsibility! 🔐