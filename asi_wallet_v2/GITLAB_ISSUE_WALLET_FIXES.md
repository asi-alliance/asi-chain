# ASI Wallet v2 - Outstanding Issues and Improvements

## Issue Title: ASI Wallet v2 - Console Warnings and UI Improvements

## Description
This issue tracks all outstanding warnings, errors, and improvements needed for the ASI Wallet v2 (version 2.2.0-dappconnect). These issues were identified during development and testing, and while they don't prevent functionality, they should be addressed for production readiness.

## Priority Levels
- 🔴 **Critical** - Must fix before production
- 🟡 **Important** - Should fix for better UX/performance
- 🟢 **Nice to have** - Can be addressed in future releases

---

## 1. 🔴 Critical Issues

### 1.1 Account Switcher Visibility
- **Issue**: Account switcher component not visible in top bar (FIXED - was hidden on desktop screens)
- **File**: `src/components/Layout/MobileLayout.tsx:34-36`
- **Status**: ✅ Fixed

### 1.2 Styled-Components Prop Warnings
- **Issue**: Non-DOM props being passed to DOM elements causing React warnings
- **Files to fix**:
  - [ ] `src/components/UI/Button.tsx` - `loading`, `variant` props
  - [ ] `src/components/UI/Input.tsx` - `hasError` prop
  - [ ] `src/pages/Accounts/Accounts.tsx` - `isSelected` prop
- **Solution**: Add `$` prefix to all non-DOM props (e.g., `$loading`, `$variant`)

---

## 2. 🟡 Important Issues

### 2.1 React Router Deprecation Warnings
- **Issue**: Future versions of React Router will require `<Route>` inside `<Routes>`
- **File**: `src/App.tsx`
- **Action**: Update routing structure to use React Router v6 patterns

### 2.2 F1R3FLY Node Connection Errors
- **Issue**: 400 errors when fetching RChain balance
- **Cause**: F1R3FLY nodes not deployed yet
- **Action**: Will resolve once blockchain infrastructure is running
- **Temporary Fix**: Add proper error handling and user-friendly messages

### 2.3 Security Headers Missing
- **Issue**: Production deployment needs security headers
- **Files**: `nginx.conf`, deployment scripts
- **Headers needed**:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security

### 2.4 Environment Configuration
- **Issue**: Production F1R3FLY URLs need updating
- **Files**: `.env.production`, `.env.staging`
- **Action**: Update with actual production node URLs once deployed

---

## 3. 🟢 Nice to Have Improvements

### 3.1 Balance Polling Optimization
- **Current**: 30-second interval polling
- **Alternatives considered**:
  - WebSocket connection for real-time updates
  - Smart polling with exponential backoff
  - Visibility API integration
  - Event-driven updates
  - Service Worker background sync
- **Decision**: Keep current implementation for now (per user request)

### 3.2 Manifest Protocol Handler Warning
- **Issue**: Warning about web+rchain protocol handler
- **File**: `public/manifest.json`
- **Action**: Either implement the handler or remove from manifest

### 3.3 Test Coverage Improvement
- **Current**: 27.58% overall, 62.88% for store modules
- **Target**: 90% coverage
- **Action**: Add comprehensive unit and integration tests

### 3.4 Hardware Wallet Support
- **Status**: Temporarily hidden (commented out)
- **File**: `src/pages/Settings/Settings.tsx:133-185`
- **Action**: Re-enable once hardware wallet integration is tested

### 3.5 Mobile Responsiveness Enhancements
- **Issue**: Some UI elements could be better optimized for mobile
- **Areas**:
  - Dashboard tiles on very small screens
  - Form inputs on mobile keyboards
  - Modal dialogs on mobile

---

## 4. Performance Optimizations

### 4.1 Bundle Size
- **Action**: Implement code splitting for large components
- **Target areas**:
  - Monaco Editor (IDE page)
  - WalletConnect modules
  - Chart libraries

### 4.2 Image Optimization
- **Action**: Use WebP format for images
- **Files**: Logo, icons, backgrounds

### 4.3 Caching Strategy
- **Action**: Implement service worker for offline support
- **Benefits**: Better performance, offline functionality

---

## 5. Documentation Needs

### 5.1 User Documentation
- [ ] Wallet setup guide
- [ ] WalletConnect integration guide
- [ ] Security best practices
- [ ] Troubleshooting guide

### 5.2 Developer Documentation
- [ ] Component API documentation
- [ ] State management guide
- [ ] Testing guide
- [ ] Deployment guide updates

---

## 6. Deployment Checklist

Before deploying to production:

- [ ] Fix all critical styled-components warnings
- [ ] Update production environment variables
- [ ] Configure security headers
- [ ] Set up monitoring and error tracking
- [ ] Configure CDN for static assets
- [ ] Set up SSL certificates
- [ ] Configure rate limiting
- [ ] Set up backup strategy
- [ ] Load testing completed
- [ ] Security audit completed

---

## Implementation Order

1. **Phase 1 (Immediate)**
   - Fix styled-components prop warnings
   - Update environment configurations
   - Add security headers

2. **Phase 2 (Pre-production)**
   - Implement error handling for node connections
   - Update React Router patterns
   - Improve test coverage

3. **Phase 3 (Post-launch)**
   - Performance optimizations
   - Enhanced mobile experience
   - Documentation improvements
   - Re-enable hardware wallet support

---

## Testing Requirements

Each fix should include:
- Unit tests for affected components
- Integration tests for critical paths
- Manual testing on:
  - Chrome, Firefox, Safari, Edge
  - Mobile devices (iOS, Android)
  - Different screen sizes

---

## Notes

- Wallet is functional despite these warnings
- Current version: 2.2.0-dappconnect
- WalletConnect v2 integration is working
- AWS Lightsail deployment scripts are ready

---

## Labels
- `bug` - For error fixes
- `enhancement` - For improvements
- `documentation` - For docs updates
- `performance` - For optimization tasks
- `security` - For security-related fixes
- `UI/UX` - For interface improvements

## Assignees
To be assigned based on team availability

## Milestone
ASI Wallet v2.3.0 - Production Ready

---

*Last updated: 2024-01-20*
*Generated from development session console logs and code analysis*