// Test using f1r3wallet's exact method
const axios = require('axios');

const privateKey = '357cdc4201a5650830e0bc5a03299a30038d9934ba4c7ab73ec164ad82471ff9';
const revAddress = '111127RX5ZgiAdRaQy4AWy57RdvAAckdELReEBxzvWYVvdnR32PiHA';

console.log('Testing with f1r3wallet method');
console.log('REV Address:', revAddress);

// Use the exact same Rholang code as f1r3wallet
const checkBalance_rho = addr => `
new return, rl(\`rho:registry:lookup\`), RevVaultCh, vaultCh in {
  rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
  for (@(_, RevVault) <- RevVaultCh) {
    @RevVault!("findOrCreate", "${addr}", *vaultCh) |
    for (@maybeVault <- vaultCh) {
      match maybeVault {
        (true, vault) => @vault!("balance", *return)
        (false, err)  => return!(err)
      }
    }
  }
}`;

async function checkBalance() {
  const nodeUrl = 'http://localhost:40453';
  
  try {
    // Get blocks
    const blocksResp = await axios.get(`${nodeUrl}/api/blocks/1`);
    const blockNumber = blocksResp.data[0]?.blockNumber || 0;
    
    console.log('Latest block:', blockNumber);
    
    // Prepare deploy exactly like f1r3wallet
    const deployCode = checkBalance_rho(revAddress);
    const deployData = {
      term: deployCode,
      phloPrice: 1,
      phloLimit: 100000000,
      validAfterBlockNumber: blockNumber,
      timestamp: Date.now()
    };
    
    console.log('\nSending explore-deploy...');
    
    const response = await axios.post(`${nodeUrl}/api/explore-deploy`, deployData);
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Parse exactly like f1r3wallet
    const {expr: [e]} = response.data;
    const dataBal = e && e.ExprInt && e.ExprInt.data;
    const dataError = e && e.ExprString && e.ExprString.data;
    
    if (dataBal !== undefined) {
      console.log('\n✅ Balance:', dataBal);
      console.log('REV:', dataBal / 100000000);
    } else if (dataError) {
      console.log('\n❌ Error:', dataError);
    } else {
      console.log('\n❌ No balance found');
      console.log('Expression:', e);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkBalance();