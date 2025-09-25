import React, { useState, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowRightLeft,
  Clock,
  Activity,
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// GraphQL Queries
const GET_TRANSACTION_COUNTS = gql`
  query GetTransactionCounts {
    deployments_aggregate {
      aggregate {
        count
      }
    }
    transfers_aggregate {
      aggregate {
        count
      }
    }
  }
`;

const GET_PAGINATED_TRANSACTIONS = gql`
  query GetPaginatedTransactions($deploymentLimit: Int!, $deploymentOffset: Int!, $transferLimit: Int!, $transferOffset: Int!) {
    deployments(limit: $deploymentLimit, offset: $deploymentOffset, order_by: { timestamp: desc }) {
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
      errored
      error_message
    }
    transfers(limit: $transferLimit, offset: $transferOffset, order_by: { created_at: desc }) {
      id
      deploy_id
      from_address
      to_address
      amount_rev
      status
      block_number
      created_at
    }
  }
`;

interface TransactionTrackerImprovedProps {
  onTransactionSelect?: (transaction: any) => void;
  embedded?: boolean;
}

const TransactionTrackerImproved: React.FC<TransactionTrackerImprovedProps> = ({
  onTransactionSelect,
  embedded = false
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'deployments' | 'transfers'>('deployments');
  // const [activeTab, setActiveTab] = useState<'all' | 'deployments' | 'transfers'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Fetch total counts
  const { data: countsData } = useQuery(GET_TRANSACTION_COUNTS, {
    pollInterval: 30000 // Update counts every 30 seconds
  });
  
  const totalDeployments = countsData?.deployments_aggregate?.aggregate?.count || 0;
  const totalTransfers = countsData?.transfers_aggregate?.aggregate?.count || 0;
  const totalTransactions = totalDeployments + totalTransfers;
  
  // Calculate pagination
  const deploymentOffset = activeTab === 'transfers' ? 0 : (currentPage - 1) * itemsPerPage;
  const transferOffset = activeTab === 'deployments' ? 0 : (currentPage - 1) * itemsPerPage;
  const deploymentLimit = activeTab === 'transfers' ? 0 : itemsPerPage;
  const transferLimit = activeTab === 'deployments' ? 0 : itemsPerPage;
  
  // Fetch paginated data
  const { data: transactionData, loading, refetch } = useQuery(GET_PAGINATED_TRANSACTIONS, {
    variables: {
      deploymentLimit,
      deploymentOffset,
      transferLimit,
      transferOffset
    },
    pollInterval: embedded ? 0 : 10000 // Poll every 10 seconds if not embedded
  });
  
  // Process transactions
  const transactions = useMemo(() => {
    if (!transactionData) return [];
    
    const results: any[] = [];
    
    // Add deployments
    // if (activeTab === 'all' || activeTab === 'deployments') {
    if (activeTab === 'deployments') {
      transactionData.deployments?.forEach((deployment: any) => {
        results.push({
          ...deployment,
          type: 'deployment',
          id: deployment.deploy_id,
          displayTitle: `Deploy by ${deployment.deployer.slice(0, 8)}...`,
          displayTime: deployment.timestamp,
          isError: deployment.errored
        });
      });
    }
    
    // Add transfers
    // if (activeTab === 'all' || activeTab === 'transfers') {
    if (activeTab === 'transfers') {
      transactionData.transfers?.forEach((transfer: any) => {
        results.push({
          ...transfer,
          type: 'transfer',
          id: transfer.id,
          displayTitle: `Transfer ${transfer.amount_rev} REV`,
          displayTime: transfer.created_at,
          isError: transfer.status !== 'success'
        });
      });
    }
    
    // Sort by time
    return results.sort((a, b) => {
      const timeA = parseInt(a.displayTime);
      const timeB = parseInt(b.displayTime);
      return timeB - timeA;
    });
  }, [transactionData, activeTab]);
  
  // Calculate pagination info
  const totalItemsForTab = activeTab === 'deployments' ? totalDeployments 
    : activeTab === 'transfers' ? totalTransfers 
    : totalTransactions;
    
  const totalPages = Math.ceil(totalItemsForTab / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItemsForTab);
  
  // Get heading text based on context
  const getHeadingText = () => {
    if (isSearching && searchQuery) {
      return {
        title: "Search Results",
        subtitle: `Found ${transactions.length} matching transactions for "${searchQuery}"`
      };
    }
    
    // if (activeTab === 'all') {
    //   return {
    //     title: "All Transactions",
    //     subtitle: `Showing ${startIndex}-${Math.min(endIndex, transactions.length)} of ${totalTransactions} total (${totalDeployments} deployments, ${totalTransfers} transfers)`
    //   };
    // } else if (activeTab === 'deployments') {
    if (activeTab === 'deployments') {
      return {
        title: "Smart Contract Deployments",
        subtitle: `Showing ${startIndex}-${endIndex} of ${totalDeployments} total deployments`
      };
    } else {
      return {
        title: "Token Transfers",
        subtitle: `Showing ${startIndex}-${endIndex} of ${totalTransfers} total transfers`
      };
    }
  };
  
  const heading = getHeadingText();
  
  return (
    <div className={embedded ? '' : 'asi-card'}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>{heading.title}</h2>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.875rem' }}>
          {heading.subtitle}
        </p>
      </div>
      
      {/* Summary Stats Bar */}
      {!embedded && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} style={{ color: '#f59e0b' }} />
            <span>{totalDeployments} Deployments</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRightLeft size={16} style={{ color: '#3b82f6' }} />
            <span>{totalTransfers} Transfers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} style={{ color: '#10b981' }} />
            <span>{totalTransactions} Total</span>
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '2rem'
      }}>
        {/* {(['all', 'deployments', 'transfers'] as const).map((tab) => ( */}
        {(['deployments', 'transfers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === tab ? '#10b981' : '#9ca3af',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: activeTab === tab ? '600' : '400'
            }}
          >
            {/* {tab === 'all' ? `All (${totalTransactions})` 
              : tab === 'deployments' ? `Deployments (${totalDeployments})`
              : `Transfers (${totalTransfers})`} */}
              {tab === 'deployments' ? `Deployments (${totalDeployments})` : `Transfers (${totalTransfers})`}
          </button>
        ))}
      </div>
      
      {/* Search Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search by ID, address, or block number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                setIsSearching(true);
                // Implement search logic here
              }
            }}
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
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Transaction List */}
      <div style={{ marginBottom: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <RefreshCw size={24} className="spinning" />
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Activity size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
            <h4>No transactions found</h4>
            <p style={{ color: '#9ca3af' }}>
              {isSearching ? 'Try adjusting your search criteria' : 'Transactions will appear here as they occur'}
            </p>
          </div>
        ) : (
          <div>
            {transactions.map((tx, index) => (
              <motion.div
                key={`${tx.type}-${tx.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="asi-card glass"
                style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
                onClick={() => onTransactionSelect?.(tx)}
              >
                {/* Type Badge */}
                <div style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: tx.type === 'deployment' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: tx.type === 'deployment' ? '#f59e0b' : '#3b82f6',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {tx.type === 'deployment' ? 'DEPLOY' : 'TRANSFER'}
                </div>
                
                {/* Transaction Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                    {tx.displayTitle}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                    Block #{tx.block_number} • {formatDistanceToNow(new Date(parseInt(tx.displayTime)), { addSuffix: true })}
                  </div>
                </div>
                
                {/* Status Icon */}
                <div>
                  {tx.isError ? (
                    <XCircle size={20} style={{ color: '#ef4444' }} />
                  ) : (
                    <CheckCircle size={20} style={{ color: '#10b981' }} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination Controls */}
      <div className='pagination-controls'>
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Showing {startIndex}-{Math.min(endIndex, transactions.length)} of {totalItemsForTab} items
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'transparent',
                  color: currentPage === 1 ? '#4b5563' : '#fff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              
              <span style={{ padding: '0 1rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'transparent',
                  color: currentPage === totalPages ? '#4b5563' : '#fff',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronRight size={16} />
              </button>
              
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  marginLeft: '1rem',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff'
                }}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionTrackerImproved;