# ASI-Chain Block Explorer - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Guide](#user-guide)
4. [Deployment Guide](#deployment-guide)
5. [API Reference](#api-reference)
6. [Implementation Details](#implementation-details)
7. [Brand Guide](#brand-guide)
8. [Brand Implementation](#brand-implementation)
9. [ASI Wallet v2 Brand Implementation](#asi-wallet-v2-brand-implementation)
10. [Theme Implementation](#theme-implementation)
11. [Reset Explorer Guide](#reset-explorer-guide)

---

## Overview

The ASI-Chain Block Explorer is a real-time blockchain data visualization and analysis system that combines RPC queries, log parsing, and a web interface to provide comprehensive blockchain insights. It is built specifically for the ASI-Chain blockchain (based on RChain/F1R3FLY technology) and provides:

- Real-time block and transaction monitoring
- REV token transfer tracking
- Smart contract deployment viewer
- Validator activity monitoring
- Wallet balance checking
- Network statistics

The system is designed with a modular architecture that can be deployed either locally for development or in production environments using Docker.

---

## Architecture

### System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ASI-Chain     │────▶│  Enhanced Parser │────▶│  SQLite Database│
│   RNode         │     │  (Python)        │     │                 │
│  (Docker)       │     │  - RPC queries   │     │  - Blocks       │
│                 │     │  - Log parsing   │     │  - Deployments  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        ▲                                                 │
        │                                                 ▼
        │               ┌──────────────────┐     ┌─────────────────┐
        └───────────────│  Flask Web Server│◀────│  Web Interface  │
    (explore-deploy)    │  (Python)        │     │  (HTML/JS/CSS)  │
                        │  - REST API      │     │  - Auto-refresh │
                        │  - Wallet queries│     │  - Dark/Light   │
                        └──────────────────┘     └─────────────────┘
```

### Components

#### 1. Data Collection Layer

**Enhanced Parser (`parser/enhanced_parser.py`)**

- **Purpose**: Continuously extract blockchain data from RNode containers
- **Key Features**:
  - Hybrid data collection approach
  - 5-second polling interval
  - Fault-tolerant design
  - Automatic retry logic

**Data Sources**:
1. **RPC Queries**:
   - `rnode show-blocks --depth N`: Fetch multiple blocks with metadata
   - `rnode show-block <hash>`: Get detailed block info including deployments
   - Block data includes: hash, number, parent, state hash, proposer, timestamp
   - Deployment data includes: deployer, term (Rholang code), phlo costs, signatures

2. **Docker Log Parsing**:
   - Extract validator public keys active for each block
   - Parse consensus participation data
   - Used to populate block_validators many-to-many relationship

#### 2. Data Storage Layer

**SQLite Database Schema**

**Tables**:

1. **blocks**
   ```sql
   CREATE TABLE blocks (
       block_number INTEGER PRIMARY KEY,
       block_hash TEXT NOT NULL UNIQUE,
       parent_hash TEXT NOT NULL,
       state_hash TEXT,
       content_hash TEXT,
       proposer_pub_key TEXT,
       created_at TEXT NOT NULL
   );
   ```

2. **validators**
   ```sql
   CREATE TABLE validators (
       public_key TEXT PRIMARY KEY,
       name TEXT
   );
   ```

3. **block_validators** (Many-to-Many)
   ```sql
   CREATE TABLE block_validators (
       block_hash TEXT NOT NULL,
       validator_pub_key TEXT NOT NULL,
       PRIMARY KEY (block_hash, validator_pub_key),
       FOREIGN KEY (block_hash) REFERENCES blocks (block_hash),
       FOREIGN KEY (validator_pub_key) REFERENCES validators (public_key)
   );
   ```

4. **deployments**
   ```sql
   CREATE TABLE deployments (
       deploy_id TEXT PRIMARY KEY,
       block_hash TEXT NOT NULL,
       deployer TEXT NOT NULL,
       term TEXT NOT NULL,
       timestamp INTEGER NOT NULL,
       sig TEXT NOT NULL,
       sig_algorithm TEXT NOT NULL,
       phlo_price INTEGER NOT NULL,
       phlo_limit INTEGER NOT NULL,
       phlo_cost INTEGER,
       valid_after_block INTEGER,
       errored BOOLEAN DEFAULT FALSE,
       error_message TEXT,
       created_at TEXT NOT NULL,
       FOREIGN KEY (block_hash) REFERENCES blocks (block_hash)
   );
   ```

#### 3. Application Layer

**Flask Web Server (`web/app.py`)**

- REST API and web interface serving
- Key endpoints for blocks, transfers, deployments, validators, and wallet queries
- Real-time data processing and REV amount conversion

#### 4. Presentation Layer

**Frontend (`web/templates/index.html`)**

- Single Page Application (SPA) with tab-based navigation
- Vanilla JavaScript (ES6+) - no framework dependencies
- CSS3 with custom properties for theming
- Responsive grid layout
- Auto-refresh with 5-second intervals

### Data Flow

1. **Block Data Collection (5-second cycle)**
   - Enhanced Parser timer triggers
   - Docker exec: rnode show-blocks --depth 25
   - Parse block metadata from CLI output
   - Docker logs API: extract validator participation
   - For each block: docker exec rnode show-block <hash>
   - Parse deployments with Rholang terms
   - Store in SQLite with foreign key relationships

2. **REV Transfer Detection**
   - API endpoint /api/transfers queries deployments table
   - SQL WHERE clause filters for RevVault transfer patterns
   - Regex extraction of transfer details
   - Amount conversion: dust / 100_000_000 = REV
   - Return paginated transfer list

3. **Wallet Balance Queries**
   - API endpoint /api/wallet/<address> receives request
   - Prepare explore-deploy Rholang query
   - HTTP POST to readonly node (port 40453)
   - Parse response JSON for ExprInt balance
   - Query deployments for transaction history
   - Return balance + recent transactions

### Known Validators and UI Consistency

The block explorer includes hardcoded validator information to ensure consistent UI behavior:

**Backend (web/app.py)**:
```python
known_validators = {
    '04ffc016579a68050d655d55df4e09f04605164543e257c8e6df10361e6068a5336588e9b355ea859c5ab4285a5ef0efdf62bc28b80320ce99e26bb1607b3ad93d': 'Bootstrap',
    '0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c': 'Validator 1',
    '04837a4cff833e3157e3135d7b40b8e1f33c6e6b5a4342b9fc784230ca4c4f9d356f258debef56ad4984726d6ab3e7709e1632ef079b4bcd653db00b68b2df065f': 'Validator 2',
    '04fa70d7be5eb750e0915c0f6d19e7085d18bb1c22d030feb2a877ca2cd226d04438aa819359c56c720142fbc66e9da03a5ab960a3d8b75363a226b7c800f60420': 'Validator 3'
}
```

**Why Validators Are Hardcoded**:
1. Consistent UI Experience when blockchain is down
2. Known Network Configuration (4 validators)
3. Key Normalization for proper mapping
4. User-Friendly Names instead of long hex keys

---

## User Guide

### Getting Started

#### Running the Explorer

**Option 1: Docker (Recommended)**
```bash
cd block-explorer
# Start the explorer container
docker-compose -f docker-compose.explorer.yml up -d

# Access the explorer at http://localhost:5001
```

**Option 2: Local Development**
```bash
cd block-explorer
# Start the parser and web server
./start_explorer.sh

# Access the explorer at http://localhost:8080
```

**Note**: The Docker deployment uses port 5001, while local development uses port 8080.

### Interface Overview

The explorer features:
- **Header**: Network status, theme toggle, and branding
- **Wallet Balance Checker**: Quick access to check REV address balances
- **Navigation Tabs**: Quick access to different sections
- **Summary Cards**: Key network metrics at a glance
- **Content Area**: Dynamic content based on selected tab

### Main Sections

#### 1. Blocks
- View all blocks in the blockchain
- Real-time block updates
- Search by block hash or number
- Click any block to see details
- Pagination for browsing history

#### 2. REV Transfers
- Track REV token movements
- Latest transfers with amounts
- From/To addresses
- Transfer status (success/failed)
- Auto-updates every 5 seconds

#### 3. Deployments
- Monitor smart contract deployments
- Full deployment list with search
- Rholang code viewer
- Deployment costs and status
- Preserved reading state during refresh

#### 4. Validators
- Track network validators
- Active validator list
- Public keys and names
- Real-time status updates

#### 5. Statistics
- Network health and performance metrics
- Total blocks and deployments
- Active validator count
- Visual block production chart

### Features

#### Wallet Balance Checker

1. Locate the "Check Wallet Balance" section at the top
2. Enter a REV address
3. Click "Check Balance" or press Enter
4. View balance in REV and dust units

#### Search Functionality

**Block Search**:
1. Navigate to the Blocks tab
2. Enter block hash or number
3. Press Enter or click Search

**Deployment Search**:
1. Go to Deployments tab
2. Enter deployment ID (signature)
3. Search results filter in real-time

#### Theme Toggle

- Click sun/moon icon in header
- Switches between light and dark themes
- Preference saved locally

### Tips and Tricks

#### Keyboard Shortcuts
- `Ctrl/Cmd + F`: Browser search within page
- `Escape`: Close expanded Rholang code
- `Enter`: Submit wallet balance check

#### Understanding the Data

**REV Amounts**:
- Displayed in REV (not dust)
- 1 REV = 100,000,000 dust
- Automatic conversion in display

**Deployment Status**:
- ✓ Success: Deployment executed successfully
- ✕ Failed: Deployment encountered errors

---

## Deployment Guide

### Development Deployment

#### Prerequisites
- Python 3.8+
- Docker (for accessing RNode containers)
- Running ASI-Chain network with `rnode.readonly` container
- Required Python packages: flask, docker, psutil, requests

#### Step-by-Step Setup

1. **Clone and Navigate**
   ```bash
   cd /path/to/asi-chain/block-explorer
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify RNode Container**
   ```bash
   docker ps | grep rnode.readonly
   ```

4. **Start Services**
   ```bash
   ./start_explorer.sh
   ```

5. **Access Explorer**
   ```
   http://localhost:8080
   ```

### Production Deployment

#### Recommended Stack
- **Web Server**: Nginx
- **WSGI Server**: Gunicorn
- **Database**: PostgreSQL (for better performance)
- **Process Manager**: systemd or supervisor
- **Monitoring**: Prometheus + Grafana

#### Systemd Services

Parser Service (`/etc/systemd/system/asi-parser.service`):
```ini
[Unit]
Description=ASI Chain Block Explorer Enhanced Parser
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=asi-explorer
WorkingDirectory=/opt/asi-explorer/block-explorer/parser
Environment="PATH=/opt/asi-explorer/block-explorer/venv/bin"
Environment="RNODE_CONTAINER_NAME=rnode.readonly"
Environment="UPDATE_INTERVAL=5"
ExecStart=/opt/asi-explorer/block-explorer/venv/bin/python enhanced_parser.py
Restart=always
RestartSec=10
StandardOutput=append:/opt/asi-explorer/block-explorer/logs/parser.log
StandardError=append:/opt/asi-explorer/block-explorer/logs/parser-error.log

[Install]
WantedBy=multi-user.target
```

#### Nginx Configuration

`/etc/nginx/sites-available/asi-explorer`:
```nginx
server {
    listen 80;
    server_name explorer.asi-chain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /opt/asi-explorer/block-explorer/web/static;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker Deployment

The block explorer includes a complete Docker setup for easy deployment:

#### Quick Start

```bash
cd block-explorer

# Build and start the explorer container
docker-compose -f docker-compose.explorer.yml up -d

# View logs
docker logs -f asi-block-explorer

# Access the explorer
# Open browser to http://localhost:5001
```

#### docker-compose.explorer.yml

```yaml
version: '3.8'

services:
  block-explorer:
    build: .
    container_name: asi-block-explorer
    ports:
      - "5001:5001"  # Web interface (Docker port:Container port)
    volumes:
      # Persistent data storage
      - ./data:/app/data
      - ./logs:/app/logs
      # Mount Docker socket to access host's Docker
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Configuration via environment variables
      - RNODE_CONTAINER_NAME=rnode.readonly
      - VALIDATOR_CONTAINER_NAME=rnode.validator1
      - DB_PATH=/app/data/asi-chain.db
      - UPDATE_INTERVAL=5
      - WEB_PORT=5001
      - EXPLORE_DEPLOY_URL=http://host.docker.internal:40453
    extra_hosts:
      # Allow access to host machine
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
```

#### Complete Reset (Stop, Clear Data, Restart)

```bash
# One-liner for quick reset:
docker-compose -f docker-compose.explorer.yml down && \
rm -f data/asi-chain.db* logs/*.log && \
docker-compose -f docker-compose.explorer.yml up -d --build
```

---

## API Reference

### Base URL
```
http://localhost:8080/api
```

### Response Format
API responses return JSON data directly without a wrapper object. Pagination information is included in paginated endpoints.

#### Success Response
```json
{
    "blocks": [...],           // Or relevant data array
    "pagination": {            // For paginated endpoints
        "page": 1,
        "per_page": 25,
        "total_count": 100,
        "total_pages": 4
    }
}
```

#### Error Response
```json
{
    "error": "Error message"
}
```

### Endpoints

#### 1. Blocks

**Get Blocks List**
```http
GET /api/blocks
```

Query Parameters:
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Results per page (default: 25, max: 100)
- `search` (string, optional): Search by block hash (partial match) or exact block number

Response:
```json
{
    "blocks": [
        {
            "block_number": 12345,
            "block_hash": "abc123...",
            "parent_hash": "def456...",
            "proposer_pub_key": "04abc...",
            "created_at": "2024-01-15T10:30:00.000000",
            "validator_count": 4,
            "deployment_count": 1
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 50,
        "total": 12345,
        "pages": 247,
        "has_next": true,
        "has_prev": false
    }
}
```

**Get Block Details**
```http
GET /api/block/<block_hash>
```

Path Parameters:
- `block_hash` (string, required): Full block hash

Response:
```json
{
    "block": {
        "block_number": 12345,
        "block_hash": "abc123...",
        "parent_hash": "def456...",
        "state_hash": "ghi789...",
        "content_hash": "jkl012...",
        "proposer_pub_key": "04abc...",
        "created_at": "2024-01-15T10:30:00.000000"
    },
    "active_validators": [
        {
            "public_key": "04abc...",
            "name": "Bootstrap"
        }
    ],
    "deployments": [
        {
            "deploy_id": "3044022...",
            "deployer": "111127RX5Zgi...",
            "term": "new x in { x!(\"Hello\") }",
            "timestamp": 1705317000000,
            "phlo_price": 1,
            "phlo_limit": 1000000,
            "phlo_cost": 50000,
            "errored": false,
            "error_message": null
        }
    ]
}
```

#### 2. REV Transfers

**Get Transfers List**
```http
GET /api/transfers
```

Query Parameters:
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Results per page (default: 25)

**Note**: Transfers are extracted from deployments by parsing Rholang terms that contain RevVault transfer patterns.

Response:
```json
{
    "transfers": [
        {
            "deploy_id": "3044022...",
            "block_hash": "abc123...",
            "block_number": 12345,
            "from_address": "111127RX5Zgi...",
            "to_address": "111128SY6Ahj...",
            "amount": 7200000000,
            "rev_amount": 72.0,
            "deployer": "111127RX5Zgi...",
            "phlo_cost": 170113,
            "errored": false,
            "error_message": null,
            "created_at": "2024-01-15T10:30:00.000000"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 10,
        "total": 156,
        "pages": 16
    }
}
```

#### 3. Deployments

**Get Deployments List**
```http
GET /api/deployments
```

Query Parameters:
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Results per page (default: 20)
- `search` (string, optional): Search by deployment ID

Response:
```json
{
    "deployments": [
        {
            "deploy_id": "3044022...",
            "block_hash": "abc123...",
            "block_number": 12345,
            "deployer": "111127RX5Zgi...",
            "term": "new x in { x!(\"Hello\") }",
            "timestamp": 1705317000000,
            "phlo_price": 1,
            "phlo_limit": 1000000,
            "phlo_cost": 50000,
            "errored": false,
            "error_message": null,
            "created_at": "2024-01-15T10:30:00.000000"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total": 5678,
        "pages": 284
    }
}
```

#### 4. Validators

**Get Active Validators**
```http
GET /api/validators
```

Response:
```json
{
    "active_validators": [
        {
            "public_key": "04ffc016579a68050d655d55df4e09f04605164543e257c8e6df10361e6068a5336588e9b355ea859c5ab4285a5ef0efdf62bc28b80320ce99e26bb1607b3ad93d",
            "name": "Bootstrap",
            "block_count": 3045,
            "last_active": "2024-01-15T10:30:00.000000"
        },
        {
            "public_key": "0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c",
            "name": "Validator 1",
            "block_count": 3044,
            "last_active": "2024-01-15T10:29:55.000000"
        }
    ],
    "total_validators": 4
}
```

#### 5. Wallet Balance

**Get Wallet Balance**
```http
GET /api/wallet/<address>
```

Path Parameters:
- `address` (string, required): REV address to check balance for

Response:
```json
{
    "address": "111127RX5ZgiAdRaQy4AWy57RdvAAckdELReEBxzvWYVvdnR32PiHA",
    "balance": {
        "dust": 50000000098906591,
        "rev": 500000000.98906591
    },
    "transactions": [
        {
            "block_hash": "abc123...",
            "block_number": 12345,
            "deploy_id": "3044022...",
            "timestamp": 1705317000000,
            "phlo_cost": 170113,
            "type": "transfer",
            "from_address": "111129p33f7vaRrpLqK8Nr35Y2aacAjrR5pd6PCzqcdrMuPHzymczH",
            "to_address": "111127RX5ZgiAdRaQy4AWy57RdvAAckdELReEBxzvWYVvdnR32PiHA",
            "amount_dust": 90000000000,
            "amount_rev": 900.0,
            "direction": "in"
        }
    ]
}
```

### Data Types

#### REV Amount Conversion
- Blockchain stores amounts in "dust" units
- 1 REV = 100,000,000 dust (10^8)
- API returns both raw `amount` and converted `rev_amount`

#### Timestamps
- Block/deployment timestamps: Unix milliseconds
- API responses: ISO 8601 format strings

---

## Implementation Details

### Core Components

#### 1. Enhanced Parser (`parser/enhanced_parser.py`)

**Key Functions**:

1. **`get_full_blocks_via_rpc(container_name, depth=10)`**
   - Executes: `docker exec <container> ./bin/rnode show-blocks --depth <depth>`
   - Parses CLI output for block metadata
   - Returns list of block dictionaries

2. **`get_block_with_deployments(container_name, block_hash)`**
   - Executes: `docker exec <container> ./bin/rnode show-block <hash>`
   - Extracts detailed block info and all deployments
   - Parses Rholang terms, signatures, phlo costs

3. **`parse_validators_from_logs(container_name, block_numbers)`**
   - Uses Docker Python API to fetch container logs
   - Searches for "ACTIVE VALIDATORS FOR StateHash" patterns
   - Maps validators to specific block numbers

4. **`store_blocks_and_validators(conn, blocks, validators_map, container_name)`**
   - Atomic database transaction
   - Stores blocks with ISO timestamp conversion
   - Creates validator records if not exist
   - Links validators to blocks via block_validators table

**Configuration**:
- `RNODE_CONTAINER_NAME = "rnode.readonly"`
- `DB_PATH = "../data/asi-chain.db"`
- `UPDATE_INTERVAL = 5` seconds
- Default depth: 25 blocks per query

#### 2. Web Application (`web/app.py`)

**Key Endpoints Implementation**:

1. **Block Operations**:
   - Paginated block list (default 25 per page, max 100)
   - Search by exact block number or partial hash match
   - Returns blocks ordered by block_number DESC

2. **Transfer Operations**:
   - Extracts REV transfers from deployment terms
   - Pattern matches: `match\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*\)`
   - Converts dust amounts to REV (1 REV = 100,000,000 dust)

3. **Wallet Balance Queries**:
   - Uses RNode's explore-deploy feature
   - Sends raw Rholang query as text/plain to port 40453
   - Query pattern:
     ```rholang
     @RevVault!("findOrCreate", "<address>", *vaultCh) |
     for (@maybeVault <- vaultCh) {
       match maybeVault {
         (true, vault) => @vault!("balance", *return)
         (false, err)  => return!(err)
       }
     }
     ```

**Hardcoded Validators**:
```python
known_validators = {
    '04ffc016579a68050d655d55df4e09f04605164543e257c8e6df10361e6068a5336588e9b355ea859c5ab4285a5ef0efdf62bc28b80320ce99e26bb1607b3ad93d': 'Bootstrap',
    '0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c': 'Validator 1',
    '04837a4cff833e3157e3135d7b40b8e1f33c6e6b5a4342b9fc784230ca4c4f9d356f258debef56ad4984726d6ab3e7709e1632ef079b4bcd653db00b68b2df065f': 'Validator 2',
    '04fa70d7be5eb750e0915c0f6d19e7085d18bb1c22d030feb2a877ca2cd226d04438aa819359c56c720142fbc66e9da03a5ab960a3d8b75363a226b7c800f60420': 'Validator 3'
}
```

#### 3. Frontend Implementation

**Single Page Application** (`web/templates/index.html`):

**State Management**:
```javascript
// Global state
let currentTab = 'blocks';
let currentPage = {blocks: 1, transfers: 1, deployments: 1};
let autoRefreshEnabled = true;
let refreshIntervals = {};

// UI preservation
const openDeploymentDetails = new Map();
const scrollPositions = new Map();
```

**Update Strategy**:
1. Check if data actually changed before DOM updates
2. Preserve scroll positions per tab
3. Maintain expanded deployment cards
4. Only update changed elements

### Data Flow Details

#### Block Data Collection
1. Timer triggers every 5 seconds
2. RPC query fetches 25 most recent blocks
3. Docker logs provide validator participation
4. For each block, fetch full deployment details
5. Store everything in atomic transaction

#### REV Transfer Extraction
1. No dedicated transfer tracking
2. On-demand extraction from deployment terms
3. Pattern matching on Rholang code
4. Amount conversion from dust to REV
5. Direction determined by comparing addresses

#### Wallet Balance Queries
1. Direct HTTP POST to readonly node
2. Content-Type must be text/plain
3. Raw Rholang code in request body
4. Parse JSON response for ExprInt data
5. Combine with transaction history from database

---

## Brand Guide

### Overview
This brand guide establishes the visual identity and design standards for the ASI-Chain Block Explorer, ensuring consistency with the broader ASI ecosystem while maintaining its unique identity.

### Color Palette

#### Primary Colors
- **ASI Green**: `#6FCF97` / `rgb(111, 207, 151)`
  - Used for primary actions, success states, and brand accent
  - Example: Balance display backgrounds, primary buttons
  
- **Dark Background**: `#1A1B23` / `rgb(26, 27, 35)`
  - Primary background color for dark theme
  - Creates high contrast for readability

- **Card Background**: `#2A2B35` / `rgb(42, 43, 53)`
  - Secondary background for cards and panels
  - Provides visual hierarchy

#### Secondary Colors
- **White**: `#FFFFFF`
  - Primary text color
  - High contrast against dark backgrounds

- **Light Gray**: `#9CA3AF` / `rgb(156, 163, 175)`
  - Secondary text, labels, and metadata
  
- **Border Gray**: `#3A3B45` / `rgb(58, 59, 69)`
  - Subtle borders and dividers

#### Accent Colors
- **Red/Coral**: `#EF4444` / `rgb(239, 68, 68)`
  - Error states, remove actions, logout buttons
  
- **Cyan/Teal**: `#06B6D4` / `rgb(6, 182, 212)`
  - Links, interactive elements, info boxes

### Typography

#### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```

#### Font Weights
- **Regular**: 400 - Body text, descriptions
- **Medium**: 500 - Subheadings, labels
- **Semibold**: 600 - Headers, important text
- **Bold**: 700 - Primary headers, CTAs

#### Font Sizes
- **Large Header**: 24px - Page titles
- **Header**: 20px - Section headers
- **Subheader**: 16px - Card titles
- **Body**: 14px - Regular text
- **Small**: 12px - Metadata, timestamps
- **Mono**: 13px - Hashes, addresses (monospace font)

### Layout Principles

#### Container Structure
- **Max Width**: 1200px for main container
- **Padding**: 2rem (32px) on desktop, 1rem (16px) on mobile
- **Card Padding**: 1.5rem (24px)
- **Border Radius**: 8px for cards and containers

#### Spacing System
- **Base Unit**: 8px
- **Spacing Scale**: 
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px

### Component Standards

#### Cards
```css
background: #2A2B35;
border-radius: 8px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
padding: 24px;
```

#### Buttons

**Primary Button**
```css
background: #6FCF97;
color: #1A1B23;
border-radius: 6px;
padding: 12px 24px;
font-weight: 600;
```

**Secondary Button**
```css
background: transparent;
border: 1px solid #3A3B45;
color: #FFFFFF;
```

### Data Display

#### Hash Display
- **Font**: Monospace (SFMono-Regular, Consolas, Liberation Mono)
- **Size**: 13px
- **Color**: `#06B6D4` for links
- **Truncation**: Show first 20 chars + "..." for space-constrained areas
- **Full Display**: 600px max-width for full hashes

#### Balance Display
- **Background**: Linear gradient with ASI Green
- **Font Size**: 32px
- **Font Weight**: 700
- **Text Color**: `#1A1B23` (dark on light background)

### Animation & Transitions

#### Standard Transitions
```css
transition: all 0.2s ease-in-out;
```

#### Hover Effects
- **Buttons**: Slight brightness increase (10%)
- **Cards**: Subtle shadow increase
- **Links**: Underline on hover

### Accessibility

#### Color Contrast
- **AA Standard**: Minimum 4.5:1 for normal text
- **AAA Standard**: 7:1 for important text
- **Focus Indicators**: 2px solid outline with ASI Green

#### Interactive Elements
- **Minimum Touch Target**: 44x44px
- **Focus States**: Visible keyboard navigation
- **ARIA Labels**: Descriptive labels for screen readers

---

## Brand Implementation

### Overview
This document details the implementation of the ASI-Chain brand guide on the block explorer's web interface.

### Changes Applied

#### 1. Color Scheme Implementation
- **Primary Color (ASI Green)**: `#6FCF97` - Used for block numbers, links on hover, and focus states
- **Dark Background**: `#1A1B23` - Applied as the main background color
- **Card Background**: `#2A2B35` - Used for all content cards and tables
- **Accent Colors**: Cyan links (`#06B6D4`), error states (`#EF4444`)

#### 2. Typography Updates
- System font stack for consistency across platforms
- Proper font weights: 400 (regular), 600 (semibold), 700 (bold)
- Font sizes: 24px (h1), 20px (h2), 14px (body), 12px (small text)
- Monospace font for hashes and technical data

#### 3. Component Styling
- **Cards**: 8px border radius, subtle shadow, 24px padding
- **Tables**: Clean design with hover states using ASI green overlay
- **Loading States**: Animated spinner using ASI green
- **Error Messages**: Styled with error red background and border

#### 4. Responsive Design
- Three breakpoints: Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)
- Hash truncation on mobile devices
- Reduced padding and font sizes for mobile
- Maintained readability across all screen sizes

#### 5. Accessibility Features
- Skip-to-main-content link for keyboard navigation
- Proper focus indicators with ASI green outline
- ARIA-compliant markup
- Color contrast meeting WCAG AA standards
- Semantic HTML structure

#### 6. UI Enhancements
- **Loading States**: Professional loading spinner during data fetch
- **Error Handling**: Clear error messages with proper styling
- **Relative Time**: Human-readable timestamps ("2 minutes ago")
- **Validator Names**: Known validators displayed with friendly names
- **Hover Effects**: Full hash display on hover

#### 7. Brand Assets
- Custom SVG favicon featuring ASI green diamond shape
- Footer with GitHub link
- Consistent brand messaging

### File Changes

#### CSS (`/web/static/style.css`)
- Complete rewrite using CSS custom properties
- Organized into logical sections
- Added utility classes for common patterns
- Implemented responsive breakpoints

#### HTML Templates
- `/web/templates/index.html` - Enhanced with cards, loading states, and accessibility
- `/web/templates/block_detail.html` - Redesigned with better data presentation

#### JavaScript Updates
- Added loading state management
- Implemented relative time formatting
- Enhanced error handling
- Added validator name mapping

---

## ASI Wallet v2 Brand Implementation

### Overview
This document details the implementation of the ASI Wallet v2 design system on the ASI-Chain Block Explorer, ensuring complete visual consistency with the wallet application.

### Color Palette Implementation

#### Primary Colors (From ASI Wallet v2)
- **ASI Lime**: `#93E27C` - Primary brand color for CTAs, success states, and highlights
- **ASI Lime Dark**: `#82C96D` - Hover state for primary elements
- **ASI Pulse Blue**: `#33E4FF` - Secondary accent for links and info states
- **ASI Pulse Blue Dark**: `#00B8D4` - Hover state for secondary elements

#### Core Surface Colors
- **Deep Space**: `#0D1012` - Main background (matching wallet exactly)
- **Charcoal 700**: `#1B1F21` - Card and surface backgrounds
- **Charcoal 500**: `#272B2E` - Input backgrounds and borders

#### Text Hierarchy
- **Off-White**: `#F7F9FA` - Primary text
- **Secondary**: `#b8b8b8` - Secondary labels
- **Tertiary**: `#757575` - Muted text and timestamps

#### Status Colors
- **Alert Red**: `#FF4D4F` - Errors and critical states
- **Warning Orange**: `#FFB84D` - Warning messages
- **Success**: Uses ASI Lime `#93E27C`

### Typography System

#### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

#### Type Scale (ASI Wallet v2)
- **H1**: 3rem (48px) - 700 weight
- **H2**: 2.25rem (36px) - 600 weight  
- **H3**: 1.75rem (28px) - 600 weight
- **Body**: 16px - 400 weight
- **Small**: 14px - 400 weight
- **Monospace**: Fira Mono, 13px - 500 weight

### Component Styling

#### Cards (asi-card)
- Background: `#1B1F21` (Charcoal 700)
- Border: 1px solid `#272B2E`
- Border Radius: 8px
- Padding: 24px
- Shadow: `0 1px 4px rgba(0, 0, 0, 0.32)`

#### Glass Morphism Cards
- Background: `rgba(27, 31, 33, 0.7)`
- Backdrop Filter: blur(20px)
- Border: 1px solid `rgba(255, 255, 255, 0.1)`

#### Navigation Tabs
- Active Tab: ASI Lime text with bottom border
- Inactive: Secondary text color
- Hover: Transition to Off-White

#### Buttons
- **Primary**: ASI Lime background, Deep Space text
- **Secondary**: Transparent with ASI Lime border
- **Danger**: Alert Red background
- All buttons: 8px border radius, 500 font weight

#### Tables
- Header Background: `#272B2E` (Charcoal 500)
- Row Hover: `rgba(147, 226, 124, 0.05)` (5% ASI Lime)
- Border: `#272B2E`
- Cell Padding: 16px

#### Form Elements
- Background: `#272B2E` (Charcoal 500)
- Focus Background: `#1B1F21` (Charcoal 700)
- Focus Border: ASI Lime
- Border Radius: 8px
- Padding: 12px 16px

### UI Patterns

#### Loading States
- Spinner: ASI Lime with cubic-bezier animation
- Drop Shadow: `rgba(147, 226, 124, 0.4)`

#### Status Indicators
- Success: ASI Lime with "✓"
- Error: Alert Red with "✕"
- Connected: Green dot "●"

#### Hash Display
- Font: Fira Mono
- Color: ASI Pulse Blue for links
- Hover: Reveal full hash with word-break

### Layout Structure

#### Header
- Logo/Title left aligned
- Network status right aligned
- Navigation tabs below with active indicator

#### Summary Cards
- Grid layout with glass morphism effect
- Key metrics displayed prominently
- Responsive grid: `repeat(auto-fit, minmax(250px, 1fr))`

#### Data Tables
- Clean headers with uppercase labels
- Alternating hover states
- Status column for block finalization

#### Footer
- Centered text with muted color
- GitHub link in ASI Lime

### Animations

#### Transitions
- Standard: `all 0.2s ease`
- Hover lift: `translateY(-2px)`
- Active press: `translateY(0)`

#### Loading Animation
```css
animation: spin 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
```

#### Fade In
```css
animation: fadeIn 0.3s ease-out;
```

### Responsive Design

#### Breakpoints
- Mobile: < 768px (14px base font)
- Desktop: ≥ 768px (16px base font)

#### Mobile Adjustments
- Reduced padding
- Smaller typography scale
- Hash truncation at 150px
- Stacked summary cards

### Accessibility

#### Focus States
- 2px solid ASI Lime outline
- 2px offset
- 4px border radius

#### Skip Links
- ASI Lime background
- Hidden until focused
- Proper ARIA labels

#### Color Contrast
- All text meets WCAG AA standards
- Primary text on dark: 15.7:1
- Secondary text on dark: 7.5:1

### Implementation Notes

1. **Exact Color Match**: All colors imported directly from ASI Wallet v2 theme.ts
2. **Component Consistency**: Card styles, buttons, and inputs match wallet exactly
3. **Typography**: Inter font from Google Fonts for brand consistency
4. **Spacing System**: Uses same spacing variables as wallet
5. **Glass Effects**: Implemented for summary cards matching wallet style

### File Structure
```
/web/static/
├── style.css         # Complete ASI Wallet v2 styles
├── favicon.svg       # ASI branded icon
/web/templates/
├── index.html        # Updated with wallet UI patterns
├── block_detail.html # Matching detail page design
```

---

## Theme Implementation

### Overview
The ASI-Chain Block Explorer now supports both light and dark themes, with dark mode as the default to match the ASI Wallet v2 branding.

### Features
- **Dark Mode (Default)**: Deep space background with ASI Lime accents
- **Light Mode**: ASI Wallet v2 style with off-white background and adjusted brand colors
- **Persistent Theme**: User preference saved in localStorage
- **Smooth Transitions**: Animated theme switching for better UX
- **Accessible Toggle**: Clear sun/moon icons with proper ARIA labels

### Implementation Details

#### CSS Variables
Theme colors are defined using CSS custom properties that change based on the `data-theme` attribute:

```css
/* Dark Mode (Default) */
:root {
    --asi-lime: #93E27C;
    --deep-space: #0D1012;
    --charcoal-700: #1B1F21;
    --off-white: #F7F9FA;
    /* ... */
}

/* Light Mode - ASI Wallet v2 Style */
[data-theme="light"] {
    --asi-lime: #5A9C4F;          /* Darker green for contrast */
    --deep-space: #F7F9FA;        /* Off-white background */
    --charcoal-700: #FFFFFF;      /* Pure white for cards */
    --off-white: #0D1012;         /* Deep space for text */
    /* ... */
}
```

#### JavaScript Theme Management
```javascript
// Initialize theme on page load
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Toggle between themes
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}
```

#### Theme Toggle Button
Located in the header next to the network status:
- Shows moon icon (🌙) in dark mode
- Shows sun icon (☀️) in light mode
- Smooth hover effects with ASI Lime accent

### Browser Support
- All modern browsers with CSS custom properties support
- localStorage for theme persistence
- Graceful fallback to dark mode if localStorage unavailable

### Color Adjustments

#### Light Mode Specific Changes (ASI Wallet v2 Style):
1. **Backgrounds**: 
   - Main: #F7F9FA (off-white)
   - Cards: #FFFFFF (pure white)
   - Inputs: #F0F2F3 (light grey)
2. **Brand Colors**:
   - ASI Lime: #5A9C4F (darker green for contrast)
   - ASI Pulse Blue: #00A3CC (darker blue)
3. **Text**: 
   - Primary: #0D1012 (deep space)
   - Secondary: #5a5a5a (medium grey)
   - Tertiary: #757575 (light grey)
4. **Shadows**: Subtle elevation (0 2px 8px rgba(0,0,0,0.06))
5. **Borders**: #E0E4E6 (light grey)
6. **Hover States**: Light green tint with #5A9C4F accents

#### Maintained Brand Elements:
- ASI brand colors adapted for optimal contrast
- Font stack and sizing consistent
- Glass morphism effects adjusted for light backgrounds
- Gradient patterns for buttons in light mode

### Usage
Users can toggle between themes by clicking the theme button in the header. The preference is automatically saved and applied on subsequent visits.

### Future Enhancements
1. System preference detection (`prefers-color-scheme`)
2. More granular theme customization options
3. High contrast mode for accessibility
4. Theme transition animations for all elements

---

## Reset Explorer Guide

This guide provides the steps to completely clear the block explorer's database. This is useful when you have performed a new deployment of the ASI-Chain and want the explorer to re-scan the blockchain from the beginning.

**Prerequisites:**
- The ASI-Chain RNode containers should be running for the parser to collect data
- If containers are not running, start them with: `docker-compose -f node/docker/docker-compose.integrated.yml up -d`

**Note:** These commands should be run from the root of the `asi-chain` workspace.

### Step 1: Stop the Running Services

Before deleting the database, you must stop the parser and web server to prevent file locking issues.

```bash
# This command finds and stops the Python processes for the parser and web app
pkill -f "enhanced_parser.py" && pkill -f "app.py"
```

Wait a few seconds after running this command to ensure the processes have terminated.

### Step 2: Delete the Database Files

The block explorer may have database files in two different locations. The following command will remove them.

```bash
# Remove the main database and any journal files
rm -f block-explorer/data/asi-chain.db block-explorer/data/asi-chain.db-journal block-explorer/parser/asi-chain.db
```
The `-f` flag will prevent errors if a file does not exist.

### Step 3: (Optional) Clear Log Files

For a completely clean slate, you can also remove all log files generated by the explorer components.

```bash
# This command removes all .log files from the explorer directories
rm -f block-explorer/*.log block-explorer/data/*.log block-explorer/parser/*.log block-explorer/web/*.log
```

### Step 4: Restart the Block Explorer

Once the databases and logs are cleared, you can restart the explorer. The parser will automatically create a new, empty database and begin populating it with data from your new deployment.

```bash
# Run the startup script
./block-explorer/start_explorer.sh
```

After a few moments, the parser will start ingesting the new blocks, and the web interface will become available at http://localhost:8080. You can check the status by running:

```bash
./block-explorer/check_status.sh
```

**Note:** The parser will create the necessary database tables automatically when it first runs. If you encounter any issues, check the logs in `block-explorer/parser/enhanced_parser.log` and `block-explorer/web/web.log`.

### Verification

After running the reset process:

1. **Check service status**: The `check_status.sh` script will show:
   - Parser and web app processes running
   - Empty database (no blocks yet if RNode containers are not running)
   - Web interface accessible at http://localhost:8080

2. **If RNode containers are not running**: 
   - The parser will run but won't find any data to collect
   - Start the blockchain with: `docker-compose -f node/docker/docker-compose.integrated.yml up -d`
   - The parser will automatically begin collecting blocks once containers are running

3. **Database location**: A fresh database is created at `block-explorer/data/asi-chain.db`

---

## Known Issues and Recent Fixes

### Recently Fixed Issues

#### Wallet Balance Check SQL Error (Fixed in v1.1.0)
**Issue**: The "Check Wallet Balance" feature was broken with SQL error `no such column: d.timestamp`  
**Cause**: Database schema mismatch between Docker and local versions  
**Fix**: Updated SQL queries in both `app.py` and `docker_app.py` to use correct column names  
**Resolution Date**: July 2025  

**Details**: The Docker version uses a different database schema with columns:
- `created_at` instead of `timestamp`
- `cost` instead of `phlo_cost`
- `errors` instead of `errored`

Both versions now correctly map these columns to maintain API compatibility.

#### Deployment ID Truncation (Fixed in v1.1.1)
**Issue**: Deployment IDs in the Docker version were showing truncated values like `deployer_timestamp` instead of full cryptographic signatures  
**Cause**: Docker parser was generating artificial IDs instead of extracting the actual deployment signatures  
**Fix**: Updated `docker_enhanced_parser.py` to parse the `sig:` field from blockchain data  
**Resolution Date**: July 2025  

**Details**: 
- Added parsing for the `sig:` field in deployment data
- Now uses actual blockchain signatures as deployment IDs
- Maintains fallback to generated IDs with warning if signature not found
- Deployment IDs now match between Docker and local versions

### Current Limitations

1. **Schema Incompatibility**: Docker and local versions use different database schemas and cannot share databases
2. **Memory Leak**: Deploy storage is never garbage collected, requiring periodic restarts
3. **Transaction Gossip**: Broken - must deploy directly to validators

---

## Summary

The ASI-Chain Block Explorer is a comprehensive blockchain monitoring solution designed specifically for the ASI-Chain ecosystem. It combines:

- **Real-time data collection** through RPC queries and log parsing
- **RESTful API** for programmatic access
- **Modern web interface** with ASI Wallet v2 branding
- **Docker support** for easy deployment
- **Hardcoded validator mapping** for consistent UI behavior
- **Theme support** with dark and light modes
- **Comprehensive documentation** for users and developers

The system is designed to be reliable, performant, and user-friendly, providing essential blockchain insights while maintaining the ASI brand identity throughout the user experience.