// Test REV vault registry
const axios = require('axios');

async function testRevVault() {
  const nodeUrl = 'http://localhost:40453';
  
  console.log('Testing REV vault registry...\n');
  
  try {
    // Get latest block
    const blocksResp = await axios.get(`${nodeUrl}/api/blocks/1`);
    const blockNumber = blocksResp.data[0]?.blockNumber || 0;
    
    // Test 1: Check if REV vault exists in registry
    const checkRegistry = `
    new return, rl(\`rho:registry:lookup\`) in {
      rl!(\`rho:rchain:revVault\`, *return)
    }`;
    
    console.log('1. Checking if rho:rchain:revVault exists in registry...');
    const resp1 = await axios.post(`${nodeUrl}/api/explore-deploy`, {
      term: checkRegistry,
      phloPrice: 1,
      phloLimit: 100000000,
      validAfterBlockNumber: blockNumber,
      timestamp: Date.now()
    });
    
    console.log('Response:', JSON.stringify(resp1.data.expr, null, 2));
    
    // Test 2: Try to create a vault without balance check
    const revAddress = '111127RX5ZgiAdRaQy4AWy57RdvAAckdELReEBxzvWYVvdnR32PiHA';
    const createVault = `
    new return, rl(\`rho:registry:lookup\`), RevVaultCh in {
      rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
      for (@(_, RevVault) <- RevVaultCh) {
        @RevVault!("findOrCreate", "${revAddress}", *return)
      }
    }`;
    
    console.log('\n2. Trying to create/find vault for address...');
    const resp2 = await axios.post(`${nodeUrl}/api/explore-deploy`, {
      term: createVault,
      phloPrice: 1,
      phloLimit: 100000000,
      validAfterBlockNumber: blockNumber,
      timestamp: Date.now()
    });
    
    console.log('Response:', JSON.stringify(resp2.data.expr, null, 2));
    
    // Test 3: Simple return test
    const simpleTest = `new return in { return!(42) }`;
    
    console.log('\n3. Testing simple return...');
    const resp3 = await axios.post(`${nodeUrl}/api/explore-deploy`, {
      term: simpleTest,
      phloPrice: 1,
      phloLimit: 100000000,
      validAfterBlockNumber: blockNumber,
      timestamp: Date.now()
    });
    
    console.log('Response:', JSON.stringify(resp3.data.expr, null, 2));
    
    // Test 4: Check with explicit return channel
    const explicitReturn = `
    new return(\`rho:rchain:deployId\`), rl(\`rho:registry:lookup\`), RevVaultCh, vaultCh in {
      rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
      for (@(_, RevVault) <- RevVaultCh) {
        @RevVault!("findOrCreate", "${revAddress}", *vaultCh) |
        for (@maybeVault <- vaultCh) {
          match maybeVault {
            (true, vault) => @vault!("balance", *return)
            (false, err)  => return!(err)
          }
        }
      }
    }`;
    
    console.log('\n4. Testing with explicit return channel...');
    const resp4 = await axios.post(`${nodeUrl}/api/explore-deploy`, {
      term: explicitReturn,
      phloPrice: 1,
      phloLimit: 100000000,
      validAfterBlockNumber: blockNumber,
      timestamp: Date.now()
    });
    
    console.log('Response:', JSON.stringify(resp4.data.expr, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testRevVault();