// WalletConnect Emergency Fix Script
// Run this in the browser console on BOTH wallet (port 3002) and DApp (port 3003)

console.log('=== WalletConnect Emergency Fix ===');
console.log('Current URL:', window.location.href);

// Step 1: Clear ALL WalletConnect data
(() => {
    const keysToRemove = [];
    
    // Find ALL WalletConnect keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wc@2:')) {
            keysToRemove.push(key);
        }
    }
    
    console.log(`Found ${keysToRemove.length} WalletConnect keys to remove`);
    
    // Remove all keys
    keysToRemove.forEach(key => {
        console.log('Removing:', key);
        localStorage.removeItem(key);
    });
    
    // Also clear sessionStorage
    sessionStorage.clear();
    
    console.log('✅ All WalletConnect data cleared!');
})();

// Step 2: Force reload
console.log('');
console.log('Now refreshing the page in 2 seconds...');
console.log('After refresh, try connecting again.');

setTimeout(() => {
    window.location.reload();
}, 2000);