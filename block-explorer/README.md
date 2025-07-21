# ASI-Chain Block Explorer

A modern, real-time blockchain explorer for the ASI-Chain network, providing comprehensive insights into blocks, transactions, validators, and network statistics.

## 🚀 Features

- **Real-time Updates**: Auto-refreshing data with 5-second intervals
- **Block Exploration**: Detailed block information including validators and deployments
- **REV Transfer Tracking**: Monitor REV token movements across the network
- **Wallet Balance Checker**: Check any REV address balance using RNode explore-deploy
- **Smart Contract Viewer**: Full Rholang code visibility with syntax preservation
- **Validator Monitoring**: Track active validators and their block production
- **Network Statistics**: Visual representation of network health and performance
- **Modern UI**: Responsive design with dark/light theme support
- **Advanced Search**: Find blocks, deployments, and transactions quickly
- **Docker Support**: Run the explorer in an isolated container

## 📋 Prerequisites

- Docker and Docker Compose
- Running ASI-Chain network with accessible RNode containers
- Python 3.8+ (for local development only)

## 🛠️ Quick Start

### Option 1: Docker Deployment (Recommended)

#### 1. Navigate to the Block Explorer Directory
```bash
cd /path/to/asi-chain/block-explorer
```

#### 2. Start the Dockerized Explorer
```bash
# Build and start the block explorer container
docker-compose -f docker-compose.explorer.yml up -d

# Check logs
docker logs -f asi-block-explorer
```

#### 3. Access the Explorer
Open your browser and navigate to: `http://localhost:5001`

#### 4. Stop the Explorer
```bash
docker-compose -f docker-compose.explorer.yml down
```

#### 5. Reset Explorer (Clear All Data)
```bash
# Stop the container
docker-compose -f docker-compose.explorer.yml down

# Clear database and logs
rm -f data/asi-chain.db data/asi-chain.db-journal
rm -f logs/*.log

# Rebuild and start fresh
docker-compose -f docker-compose.explorer.yml up -d --build

# One-liner for quick reset:
docker-compose -f docker-compose.explorer.yml down && rm -f data/asi-chain.db* logs/*.log && docker-compose -f docker-compose.explorer.yml up -d --build
```

### Option 2: Local Development

#### 1. Install Dependencies
```bash
# Install required Python packages
pip install -r requirements.txt
```

#### 2. Start the Services

**Using the Start Script (Recommended):**
```bash
./start_explorer.sh
```

**Manual Start:**

Terminal 1 - Start the Parser:
```bash
cd parser
python enhanced_parser.py
```

Terminal 2 - Start the Web Server:
```bash
cd web
python app.py
```

#### 3. Access the Explorer
Open your browser and navigate to: `http://localhost:8080` (local) or `http://localhost:5001` (Docker)

#### 4. Stop the Explorer (Local)
```bash
# Kill the parser
ps aux | grep enhanced_parser.py | grep -v grep | awk '{print $2}' | xargs kill -9

# Kill the web server
ps aux | grep "python.*app.py" | grep -v grep | awk '{print $2}' | xargs kill -9
```

#### 5. Reset Explorer (Clear All Data - Local)
```bash
# Stop running processes (see step 4)

# Clear database and logs
rm -f data/asi-chain.db data/asi-chain.db-journal
rm -f parser/*.log web/*.log

# Start fresh
./start_explorer.sh
```

## 📚 Documentation

Comprehensive documentation is available in the [ASI Chain docs](../docs/):

- **[Complete Block Explorer Documentation](../docs/block-explorer/COMPLETE_DOCUMENTATION.md)** - All documentation in one place
- **[Quick Reference](../docs/BLOCK_EXPLORER.md)** - Overview and key features

## 📁 Directory Structure

```
block-explorer/
├── README.md                    # This file
├── Dockerfile                   # Docker container definition
├── docker-compose.explorer.yml  # Docker Compose configuration
├── docker-entrypoint.sh        # Docker startup script
├── requirements.txt            # Python dependencies
├── start_explorer.sh           # Automated startup script (local)
├── check_status.sh            # Service status checker
├── monitor_services.py        # Real-time service monitor
├── parser/
│   ├── enhanced_parser.py     # Main blockchain data parser
│   ├── docker_enhanced_parser.py # Docker-aware parser (with deployment extraction)
│   └── enhanced_parser.log    # Parser logs
├── web/
│   ├── app.py                # Flask web server (local)
│   ├── docker_app.py         # Flask web server (Docker) - handles API endpoints
│   ├── static/               # Static assets
│   │   ├── style.css         # Main stylesheet
│   │   ├── asi-icon.png      # ASI icon
│   │   ├── asi_logo.jpg      # ASI logo
│   │   └── favicon*.svg      # Various favicon designs
│   ├── templates/            # HTML templates
│   │   ├── index.html        # Main explorer page
│   │   └── block_detail.html # Block detail view
│   └── web.log              # Web server logs
├── data/
│   ├── asi-chain.db         # Main SQLite database
│   ├── REV_TRANSFER_TRACKING.md # REV transfer documentation
│   └── extract_rev_transfers.py # REV transfer extraction utility
└── logs/                    # Log directory (Docker)
    ├── enhanced_parser.log  # Parser logs
    └── webapp.log          # Web application logs
```

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ASI-Chain     │────▶│  Enhanced Parser │────▶│     SQLite      │
│   RNode         │     │    (Python)      │     │    Database     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Browser   │◀────│  Flask Server    │◀────│   REST API      │
│   (Frontend)    │     │    (Python)      │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 🔧 Configuration

