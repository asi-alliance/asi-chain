import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { gql } from '@apollo/client';
import { formatDistanceToNow } from 'date-fns';

const GET_DEPLOYMENTS = gql`
  query GetDeployments($limit: Int!, $offset: Int!, $search: String) {
    deployments(
      limit: $limit, 
      offset: $offset, 
      order_by: {created_at: desc},
      where: {
        _or: [
          { deploy_id: { _ilike: $search } },
          { deployer: { _ilike: $search } }
        ]
      }
    ) {
      deploy_id
      deployer
      term
      timestamp
      deployment_type
      phlo_cost
      phlo_price
      phlo_limit
      errored
      error_message
      created_at
      block_number
      sig
    }
  }
`;

interface Deployment {
  deploy_id: string;
  deployer: string;
  term: string;
  timestamp: string;
  deployment_type: string;
  phlo_cost?: number;
  phlo_price?: number;
  phlo_limit?: number;
  valid_after_block_number?: number | null;
  status?: string;
  block_hash?: string;
  seq_num?: number;
  shard_id?: string;
  sig?: string;
  sig_algorithm?: string;
  errored: boolean;
  error_message: string | null;
  created_at: string;
  block_number: number | null;
}

const DeploymentsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedDeployments, setExpandedDeployments] = useState<Set<string>>(new Set());
  const deploymentsPerPage = 20;

  const { data: queryData, loading, error, refetch } = useQuery(GET_DEPLOYMENTS, {
    variables: { 
      limit: deploymentsPerPage, 
      offset: (currentPage - 1) * deploymentsPerPage,
      search: searchQuery ? `%${searchQuery}%` : '%'
    },
    pollInterval: 3000, // Poll every 3 seconds
  });

  const deployments: Deployment[] = queryData?.deployments || [];
  // Since aggregates aren't available, estimate total based on returned data
  const deploymentCount = deployments.length < deploymentsPerPage ? 
    (currentPage - 1) * deploymentsPerPage + deployments.length : 
    currentPage * deploymentsPerPage + 1; // Assume there's at least one more page
  const totalPages = deployments.length < deploymentsPerPage ? currentPage : currentPage + 1;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleSearchKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatTimestamp = (timestamp: string | number) => {
    try {
      const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
      const date = new Date(ts > 1e10 ? ts : ts * 1000);
      if (isNaN(date.getTime())) return 'Invalid date';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const determineDeploymentType = (term: string, existingType: string): { type: string; color: string } => {
    // Use existing type from database if available
    if (existingType && existingType !== 'Unknown') {
      const typeColorMap: { [key: string]: string } = {
        'REV Transfer': 'var(--asi-lime)',
        'Contract Deployment': 'var(--asi-pulse-blue)',
        'Channel Operation': 'var(--warning-orange)',
        'Validator Operation': 'var(--text-secondary)',
        'Finalizer Contract': 'var(--warning-orange)'
      };
      return { type: existingType, color: typeColorMap[existingType] || 'var(--text-secondary)' };
    }

    // Otherwise determine from term content
    if (term.includes('RevVault') && term.includes('transfer')) {
      return { type: 'REV Transfer', color: 'var(--asi-lime)' };
    } else if (term.includes('validator') || term.includes('bond')) {
      return { type: 'Validator Operation', color: 'var(--asi-pulse-blue)' };
    } else if (term.includes('finalizer')) {
      return { type: 'Finalizer Contract', color: 'var(--warning-orange)' };
    } else {
      return { type: 'Contract Deployment', color: 'var(--asi-pulse-blue)' };
    }
  };

  const formatRholangCode = (code: string): string => {
    // Unescape JSON string
    let formatted = code
      .replace(/\\\"/g, '"')
      .replace(/\\\\/g, '\\');
    
    // Replace \\n with actual newlines
    formatted = formatted
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ');
    
    return formatted;
  };

  const toggleCodeExpansion = (deployId: string) => {
    const newExpanded = new Set(expandedDeployments);
    if (newExpanded.has(deployId)) {
      newExpanded.delete(deployId);
    } else {
      newExpanded.add(deployId);
    }
    setExpandedDeployments(newExpanded);
  };

  return (
    <section className="asi-card">
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <h2>All Deployments</h2>
        <div className="section-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyUp={handleSearchKeyUp}
                placeholder="Search by deploy ID or deployer..."
                style={{ 
                  flex: '0 1 300px',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--charcoal-500)',
                  color: 'var(--text-primary)',
                  marginRight: '0.5rem',
                }}
              />
              <button 
                className="btn btn-secondary" 
                onClick={handleSearch}
                style={{ padding: '8px 16px' }}
                disabled={searchInput === ''}
              >
                Search
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-indicator" style={{ background: 'var(--asi-lime)' }}></span>
              <span className="text-muted" style={{ fontSize: '14px' }}>Live Updates</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <span className="loading"></span>
          <p className="text-muted mt-2">Loading deployments...</p>
        </div>
      ) : error ? (
        <div className="status-message error">
          <strong>Error:</strong> {error.message}
        </div>
      ) : deployments.length === 0 ? (
        <div className="text-center" style={{ padding: '3rem' }}>
          <p className="text-muted">
            {searchQuery ? 'No deployments found matching your search' : 'No deployments found'}
          </p>
        </div>
      ) : (
        <div>
          {deployments.map((deployment) => {
            const { type, color } = determineDeploymentType(deployment.term, deployment.deployment_type);
            const isExpanded = expandedDeployments.has(deployment.deploy_id);
            
            return (
              <div 
                key={deployment.deploy_id} 
                className="deployment-item fade-in" 
                style={{ marginBottom: '1.5rem' }}
              >
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--charcoal-500)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)' 
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'start', 
                    marginBottom: '0.75rem' 
                  }}>
                    <div>
                      <h4 style={{ margin: 0, color, fontSize: '1.1rem' }}>{type}</h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {formatTimestamp(deployment.timestamp)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span 
                        className={(deployment.errored || deployment.error_message) ? 'text-error' : 'text-success'} 
                        style={{ fontSize: '14px' }}
                      >
                        {(deployment.errored || deployment.error_message) ? '✕ Failed' : '✓ Success'}
                      </span>
                      {deployment.block_number && (
                        <>
                          <br />
                          <Link 
                            to={`/block/${deployment.block_number}`} 
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '11px', 
                              marginTop: '4px',
                              display: 'inline-block'
                            }}
                          >
                            Block #{deployment.block_number}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <dl style={{ 
                    margin: 0, 
                    display: 'grid', 
                    gridTemplateColumns: '100px 1fr', 
                    gap: '0.5rem', 
                    alignItems: 'start' 
                  }}>
                    <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Deploy ID</dt>
                    <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                      {deployment.deploy_id}
                    </dd>
                    
                    <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Deployer</dt>
                    <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                      {deployment.deployer}
                    </dd>
                    
                    <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Phlo Cost</dt>
                    <dd style={{ fontSize: '12px', margin: 0 }}>
                      {deployment.phlo_cost ? deployment.phlo_cost.toLocaleString() : 'N/A'} 
                      {deployment.phlo_limit && ` / ${deployment.phlo_limit.toLocaleString()}`}
                      {deployment.phlo_price && (
                        <span className="text-muted"> ({deployment.phlo_price} dust/phlo)</span>
                      )}
                    </dd>
                    
                    {deployment.error_message && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Error</dt>
                        <dd className="text-error" style={{ fontSize: '12px', margin: 0 }}>
                          {deployment.error_message}
                        </dd>
                      </>
                    )}

                    {deployment.valid_after_block_number !== undefined && deployment.valid_after_block_number !== null && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Valid After Block</dt>
                        <dd style={{ fontSize: '12px', margin: 0 }}>
                          {deployment.valid_after_block_number}
                        </dd>
                      </>
                    )}
                    
                    {deployment.status && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Status</dt>
                        <dd style={{ fontSize: '12px', margin: 0 }}>
                          {deployment.status}
                        </dd>
                      </>
                    )}
                    
                    {deployment.block_hash && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Block Hash</dt>
                        <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                          {deployment.block_hash.length > 32 
                            ? `${deployment.block_hash.slice(0, 16)}...${deployment.block_hash.slice(-16)}`
                            : deployment.block_hash
                          }
                        </dd>
                      </>
                    )}
                    
                    {deployment.seq_num !== undefined && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Sequence</dt>
                        <dd style={{ fontSize: '12px', margin: 0 }}>
                          {deployment.seq_num}
                        </dd>
                      </>
                    )}
                    
                    {deployment.shard_id && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Shard ID</dt>
                        <dd style={{ fontSize: '12px', margin: 0 }}>
                          {deployment.shard_id}
                        </dd>
                      </>
                    )}

                    {deployment.sig && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Signature</dt>
                        <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                          {deployment.sig.length > 32 
                            ? `${deployment.sig.slice(0, 16)}...${deployment.sig.slice(-16)}`
                            : deployment.sig
                          }
                        </dd>
                      </>
                    )}
                    
                    {deployment.sig_algorithm && (
                      <>
                        <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Sig Algorithm</dt>
                        <dd style={{ fontSize: '12px', margin: 0 }}>
                          {deployment.sig_algorithm}
                        </dd>
                      </>
                    )}
                  </dl>
                  
                  <details 
                    open={isExpanded}
                    onToggle={(e) => {
                      if (e.currentTarget.open !== isExpanded) {
                        toggleCodeExpansion(deployment.deploy_id);
                      }
                    }}
                    style={{ marginTop: '0.75rem' }}
                  >
                    <summary style={{ 
                      cursor: 'pointer', 
                      color: 'var(--asi-pulse-blue)', 
                      fontSize: '14px', 
                      padding: '0.5rem 0' 
                    }}>
                      View Rholang Code
                    </summary>
                    <pre style={{ 
                      background: 'var(--charcoal-700)', 
                      padding: '1rem', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      margin: '0.5rem 0 0 0',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowX: 'auto',
                      maxHeight: '600px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)'
                    }}>
                      <code>{formatRholangCode(deployment.term)}</code>
                    </pre>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Previous
            </button>
            <span>
              Page <span>{currentPage}</span> of <span>{totalPages}</span>
            </span>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <span className="text-muted" style={{ fontSize: '14px' }}>
              Showing {((currentPage - 1) * deploymentsPerPage) + 1}-{Math.min(currentPage * deploymentsPerPage, deploymentCount)} of {deploymentCount} deployments
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export default DeploymentsPage;