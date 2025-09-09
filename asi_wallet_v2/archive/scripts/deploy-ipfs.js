const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function deployToIPFS() {
  try {
    console.log('Connecting to IPFS...');
    
    // Connect to local IPFS node or use Infura
    const ipfs = create({
      host: process.env.IPFS_HOST || 'ipfs.infura.io',
      port: process.env.IPFS_PORT || 5001,
      protocol: process.env.IPFS_PROTOCOL || 'https'
    });

    const buildDir = path.join(__dirname, '../build');
    
    if (!fs.existsSync(buildDir)) {
      console.error('Build directory not found. Run "npm run build" first.');
      process.exit(1);
    }

    console.log('Adding files to IPFS...');
    
    // Get all files in build directory
    const files = glob.sync('**/*', { 
      cwd: buildDir, 
      nodir: true 
    });

    const results = [];
    
    for (const file of files) {
      const filePath = path.join(buildDir, file);
      const content = fs.readFileSync(filePath);
      
      const result = await ipfs.add({
        path: file,
        content: content
      });
      
      results.push(result);
      console.log(`Added ${file}: ${result.cid}`);
    }

    // Add the entire directory
    console.log('\nAdding directory to IPFS...');
    const directoryFiles = [];
    
    for (const file of files) {
      const filePath = path.join(buildDir, file);
      const content = fs.readFileSync(filePath);
      
      directoryFiles.push({
        path: file,
        content: content
      });
    }
    
    const dirResult = await ipfs.addAll(directoryFiles, { 
      wrapWithDirectory: true,
      pin: true 
    });
    
    let rootCID;
    for await (const result of dirResult) {
      if (result.path === '') {
        rootCID = result.cid.toString();
      }
    }
    
    console.log('\n✅ Deployment successful!');
    console.log(`\nRoot CID: ${rootCID}`);
    console.log(`\nAccess your app at:`);
    console.log(`- https://ipfs.io/ipfs/${rootCID}/`);
    console.log(`- https://cloudflare-ipfs.com/ipfs/${rootCID}/`);
    console.log(`- https://gateway.pinata.cloud/ipfs/${rootCID}/`);
    
    // Save deployment info
    const deploymentInfo = {
      cid: rootCID,
      timestamp: new Date().toISOString(),
      files: results.length
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../ipfs-deployment.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\nDeployment info saved to ipfs-deployment.json');
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deployToIPFS();