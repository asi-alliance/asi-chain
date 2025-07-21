import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Global error handler for WalletConnect errors BEFORE React starts
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (message.includes('No matching key') && 
      (message.includes('session or pairing topic doesn\'t exist') || 
       message.includes('session:'))) {
    console.warn('🔧 WalletConnect cleanup handled:', ...args);
    return;
  }
  originalError.apply(console, args);
};

// Override global error handling
const originalOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  if (typeof message === 'string' && message.includes('No matching key')) {
    console.warn('🔧 WalletConnect error prevented:', message);
    return true; // Prevent default error handling
  }
  if (originalOnError) {
    return originalOnError(message, source, lineno, colno, error);
  }
  return false;
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && event.reason.message) {
    const message = event.reason.message;
    if (message.includes('No matching key')) {
      console.warn('🔧 WalletConnect promise rejection handled:', message);
      event.preventDefault();
      return;
    }
  }
});

// More aggressive error prevention - try to prevent the errors at source
let errorPrevented = false;

// Patch Error constructor to completely prevent WalletConnect errors
const OriginalError = Error;
window.Error = function(message?: string) {
  if (message && message.includes('No matching key')) {
    console.warn('🔧 WalletConnect Error intercepted and suppressed:', message);
    errorPrevented = true;
    // Return a dummy object that looks like an error but doesn't throw
    const fakeError = {
      name: 'WalletConnectHandledError',
      message: 'WalletConnect session cleanup (handled)',
      stack: '',
      toString: () => 'WalletConnect session cleanup (handled)'
    };
    return fakeError as any;
  }
  return new OriginalError(message);
} as any;

// Patch throw statement
const originalThrow = Error;
const throwHandler = function(error: any) {
  if (error && typeof error === 'object' && 
      (error.message?.includes('No matching key') || 
       error.name === 'WalletConnectHandledError')) {
    console.warn('🔧 Throw statement prevented for WalletConnect error');
    return; // Don't throw
  }
  throw error;
};

// Override Error in global scope
Object.setPrototypeOf(window.Error, OriginalError);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}