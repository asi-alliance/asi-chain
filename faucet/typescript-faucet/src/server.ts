import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { FaucetService } from './services/FaucetService';
import { FaucetConfig } from './types';

// Load environment variables
dotenv.config();

// Configuration
const config: FaucetConfig = {
  privateKey: process.env.FAUCET_PRIVATE_KEY || '',
  faucetAmount: parseInt(process.env.FAUCET_AMOUNT || '100'),
  validatorUrl: process.env.VALIDATOR_URL || 'http://13.251.66.61:40413',
  readOnlyUrl: process.env.READONLY_URL || 'http://13.251.66.61:40453',
  graphqlUrl: process.env.GRAPHQL_URL || 'http://13.251.66.61:8080/v1/graphql',
  phloLimit: parseInt(process.env.PHLO_LIMIT || '500000'),
  phloPrice: parseInt(process.env.PHLO_PRICE || '1'),
  maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || '5'),
  maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || '20'),
  databasePath: process.env.DATABASE_PATH || './faucet.db'
};

// Validate configuration
if (!config.privateKey) {
  console.error('Error: FAUCET_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Initialize services
const faucetService = new FaucetService(config);

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Disable HSTS and upgrade-insecure-requests for HTTP-only service
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP entirely to avoid upgrade-insecure-requests
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  hsts: false, // Disable HSTS completely
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.maxRequestsPerHour,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/request', limiter);

// Routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await faucetService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.post('/api/request', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.body;
    
    if (!address) {
      res.status(400).json({ 
        success: false, 
        error: 'Address is required' 
      });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await faucetService.requestTokens(address, ipAddress);
    
    if (result.success) {
      res.json({
        success: true,
        deployId: result.deployId,
        amount: config.faucetAmount,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Serve static HTML interface
app.get('/', (_req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ASI Chain TypeScript Faucet</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: rgba(26, 26, 46, 0.9);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        h1 {
            color: #10b981;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #9ca3af;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .tech-badge {
            display: inline-block;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid #10b981;
            color: #10b981;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 25px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #9ca3af;
            font-size: 14px;
        }
        input {
            width: 100%;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 8px;
            color: #e0e0e0;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        input:focus {
            outline: none;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        button {
            width: 100%;
            padding: 14px;
            background: #10b981;
            color: #000;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        button:hover {
            background: #0ea572;
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }
        button:disabled {
            background: #4b5563;
            cursor: not-allowed;
            transform: none;
        }
        .message {
            margin-top: 20px;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
        }
        .success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid #10b981;
            color: #10b981;
        }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #ef4444;
        }
        .info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid #3b82f6;
            color: #93bbfc;
            margin-bottom: 20px;
        }
        .stats {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
    </style>
    <script>
        // Immediately redirect HTTPS to HTTP
        if (window.location.protocol === 'https:') {
            window.location.href = 'http://' + window.location.host + window.location.pathname;
        }
    </script>
</head>
<body>
    <div class="container">
        <h1>🚰 ASI Chain Faucet</h1>
        <div class="subtitle">Get test REV tokens for the F1R3FLY testnet</div>
        <div class="tech-badge">TypeScript Edition - Wallet-Based Implementation</div>
        
        <div class="info">
            <strong>Network:</strong> ASI Testnet<br>
            <strong>Amount:</strong> ${config.faucetAmount} REV per request<br>
            <strong>Limit:</strong> ${config.maxRequestsPerDay} requests per day
        </div>
        
        <form id="faucetForm">
            <div class="form-group">
                <label for="address">REV Address</label>
                <input 
                    type="text" 
                    id="address" 
                    name="address" 
                    placeholder="Enter your REV address (e.g., 11112...)" 
                    required
                    pattern="^1[0-9A-Za-z]{20,}$"
                >
            </div>
            
            <button type="submit" id="submitBtn">Request ${config.faucetAmount} REV</button>
        </form>
        
        <div id="message"></div>
        
        <div class="stats">
            <h3 style="margin-bottom: 15px; color: #10b981;">Faucet Stats</h3>
            <div class="stat-item">
                <span>Status:</span>
                <span id="status">Loading...</span>
            </div>
            <div class="stat-item">
                <span>Balance:</span>
                <span id="balance">Loading...</span>
            </div>
            <div class="stat-item">
                <span>Total Distributed:</span>
                <span id="distributed">Loading...</span>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('faucetForm').onsubmit = async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('submitBtn');
            const msgDiv = document.getElementById('message');
            const address = document.getElementById('address').value;
            
            btn.disabled = true;
            btn.textContent = 'Processing...';
            msgDiv.innerHTML = '';
            
            try {
                const response = await fetch('/api/request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ address })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    msgDiv.innerHTML = \`
                        <div class="message success">
                            ✅ Success! \${data.amount} REV sent to \${address}<br>
                            Deploy ID: \${data.deployId ? data.deployId.slice(0, 12) + '...' : 'N/A'}
                        </div>
                    \`;
                } else {
                    msgDiv.innerHTML = \`<div class="message error">❌ \${data.error}</div>\`;
                }
            } catch (error) {
                msgDiv.innerHTML = \`<div class="message error">❌ Network error: \${error.message}</div>\`;
            } finally {
                btn.disabled = false;
                btn.textContent = 'Request ${config.faucetAmount} REV';
            }
        };
        
        // Load stats
        async function loadStats() {
            try {
                // Force HTTP if browser is using HTTPS
                const host = window.location.host;
                const protocol = window.location.protocol === 'https:' ? 'http:' : window.location.protocol;
                const baseUrl = protocol + '//' + host;
                
                // If we're on HTTPS, redirect to HTTP
                if (window.location.protocol === 'https:') {
                    window.location.href = 'http://' + host + window.location.pathname;
                    return;
                }
                
                const response = await fetch('/api/stats');
                const data = await response.json();
                document.getElementById('status').textContent = data.status === 'online' ? '🟢 Online' : '🔴 Offline';
                document.getElementById('balance').textContent = \`\${data.balance.toFixed(2)} REV\`;
                document.getElementById('distributed').textContent = \`\${data.distributed.toFixed(2)} REV\`;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }
        
        loadStats();
        setInterval(loadStats, 30000); // Refresh every 30 seconds
    </script>
</body>
</html>
  `);
});

// Initialize and start server
async function start() {
  try {
    await faucetService.initialize();
    
    app.listen(PORT, () => {
      console.log(`✅ TypeScript Faucet server running on port ${PORT}`);
      console.log(`📍 Web interface: http://localhost:${PORT}`);
      console.log(`🔧 Configuration:`);
      console.log(`   - Faucet amount: ${config.faucetAmount} REV`);
      console.log(`   - Validator URL: ${config.validatorUrl}`);
      console.log(`   - Read-only URL: ${config.readOnlyUrl}`);
      console.log(`   - Max requests per day: ${config.maxRequestsPerDay}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();