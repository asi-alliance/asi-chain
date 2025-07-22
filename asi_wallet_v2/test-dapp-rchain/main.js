import { SignClient } from '@walletconnect/sign-client';
import { getSdkError } from '@walletconnect/utils';
import QRCode from 'qrcode';

// Configuration
const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || import.meta.env.VITE_PROJECT_ID;
const RELAY_URL = 'wss://relay.walletconnect.com';

// Show warning if PROJECT_ID not configured
if (!PROJECT_ID || PROJECT_ID === 'YOUR_PROJECT_ID') {
  console.error('⚠️ WalletConnect Project ID not configured!');
  console.error('Please ensure VITE_WALLETCONNECT_PROJECT_ID is set in .env file');
} else {
  console.log('WalletConnect Project ID configured:', PROJECT_ID);
}

// App state
let signClient = null;
let session = null;
let currentChain = 'rchain:01'; // Default to mainnet

// Clean up stale WalletConnect data
function cleanupStaleWCData() {
  const keysToRemove = [];
  
  // Find all WalletConnect keys that might have stale data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('wc@2:')) {
      // Be more aggressive - remove all core/client keys except active sessions
      if (key.includes(':history:') || 
          key.includes(':messages:') || 
          key.includes(':keychain:') ||
          key.includes(':core:0.3:history:') ||
          key.includes(':sign-client:')) {
        keysToRemove.push(key);
      }
    }
  }
  
  // Remove stale keys
  if (keysToRemove.length > 0) {
    console.log(`[WalletConnect] Cleaning ${keysToRemove.length} stale keys...`);
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('[WalletConnect] Cleanup complete');
  } else {
    console.log('[WalletConnect] No stale keys found');
  }
}

// Initialize
async function init() {
  try {
    // Clean up stale WalletConnect data before init
    cleanupStaleWCData();
    
    signClient = await SignClient.init({
      projectId: PROJECT_ID,
      relayUrl: RELAY_URL,
      metadata: {
        name: 'ASI Chain Test dApp',
        description: 'Test dApp for ASI Chain WalletConnect Integration',
        url: window.location.origin,  // Changed from .host to .origin to include protocol
        icons: [
          `${window.location.origin}/favicon.png`,
          `${window.location.origin}/favicon.svg`
        ]
      }
    });

    // Set up event listeners
    signClient.on('session_event', ({ event }) => {
      console.log('Session event:', event);
    });

    signClient.on('session_update', ({ topic, params }) => {
      console.log('Session update:', { topic, params });
      const { namespaces } = params;
      const _session = signClient.session.get(topic);
      const updatedSession = { ..._session, namespaces };
      onSessionConnected(updatedSession);
    });

    signClient.on('session_delete', () => {
      console.log('Session deleted by wallet');
      reset();
      // Don't auto-reconnect, let user decide
    });

    // Stale session cleanup is now handled by clearing local storage
  } catch (error) {
    console.error('Failed to initialize:', error);
    showError('connectError', 'Failed to initialize WalletConnect');
  }
}

// Connect wallet
window.connect = async function() {
  console.log('Connect function called');
  
  if (!signClient) {
    console.error('SignClient not initialized');
    showError('connectError', 'WalletConnect not initialized. Please refresh the page.');
    return;
  }
  
  try {
    clearErrors();
    document.getElementById('connectBtn').disabled = true;
    document.getElementById('connectBtn').innerHTML = 'Connecting... <span class="spinner"></span>';

    const { uri, approval } = await signClient.connect({
      pairingTopic: undefined,
      requiredNamespaces: {
        rchain: {
          methods: [
            'rchain_sendTransaction',
            'rchain_signMessage',
            'rchain_getBalance'
          ],
          chains: ['rchain:01', 'rchain:testnet'],
          events: ['chainChanged', 'accountsChanged']
        }
      }
    });

    // Generate QR code and show URI
    if (uri) {
      const qrCodeElement = document.getElementById('qrcode');
      qrCodeElement.innerHTML = '';
      await QRCode.toCanvas(uri, {
        width: 256,
        margin: 0
      }, (error, canvas) => {
        if (error) {
          console.error('QR code error:', error);
          return;
        }
        qrCodeElement.appendChild(canvas);
      });
      qrCodeElement.classList.remove('hidden');

      // Show URI for manual copy
      document.getElementById('wcUri').value = uri;
      document.getElementById('uriSection').classList.remove('hidden');
      
      // Also log URI for manual copy
      console.log('WalletConnect URI:', uri);
    }

    // Wait for approval
    const session = await approval();
    onSessionConnected(session);
  } catch (error) {
    console.error('Connection error:', error);
    showError('connectError', error.message || 'Failed to connect');
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('connectBtn').innerHTML = 'Connect Wallet';
  }
}

// Handle successful connection
function onSessionConnected(newSession) {
  session = newSession;
  
  // Update UI
  document.getElementById('status').className = 'status connected';
  document.getElementById('status').textContent = 'Connected';
  document.getElementById('connectSection').classList.add('hidden');
  document.getElementById('connectedSection').classList.remove('hidden');
  document.getElementById('qrcode').classList.add('hidden');
  
  // Show other sections
  document.getElementById('transactionSection').classList.remove('hidden');
  document.getElementById('signSection').classList.remove('hidden');
  document.getElementById('balanceSection').classList.remove('hidden');
  
  // Display connection info
  const accounts = session.namespaces.rchain?.accounts || [];
  const account = accounts[0] || '';
  const address = account.split(':')[2] || '';
  
  document.getElementById('walletName').textContent = session.peer.metadata.name;
  document.getElementById('address').textContent = address;
  document.getElementById('chain').textContent = currentChain;
  
  // Reset connect button
  document.getElementById('connectBtn').disabled = false;
  document.getElementById('connectBtn').innerHTML = 'Connect Wallet';
}

