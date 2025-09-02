"""Monitoring and health check endpoints."""

from datetime import datetime
from typing import Dict, Any, List
from decimal import Decimal
import json

from aiohttp import web
from prometheus_client import Counter, Gauge, Histogram, generate_latest, REGISTRY
import structlog

from src.config import settings
from src.database import db
from src.rust_cli_client import RustCLIClient

logger = structlog.get_logger(__name__)

# Prometheus metrics
blocks_indexed = Counter(
    "indexer_blocks_indexed_total",
    "Total number of blocks indexed"
)

deployments_indexed = Counter(
    "indexer_deployments_indexed_total",
    "Total number of deployments indexed"
)

transfers_extracted = Counter(
    "indexer_transfers_extracted_total",
    "Total number of REV transfers extracted"
)

sync_lag = Gauge(
    "indexer_sync_lag_blocks",
    "Number of blocks behind the chain head"
)

last_block_height = Gauge(
    "indexer_last_block_height",
    "Last indexed block height"
)

sync_duration = Histogram(
    "indexer_sync_duration_seconds",
    "Time taken to sync a batch of blocks",
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60]
)

node_request_duration = Histogram(
    "indexer_node_request_duration_seconds",
    "Time taken for RChain node API requests",
    buckets=[0.1, 0.25, 0.5, 1, 2, 5]
)


