# ASI Chain Faucet

A production-ready token faucet for the F1R3FLY blockchain network, distributing REV tokens to developers and users on testnet.

## 🚀 Deployment Status

✅ **PRODUCTION** - Deployed on AWS Lightsail  
🌐 **Public URL**: http://13.251.66.61:5050  
📊 **Balance**: ~500M REV available  
🔗 **Network**: Connected to Singapore F1R3FLY nodes  
📍 **Faucet Address**: `1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g`  
⚡ **Status**: Online and operational  

## 📦 Active Implementation

**The TypeScript faucet (`typescript-faucet/`) is the current production implementation.**

All Python-based implementations have been archived in the `archive/` directory for historical reference.

## 📋 Features

- **REV Token Distribution**: Automated testnet token distribution
- **Rate Limiting**: 20 requests/hour, 5 requests/day per address
- **Modern Web Interface**: React-style UI with real-time stats
- **Enterprise Security**: Helmet.js, CORS, input validation
- **GraphQL Integration**: Real-time transaction verification
- **Docker Ready**: Production containerization with health checks

## 🏃 Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# Configure environment
cp .env.example .env
# Edit .env with your FAUCET_PRIVATE_KEY

# Build and start faucet
docker-compose build --no-cache
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f faucet
```

Access the faucet at http://localhost:5050

### Option 2: Local Development

```bash
cd typescript-faucet
npm install
npm run build
npm start
```

Access the faucet at http://localhost:5000

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Required: Faucet private key (hex format)
FAUCET_PRIVATE_KEY=your_private_key_here

# F1R3FLY Network (Singapore Production)
VALIDATOR_URL=http://13.251.66.61:40413
READONLY_URL=http://13.251.66.61:40453
GRAPHQL_URL=http://13.251.66.61:8080/v1/graphql

# Faucet settings
FAUCET_AMOUNT=100  # REV per request
PHLO_LIMIT=500000  # Gas limit
PHLO_PRICE=1       # Gas price

# Optional: reCAPTCHA
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=
```

## 🌐 Network Endpoints

**Production (AWS Lightsail - Singapore):**
- Validator: http://13.251.66.61:40413 (transactions)
- Read-only: http://13.251.66.61:40453 (balance queries)
- GraphQL: http://13.251.66.61:8080/v1/graphql (indexer)

## 📁 Directory Structure

```
faucet/
├── typescript-faucet/      # ✅ Active TypeScript implementation
│   ├── src/               # Source code
│   ├── package.json       # Dependencies
│   └── tsconfig.json      # TypeScript config
├── docker-compose.yml     # Docker deployment
├── Dockerfile            # Container build (TypeScript)
├── .env.example          # Configuration template
├── README.md             # This file
└── archive/              # Legacy implementations (Python)
    ├── ethereum-web3-faucet.py
    ├── f1r3fly_faucet.py
    ├── rchain_faucet.py
    └── ARCHIVED_FAUCETS.md
```

## 🔒 Security

- **Input Validation**: Strict REV address format checking
- **Rate Limiting**: IP and address-based throttling
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Secure cross-origin requests
- **Non-root Docker**: Unprivileged container execution
- **Optional CAPTCHA**: Google reCAPTCHA v2 support

## 📊 API Endpoints

- `GET /` - Web interface with real-time stats
- `POST /api/request` - Request REV tokens
- `GET /api/stats` - Faucet statistics
- `GET /health` - Health check endpoint

## 💰 Funding the Faucet

1. **Faucet address**: `1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g`
2. **Send REV tokens**: Use ASI Wallet or CLI to fund the faucet address
3. **Monitor balance**: View real-time balance at http://localhost:5050/api/stats

## 🧪 Testing

```bash
cd typescript-faucet

# Run tests
npm test

# Test API directly (Docker on port 5050)
curl -X POST http://localhost:5050/api/request \
  -H "Content-Type: application/json" \
  -d '{"address": "1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8"}'

# Check faucet stats
curl http://localhost:5050/api/stats | jq .
```

## 🐳 Docker Operations

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f faucet

# Stop services
docker-compose down

# Clean everything
docker-compose down -v
```

## 🆘 Troubleshooting

### Browser forcing HTTPS (FIXED)
- **Issue**: Browsers auto-redirecting to HTTPS causing SSL errors
- **Root Cause**: Helmet.js security headers (HSTS, CSP upgrade-insecure-requests)
- **Fix Applied**: Disabled HSTS and CSP in server.ts configuration
- **User Action**: Clear browser cache or use incognito mode to bypass cached HSTS

### Port 5000 already in use (macOS)
- macOS ControlCenter uses port 5000 by default
- Docker deployment uses port 5050 instead
- For local development, change the PORT environment variable

### Faucet has no balance
- Fund the faucet's REV address: `1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g`
- Check balance at `http://13.251.66.61:5050/api/stats`

### Transaction failures
- Verify node connectivity: `curl http://13.251.66.61:40413/api/status`
- Check PHLO_LIMIT is sufficient (default: 500000)
- Ensure validator node is accepting deploys

### Rate limit issues
- Default: 20 requests/hour, 5 requests/day
- Limits are per address and IP
- SQLite database stores request history in `/app/data/faucet.db`

### Health check shows "unhealthy"
- This is cosmetic - faucet works despite the status
- Caused by missing curl in Alpine image (intentional for smaller size)

## 📚 Additional Resources

- **TypeScript Implementation**: See `typescript-faucet/README.md`
- **Archived Implementations**: See `archive/ARCHIVED_FAUCETS.md`
- **F1R3FLY Documentation**: See main project docs
- **ASI Wallet**: http://13.251.66.61:3000

## 📝 License

MIT License - Part of the ASI Chain project

---

**Note**: This faucet is for the F1R3FLY blockchain (REV tokens), not Ethereum. For historical Ethereum faucet implementations, see the `archive/` directory.