#!/bin/bash

echo "=== WalletConnect Complete Reset Script ==="
echo "This will clear all WalletConnect data from both wallet and DApp"
echo ""

# Function to clear browser storage via JavaScript
clear_storage() {
    local port=$1
    local app_name=$2
    
    echo "Clearing storage for $app_name on port $port..."
    
    # Create a temporary HTML file that clears storage
    cat > /tmp/clear_wc_storage.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Clear WalletConnect Storage</title>
</head>
<body>
    <h1>Clearing WalletConnect Storage...</h1>
    <div id="status"></div>
    <script>
        const status = document.getElementById('status');
        let cleared = 0;
        
        // Clear all WalletConnect keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('wc@2')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            cleared++;
        });
        
        // Also clear sessionStorage
        sessionStorage.clear();
        
        status.innerHTML = `<p>Cleared ${cleared} WalletConnect keys from localStorage</p>`;
        status.innerHTML += '<p>Cleared sessionStorage</p>';
        status.innerHTML += '<p style="color: green; font-weight: bold;">✓ Storage cleared successfully!</p>';
        status.innerHTML += '<p>You can close this tab now.</p>';
    </script>
</body>
</html>
EOF
    
    # Open in browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "http://localhost:$port/clear_wc_storage.html" 2>/dev/null || true
    else
        xdg-open "http://localhost:$port/clear_wc_storage.html" 2>/dev/null || true
    fi
    
    echo "Please check your browser for the storage clearing page"
    echo ""
}

echo "Step 1: Stop any running wallet or DApp servers"
echo "Press Ctrl+C in their terminals or close them"
echo "Press Enter when done..."
read

echo ""
echo "Step 2: Clear browser storage"
echo "Option A: Manual method (recommended)"
echo "  1. Open Chrome/Firefox Developer Tools (F12)"
echo "  2. Go to Application/Storage tab"
echo "  3. Clear storage for http://localhost:3002 (wallet)"
echo "  4. Clear storage for http://localhost:3003 (DApp)"
echo ""
echo "Option B: Run this JavaScript in console for each app:"
echo ""
cat << 'EOF'
// Run this in browser console at http://localhost:3002 (wallet)
// Then run it again at http://localhost:3003 (DApp)
(() => {
    let count = 0;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wc@2')) {
            keys.push(key);
        }
    }
    keys.forEach(key => {
        localStorage.removeItem(key);
        count++;
    });
    sessionStorage.clear();
    console.log(`Cleared ${count} WalletConnect keys`);
})();
EOF

echo ""
echo "Press Enter after clearing storage..."
read

echo ""
echo "Step 3: Start fresh instances"
echo ""
echo "Start the wallet:"
echo "  cd asi_wallet_v2"
echo "  npm start"
echo ""
echo "Start the DApp:"
echo "  cd asi_wallet_v2/test-dapp-rchain"
echo "  npm run dev"
echo ""
echo "Step 4: Test connection"
echo "  1. Click 'Connect Wallet' in DApp"
echo "  2. Copy the URI or scan QR"
echo "  3. Paste in wallet and connect"
echo ""
echo "Reset complete! The apps should now connect without errors."