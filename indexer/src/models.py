"""Database models for the indexer."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, UniqueConstraint, create_engine
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()


class Block(Base):
    """Block model representing blockchain blocks."""
    
    __tablename__ = "blocks"
    
    block_number = Column(BigInteger, primary_key=True, index=True)
    block_hash = Column(String(64), unique=True, nullable=False, index=True)
    parent_hash = Column(String(64), nullable=False)
    timestamp = Column(BigInteger, nullable=False, index=True)
    proposer = Column(String(160), nullable=False, index=True)  # Increased size
    state_hash = Column(String(64))
    state_root_hash = Column(String(64))  # New field
    pre_state_hash = Column(String(64))  # New field
    finalization_status = Column(String(20), default="finalized")  # New field
    bonds_map = Column(JSONB)  # New field for storing bonds as JSON
    justifications = Column(JSONB)  # New field for storing justifications
    fault_tolerance = Column(Numeric(5, 4))  # New field
    seq_num = Column(Integer)
    sig = Column(String(140))
    sig_algorithm = Column(String(20))
    shard_id = Column(String(20))
    extra_bytes = Column(Text)
    version = Column(Integer)
    deployment_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    deployments = relationship("Deployment", back_populates="block", cascade="all, delete-orphan", foreign_keys="[Deployment.block_hash]")
    validator_bonds = relationship("ValidatorBond", back_populates="block", cascade="all, delete-orphan", foreign_keys="[ValidatorBond.block_hash]")
    
    __table_args__ = (
        Index("idx_blocks_timestamp", "timestamp"),
        Index("idx_blocks_proposer", "proposer"),
    )


class Deployment(Base):
    """Deployment model for smart contract deployments."""
    
    __tablename__ = "deployments"
    
    deploy_id = Column(String(160), primary_key=True)  # Increased size
    block_hash = Column(String(64), ForeignKey("blocks.block_hash"), nullable=False, index=True)
    block_number = Column(BigInteger, ForeignKey("blocks.block_number"), nullable=False, index=True)
    deployer = Column(String(160), nullable=False, index=True)  # Increased size
    term = Column(Text, nullable=False)  # Full Rholang code
    timestamp = Column(BigInteger, nullable=False, index=True)
    sig = Column(String(160), nullable=False)  # Increased size
    sig_algorithm = Column(String(20), default="secp256k1")
    phlo_price = Column(BigInteger, default=1)
    phlo_limit = Column(BigInteger, default=1000000)
    phlo_cost = Column(BigInteger, default=0)
    valid_after_block_number = Column(BigInteger)
    errored = Column(Boolean, default=False, index=True)
    error_message = Column(Text)
    deployment_type = Column(String(50), index=True)  # New field
    seq_num = Column(Integer)  # New field
    shard_id = Column(String(20))  # New field
    status = Column(String(20), default="included", index=True)  # New field
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    block = relationship("Block", back_populates="deployments", foreign_keys=[block_hash])
    transfers = relationship("Transfer", back_populates="deployment", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_deployments_deployer", "deployer"),
        Index("idx_deployments_timestamp", "timestamp"),
        Index("idx_deployments_errored", "errored"),
    )


class Transfer(Base):
    """Transfer model for REV token transfers."""
    
    __tablename__ = "transfers"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    deploy_id = Column(String(140), ForeignKey("deployments.deploy_id"), nullable=False, index=True)
    block_number = Column(BigInteger, ForeignKey("blocks.block_number"), nullable=False, index=True)
    from_address = Column(String(150), nullable=False, index=True)  # Support validator public keys
    to_address = Column(String(150), nullable=False, index=True)    # Support validator public keys
    amount_dust = Column(BigInteger, nullable=False)
    amount_rev = Column(Numeric(20, 8), nullable=False)
    status = Column(String(20), default="success", index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    deployment = relationship("Deployment", back_populates="transfers")
    
    __table_args__ = (
        Index("idx_transfers_from", "from_address"),
        Index("idx_transfers_to", "to_address"),
        Index("idx_transfers_block", "block_number"),
        Index("idx_transfers_created", "created_at"),
    )


class Validator(Base):
    """Validator model for network validators."""
    
    __tablename__ = "validators"
    
    public_key = Column(String(130), primary_key=True)
    name = Column(String(50))
    total_stake = Column(BigInteger, default=0)
    first_seen_block = Column(BigInteger)
    last_seen_block = Column(BigInteger)
    status = Column(String(20), default="bonded", index=True)  # New field: active/bonded/quarantine/inactive
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bonds = relationship("ValidatorBond", back_populates="validator")


class ValidatorBond(Base):
    """Validator bond model for tracking validator stakes per block."""
    
    __tablename__ = "validator_bonds"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    block_hash = Column(String(64), ForeignKey("blocks.block_hash"), nullable=False)
    block_number = Column(BigInteger, ForeignKey("blocks.block_number"), nullable=False)
    validator_public_key = Column(String(130), ForeignKey("validators.public_key"), nullable=False)
    stake = Column(BigInteger, nullable=False)
    
    # Relationships
    block = relationship("Block", back_populates="validator_bonds", foreign_keys=[block_hash])
    validator = relationship("Validator", back_populates="bonds")
    
    __table_args__ = (
        UniqueConstraint("block_hash", "validator_public_key", name="uq_block_validator"),
        Index("idx_validator_bonds_block", "block_number"),
        Index("idx_validator_bonds_validator", "validator_public_key"),
    )


class BlockValidator(Base):
    """Junction table for block-validator relationships."""
    
    __tablename__ = "block_validators"
    
    block_hash = Column(String(64), ForeignKey("blocks.block_hash", ondelete="CASCADE"), primary_key=True)
    validator_public_key = Column(String(160), primary_key=True)
    
    # Relationships
    block = relationship("Block", backref="block_validators")


class IndexerState(Base):
    """Indexer state for tracking sync progress."""
    
    __tablename__ = "indexer_state"
    
    key = Column(String(50), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Common keys:
    # - last_indexed_block: Last successfully indexed block number
    # - last_sync_time: Last successful sync timestamp
    # - indexer_version: Current indexer version
    # - chain_id: Chain identifier


class BalanceState(Base):
    """Track bonded vs unbonded balances for addresses."""
    
    __tablename__ = "balance_states"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    address = Column(String(150), nullable=False)  # Support both REV addresses and validator public keys
    block_number = Column(BigInteger, ForeignKey("blocks.block_number", ondelete="CASCADE"), nullable=False)
    unbonded_balance_dust = Column(BigInteger, nullable=False, default=0)
    unbonded_balance_rev = Column(Numeric(20, 8), nullable=False, default=0)
    bonded_balance_dust = Column(BigInteger, nullable=False, default=0)
    bonded_balance_rev = Column(Numeric(20, 8), nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    block = relationship("Block", backref="balance_states")
    
    __table_args__ = (
        UniqueConstraint("address", "block_number", name="uq_balance_address_block"),
        Index("idx_balance_states_address", "address"),
        Index("idx_balance_states_block", "block_number", postgresql_using="btree"),
        Index("idx_balance_states_updated", "updated_at", postgresql_using="btree"),
    )
    
    @property
    def total_balance_dust(self):
        """Calculate total balance in dust."""
        return self.unbonded_balance_dust + self.bonded_balance_dust
    
    @property
    def total_balance_rev(self):
        """Calculate total balance in REV."""
        return self.unbonded_balance_rev + self.bonded_balance_rev


class EpochTransition(Base):
    """Track epoch transitions and validator set changes."""
    
    __tablename__ = "epoch_transitions"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    epoch_number = Column(BigInteger, unique=True, nullable=False, index=True)
    start_block = Column(BigInteger, nullable=False, index=True)
    end_block = Column(BigInteger, nullable=False, index=True)
    active_validators = Column(Integer, nullable=False)
    quarantine_length = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index("idx_epoch_blocks", "start_block", "end_block"),
    )


class NetworkStats(Base):
    """Network statistics captured at specific blocks."""
    
    __tablename__ = "network_stats"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    block_number = Column(BigInteger, nullable=False, index=True)
    total_validators = Column(Integer, nullable=False)
    active_validators = Column(Integer, nullable=False)
    validators_in_quarantine = Column(Integer, default=0)
    consensus_participation = Column(Numeric(5, 2), nullable=False)  # Percentage
    consensus_status = Column(String(20), nullable=False)  # healthy/degraded/critical
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        Index("idx_network_stats_timestamp", "timestamp"),
    )