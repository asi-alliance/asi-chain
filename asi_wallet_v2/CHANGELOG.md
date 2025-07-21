# Changelog

All notable changes to ASI Wallet v2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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