### Docker Configuration (docker-compose.explorer.yml)
| Variable | Default | Description |
|----------|---------|-------------|
| `RNODE_CONTAINER_NAME` | `rnode.readonly` | RNode container to query |
| `VALIDATOR_CONTAINER_NAME` | `rnode.validator1` | Validator container for bonds info |
| `DB_PATH` | `/app/data/asi-chain.db` | SQLite database location |
| `UPDATE_INTERVAL` | `5` | Parser update frequency (seconds) |
| `WEB_PORT` | `5001` | Web server port |
| `EXPLORE_DEPLOY_URL` | `http://host.docker.internal:40453` | RNode API endpoint |

### Local Development Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `RNODE_CONTAINER_NAME` | `rnode.readonly` | Docker container to query |
| `UPDATE_INTERVAL` | `5` | Parser update frequency (seconds) |
| `DB_PATH` | `asi-chain.db` | SQLite database location |
| `PORT` | `8080` | Web server port (local) |
| `AUTO_REFRESH_INTERVAL` | `5000` | Auto-refresh interval (milliseconds) |

## 🌟 Key Features Explained

### Smart Contract Viewing
- Click "View Rholang Code" to see smart contract source
- Code formatting preserved with proper indentation
- Scroll position maintained during auto-refresh
- Syntax highlighting for better readability

### REV Transfer Tracking
- Automatic conversion from dust to REV (1 REV = 10^8 dust)
- Real-time transfer monitoring
- From/To address tracking
- Accurate success/failure status indicators (fixed in latest version)
- Parses transfer details from Rholang deployment terms

### Wallet Balance Checker
- Enter any REV address to check its current balance
- Direct integration with RNode explore-deploy API
- Shows balance in both REV and dust units
- Handles non-existent wallets gracefully
- Fast query using read-only node connection

### Network Statistics
- Live block production graph
- Active validator count
- Total blocks and deployments
- 30-second historical view

## 🐛 Troubleshooting

### Docker Deployment Issues

#### Container Not Starting
```bash
# Check container status
docker ps -a | grep asi-block-explorer

# View container logs
docker logs asi-block-explorer

# Restart the container
docker-compose -f docker-compose.explorer.yml restart
```

#### Parser Not Finding Blocks
```bash
# Check if ASI Chain nodes are running
docker ps | grep rnode

# Verify RNode accessibility from inside container
docker exec asi-block-explorer python -c "import docker; print(docker.from_env().containers.list())"

# Check parser logs
docker exec asi-block-explorer tail -f /app/logs/enhanced_parser.log
```

#### Database Corruption
```bash
# Stop the container
docker-compose -f docker-compose.explorer.yml down

# Remove corrupted database
rm data/asi-chain.db data/asi-chain.db-journal

# Restart container (database will be recreated)
docker-compose -f docker-compose.explorer.yml up -d
```

### Local Development Issues

#### Parser Not Finding Blocks
```bash
# Check if Docker containers are running
docker ps

# Verify RNode accessibility
docker exec rnode.readonly /opt/docker/bin/rnode show-blocks

# Check parser logs
tail -f parser/enhanced_parser.log
```

#### Web Server Issues
```bash
# Check web app logs
tail -f web/web.log

# Verify database exists
ls data/asi-chain.db

# Check database content
sqlite3 data/asi-chain.db "SELECT COUNT(*) FROM blocks;"
```

#### Port Already in Use
```bash
# For Docker (port 5001)
lsof -i :5001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# For local development (port 8080)
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or change port in docker-compose.explorer.yml or web/app.py
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| "database disk image is malformed" | Remove database files and restart |
| "Container rnode.readonly not found" | Ensure ASI Chain nodes are running |
| "No output from show-blocks command" | Check node container names match configuration |
| "Failed to load blocks" | Check parser is running and database is accessible |
| "Failed to load transfers/deployments" | Database schema mismatch - rebuild container |
| REV transfers showing as "Failed" incorrectly | Fixed in latest version - rebuild container |

## 🔍 Monitoring Services

The block explorer includes a monitoring script to check service health:

```bash
# Check current status
./check_status.sh

# Monitor services in real-time
python monitor_services.py
```

The monitor displays:
- Parser status and last update time
- Web server health
- Database size and record counts
- Recent blocks and deployments

## 📝 Additional Scripts

### REV Transfer Analysis
```bash
cd data
python extract_rev_transfers.py
```

This script extracts and analyzes REV transfers from the blockchain data.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the ASI-Chain ecosystem.

## 🙏 Acknowledgments

- ASI-Chain team for the blockchain infrastructure
- Flask community for the excellent web framework
- All contributors and testers

## 📞 Support

For issues or questions:
- Check the [Complete Documentation](../docs/block-explorer/COMPLETE_DOCUMENTATION.md)
- Review [Quick Reference](../docs/BLOCK_EXPLORER.md)
- Open an issue in the repository

---

Built with ❤️ for the ASI-Chain community