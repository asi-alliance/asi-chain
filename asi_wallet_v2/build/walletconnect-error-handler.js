// WalletConnect Error Handler - Loads before React bundle
// This script intercepts WalletConnect errors at the lowest level

(function() {
  'use strict';
  
  console.log('🔧 WalletConnect Error Handler loaded');
  
  // Override global error handling before any other scripts load
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('No matching key')) {
      console.warn('🔧 Global error handler caught WalletConnect error:', event.error.message);
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Override unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('No matching key')) {
      console.warn('🔧 Promise rejection handler caught WalletConnect error:', event.reason.message);
      event.preventDefault();
      return false;
    }
  });
  
  // Patch Error constructor at the earliest possible moment
  const OriginalError = window.Error;
  window.Error = function(message) {
    if (message && typeof message === 'string' && message.includes('No matching key')) {
      console.warn('🔧 Error constructor intercepted WalletConnect error:', message);
      // Return a harmless error-like object
      const harmlessError = {
        name: 'WalletConnectHandledError',
        message: 'WalletConnect cleanup handled',
        stack: '',
        toString: function() { return this.message; }
      };
      return harmlessError;
    }
    return new OriginalError(message);
  };
  
  // Preserve Error properties
  Object.setPrototypeOf(window.Error, OriginalError);
  window.Error.prototype = OriginalError.prototype;
  
  // Override console.error to suppress error display
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('No matching key')) {
      console.warn('🔧 Console error suppressed:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.log('🔧 WalletConnect Error Handler initialized');
})();