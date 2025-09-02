"""Configuration management for the indexer."""

from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # RChain Node Configuration
    node_url: str = Field(
        default="http://localhost:40453",
        description="RChain node HTTP API endpoint"
    )
    node_timeout: int = Field(
        default=30,
        description="HTTP request timeout in seconds"
    )
    
    # Rust CLI Configuration
    rust_cli_path: Optional[str] = Field(
        default=None,
        description="Path to Rust CLI executable (node_cli)"
    )
    node_host: str = Field(
        default="localhost",
        description="Node hostname for Rust CLI"
    )
    grpc_port: int = Field(
        default=40412,
        description="gRPC port for blockchain operations"
    )
    http_port: int = Field(
        default=40413,
        description="HTTP port for status queries"
    )
    
    # Database Configuration
    database_url: str = Field(
        default="postgresql://indexer:indexer_pass@localhost:5432/asichain",
        description="PostgreSQL connection URL"
    )
    database_pool_size: int = Field(
        default=20,
        description="Database connection pool size"
    )
    database_pool_timeout: int = Field(
        default=10,
        description="Database pool timeout in seconds"
    )
    
    # Sync Configuration
    sync_interval: int = Field(
        default=5,
        description="Seconds between sync cycles"
    )
    batch_size: int = Field(
        default=100,
        description="Number of blocks to process per batch"
    )
    start_from_block: int = Field(
        default=0,
        description="Block number to start syncing from"
    )
    
    # Monitoring
    monitoring_port: int = Field(
        default=9090,
        description="Port for metrics and health endpoints"
    )
    health_check_interval: int = Field(
        default=60,
        description="Health check interval in seconds"
    )
    
    # Logging
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )
    log_format: str = Field(
        default="json",
        description="Log format (json or text)"
    )
    
    # Feature Flags
    enable_rev_transfer_extraction: bool = Field(
        default=True,
        description="Enable REV transfer extraction from deployments"
    )
    enable_metrics: bool = Field(
        default=True,
        description="Enable Prometheus metrics"
    )
    enable_health_check: bool = Field(
        default=True,
        description="Enable health check endpoint"
    )
    
    # Hasura Configuration (optional, not used by indexer but may be in env)
    hasura_admin_secret: Optional[str] = Field(
        default=None,
        description="Hasura admin secret (not used by indexer)"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()