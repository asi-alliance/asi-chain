import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from './AnimatePresenceWrapper';
import { useQuery, useLazyQuery } from '@apollo/client';
import { 
  Search, 
  Filter, 
  Eye, 
  ExternalLink, 
  Copy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Activity,
  Hash,
  User,
  Layers,
  Zap,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'react-toastify';
import { Transfer, Deployment, Block } from '../types';
import { gql } from '@apollo/client';

// Enhanced GraphQL queries for transaction tracking
const GET_RECENT_TRANSACTIONS = gql`
  query GetRecentTransactions($limit: Int = 20) {
    deployments(limit: $limit, order_by: { timestamp: desc }) {
      deploy_id
      deployer
      term
      timestamp
      deployment_type
      phlo_cost
      phlo_price
      phlo_limit
      status
      block_number
      block_hash
      errored
      error_message
      created_at
    }
    transfers(limit: $limit, order_by: { created_at: desc }) {
      id
      deploy_id
      from_address
      to_address
      amount_rev
      amount_dust
      status
      block_number
      created_at
    }
  }
`;

const TRACK_TRANSACTION = gql`
  query TrackTransaction($deployId: String!) {
    deployments(where: { deploy_id: { _eq: $deployId } }) {
      deploy_id
      deployer
      term
      timestamp
      deployment_type
      phlo_cost
      phlo_price
      phlo_limit
      status
      block_number
      block_hash
      errored
      error_message
      created_at
      transfers {
        id
        from_address
        to_address
        amount_rev
        amount_dust
        status
        created_at
      }
    }
  }
`;

const SEARCH_TRANSACTIONS = gql`
  query SearchTransactions(
    $deployId: String,
    $deployer: String,
    $fromAddress: String,
    $toAddress: String,
    $blockNumber: bigint,
    $startDate: timestamptz,
    $endDate: timestamptz,
    $status: String,
    $limit: Int = 20,
    $offset: Int = 0
  ) {
    deployments(
      where: {
        _or: [
          { deploy_id: { _ilike: $deployId } }
          { deployer: { _ilike: $deployer } }
        ]
      }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      deploy_id
      deployer
      term
      timestamp
      deployment_type
      phlo_cost
      phlo_price
      phlo_limit
      status
      block_number
      block_hash
      errored
      error_message
      created_at
      transfers {
        id
        from_address
        to_address
        amount_rev
        status
      }
    }
    
    transfers(
      where: {
        _and: [
          { from_address: { _ilike: $fromAddress } }
          { to_address: { _ilike: $toAddress } }
          { block_number: { _eq: $blockNumber } }
          { created_at: { _gte: $startDate } }
          { created_at: { _lte: $endDate } }
          { status: { _ilike: $status } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      deploy_id
      from_address
      to_address
      amount_rev
      amount_dust
      status
      block_number
      created_at
      deployment {
        deploy_id
        deployer
        deployment_type
        phlo_cost
        errored
      }
      block {
        block_number
        timestamp
        proposer
      }
    }
  }
`;

const GET_TRANSACTION_STATS = gql`
  query GetTransactionStats($timeRange: timestamptz) {
    deployments(where: { timestamp: { _gte: $timeRange } }, limit: 1000) {
      phlo_cost
      errored
    }
    transfers(where: { created_at: { _gte: $timeRange } }, limit: 1000) {
      amount_rev
      status
    }
  }
`;

interface TransactionFilters {
  deployId: string;
  deployer: string;
  fromAddress: string;
  toAddress: string;
  blockNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  type: 'all' | 'deployments' | 'transfers';
}

interface TransactionTrackerProps {
  initialSearch?: string;
  embedded?: boolean;
  onTransactionSelect?: (transaction: any) => void;
}

// Helper functions to safely parse timestamps
const parseTimestamp = (timestamp: any): number => {
  if (!timestamp) return Date.now();
  
  // If it's already a number
  if (typeof timestamp === 'number') {
    // Check if it's in seconds (< 10 digits) or milliseconds
    return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  }
  
  // If it's a string
  if (typeof timestamp === 'string') {
    // Try parsing as number first (epoch timestamp)
    const parsed = parseInt(timestamp);
    if (!isNaN(parsed)) {
      // Check if it's in seconds or milliseconds
      return parsed < 10000000000 ? parsed * 1000 : parsed;
    }
    
    // Try parsing as date string
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  
  // Fallback to current time
  return Date.now();
};

const formatTimestamp = (timestamp: any): string => {
  try {
    const time = parseTimestamp(timestamp);
    const date = new Date(time);
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Unknown time';
  }
};

const TransactionTracker: React.FC<TransactionTrackerProps> = ({
  initialSearch = '',
  embedded = false,
  onTransactionSelect
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResults, setTrackingResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  
  const [filters, setFilters] = useState<TransactionFilters>({
    deployId: '',
    deployer: '',
    fromAddress: '',
    toAddress: '',
    blockNumber: '',
    startDate: '',
    endDate: '',
    status: '',
    type: 'all'
  });

  // const closeFilters = () => {
  //   setShowFilters(false);
  // }

  // useEffect(() => {
  //   if (showFilters) {
  //     document.addEventListener('click', closeFilters);
  //   }

  //   return () => document.removeEventListener('click', closeFilters);
  // }, [showFilters])

  // Initial data query
  const { data: initialData, loading: initialLoading } = useQuery(GET_RECENT_TRANSACTIONS, {
    variables: { limit: 20 },
    pollInterval: 5000 // Poll every 5 seconds
  });

  // Lazy queries for search and tracking
  const [trackTransaction, { data: trackData, loading: trackLoading }] = useLazyQuery(TRACK_TRANSACTION);
  const [searchTransactions, { data: searchData, loading: searchLoading }] = useLazyQuery(SEARCH_TRANSACTIONS);

  // Get transaction statistics
  const { data: statsData } = useQuery(GET_TRANSACTION_STATS, {
    variables: {
      timeRange: (() => {
        const now = new Date();
        switch (timeRange) {
          case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
          case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
          case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
      })()
    },
    pollInterval: 30000 // Poll every 30 seconds
  });

  // Process search results or initial data
  const searchResults = useMemo(() => {
    // Use searchData if available, otherwise use initialData
    const dataSource = searchData || initialData;
    if (!dataSource) return [];
    
    const results: any[] = [];
    
    // Add deployments
    if (filters.type === 'all' || filters.type === 'deployments') {
      dataSource.deployments?.forEach((deployment: any) => {
        results.push({
          ...deployment,
          type: 'deployment',
          id: deployment.deploy_id,
          title: `Deployment by ${deployment.deployer.slice(0, 8)}...`,
          description: deployment.deployment_type || 'Unknown type',
          timestamp: parseTimestamp(deployment.timestamp),
          status: deployment.errored ? 'failed' : 'success'
        });
      });
    }
    
    // Add transfers
    if (filters.type === 'all' || filters.type === 'transfers') {
      dataSource.transfers?.forEach((transfer: any) => {
        results.push({
          ...transfer,
          type: 'transfer',
          title: `${transfer.amount_rev} REV Transfer`,
          description: `From ${transfer.from_address.slice(0, 8)}... to ${transfer.to_address.slice(0, 8)}...`,
          timestamp: parseTimestamp(transfer.created_at)
        });
      });
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }, [searchData, initialData, filters.type]);

  // Transaction statistics
  const transactionStats = useMemo(() => {
    if (!statsData) return null;
    
    const deployments = statsData.deployments || [];
    const transfers = statsData.transfers || [];
    
    const totalDeployments = deployments.length;
    const successfulDeployments = deployments.filter((d: any) => !d.errored).length;
    const totalTransfers = transfers.length;
    const successfulTransfers = transfers.filter((t: any) => t.status === 'success').length;
    
    const totalPhlo = deployments.reduce((sum: number, d: any) => sum + (parseFloat(d.phlo_cost) || 0), 0);
    const avgPhloCost = totalDeployments > 0 ? totalPhlo / totalDeployments : 0;
    
    const totalRevTransferred = transfers.reduce((sum: number, t: any) => sum + (parseFloat(t.amount_rev) || 0), 0);
    const avgTransferAmount = totalTransfers > 0 ? totalRevTransferred / totalTransfers : 0;
    
    return {
      totalDeployments,
      successfulDeployments,
      deploymentSuccessRate: totalDeployments > 0 ? (successfulDeployments / totalDeployments) * 100 : 0,
      totalTransfers,
      successfulTransfers,
      transferSuccessRate: totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0,
      avgPhloCost,
      totalPhlo,
      totalRevTransferred,
      avgTransferAmount
    };
  }, [statsData]);

  // Handle transaction tracking
  const handleTrackTransaction = async (txId: string) => {
    if (!txId.trim()) return;
    
    setIsTracking(true);
    try {
      await trackTransaction({ variables: { deployId: txId } });
    } catch (error) {
      console.error('Error tracking transaction:', error);
      toast.error('Failed to track transaction');
    } finally {
      setIsTracking(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    const searchVariables: any = {
      limit: 20,
      offset: (currentPage - 1) * 20
    };
    
    // Add non-empty filters
    if (filters.deployId) searchVariables.deployId = `%${filters.deployId}%`;
    if (filters.deployer) searchVariables.deployer = `%${filters.deployer}%`;
    if (filters.fromAddress) searchVariables.fromAddress = `%${filters.fromAddress}%`;
    if (filters.toAddress) searchVariables.toAddress = `%${filters.toAddress}%`;
    if (filters.blockNumber) searchVariables.blockNumber = parseInt(filters.blockNumber);
    if (filters.startDate) searchVariables.startDate = filters.startDate;
    if (filters.endDate) searchVariables.endDate = filters.endDate;
    if (filters.status) searchVariables.status = `%${filters.status}%`;
    
    // If there's a simple search query, use it for deploy_id or address search
    if (searchQuery.trim()) {
      searchVariables.deployId = `%${searchQuery}%`;
      searchVariables.deployer = `%${searchQuery}%`;
      searchVariables.fromAddress = `%${searchQuery}%`;
      searchVariables.toAddress = `%${searchQuery}%`;
    }
    
    await searchTransactions({ variables: searchVariables });
  };

  // Update tracking results when track data changes
  useEffect(() => {
    if (trackData?.deployments) {
      setTrackingResults(trackData.deployments);
    }
  }, [trackData]);

  // Auto-search when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.values(filters).some(value => value) || searchQuery.trim()) {
        handleSearch();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters, searchQuery, currentPage]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status: string, errored?: boolean) => {
    if (errored) return <XCircle size={16} style={{ color: '#ef4444' }} />;
    
    switch (status) {
      case 'success':
        return <CheckCircle size={16} style={{ color: '#10b981' }} />;
      case 'pending':
        return <Clock size={16} style={{ color: '#f59e0b' }} />;
      case 'failed':
        return <XCircle size={16} style={{ color: '#ef4444' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#9ca3af' }} />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deployment':
        return <FileText size={16} style={{ color: '#f59e0b' }} />;
      case 'transfer':
        return <TrendingUp size={16} style={{ color: '#3b82f6' }} />;
      default:
        return <Activity size={16} style={{ color: '#9ca3af' }} />;
    }
  };

  const exportResults = (format: 'csv' | 'json') => {
    const data = searchResults.map(result => ({
      type: result.type,
      id: result.id,
      title: result.title,
      description: result.description,
      status: result.status,
      timestamp: new Date(result.timestamp).toISOString(),
      ...result
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Simple CSV export
      const headers = ['Type', 'ID', 'Title', 'Status', 'Timestamp'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => [
          row.type,
          row.id,
          `"${row.title}"`,
          row.status,
          row.timestamp
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={embedded ? '' : 'asi-card'}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        borderBottom: embedded ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: embedded ? '0' : '1rem'
      }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Transaction Tracker</h2>
          <p style={{ margin: 0, color: '#9ca3af' }}>
            Search, track, and monitor ASI Chain transactions in real-time
          </p>
        </div>
        
        {!embedded && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '0.5rem 1rem',
                  border: timeRange === range ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  backgroundColor: timeRange === range ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  color: timeRange === range ? '#10b981' : '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {transactionStats && !embedded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div className="asi-card glass">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FileText size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Deployments</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {transactionStats.totalDeployments}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
              {transactionStats.deploymentSuccessRate.toFixed(1)}% success rate
            </div>
          </div>

          <div className="asi-card glass">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={16} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Transfers</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {transactionStats.totalTransfers}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
              {transactionStats.transferSuccessRate.toFixed(1)}% success rate
            </div>
          </div>

          <div className="asi-card glass">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap size={16} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Avg Phlo Cost</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {Math.round(transactionStats.avgPhloCost).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Total: {Math.round(transactionStats.totalPhlo).toLocaleString()}
            </div>
          </div>

          <div className="asi-card glass">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Activity size={16} style={{ color: '#06b6d4' }} />
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>REV Volume</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {transactionStats.totalRevTransferred.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Avg: {transactionStats.avgTransferAmount.toFixed(4)} REV
            </div>
          </div>
        </div>
      )}

      {/* Search and Track Controls */}
      <div style={{ marginBottom: '2rem' }}>
        {/* Quick Track Input */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Enter transaction/deployment ID to track..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrackTransaction(searchQuery)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#fff'
              }}
            />
            <button
              onClick={() => handleTrackTransaction(searchQuery)}
              disabled={isTracking || trackLoading || !searchQuery.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500'
              }}
            >
              {isTracking || trackLoading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Track
            </button>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              backgroundColor: showFilters ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Filter size={16} />
            Advanced Filters
          </button>

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => exportResults('json')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Download size={14} />
                JSON
              </button>
              <button
                onClick={() => exportResults('csv')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Download size={14} />
                CSV
              </button>
            </div>
          )}
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="deployments">Deployments</option>
                    <option value="transfers">Transfers</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    Deploy ID
                  </label>
                  <input
                    type="text"
                    value={filters.deployId}
                    onChange={(e) => setFilters(prev => ({ ...prev, deployId: e.target.value }))}
                    placeholder="Deployment ID..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    Deployer
                  </label>
                  <input
                    type="text"
                    value={filters.deployer}
                    onChange={(e) => setFilters(prev => ({ ...prev, deployer: e.target.value }))}
                    placeholder="Deployer address..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    From Address
                  </label>
                  <input
                    type="text"
                    value={filters.fromAddress}
                    onChange={(e) => setFilters(prev => ({ ...prev, fromAddress: e.target.value }))}
                    placeholder="From address..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    To Address
                  </label>
                  <input
                    type="text"
                    value={filters.toAddress}
                    onChange={(e) => setFilters(prev => ({ ...prev, toAddress: e.target.value }))}
                    placeholder="To address..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    Block Number
                  </label>
                  <input
                    type="number"
                    value={filters.blockNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, blockNumber: e.target.value }))}
                    placeholder="Block number..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setFilters({
                    deployId: '',
                    deployer: '',
                    fromAddress: '',
                    toAddress: '',
                    blockNumber: '',
                    startDate: '',
                    endDate: '',
                    status: '',
                    type: 'all'
                  })}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
                <button
                  onClick={handleSearch}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tracking Results */}
      {trackingResults.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#10b981' }}>
            Tracking Results ({trackingResults.length})
          </h3>
          {trackingResults.map((result, index) => (
            <motion.div
              key={result.deploy_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="asi-card glass"
              style={{ marginBottom: '1rem' }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    {getTypeIcon('deployment')}
                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                      Deployment
                    </span>
                    {getStatusIcon(result.status, result.errored)}
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem' }}>
                    <strong>ID:</strong> 
                    <code style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                      {result.deploy_id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(result.deploy_id)}
                      style={{
                        marginLeft: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer'
                      }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem' }}>
                    <strong>Deployer:</strong> 
                    <code style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                      {result.deployer}
                    </code>
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem' }}>
                    <strong>Block:</strong> #{result.block_number} • 
                    <strong style={{ marginLeft: '0.5rem' }}>Phlo Cost:</strong> {result.phlo_cost?.toLocaleString() || 'N/A'} • 
                    <strong style={{ marginLeft: '0.5rem' }}>Type:</strong> {result.deployment_type || 'Unknown'}
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                    {formatTimestamp(result.timestamp)}
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedTransaction(result)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#10b981',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Eye size={14} />
                  Details
                </button>
              </div>
              
              {/* Transfers in this deployment */}
              {result.transfers?.length > 0 && (
                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1rem'
                }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#3b82f6' }}>
                    Transfers ({result.transfers.length})
                  </h4>
                  {result.transfers.map((transfer: any, idx: number) => (
                    <div key={transfer.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '6px',
                      marginBottom: idx < result.transfers.length - 1 ? '0.5rem' : '0'
                    }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>{transfer.amount_rev} REV</span>
                        <span style={{ margin: '0 0.5rem', color: '#9ca3af' }}>•</span>
                        <span style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                          {transfer.from_address.slice(0, 8)}... → {transfer.to_address.slice(0, 8)}...
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getStatusIcon(transfer.status)}
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {transfer.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>
            Search Results ({searchResults.length})
          </h3>
          <div style={{ gap: '1rem' }}>
            {searchResults.map((result, index) => (
              <motion.div
                key={`${result.type}-${result.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="asi-card glass"
                style={{
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                whileHover={{ scale: 1.01 }}
                onClick={() => {
                  setSelectedTransaction(result);
                  onTransactionSelect?.(result);
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      {getTypeIcon(result.type)}
                      <span style={{ fontWeight: '600' }}>{result.title}</span>
                      {getStatusIcon(result.status, result.errored)}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#d1d5db',
                      marginBottom: '0.5rem'
                    }}>
                      {result.description}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <span>
                        <Clock size={12} style={{ marginRight: '0.25rem' }} />
                        {formatTimestamp(result.timestamp)}
                      </span>
                      {result.block_number && (
                        <span>
                          <Hash size={12} style={{ marginRight: '0.25rem' }} />
                          Block #{result.block_number}
                        </span>
                      )}
                      {result.phlo_cost && (
                        <span>
                          <Zap size={12} style={{ marginRight: '0.25rem' }} />
                          {result.phlo_cost.toLocaleString()} phlo
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: result.type === 'deployment' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: result.type === 'deployment' ? '#f59e0b' : '#3b82f6',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {result.type}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Loading States */}
      {(searchLoading || trackLoading) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem',
          color: '#9ca3af'
        }}>
          <div className="loading" style={{ marginRight: '1rem' }} />
          {trackLoading ? 'Tracking transaction...' : 'Searching transactions...'}
        </div>
      )}

      {/* Empty States */}
      {!searchLoading && !trackLoading && searchResults.length === 0 && trackingResults.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No transactions found</h3>
          <p style={{ marginBottom: '1.5rem' }}>
            Try entering a transaction ID to track or use the advanced filters to search
          </p>
        </div>
      )}

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}
            onClick={() => setSelectedTransaction(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="asi-card"
              style={{
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '1rem'
              }}>
                <h3 style={{ margin: 0 }}>Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    fontSize: '1.5rem'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ gap: '1rem' }}>
                {/* Transaction details would go here */}
                <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                  <strong>Type:</strong> {selectedTransaction.type}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                  <strong>ID:</strong> 
                  <code style={{ marginLeft: '0.5rem' }}>{selectedTransaction.id}</code>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                  <strong>Status:</strong> {selectedTransaction.status}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                  <strong>Timestamp:</strong> {format(new Date(selectedTransaction.timestamp), 'PPpp')}
                </div>
                
                {/* Add more detailed information based on transaction type */}
                {selectedTransaction.type === 'deployment' && (
                  <>
                    <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                      <strong>Deployer:</strong> 
                      <code style={{ marginLeft: '0.5rem' }}>{selectedTransaction.deployer}</code>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                      <strong>Phlo Cost:</strong> {selectedTransaction.phlo_cost?.toLocaleString() || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                      <strong>Deployment Type:</strong> {selectedTransaction.deployment_type || 'Unknown'}
                    </div>
                  </>
                )}
                
                {selectedTransaction.type === 'transfer' && (
                  <>
                    <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                      <strong>From:</strong> 
                      <code style={{ marginLeft: '0.5rem' }}>{selectedTransaction.from_address}</code>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                      <strong>To:</strong> 
                      <code style={{ marginLeft: '0.5rem' }}>{selectedTransaction.to_address}</code>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                      <strong>Amount:</strong> {selectedTransaction.amount_rev} REV
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionTracker;