# Token Faucet Component Guide

## 💧 Component Overview

The ASI Chain Faucet is a TypeScript/Express service that distributes testnet REV tokens to developers. It features rate limiting, transaction history tracking, and automated wallet management.

```
faucet/typescript-faucet/
├── src/
│   ├── server.ts              # Express server setup
│   ├── routes/
│   │   ├── faucet.ts         # Faucet endpoints
│   │   └── admin.ts          # Admin endpoints
│   ├── services/
│   │   ├── wallet.ts         # Wallet operations
│   │   ├── blockchain.ts     # F1R3FLY interaction
│   │   └── database.ts       # SQLite storage
│   ├── middleware/
│   │   ├── rateLimiter.ts    # Rate limiting
│   │   ├── validator.ts      # Input validation
│   │   └── auth.ts           # Admin authentication
│   └── utils/
│       ├── crypto.ts         # Cryptographic functions
│       └── logger.ts         # Logging configuration
├── database/
│   └── faucet.db            # SQLite database
├── dist/                     # Compiled JavaScript
└── tests/                    # Test files
```

## 🏗️ Architecture

### System Design

```
User Request
    ↓
Rate Limiter (IP/Address based)
    ↓
Input Validation
    ↓
Balance Check (Faucet wallet)
    ↓
Transaction Creation
    ↓
F1R3FLY Validator Node (40413)
    ↓
Transaction Broadcast
    ↓
Database Recording
    ↓
Response to User
```

### Key Features

1. **Rate Limiting**: 1 request per address per 24 hours
2. **IP Limiting**: 5 requests per IP per day
3. **Transaction Queue**: Handles concurrent requests
4. **Balance Monitoring**: Auto-alerts when low
5. **Admin Dashboard**: Monitor and manage faucet

## 💻 Core Components

### 1. Server Setup (`src/server.ts`)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { initDatabase } from './services/database';
import faucetRoutes from './routes/faucet';
import adminRoutes from './routes/admin';

config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5050; // Use 5050 to avoid macOS conflict

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,  // Disabled for HTTP deployment
  hsts: false                    // Disabled for HTTP deployment
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP'
});
app.use(globalLimiter);

// Routes
app.use('/api/faucet', faucetRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  await initDatabase();
  
  app.listen(PORT, () => {
    logger.info(`Faucet server running on port ${PORT}`);
  });
}

start().catch(console.error);
```

### 2. Wallet Service (`src/services/wallet.ts`)

```typescript
import * as secp256k1 from 'secp256k1';
import { blake2b } from 'blakejs';
import bs58check from 'bs58check';
import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');

export class WalletService {
  private privateKey: Buffer;
  private publicKey: Buffer;
  private address: string;
  
  constructor() {
    // Load faucet wallet from environment
    const privateKeyHex = process.env.FAUCET_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('FAUCET_PRIVATE_KEY not configured');
    }
    
    this.privateKey = Buffer.from(privateKeyHex, 'hex');
    this.publicKey = secp256k1.publicKeyCreate(this.privateKey);
    this.address = this.generateAddress(this.publicKey);
  }
  
  generateAddress(publicKey: Buffer): string {
    // REV address generation
    const hash = blake2b(publicKey, null, 32);
    const payload = Buffer.concat([
      Buffer.from([0x00]), // Version byte for mainnet
      hash.slice(0, 20)     // First 20 bytes of hash
    ]);
    
    return bs58check.encode(payload);
  }
  
  signTransaction(deployData: any): string {
    // Serialize deploy data
    const serialized = this.serializeDeploy(deployData);
    
    // Hash the data
    const hash = blake2b(serialized, null, 32);
    
    // Sign with private key
    const signature = secp256k1.ecdsaSign(hash, this.privateKey);
    
    return Buffer.concat([
      signature.signature,
      Buffer.from([signature.recid])
    ]).toString('hex');
  }
  
  private serializeDeploy(deploy: any): Buffer {
    // Rholang deploy serialization
    const parts = [
      Buffer.from(deploy.deployer),
      Buffer.from(deploy.term),
      Buffer.from(deploy.timestamp.toString()),
      Buffer.from(deploy.phloLimit.toString()),
      Buffer.from(deploy.phloPrice.toString())
    ];
    
    return Buffer.concat(parts);
  }
  
  validateAddress(address: string): boolean {
    try {
      // Check format
      if (!address.startsWith('1111')) return false;
      
      // Decode and verify checksum
      const decoded = bs58check.decode(address);
      
      // Check version byte
      if (decoded[0] !== 0x00) return false;
      
      return true;
    } catch {
      return false;
    }
  }
}
```

### 3. Blockchain Service (`src/services/blockchain.ts`)

```typescript
import axios from 'axios';
import { WalletService } from './wallet';

