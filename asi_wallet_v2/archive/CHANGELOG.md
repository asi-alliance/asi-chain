# Changelog

All notable changes to ASI Wallet v2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.1] - 2025-08-21

### Added
- Type declarations for `speakeasy` and `validator` modules in `src/types/modules.d.ts`
- Missing static methods in SecureStorage service (`setItem`, `getItem`, `removeItem`)
- Comprehensive deployment guide (DEPLOYMENT_GUIDE.md)
- Docker deployment configuration improvements

### Changed
- Updated installation instructions to use `npm install --legacy-peer-deps`
- Modified `config-overrides.js` to include proper webpack polyfills for `process/browser`
- Updated styled-components theme typing to include nested `colors` structure
- Changed QRCode import to use named export from `react-qr-code`

### Fixed
- **Critical**: Webpack module resolution error for `process/browser`
- TypeScript compilation errors in styled-components theme
- Missing type declarations causing build failures
- QRCode component import error
- SecureStorage service missing static method implementations

### Removed
- Unused `rateLimiter.ts` file (backend code in frontend directory)

## [2.2.0] - 2025-07-15

### Added
- Comprehensive testing framework with Jest and React Testing Library
- Test suites for critical components (Dashboard, Send, Settings)
- Mock modules for complex services (WalletConnect, SecureStorage, RChain)
- TextEncoder/TextDecoder polyfills for Jest environment
- TypeScript configuration for excluding test files from production builds
- LocalStorage persistence for network settings
- Redux middleware for automatic network state persistence
- Comprehensive test coverage reporting
- Final test report documentation (FINAL_TEST_REPORT.md)

### Changed
- Improved network settings management with proper state persistence
- Enhanced Redux store to load networks from localStorage on initialization
- Updated tsconfig.json to exclude mock and test files from compilation
- Modified config-overrides.js to prevent test files from being included in builds
- Refactored crypto test suite with proper mock hoisting
- Updated Settings component to correctly handle custom network additions

### Fixed
- **Critical Bug #12**: Custom network settings now persist after page reload
- Network modifications are saved to localStorage automatically
- "Add Custom Network" functionality now works correctly
- Fixed TypeScript compilation errors related to Jest namespace in mock files
- Resolved module import hoisting issues in test files
- Fixed RChain service tests to match actual class API
- Corrected WalletConnect slice test action names

## [2.2.0] - Previous Release

_Note: The current version in package.json shows 2.2.0-dappconnect. Changes listed under [Unreleased] will be included in the next version following SemVer guidelines._