class MonitoringServer:
    """HTTP server for monitoring endpoints."""
    
    def __init__(self, indexer):
        self.indexer = indexer
        self.app = web.Application()
        self._setup_routes()
    
    def _json_response(self, data, status=200):
        """Create a JSON response with custom serialization."""
        def default_serializer(obj):
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            elif isinstance(obj, Decimal):
                return float(obj)
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        return web.Response(
            text=json.dumps(data, default=default_serializer),
            content_type='application/json',
            status=status
        )
    
    def _serialize_result(self, data):
        """Convert database results to JSON-serializable format."""        
        if isinstance(data, list):
            return [self._serialize_result(item) for item in data]
        elif isinstance(data, dict):
            result = {}
            for key, value in data.items():
                if hasattr(value, 'isoformat'):
                    result[key] = value.isoformat()
                elif isinstance(value, Decimal):
                    result[key] = float(value)
                elif isinstance(value, (dict, list)):
                    result[key] = self._serialize_result(value)
                else:
                    result[key] = value
            return result
        elif isinstance(data, Decimal):
            return float(data)
        else:
            return data
    
    def _setup_routes(self):
        """Setup HTTP routes."""
        # Health and monitoring
        self.app.router.add_get("/health", self.health_check)
        self.app.router.add_get("/readiness", self.readiness_check)
        self.app.router.add_get("/ready", self.readiness_check)  # Alias for compatibility
        self.app.router.add_get("/metrics", self.metrics)
        self.app.router.add_get("/status", self.status)
        
        # Data access endpoints
        self.app.router.add_get("/api/blocks", self.get_blocks)
        self.app.router.add_get("/api/blocks/search", self.search_blocks)  # Must come before parameterized route
        self.app.router.add_get("/api/blocks/{block_number}", self.get_block)
        self.app.router.add_get("/api/deployments", self.get_deployments)
        self.app.router.add_get("/api/deployments/search", self.search_deployments)  # Must come before parameterized route
        self.app.router.add_get("/api/deployments/{deploy_id}", self.get_deployment)
        self.app.router.add_get("/api/transfers", self.get_transfers)
        self.app.router.add_get("/api/validators", self.get_validators)
        self.app.router.add_get("/api/stats/network", self.get_network_stats)
        self.app.router.add_get("/api/address/{address}/transfers", self.get_address_transfers)
    
    async def health_check(self, request):
        """Basic health check endpoint."""
        return web.json_response({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        })
    
    async def readiness_check(self, request):
        """Readiness check - verifies all dependencies are available."""
        checks = {
            "database": False,
            "rchain_node": False
        }
        
        # Check database
        try:
            await db.execute_raw("SELECT 1")
            checks["database"] = True
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
        
        # Check Rust CLI
        try:
            client = RustCLIClient()
            # Try to get last finalized block as health check
            last_block = await client.get_last_finalized_block()
            checks["rust_cli"] = last_block is not None
            checks["rchain_node"] = last_block is not None
        except Exception as e:
            logger.error("Rust CLI health check failed", error=str(e))
            checks["rust_cli"] = False
            checks["rchain_node"] = False
        
        # Overall status
        all_healthy = all(checks.values())
        status_code = 200 if all_healthy else 503
        
        return web.json_response({
            "ready": all_healthy,
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }, status=status_code)
    
    async def metrics(self, request):
        """Prometheus metrics endpoint."""
        try:
            # Update dynamic metrics
            await self._update_metrics()
            
            # Generate Prometheus format
            metrics_data = generate_latest(REGISTRY)
            return web.Response(
                body=metrics_data,
                content_type="text/plain; version=0.0.4",
                charset="utf-8"
            )
        except Exception as e:
            logger.error("Failed to generate metrics", error=str(e))
            return web.Response(
                text=f"# Error generating metrics: {str(e)}\n",
                content_type="text/plain",
                status=500
            )
    
    async def status(self, request):
        """Detailed status endpoint."""
        status_data = await self._get_status()
        return web.json_response(status_data)
    
    async def _update_metrics(self):
        """Update dynamic metrics values."""
        try:
            # Get last indexed block
            last_indexed = await db.get_last_indexed_block()
            last_block_height.set(last_indexed)
            
            # Get chain height and calculate lag
            client = RustCLIClient()
            last_finalized = await client.get_last_finalized_block()
            if last_finalized and "blockNumber" in last_finalized:
                latest_block = last_finalized["blockNumber"]
                lag = max(0, latest_block - last_indexed)
                sync_lag.set(lag)
        except Exception as e:
            logger.error("Failed to update metrics", error=str(e))
    
    async def _get_status(self) -> Dict[str, Any]:
        """Get detailed indexer status."""
        try:
            # Database stats
            db_stats = await db.execute_raw("""
                SELECT 
                    (SELECT COUNT(*) FROM blocks) as total_blocks,
                    (SELECT COUNT(*) FROM deployments) as total_deployments,
                    (SELECT COUNT(*) FROM transfers) as total_transfers,
                    (SELECT COUNT(*) FROM validators) as total_validators,
                    (SELECT value FROM indexer_state WHERE key = 'last_indexed_block') as last_indexed_block,
                    (SELECT updated_at FROM indexer_state WHERE key = 'last_indexed_block') as last_sync_time
            """)
            
            stats = dict(db_stats[0]) if db_stats else {}
            
            # Node status
            node_status = {}
            try:
                client = RustCLIClient()
                last_finalized = await client.get_last_finalized_block()
                if last_finalized:
                    node_status = {
                        "connected": True,
                        "latest_block": last_finalized.get("blockNumber")
                    }
                else:
                    node_status = {"connected": False}
            except Exception:
                node_status = {"connected": False}
            
            # Calculate sync status
            last_indexed = int(stats.get("last_indexed_block", 0))
            latest_block = node_status.get("latest_block", 0)
            
            return {
                "indexer": {
                    "version": "2.0.0",
                    "indexer_type": "rust_cli",
                    "running": self.indexer.running if self.indexer else False,
                    "last_indexed_block": last_indexed,
                    "last_sync_time": stats.get("last_sync_time").isoformat() if stats.get("last_sync_time") else None,
                    "sync_lag": max(0, latest_block - last_indexed) if latest_block else None,
                    "sync_percentage": (last_indexed / latest_block * 100) if latest_block else 0,
                    "syncing_from_genesis": True
                },
                "database": {
                    "total_blocks": stats.get("total_blocks", 0),
                    "total_deployments": stats.get("total_deployments", 0),
                    "total_transfers": stats.get("total_transfers", 0),
                    "total_validators": stats.get("total_validators", 0)
                },
                "config": {
                    "sync_interval": settings.sync_interval,
                    "batch_size": settings.batch_size,
                    "start_from_block": settings.start_from_block
                },
                "cli": {
                    "binary_path": settings.rust_cli_path,
                    "node_host": settings.node_host,
                    "grpc_port": settings.grpc_port,
                    "http_port": settings.http_port
                },
                "node": {
                    "connected": node_status.get("connected", False),
                    "host": settings.node_host,
                    "grpc_port": settings.grpc_port,
                    "http_port": settings.http_port,
                    "latest_block": node_status.get("latest_block")
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error("Failed to get status", error=str(e))
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_blocks(self, request):
        """Get list of blocks with pagination."""
        try:
            # Get query parameters
            page = int(request.query.get('page', 1))
            limit = min(int(request.query.get('limit', 20)), 100)  # Max 100 per page
            offset = (page - 1) * limit
            
            # Query blocks
            query = """
                SELECT block_number, block_hash, timestamp, proposer, deployment_count
                FROM blocks
                ORDER BY block_number DESC
                LIMIT $1 OFFSET $2
            """
            blocks = await db.execute_raw(query, limit, offset)
            
            # Get total count
            count_result = await db.execute_raw("SELECT COUNT(*) as count FROM blocks")
            total = count_result[0]['count'] if count_result else 0
            
            return web.json_response({
                "blocks": self._serialize_result([dict(b) for b in blocks]),
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            })
        except Exception as e:
            logger.error("Failed to get blocks", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def get_block(self, request):
        """Get block details by number."""
        try:
            block_number = int(request.match_info['block_number'])
            
            # Get block
            query = "SELECT * FROM blocks WHERE block_number = $1"
            result = await db.execute_raw(query, block_number)
            if not result:
                return web.json_response({"error": "Block not found"}, status=404)
            
            block = dict(result[0])
            
            # Get deployments for this block
            deploy_query = """
                SELECT deploy_id, deployer, timestamp, errored, error_message
                FROM deployments
                WHERE block_number = $1
                ORDER BY timestamp
            """
            deployments = await db.execute_raw(deploy_query, block_number)
            block['deployments'] = [dict(d) for d in deployments]
            
            # Get validator bonds for this block
            bonds_query = """
                SELECT vb.validator_public_key, vb.stake, v.name
                FROM validator_bonds vb
                JOIN validators v ON vb.validator_public_key = v.public_key
                WHERE vb.block_number = $1
            """
            bonds = await db.execute_raw(bonds_query, block_number)
            block['bonds'] = [dict(b) for b in bonds]
            
            return web.json_response(self._serialize_result(block))
        except ValueError:
            return web.json_response({"error": "Invalid block number"}, status=400)
        except Exception as e:
            logger.error("Failed to get block", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def get_deployments(self, request):
        """Get list of deployments with pagination."""
        try:
            # Get query parameters
            page = int(request.query.get('page', 1))
            limit = min(int(request.query.get('limit', 20)), 100)
            offset = (page - 1) * limit
            deployer = request.query.get('deployer')
            errored = request.query.get('errored')
            
            # Build query
            query = """
                SELECT d.deploy_id, d.deployer, d.timestamp, d.block_number, 
                       d.errored, d.error_message, b.block_hash
                FROM deployments d
                JOIN blocks b ON d.block_number = b.block_number
            """
            params = []
            where_clauses = []
            
            if deployer:
                where_clauses.append(f"d.deployer = ${len(params) + 1}")
                params.append(deployer)
            
            if errored is not None:
                where_clauses.append(f"d.errored = ${len(params) + 1}")
                params.append(errored.lower() == 'true')
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
            
            query += f" ORDER BY d.timestamp DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
            params.extend([limit, offset])
            
            deployments = await db.execute_raw(query, *params)
            
            # Get total count
            count_query = "SELECT COUNT(*) as count FROM deployments d"
            if where_clauses:
                count_query += " WHERE " + " AND ".join(where_clauses)
            count_result = await db.execute_raw(count_query, *params[:-2] if params else [])
            total = count_result[0]['count'] if count_result else 0
            
            return web.json_response({
                "deployments": self._serialize_result([dict(d) for d in deployments]),
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            })
        except Exception as e:
            logger.error("Failed to get deployments", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def get_deployment(self, request):
        """Get deployment details by ID."""
        try:
            deploy_id = request.match_info['deploy_id']
            
            # Get deployment with full details
            query = """
                SELECT d.*, b.block_hash
                FROM deployments d
                JOIN blocks b ON d.block_number = b.block_number
                WHERE d.deploy_id = $1
            """
            result = await db.execute_raw(query, deploy_id)
            if not result:
                return web.json_response({"error": "Deployment not found"}, status=404)
            
            deployment = dict(result[0])
            
            # Get any transfers from this deployment
            transfer_query = """
                SELECT * FROM transfers
                WHERE deploy_id = $1
            """
            transfers = await db.execute_raw(transfer_query, deploy_id)
            deployment['transfers'] = [dict(t) for t in transfers]
            
            return web.json_response(self._serialize_result(deployment))
        except Exception as e:
            logger.error("Failed to get deployment", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def get_transfers(self, request):
        """Get list of REV transfers with pagination."""
        try:
            # Get query parameters
            page = int(request.query.get('page', 1))
            limit = min(int(request.query.get('limit', 20)), 100)
            offset = (page - 1) * limit
            from_address = request.query.get('from')
            to_address = request.query.get('to')
            
            # Build query
            query = """
                SELECT 
                    t.id, t.deploy_id, t.block_number, t.from_address, t.to_address,
                    t.amount_dust, t.amount_rev::FLOAT as amount_rev, t.status, t.created_at,
                    d.timestamp
                FROM transfers t
                JOIN deployments d ON t.deploy_id = d.deploy_id
            """
            params = []
            where_clauses = []
            
            if from_address:
                where_clauses.append(f"t.from_address = ${len(params) + 1}")
                params.append(from_address)
            
            if to_address:
                where_clauses.append(f"t.to_address = ${len(params) + 1}")
                params.append(to_address)
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
            
            query += f" ORDER BY d.timestamp DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
            params.extend([limit, offset])
            
            transfers = await db.execute_raw(query, *params)
            
            # Get total count
            count_query = "SELECT COUNT(*) as count FROM transfers t"
            if where_clauses:
                count_query += " WHERE " + " AND ".join(where_clauses)
            count_result = await db.execute_raw(count_query, *params[:-2] if params else [])
            total = count_result[0]['count'] if count_result else 0
            
            return web.json_response({
                "transfers": self._serialize_result([dict(t) for t in transfers]),
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            })
        except Exception as e:
            logger.error("Failed to get transfers", error=str(e))
            return self._json_response({"error": str(e)}, status=500)
    
    async def get_validators(self, request):
        """Get list of validators."""
        try:
            query = """
                SELECT * FROM validators
                ORDER BY total_stake DESC
            """
            validators = await db.execute_raw(query)
            
            return web.json_response({
                "validators": self._serialize_result([dict(v) for v in validators])
            })
        except Exception as e:
            logger.error("Failed to get validators", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def search_blocks(self, request):
        """Search blocks by hash (partial match)."""
        try:
            search_term = request.query.get('q', '').strip()
            if not search_term:
                return web.json_response({"error": "Search term required"}, status=400)
            
            page = int(request.query.get('page', 1))
            limit = min(int(request.query.get('limit', 20)), 100)
            offset = (page - 1) * limit
            
            # Search by partial hash
            query = """
                SELECT block_number, block_hash, timestamp, proposer, deployment_count
                FROM blocks
                WHERE block_hash LIKE $1
                ORDER BY block_number DESC
                LIMIT $2 OFFSET $3
            """
            blocks = await db.execute_raw(query, f"{search_term}%", limit, offset)
            
            # Get count
            count_query = "SELECT COUNT(*) as count FROM blocks WHERE block_hash LIKE $1"
            count_result = await db.execute_raw(count_query, f"{search_term}%")
            total = count_result[0]['count'] if count_result else 0
            
            return web.json_response({
                "blocks": self._serialize_result([dict(b) for b in blocks]),
                "search_term": search_term,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit if limit else 0
                }
            })
        except Exception as e:
            logger.error("Failed to search blocks", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def search_deployments(self, request):
        """Search deployments by deploy ID or deployer."""
        try:
            search_term = request.query.get('q', '').strip()
            if not search_term:
                return web.json_response({"error": "Search term required"}, status=400)
            
            page = int(request.query.get('page', 1))
            limit = min(int(request.query.get('limit', 20)), 100)
            offset = (page - 1) * limit
            
            # Search by deploy ID or deployer
            query = """
                SELECT d.*, d.deployment_type
                FROM deployments d
                WHERE d.deploy_id LIKE $1 OR d.deployer LIKE $1
                ORDER BY d.timestamp DESC
                LIMIT $2 OFFSET $3
            """
            deployments = await db.execute_raw(query, f"%{search_term}%", limit, offset)
            
            # Get count
            count_query = """
                SELECT COUNT(*) as count FROM deployments 
                WHERE deploy_id LIKE $1 OR deployer LIKE $1
            """
            count_result = await db.execute_raw(count_query, f"%{search_term}%")
            total = count_result[0]['count'] if count_result else 0
            
            return web.json_response({
                "deployments": self._serialize_result([dict(d) for d in deployments]),
                "search_term": search_term,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit if limit else 0
                }
            })
        except Exception as e:
            logger.error("Failed to search deployments", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def get_network_stats(self, request):
        """Get network statistics."""
        try:
            # Get basic stats from the view
            stats_query = """
                SELECT 
                    total_blocks,
                    avg_block_time_seconds,
                    earliest_block_time,
                    latest_block_time
                FROM network_stats
            """
            stats_result = await db.execute_raw(stats_query)
            
            if not stats_result:
                return web.json_response({
                    "error": "No statistics available",
                    "total_blocks": 0
                })
            
            stats = dict(stats_result[0])
            
            # Calculate additional metrics
            avg_block_time = float(stats.get('avg_block_time_seconds') or 0)
            if avg_block_time > 0:
                blocks_per_hour = 3600 / avg_block_time
                blocks_per_day = 86400 / avg_block_time
            else:
                blocks_per_hour = 0
                blocks_per_day = 0
            
            # Get validator stats
            validator_query = """
                SELECT 
                    COUNT(DISTINCT v.public_key) as validator_count,
                    MAX(v.block_count) as max_blocks_by_validator
                FROM (
                    SELECT proposer as public_key, COUNT(*) as block_count
                    FROM blocks
                    GROUP BY proposer
                ) v
            """
            validator_result = await db.execute_raw(validator_query)
            validator_stats = dict(validator_result[0]) if validator_result else {}
            
            # Get deployment type distribution
            deployment_query = """
                SELECT deployment_type, COUNT(*) as count
                FROM deployments
                WHERE deployment_type IS NOT NULL
                GROUP BY deployment_type
                ORDER BY count DESC
            """
            deployment_types = await db.execute_raw(deployment_query)
            
            return web.json_response({
                "network": {
                    "total_blocks": stats.get('total_blocks', 0),
                    "avg_block_time_seconds": avg_block_time,
                    "blocks_per_hour": round(blocks_per_hour, 2),
                    "blocks_per_day": round(blocks_per_day, 2),
                    "earliest_block_time": stats.get('earliest_block_time'),
                    "latest_block_time": stats.get('latest_block_time')
                },
                "validators": {
                    "total": validator_stats.get('validator_count', 0),
                    "max_blocks_by_single_validator": validator_stats.get('max_blocks_by_validator', 0)
                },
                "deployments": {
                    "by_type": [dict(d) for d in deployment_types]
                },
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error("Failed to get network stats", error=str(e))
            return web.json_response({"error": str(e)}, status=500)
    
    async def get_address_transfers(self, request):
        """Get transfers for a specific address."""
        try:
            address = request.match_info['address']
            page = int(request.query.get('page', 1))
            limit = min(int(request.query.get('limit', 20)), 100)
            offset = (page - 1) * limit
            
            # Get transfers where address is sender or receiver
            query = """
                SELECT 
                    id, deploy_id, block_number, from_address, to_address,
                    amount_dust, amount_rev::FLOAT as amount_rev, status, created_at
                FROM transfers
                WHERE from_address = $1 OR to_address = $1
                ORDER BY block_number DESC
                LIMIT $2 OFFSET $3
            """
            transfers = await db.execute_raw(query, address, limit, offset)
            
            # Get count
            count_query = """
                SELECT COUNT(*) as count FROM transfers
                WHERE from_address = $1 OR to_address = $1
            """
            count_result = await db.execute_raw(count_query, address)
            total = count_result[0]['count'] if count_result else 0
            
            return web.json_response({
                "address": address,
                "transfers": self._serialize_result([dict(t) for t in transfers]),
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit if limit else 0
                }
            })
        except Exception as e:
            logger.error("Failed to get address transfers", error=str(e))
            return self._json_response({"error": str(e)}, status=500)
    
    async def start(self):
        """Start the monitoring server."""
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", settings.monitoring_port)
        await site.start()
        
        logger.info(
            "Monitoring server started",
            port=settings.monitoring_port,
            endpoints=["/health", "/readiness", "/metrics", "/status", 
                       "/api/blocks", "/api/blocks/search", "/api/deployments", "/api/deployments/search",
                       "/api/transfers", "/api/validators", "/api/stats/network", "/api/address/{address}/transfers"]
        )