export class BlockchainService {
  private nodeUrl: string;
  private wallet: WalletService;
  
  constructor(wallet: WalletService) {
    // CRITICAL: Use validator node, not bootstrap!
    this.nodeUrl = process.env.NODE_URL || 'http://13.251.66.61:40413';
    this.wallet = wallet;
  }
  
  async getBalance(address: string): Promise<number> {
    // Query balance via Observer node for better performance
    const observerUrl = process.env.OBSERVER_URL || 'http://13.251.66.61:40453';
    
    try {
      const response = await axios.post(`${observerUrl}/api/explore-deploy`, {
        term: `new return in { 
          @"findBalance"!(["${address}"], *return) 
        }`
      });
      
      // Parse balance from response
      const balance = this.parseBalance(response.data);
      return balance;
    } catch (error) {
      logger.error(`Failed to get balance for ${address}:`, error);
      return 0;
    }
  }
  
  async sendTokens(recipient: string, amount: number): Promise<string> {
    // Create transfer deploy
    const deploy = {
      deployer: this.wallet.address,
      term: this.createTransferTerm(recipient, amount),
      phloLimit: 100000,
      phloPrice: 1,
      timestamp: Date.now(),
      sig: '',
      sigAlgorithm: 'secp256k1'
    };
    
    // Sign the deploy
    deploy.sig = this.wallet.signTransaction(deploy);
    
    try {
      // Send to validator node (NOT bootstrap!)
      const response = await axios.post(
        `${this.nodeUrl}/api/deploy`,
        deploy,
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 
        }
      );
      
      if (response.data.success === false) {
        throw new Error(response.data.message || 'Deploy failed');
      }
      
      return response.data.result || response.data.deployId;
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw new Error(`Failed to send tokens: ${error.message}`);
    }
  }
  
  private createTransferTerm(recipient: string, amount: number): string {
    // Rholang transfer code
    return `
      new 
        rl(\`rho:registry:lookup\`),
        RevVaultCh,
        vaultCh,
        revVaultKeyCh,
        deployerId(\`rho:rchain:deployerId\`)
      in {
        rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
        for (@(_, RevVault) <- RevVaultCh) {
          @RevVault!("findOrCreate", *deployerId, *vaultCh) |
          for (@vault <- vaultCh) {
            @vault!("transfer", "${recipient}", ${amount}, *revVaultKeyCh) |
            for (@result <- revVaultKeyCh) {
              match result {
                (true, _) => { Nil }
                (false, reason) => { 
                  new out(\`rho:io:stdout\`) in {
                    out!({"transfer failed": reason})
                  }
                }
              }
            }
          }
        }
      }
    `;
  }
  
  private parseBalance(response: any): number {
    // Extract balance from exploratory deploy response
    try {
      const match = response.match(/balance[:\s]+(\d+)/i);
      return match ? parseInt(match[1]) : 0;
    } catch {
      return 0;
    }
  }
}
```

### 4. Database Service (`src/services/database.ts`)

```typescript
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database;

