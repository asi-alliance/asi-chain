const fs = require('fs');
const path = require('path');

console.log('Running post-build script...');

const buildDir = path.join(__dirname, '../build');

// Add _redirects for Netlify
const redirectsContent = '/* /index.html 200';
fs.writeFileSync(path.join(buildDir, '_redirects'), redirectsContent);
console.log('Created _redirects file for Netlify');

// Add 404.html for GitHub Pages (copy of index.html)
const indexPath = path.join(buildDir, 'index.html');
const notFoundPath = path.join(buildDir, '404.html');
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log('Created 404.html for GitHub Pages');
}

// Generate deployment instructions
const deploymentGuide = `# ASI Wallet Static Deployment Guide

## Deployment Options

### GitHub Pages
\`\`\`bash
npm run deploy:gh
\`\`\`

### IPFS
\`\`\`bash
npm run deploy:ipfs
\`\`\`

### Arweave
\`\`\`bash
arkb deploy build --wallet wallet.json
\`\`\`

### Netlify
\`\`\`bash
netlify deploy --prod --dir=build
\`\`\`

### Vercel
\`\`\`bash
vercel --prod build
\`\`\`

### Self-Hosting
1. Copy the contents of the build/ directory to your web server
2. Configure your server to serve index.html for all routes
3. Enable CORS headers if needed for blockchain connectivity

## Access Methods

- GitHub Pages: https://[username].github.io/[repo]/
- IPFS: https://ipfs.io/ipfs/[hash]/
- Local: npx serve -s build

## Notes

- All routes use hash-based routing (e.g., /#/accounts)
- No backend required - runs entirely in the browser
- Private keys are encrypted in browser storage
`;

fs.writeFileSync(path.join(buildDir, 'DEPLOY.md'), deploymentGuide);
console.log('Created DEPLOY.md with deployment instructions');

// Create a version file with build information
const buildInfo = {
  version: require('../package.json').version,
  buildTime: new Date().toISOString(),
  gitCommit: process.env.GITHUB_SHA || 'local',
  nodeVersion: process.version
};

fs.writeFileSync(
  path.join(buildDir, 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);
console.log('Created build-info.json');

console.log('Post-build script completed successfully!');