// Disconnect
window.disconnect = async function() {
  if (session) {
    try {
      await signClient.disconnect({
        topic: session.topic,
        reason: getSdkError('USER_DISCONNECTED')
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      // If disconnect fails, session might already be gone
      if (error.message?.includes('No matching key') || 
          error.message?.includes('session or pairing topic doesn\'t exist')) {
        console.log('Session already disconnected');
      }
    }
  }
  reset();
}

// Reset UI
function reset() {
  session = null;
  
  document.getElementById('status').className = 'status disconnected';
  document.getElementById('status').textContent = 'Disconnected';
  document.getElementById('connectSection').classList.remove('hidden');
  document.getElementById('connectedSection').classList.add('hidden');
  document.getElementById('qrcode').classList.add('hidden');
  document.getElementById('uriSection').classList.add('hidden');
  
  // Hide other sections
  document.getElementById('transactionSection').classList.add('hidden');
  document.getElementById('signSection').classList.add('hidden');
  document.getElementById('balanceSection').classList.add('hidden');
  
  // Clear data
  document.getElementById('walletName').textContent = '-';
  document.getElementById('address').textContent = '-';
  document.getElementById('chain').textContent = '-';
  
  clearErrors();
  clearResponses();
}

// Send transaction
window.sendTransaction = async function() {
  if (!session) return;
  
  clearErrors();
  const to = document.getElementById('toAddress').value;
  const amount = document.getElementById('amount').value;
  const deployCode = document.getElementById('deployCode').value;
  
  if (!to || !amount) {
    showError('txError', 'Please fill in all required fields');
    return;
  }
  
  try {
    console.log("Requesting transaction with session:", session);
    const result = await signClient.request({
      topic: session.topic,
      chainId: currentChain,
      request: {
        method: 'rchain_sendTransaction',
        params: [{
          to,
          amount,
          deploy: deployCode || undefined
        }]
      }
    });
    
    showResponse('txResponse', 'Transaction Result:', result);
  } catch (error) {
    console.error('Transaction error:', error);
    showError('txError', error.message || 'Transaction failed');
    // Don't disconnect on error - session should remain active
  }
}

// Sign message
window.signMessage = async function() {
  if (!session) return;
  
  clearErrors();
  const message = document.getElementById('message').value;
  
  if (!message) {
    showError('signError', 'Please enter a message');
    return;
  }
  
  try {
    const result = await signClient.request({
      topic: session.topic,
      chainId: currentChain,
      request: {
        method: 'rchain_signMessage',
        params: [message]
      }
    });
    
    showResponse('signResponse', 'Signature:', result);
  } catch (error) {
    console.error('Sign error:', error);
    showError('signError', error.message || 'Signing failed');
    // Don't disconnect on error - session should remain active
  }
}

// Get balance
window.getBalance = async function() {
  if (!session) return;
  
  clearErrors();
  
  try {
    const result = await signClient.request({
      topic: session.topic,
      chainId: currentChain,
      request: {
        method: 'rchain_getBalance',
        params: []
      }
    });
    
    showResponse('balanceResponse', 'Balance:', result);
  } catch (error) {
    console.error('Balance error:', error);
    showError('balanceError', error.message || 'Failed to get balance');
    // Don't disconnect on error - session should remain active
  }
}

// UI helpers
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

function showResponse(elementId, label, data) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<strong>${label}</strong><br>${JSON.stringify(data, null, 2)}`;
    element.classList.remove('hidden');
  }
}

function clearErrors() {
  ['connectError', 'txError', 'signError', 'balanceError'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = '';
      element.style.display = 'none';
    }
  });
}

function clearResponses() {
  ['txResponse', 'signResponse', 'balanceResponse'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = '';
      element.classList.add('hidden');
    }
  });
}

// Copy URI to clipboard
window.copyUri = function() {
  const uriInput = document.getElementById('wcUri');
  if (uriInput && uriInput.value) {
    navigator.clipboard.writeText(uriInput.value).then(() => {
      const successMsg = document.getElementById('copySuccess');
      successMsg.style.display = 'block';
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      uriInput.select();
      document.execCommand('copy');
    });
  }
}

// Open wallet with deep link
window.openInWallet = function() {
  const uriInput = document.getElementById('wcUri');
  if (uriInput && uriInput.value) {
    // Try multiple approaches for different platforms
    const walletUrl = `http://localhost:3002/?uri=${encodeURIComponent(uriInput.value)}`;
    const deepLink = `asiwallet://connect?uri=${encodeURIComponent(uriInput.value)}`;
    
    // For mobile, try deep link first
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      // Try deep link
      window.location.href = deepLink;
      
      // Fallback to web URL after a delay
      setTimeout(() => {
        window.open(walletUrl, '_blank');
      }, 1500);
    } else {
      // Desktop: open in new tab
      window.open(walletUrl, '_blank');
    }
  }
}

// All session restoration logic has been removed to simplify the flow.

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing WalletConnect...');
  init().then(() => {
    console.log('WalletConnect initialized');
    // Expose for debugging
    window.signClient = signClient;
  }).catch(error => {
    console.error('Failed to initialize:', error);
  });
});