export async function initDatabase() {
  db = await open({
    filename: path.join(__dirname, '../../database/faucet.db'),
    driver: sqlite3.Database
  });
  
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      amount INTEGER NOT NULL,
      transaction_id TEXT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
    
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE,
      last_request DATETIME,
      request_count INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS ip_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT UNIQUE,
      last_request DATETIME,
      daily_count INTEGER DEFAULT 0,
      blocked_until DATETIME
    );
    
    CREATE TABLE IF NOT EXISTS statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE UNIQUE,
      total_requests INTEGER DEFAULT 0,
      total_distributed INTEGER DEFAULT 0,
      unique_addresses INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0
    );
    
    CREATE INDEX IF NOT EXISTS idx_requests_address ON requests(address);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at);
  `);
}

export async function checkRateLimit(address: string): Promise<boolean> {
  const limit = await db.get(
    'SELECT * FROM rate_limits WHERE address = ?',
    address
  );
  
  if (!limit) return true;
  
  const lastRequest = new Date(limit.last_request);
  const hoursSince = (Date.now() - lastRequest.getTime()) / (1000 * 60 * 60);
  
  return hoursSince >= 24; // 24 hour cooldown
}

export async function updateRateLimit(address: string) {
  await db.run(`
    INSERT INTO rate_limits (address, last_request, request_count)
    VALUES (?, CURRENT_TIMESTAMP, 1)
    ON CONFLICT(address) 
    DO UPDATE SET 
      last_request = CURRENT_TIMESTAMP,
      request_count = request_count + 1
  `, address);
}

export async function checkIPLimit(ip: string): Promise<boolean> {
  const limit = await db.get(
    'SELECT * FROM ip_limits WHERE ip_address = ?',
    ip
  );
  
  if (!limit) return true;
  
  // Check if blocked
  if (limit.blocked_until) {
    const blockedUntil = new Date(limit.blocked_until);
    if (blockedUntil > new Date()) return false;
  }
  
  // Check daily limit (5 requests per day)
  const lastRequest = new Date(limit.last_request);
  const isNewDay = !isSameDay(lastRequest, new Date());
  
  if (isNewDay) {
    // Reset daily count
    await db.run(
      'UPDATE ip_limits SET daily_count = 0 WHERE ip_address = ?',
      ip
    );
    return true;
  }
  
  return limit.daily_count < 5lt;5;
}

export async function recordRequest(data: {
  address: string;
  amount: number;
  ip: string;
  userAgent?: string;
}) {
  return await db.run(`
    INSERT INTO requests (address, amount, ip_address, user_agent, status)
    VALUES (?, ?, ?, ?, 'pending')
  `, data.address, data.amount, data.ip, data.userAgent);
}

export async function updateRequestStatus(
  id: number, 
  status: string, 
  transactionId?: string,
  errorMessage?: string
) {
  await db.run(`
    UPDATE requests 
    SET status = ?, 
        transaction_id = ?,
        error_message = ?,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, status, transactionId, errorMessage, id);
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}
```

### 5. Faucet Routes (`src/routes/faucet.ts`)

```typescript
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { WalletService } from '../services/wallet';
import { BlockchainService } from '../services/blockchain';
import * as db from '../services/database';

const router = Router();
const wallet = new WalletService();
const blockchain = new BlockchainService(wallet);

// Rate limiter specific to faucet endpoint
const faucetLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => req.ip + ':' + req.body.address
});

// Request tokens
router.post('/request',
  faucetLimiter,
  [
    body('address')
      .isString()
      .trim()
      .custom((value) => wallet.validateAddress(value))
      .withMessage('Invalid REV address'),
    body('amount')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Amount must be between 1 and 1000')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { address } = req.body;
    const amount = req.body.amount || 100; // Default 100 REV
    const ip = req.ip;
    
    try {
      // Check rate limits
      const canRequest = await db.checkRateLimit(address);
      if (!canRequest) {
        return res.status(429).json({
          error: 'Please wait 24 hours between requests'
        });
      }
      
      const ipAllowed = await db.checkIPLimit(ip);
      if (!ipAllowed) {
        return res.status(429).json({
          error: 'Too many requests from this IP address'
        });
      }
      
      // Check faucet balance
      const faucetBalance = await blockchain.getBalance(wallet.address);
      if (faucetBalance < amount * 100000000) { // Convert to smallest unit
        return res.status(503).json({
          error: 'Faucet is temporarily empty. Please try again later.'
        });
      }
      
      // Record request
      const request = await db.recordRequest({
        address,
        amount,
        ip,
        userAgent: req.get('user-agent')
      });
      
      // Send tokens
      const txId = await blockchain.sendTokens(address, amount * 100000000);
      
      // Update database
      await db.updateRequestStatus(request.lastID, 'completed', txId);
      await db.updateRateLimit(address);
      
      res.json({
        success: true,
        transactionId: txId,
        amount: amount,
        message: `Successfully sent ${amount} REV to ${address}`
      });
      
    } catch (error) {
      logger.error('Faucet request failed:', error);
      
      if (request?.lastID) {
        await db.updateRequestStatus(
          request.lastID, 
          'failed', 
          null, 
          error.message
        );
      }
      
      res.status(500).json({
        error: 'Failed to process request. Please try again later.'
      });
    }
  }
);

// Check request status
router.get('/status/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!wallet.validateAddress(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  
  const requests = await db.db.all(
    `SELECT * FROM requests 
     WHERE address = ? 
     ORDER BY created_at DESC 
     LIMIT 10`,
    address
  );
  
  res.json({
    address,
    requests: requests.map(r => ({
      amount: r.amount,
      status: r.status,
      transactionId: r.transaction_id,
      timestamp: r.created_at
    }))
  });
});

