// Complete WalletConnect cleanup script
// Run this in BOTH wallet and DApp consoles to fix "No matching key" errors

(() => {
    console.log('=== Complete WalletConnect Cleanup ===');
    
    // Find all localStorage keys
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
    }
    
    // Filter WalletConnect keys
    const wcKeys = allKeys.filter(key => key.startsWith('wc@2:'));
    
    console.log(`Found ${wcKeys.length} WalletConnect keys:`);
    wcKeys.forEach(key => {
        console.log(`  - ${key}`);
    });
    
    // Remove ALL WalletConnect keys
    if (wcKeys.length > 0) {
        console.log('\nRemoving all WalletConnect keys...');
        wcKeys.forEach(key => {
            localStorage.removeItem(key);
        });
    }
    
    // Clear sessionStorage too
    sessionStorage.clear();
    
    console.log('\n✅ Cleanup complete!');
    console.log('Please refresh the page now.');
    
    // Show what keys remain
    const remainingWC = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wc@2:')) {
            remainingWC.push(key);
        }
    }
    
    if (remainingWC.length > 0) {
        console.log(`\n⚠️ Warning: ${remainingWC.length} WalletConnect keys still remain`);
    } else {
        console.log('\n✅ All WalletConnect keys successfully removed');
    }
})();