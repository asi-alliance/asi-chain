# ASI Wallet Static Deployment Guide

## Deployment Options

### GitHub Pages
```bash
npm run deploy:gh
```

### IPFS
```bash
npm run deploy:ipfs
```

### Arweave
```bash
arkb deploy build --wallet wallet.json
```

### Netlify
```bash
netlify deploy --prod --dir=build
```

### Vercel
```bash
vercel --prod build
```

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