// Get faucet info
router.get('/info', async (req: Request, res: Response) => {
  try {
    const balance = await blockchain.getBalance(wallet.address);
    const stats = await db.db.get(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(amount) as total_distributed,
        COUNT(DISTINCT address) as unique_addresses
      FROM requests
      WHERE status = 'completed'
      AND date(created_at) = date('now')
    `);
    
    res.json({
      faucetAddress: wallet.address,
      balance: balance / 100000000, // Convert to REV
      dailyLimit: 100,
      requestCooldown: '24 hours',
      statistics: {
        todayRequests: stats.total_requests || 0,
        todayDistributed: (stats.total_distributed || 0) + ' REV',
        uniqueAddresses: stats.unique_addresses || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get faucet info' });
  }
});

export default router;
```

### 6. Admin Routes (`src/routes/admin.ts`)

```typescript
import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import * as db from '../services/database';

const router = Router();

// All admin routes require authentication
router.use(authenticateAdmin);

// Get statistics
router.get('/stats', async (req, res) => {
  const stats = await db.db.get(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(amount) as total_distributed,
      COUNT(DISTINCT address) as unique_addresses,
      COUNT(DISTINCT ip_address) as unique_ips
    FROM requests
    WHERE date(created_at) >= date('now', '-30 days')
  `);
  
  res.json(stats);
});

// Block/unblock IP
router.post('/block-ip', async (req, res) => {
  const { ip, duration = 24 } = req.body;
  
  const blockedUntil = new Date();
  blockedUntil.setHours(blockedUntil.getHours() + duration);
  
  await db.db.run(`
    INSERT INTO ip_limits (ip_address, blocked_until)
    VALUES (?, ?)
    ON CONFLICT(ip_address)
    DO UPDATE SET blocked_until = ?
  `, ip, blockedUntil, blockedUntil);
  
  res.json({ success: true, blockedUntil });
});

// Manual token distribution
router.post('/distribute', async (req, res) => {
  const { address, amount } = req.body;
  
  try {
    const txId = await blockchain.sendTokens(address, amount * 100000000);
    
    await db.recordRequest({
      address,
      amount,
      ip: 'admin',
      userAgent: 'Manual distribution'
    });
    
    res.json({ success: true, transactionId: txId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## 🧪 Testing

### Unit Tests

```typescript
// tests/wallet.test.ts
import { WalletService } from '../src/services/wallet';

describe('WalletService', () => {
  let wallet: WalletService;
  
  beforeEach(() => {
    process.env.FAUCET_PRIVATE_KEY = 'test_private_key_hex';
    wallet = new WalletService();
  });
  
  test('validates correct REV address', () => {
    const validAddress = '1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g';
    expect(wallet.validateAddress(validAddress)).toBe(true);
  });
  
  test('rejects invalid address', () => {
    expect(wallet.validateAddress('invalid')).toBe(false);
    expect(wallet.validateAddress('0x123')).toBe(false);
    expect(wallet.validateAddress('')).toBe(false);
  });
});
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 5050
CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  faucet:
    build: .
    container_name: asi-faucet
    ports:
      - "5050:5050"
    environment:
      NODE_ENV: production
      PORT: 5050
      NODE_URL: http://13.251.66.61:40413
      OBSERVER_URL: http://13.251.66.61:40453
      FAUCET_PRIVATE_KEY: ${FAUCET_PRIVATE_KEY}
      ADMIN_TOKEN: ${ADMIN_TOKEN}
    volumes:
      - ./database:/app/database
    restart: unless-stopped
```

## 🔧 Configuration

### Environment Variables

```bash
# .env
NODE_ENV=production
PORT=5050

# Blockchain
NODE_URL=http://13.251.66.61:40413      # Validator for transactions
OBSERVER_URL=http://13.251.66.61:40453  # Observer for queries

# Faucet wallet (NEVER COMMIT!)
FAUCET_PRIVATE_KEY=your_private_key_hex
FAUCET_ADDRESS=1111...

# Security
ADMIN_TOKEN=secure_admin_token
ALLOWED_ORIGINS=http://13.251.66.61:3000,http://13.251.66.61:3001

# Limits
DEFAULT_AMOUNT=100
MAX_AMOUNT=1000
COOLDOWN_HOURS=24
DAILY_IP_LIMIT=5
```

## 📋 Maintenance

### Daily Tasks
- Check balance: `curl http://localhost:5050/api/faucet/info`
- Monitor requests: Check SQLite database
- Review failed transactions

### Weekly Tasks
- Backup database: `cp database/faucet.db backups/`
- Clean old requests: Delete records older than 30 days
- Review IP blocks

### When Balance Low
1. Generate alert
2. Transfer funds to faucet wallet
3. Verify balance updated
4. Resume operations

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Component Version**: 1.0.0