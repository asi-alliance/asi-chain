// Debug script to check WalletConnect localStorage state
// Run this in the browser console on both wallet and DApp

console.log('=== WalletConnect Debug Info ===');
console.log('Current URL:', window.location.href);
console.log('Origin:', window.location.origin);

// Find all WalletConnect keys
const wcKeys = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('wc@2')) {
    wcKeys.push(key);
  }
}

console.log('\nWalletConnect Keys Found:', wcKeys.length);
wcKeys.forEach(key => {
  console.log('\nKey:', key);
  try {
    const value = localStorage.getItem(key);
    const parsed = JSON.parse(value);
    console.log('Value:', parsed);
  } catch (e) {
    console.log('Value (raw):', localStorage.getItem(key));
  }
});

// Check for specific important keys
const importantKeys = [
  'wc@2:core:0.3:keychain',
  'wc@2:core:0.3:pairing',
  'wc@2:core:0.3:history',
  'wc@2:web3wallet:0.3:session',
  'wc@2:sign-client:0.3:session',
  'wc@2:sign-client:0.3:proposal'
];

console.log('\n=== Important Keys Check ===');
importantKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value ? 'EXISTS' : 'NOT FOUND'}`);
});

// Check if WalletConnect is initialized
if (window.signClient) {
  console.log('\n=== SignClient Info (DApp) ===');
  console.log('Sessions:', window.signClient.session.values);
  console.log('Pairings:', window.signClient.pairing.values);
}

if (window.walletConnectService) {
  console.log('\n=== WalletConnect Service Info (Wallet) ===');
  console.log('Initialized:', window.walletConnectService.isReady());
  console.log('Active Sessions:', window.walletConnectService.getActiveSessions());
}