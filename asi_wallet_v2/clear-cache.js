// Run this in your browser console to clear cached network settings
// and see the updated network names and URLs

// Clear cached networks
localStorage.removeItem('asi_wallet_networks');

// Clear any cached selected network
localStorage.removeItem('selectedNetwork');

// Reload the page to get fresh network settings
location.reload();

console.log('✅ Network cache cleared! The page will now reload with updated settings:');
console.log('- Mainnet: http://54.254.197.253:40403');
console.log('- Testnet: http://54.254.197.253:40403');
console.log('- Custom: http://54.254.197.253:40403');