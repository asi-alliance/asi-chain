import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import { AnimatePresence } from '../components/AnimatePresenceWrapper';
import { 
  ArrowLeft, 
  Copy, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Hash,
  User,
  Zap,
  FileText,
  TrendingUp,
  Database,
  Activity,
  Code,
  Share2,
  Download,
  Eye,
  Shield,
  Layers
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { gql } from '@apollo/client';

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
    return format(date, 'PPpp');
  } catch (error) {
    return 'Unknown time';
  }
};

const formatTimestampDistance = (timestamp: any): string => {
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

const GET_TRANSACTION_DETAILS = gql`
  query GetTransactionDetails($deployId: String!) {
    deployments(where: { deploy_id: { _eq: $deployId } }) {
      deploy_id
      deployer
      term
      timestamp
      deployment_type
      phlo_cost
      phlo_price
      phlo_limit
      valid_after_block_number
      status
      block_number
      block_hash
      seq_num
      shard_id
      sig
      sig_algorithm
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
      block {
        block_number
        block_hash
        parent_hash
        timestamp
        proposer
        deployment_count
        state_hash
        finalization_status
        justifications
        created_at
      }
    }
  }
`;

const TransactionDetailPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'transfers' | 'block'>('overview');
  const [showRawData, setShowRawData] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_TRANSACTION_DETAILS, {
    variables: { deployId: transactionId },
    skip: !transactionId,
    errorPolicy: 'all'
  });

  const transaction = data?.deployments?.[0];
  const transfers = transaction?.transfers || [];
  const block = transaction?.block;

  useEffect(() => {
    if (!transactionId) {
      navigate('/');
    }
  }, [transactionId, navigate]);

  const copyToClipboard = (text: string, label: string = 'Text') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const shareTransaction = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Transaction link copied to clipboard');
  };

  const downloadTransactionData = (format: 'json' | 'txt') => {
    if (!transaction) return;

    const data = {
      transaction,
      transfers,
      block,
      exported_at: new Date().toISOString()
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction-${transactionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const text = `
ASI Chain Transaction Details
=============================

Transaction ID: ${transaction.deploy_id}
Deployer: ${transaction.deployer}
Block Number: ${transaction.block_number}
Timestamp: ${new Date(transaction.timestamp).toLocaleString()}
Status: ${transaction.errored ? 'Failed' : 'Success'}
Phlo Cost: ${transaction.phlo_cost?.toLocaleString() || 'N/A'}
Type: ${transaction.deployment_type || 'Unknown'}

${transaction.error_message ? `Error: ${transaction.error_message}\n` : ''}
${transfers.length > 0 ? `\nTransfers (${transfers.length}):\n${transfers.map((t: any) => 
  `- ${t.amount_rev} REV from ${t.from_address} to ${t.to_address} (${t.status})`
).join('\n')}` : ''}

Exported at: ${new Date().toLocaleString()}
      `.trim();

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction-${transactionId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getStatusIcon = (errored: boolean, status?: string) => {
    if (errored) return <XCircle size={20} style={{ color: '#ef4444' }} />;
    if (status === 'success') return <CheckCircle size={20} style={{ color: '#10b981' }} />;
    if (status === 'pending') return <Clock size={20} style={{ color: '#f59e0b' }} />;
    return <AlertCircle size={20} style={{ color: '#9ca3af' }} />;
  };

  const getStatusText = (errored: boolean, status?: string) => {
    if (errored) return 'Failed';
    if (status === 'success') return 'Success';
    if (status === 'pending') return 'Pending';
    return 'Unknown';
  };

  const getStatusColor = (errored: boolean, status?: string) => {
    if (errored) return '#ef4444';
    if (status === 'success') return '#10b981';
    if (status === 'pending') return '#f59e0b';
    return '#9ca3af';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="loading" />
        <p>Loading transaction details...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="asi-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
          <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
          <h2>Transaction Not Found</h2>
        </div>
        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
          {error ? error.message : `Transaction ${transactionId} could not be found.`}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
            Go Back
          </button>
          <button
            onClick={() => refetch()}
            className="btn btn-primary"
          >
            <Activity size={16} style={{ marginRight: '0.5rem' }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { key: 'code', label: 'Code', icon: <Code size={16} /> },
    { key: 'transfers', label: `Transfers (${transfers.length})`, icon: <TrendingUp size={16} /> },
    { key: 'block', label: 'Block Info', icon: <Database size={16} /> }
  ];

  const renderOverviewTab = () => (
    <div>
      {/* Status Banner */}
      <div className="asi-card" style={{
        marginBottom: '2rem',
        backgroundColor: transaction.errored ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        border: `1px solid ${getStatusColor(transaction.errored, transaction.status)}40`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {getStatusIcon(transaction.errored, transaction.status)}
          <div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: getStatusColor(transaction.errored, transaction.status)
            }}>
              Transaction {getStatusText(transaction.errored, transaction.status)}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              {transaction.errored && transaction.error_message ? transaction.error_message : 
               'Transaction has been processed and included in the blockchain'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Transaction Info */}
        <div className="asi-card">
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#f59e0b'
          }}>
            <FileText size={20} />
            Transaction Information
          </h3>
          <div style={{ gap: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                Transaction ID
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all'
              }}>
                {transaction.deploy_id}
                <button
                  onClick={() => copyToClipboard(transaction.deploy_id, 'Transaction ID')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                Deployer
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all'
              }}>
                {transaction.deployer}
                <button
                  onClick={() => copyToClipboard(transaction.deployer, 'Deployer address')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                Type
              </div>
              <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                borderRadius: '6px',
                color: '#f59e0b',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'inline-block'
              }}>
                {transaction.deployment_type || 'Unknown'}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                Timestamp
              </div>
              <div>
                <div style={{ fontWeight: '500' }}>
                  {formatTimestamp(transaction.timestamp)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  {formatTimestampDistance(transaction.timestamp)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Details */}
        <div className="asi-card">
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#8b5cf6'
          }}>
            <Zap size={20} />
            Execution Details
          </h3>
          <div style={{ gap: '1rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                  Phlo Cost
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#8b5cf6' }}>
                  {transaction.phlo_cost?.toLocaleString() || 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                  Phlo Price
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {transaction.phlo_price?.toLocaleString() || 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                  Phlo Limit
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {transaction.phlo_limit?.toLocaleString() || 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                  Valid After Block
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  #{transaction.valid_after_block_number || 'N/A'}
                </div>
              </div>
            </div>

            {transaction.sig && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                  Signature
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {transaction.sig}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Info */}
        <div className="asi-card">
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#10b981'
          }}>
            <Database size={20} />
            Blockchain Information
          </h3>
          <div style={{ gap: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                Block Number
              </div>
              <Link
                to={`/block/${transaction.block_number}`}
                style={{
                  color: '#10b981',
                  textDecoration: 'none',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                #{transaction.block_number}
                <ExternalLink size={16} />
              </Link>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                Block Hash
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all'
              }}>
                {transaction.block_hash}
                <button
                  onClick={() => copyToClipboard(transaction.block_hash, 'Block hash')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {transaction.seq_num !== undefined && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                    Sequence Number
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    {transaction.seq_num}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                    Shard ID
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    {transaction.shard_id || 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Summary */}
      {transfers.length > 0 && (
        <div className="asi-card">
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#3b82f6'
          }}>
            <TrendingUp size={20} />
            Transfer Summary ({transfers.length})
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            {transfers.slice(0, 4).map((transfer: any, index: number) => (
              <div
                key={transfer.id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontWeight: '600', color: '#3b82f6' }}>
                    {transfer.amount_rev} REV
                  </span>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: transfer.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: transfer.status === 'success' ? '#10b981' : '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {transfer.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>From:</strong> {transfer.from_address.slice(0, 12)}...
                  </div>
                  <div>
                    <strong>To:</strong> {transfer.to_address.slice(0, 12)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
          {transfers.length > 4 && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => setActiveTab('transfers')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#3b82f6',
                  cursor: 'pointer'
                }}
              >
                View All {transfers.length} Transfers
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCodeTab = () => (
    <div className="asi-card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ margin: 0 }}>Contract Code</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowRawData(!showRawData)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              backgroundColor: showRawData ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
          >
            {showRawData ? 'Hide Raw' : 'Show Raw'}
          </button>
          <button
            onClick={() => copyToClipboard(transaction.term, 'Contract code')}
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
            <Copy size={14} />
            Copy
          </button>
        </div>
      </div>

      <div style={{
        maxHeight: '600px',
        overflow: 'auto',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <SyntaxHighlighter
          language={showRawData ? "text" : "scala"}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            fontSize: '0.875rem',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          {transaction.term || '// No code available'}
        </SyntaxHighlighter>
      </div>

      {transaction.term && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#9ca3af'
        }}>
          <strong>Code Analysis:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            <li>Language: Rholang</li>
            <li>Size: {new Blob([transaction.term]).size} bytes</li>
            <li>Lines: {transaction.term.split('\n').length}</li>
          </ul>
        </div>
      )}
    </div>
  );

  const renderTransfersTab = () => (
    <div className="asi-card">
      <h3 style={{ marginBottom: '1rem' }}>Transfers ({transfers.length})</h3>
      
      {transfers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No transfers found for this transaction</p>
        </div>
      ) : (
        <div style={{ gap: '1rem' }}>
          {transfers.map((transfer: any, index: number) => (
            <motion.div
              key={transfer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                marginBottom: '1rem'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#3b82f6',
                    marginBottom: '0.25rem'
                  }}>
                    {transfer.amount_rev} REV
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                    Transfer #{transfer.id}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: transfer.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: transfer.status === 'success' ? '#10b981' : '#ef4444',
                  fontWeight: '500'
                }}>
                  {transfer.status === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {transfer.status}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '1rem',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                    From
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    wordBreak: 'break-all'
                  }}>
                    {transfer.from_address}
                  </div>
                </div>

                <div style={{
                  padding: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6'
                }}>
                  <TrendingUp size={16} />
                </div>

                <div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                    To
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    wordBreak: 'break-all'
                  }}>
                    {transfer.to_address}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem',
                color: '#9ca3af'
              }}>
                <div>
                  <Clock size={14} style={{ marginRight: '0.25rem' }} />
                  {formatTimestampDistance(transfer.created_at)}
                </div>
                {transfer.amount_dust && (
                  <div>
                    Dust: {transfer.amount_dust}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBlockTab = () => (
    <div className="asi-card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0 }}>Block Information</h3>
        <Link
          to={`/block/${transaction.block_number}`}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #10b981',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#10b981',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Eye size={14} />
          View Full Block
        </Link>
      </div>

      {block ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
              Block Number
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>
              #{block.block_number}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
              Timestamp
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500' }}>
              {formatTimestamp(block.timestamp)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
              Proposer
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              wordBreak: 'break-all'
            }}>
              {block.proposer}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
              Total Deployments
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
              {block.deployment_count}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
              Block Hash
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              wordBreak: 'break-all',
              padding: '0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px'
            }}>
              {block.block_hash}
              <button
                onClick={() => copyToClipboard(block.block_hash, 'Block hash')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {block.parent_hash && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                Parent Hash
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px'
              }}>
                {block.parent_hash}
              </div>
            </div>
          )}

          {block.state_hash && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                State Hash
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px'
              }}>
                {block.state_hash}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          Block information not available
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          
          <h1 style={{ margin: '0 0 0.5rem 0' }}>Transaction Details</h1>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#9ca3af',
            wordBreak: 'break-all'
          }}>
            {transactionId}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={shareTransaction}
            style={{
              padding: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
            title="Share transaction"
          >
            <Share2 size={16} />
          </button>
          
          <button
            onClick={() => downloadTransactionData('json')}
            style={{
              padding: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
            title="Download as JSON"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '0.5rem'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === tab.key ? '#10b981' : 'transparent',
              color: activeTab === tab.key ? '#000' : '#9ca3af',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: '500'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'code' && renderCodeTab()}
          {activeTab === 'transfers' && renderTransfersTab()}
          {activeTab === 'block' && renderBlockTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TransactionDetailPage;