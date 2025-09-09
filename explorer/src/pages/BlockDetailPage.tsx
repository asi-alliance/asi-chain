import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_BLOCK_DETAILS } from '../graphql/queries';
import { Block } from '../types';
import { formatDistanceToNow } from 'date-fns';

const BlockDetailPage: React.FC = () => {
  const { blockNumber } = useParams<{ blockNumber: string }>();
  
  const { data, loading, error } = useQuery(GET_BLOCK_DETAILS, {
    variables: { blockNumber: blockNumber || '0' },
    skip: blockNumber === undefined || blockNumber === null || blockNumber === '',
  });

  if (loading) {
    return (
      <div className="text-center">
        <span className="loading"></span>
        <p className="text-muted mt-2">Loading block details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-message error">
        <strong>Error:</strong> {error.message}
      </div>
    );
  }

  const block = data?.blocks?.[0] as Block;

  if (!block) {
    return (
      <div className="status-message error">
        <strong>Block Not Found:</strong> Block #{blockNumber} was not found on the network.
      </div>
    );
  }

  const formatTimestamp = (timestamp: string | number) => {
    try {
      const ts = parseInt(timestamp.toString());
      const date = new Date(ts);
      if (isNaN(date.getTime())) return 'Invalid date';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatDate = (timestamp: string | number) => {
    try {
      const ts = parseInt(timestamp.toString());
      const date = new Date(ts);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const truncateAddress = (address: string) => {
    if (!address || address.length < 32) return address;
    return `${address.slice(0, 20)}...${address.slice(-20)}`;
  };

  const getTransactionType = (deploy: any) => {
    if (deploy.deployment_type) {
      return deploy.deployment_type;
    }
    
    if (deploy.term) {
      if (deploy.term.includes('RevVault') && deploy.term.includes('transfer')) {
        return 'REV Transfer';
      } else if (deploy.term.includes('validator') || deploy.term.includes('bond')) {
        return 'Validator Operation';
      } else if (deploy.term.includes('ch_')) {
        return 'Channel Operation';
      }
    }
    
    return 'Contract Deployment';
  };

  // Try to extract transfer details from Rholang term
  const extractTransferDetails = (term: string) => {
    const cleanTerm = term.replace(/\\n/g, ' ');
    const matchPattern = /match\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*\)/;
    const match = cleanTerm.match(matchPattern);
    
    if (match) {
      return {
        from: match[1],
        to: match[2],
        amount: parseInt(match[3]) / 1000000000
      };
    }
    return null;
  };

  return (
    <>
      {/* Navigation */}
      <nav style={{ marginBottom: '2rem' }}>
        <Link to="/" className="btn btn-secondary">← Back to Blocks</Link>
      </nav>

      {/* Block Summary Cards */}
      <div className="summary-grid mb-3">
        <div className="asi-card glass">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Block Number</p>
          <h3 className="text-success" style={{ margin: 0 }}>
            {block.block_number.toLocaleString()}
          </h3>
        </div>
        <div className="asi-card glass">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Proposer</p>
          <h3 style={{ margin: 0 }}>
            {truncateAddress(block.proposer)}
          </h3>
        </div>
        <div className="asi-card glass">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Time</p>
          <h3 style={{ margin: 0 }}>
            {formatTimestamp(block.timestamp)}
          </h3>
        </div>
        <div className="asi-card glass">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Status</p>
          <h3 className="text-success" style={{ margin: 0 }}>✓ Confirmed</h3>
        </div>
      </div>

      {/* Block Details */}
      <section className="asi-card">
        <h2 style={{ marginBottom: '1.5rem' }}>Block Details</h2>
        <dl style={{ 
          display: 'grid', 
          gridTemplateColumns: 'max-content 1fr', 
          gap: 'var(--spacing-sm) var(--spacing-lg)',
          margin: 0 
        }}>
          <dt>Block Number</dt>
          <dd className="block-number">{block.block_number.toLocaleString()}</dd>
          
          <dt>Block Hash</dt>
          <dd className="mono">{block.block_hash}</dd>
          
          <dt>Parent Hash</dt>
          <dd className="mono">{block.parent_hash}</dd>
          
          <dt>State Hash</dt>
          <dd className="mono">{block.state_hash || 'N/A'}</dd>
          
          <dt>State Root Hash</dt>
          <dd className="mono">{block.state_root_hash || 'N/A'}</dd>
          
          <dt>Pre-State Hash</dt>
          <dd className="mono">{block.pre_state_hash || 'N/A'}</dd>
          
          <dt>Proposer</dt>
          <dd>
            <span className="mono" style={{ fontSize: '11px' }}>{block.proposer}</span>
          </dd>
          
          <dt>Timestamp</dt>
          <dd>
            {formatDate(block.timestamp)} 
            <span className="text-muted"> ({formatTimestamp(block.timestamp)})</span>
          </dd>
          
          <dt>Finalization Status</dt>
          <dd>
            <span className="text-success">
              {block.finalization_status || 'finalized'}
            </span>
          </dd>
          
          <dt>Version</dt>
          <dd>{block.version || 'N/A'}</dd>
          
          <dt>Sequence Number</dt>
          <dd>{block.seq_num || 'N/A'}</dd>
          
          <dt>Shard ID</dt>
          <dd className="mono">{block.shard_id || 'N/A'}</dd>
          
          <dt>Fault Tolerance</dt>
          <dd>{block.fault_tolerance !== undefined ? block.fault_tolerance : 'N/A'}</dd>
          
          <dt>Deployment Count</dt>
          <dd>{block.deployment_count || 0}</dd>
        </dl>
      </section>

      {/* Advanced Block Information */}
      {(block.sig || block.extra_bytes) && (
        <section className="asi-card mt-3">
          <h2>Advanced Information</h2>
          <dl style={{ 
            display: 'grid', 
            gridTemplateColumns: 'max-content 1fr', 
            gap: 'var(--spacing-sm) var(--spacing-lg)',
            margin: 0 
          }}>
            {block.sig && (
              <>
                <dt>Block Signature</dt>
                <dd>
                  <details>
                    <summary style={{ cursor: 'pointer', color: 'var(--asi-pulse-blue)' }}>
                      View Signature
                    </summary>
                    <pre style={{ 
                      marginTop: '0.5rem',
                      padding: '1rem',
                      background: 'var(--deep-space)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      wordBreak: 'break-all'
                    }}>
                      {block.sig}
                    </pre>
                  </details>
                </dd>
                
                <dt>Signature Algorithm</dt>
                <dd>{block.sig_algorithm || 'secp256k1'}</dd>
              </>
            )}
            
            {block.extra_bytes && (
              <>
                <dt>Extra Data</dt>
                <dd>
                  <details>
                    <summary style={{ cursor: 'pointer', color: 'var(--asi-pulse-blue)' }}>
                      View Extra Bytes
                    </summary>
                    <pre style={{ 
                      marginTop: '0.5rem',
                      padding: '1rem',
                      background: 'var(--deep-space)',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      {block.extra_bytes}
                    </pre>
                  </details>
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      {/* Bonds Map */}
      {block.bonds_map && block.bonds_map.length > 0 && (
        <section className="asi-card mt-3">
          <h2>Validator Bonds Map</h2>
          <p className="text-muted mb-2">
            Current bond stakes for {block.bonds_map.length} validators
          </p>
          <table>
            <thead>
              <tr>
                <th>Validator</th>
                <th>Stake</th>
              </tr>
            </thead>
            <tbody>
              {block.bonds_map.map((bond: any, index: number) => (
                <tr key={index}>
                  <td className="mono" style={{ fontSize: '11px' }}>
                    {bond.validator}
                  </td>
                  <td>{(bond.stake / 1e8).toFixed(2)} REV</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Justifications */}
      {block.justifications && block.justifications.length > 0 && (
        <section className="asi-card mt-3">
          <h2>Block Justifications</h2>
          <p className="text-muted mb-2">
            {block.justifications.length} justifications from validators
          </p>
          <table>
            <thead>
              <tr>
                <th>Validator</th>
                <th>Latest Block Hash</th>
              </tr>
            </thead>
            <tbody>
              {block.justifications.map((just: any, index: number) => (
                <tr key={index}>
                  <td className="mono" style={{ fontSize: '11px' }}>
                    {just.validator ? `${just.validator.slice(0, 20)}...${just.validator.slice(-20)}` : 'N/A'}
                  </td>
                  <td className="mono" style={{ fontSize: '11px' }}>
                    {just.latestBlockHash ? `${just.latestBlockHash.slice(0, 20)}...${just.latestBlockHash.slice(-20)}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}


      {/* Deployments */}
      {block.deployments && block.deployments.length > 0 && (
        <section className="asi-card mt-3">
          <h2>Transactions / Deployments</h2>
          <p className="text-muted mb-2">
            {block.deployments.length} deployments in this block
          </p>
          
          <div>
            {block.deployments.map((deploy: any, index: number) => {
              const transactionType = getTransactionType(deploy);
              const isTransfer = transactionType === 'REV Transfer';
              const transferDetails = isTransfer && deploy.term ? extractTransferDetails(deploy.term) : null;
              
              return (
                <div key={deploy.deploy_id} className="deployment-item" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--charcoal-500)', 
                    borderRadius: '8px', 
                    border: isTransfer ? '1px solid var(--asi-lime)' : '1px solid var(--border-color)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'start', 
                      marginBottom: '0.75rem' 
                    }}>
                      <h4 style={{ margin: 0, color: 'var(--asi-lime)', fontSize: '1.1rem' }}>
                        {transactionType}
                      </h4>
                      <span className={deploy.errored ? 'text-error' : 'text-success'} 
                            style={{ fontSize: '14px' }}>
                        {deploy.errored ? '✗ Failed' : '✓ Success'}
                      </span>
                    </div>
                    
                    <dl style={{ 
                      margin: 0, 
                      display: 'grid', 
                      gridTemplateColumns: '120px 1fr', 
                      gap: '0.5rem', 
                      alignItems: 'start' 
                    }}>
                      {transferDetails && (
                        <>
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            From
                          </dt>
                          <dd className="mono" style={{ fontSize: '12px', margin: 0, wordBreak: 'break-all' }}>
                            {transferDetails.from}
                          </dd>
                          
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            To
                          </dt>
                          <dd className="mono" style={{ fontSize: '12px', margin: 0, wordBreak: 'break-all' }}>
                            {transferDetails.to}
                          </dd>
                          
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Amount
                          </dt>
                          <dd style={{ 
                            fontSize: '14px', 
                            margin: 0, 
                            color: 'var(--asi-lime)', 
                            fontWeight: 600 
                          }}>
                            {transferDetails.amount.toFixed(8)} REV
                          </dd>
                        </>
                      )}
                      
                      <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Deploy ID
                      </dt>
                      <dd className="mono" style={{ fontSize: '12px', margin: 0, wordBreak: 'break-all' }}>
                        {deploy.deploy_id}
                      </dd>
                      
                      <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Deployer
                      </dt>
                      <dd className="mono" style={{ fontSize: '12px', margin: 0, wordBreak: 'break-all' }}>
                        {deploy.deployer}
                      </dd>
                      
                      <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Phlo Cost
                      </dt>
                      <dd style={{ fontSize: '13px', margin: 0 }}>
                        {deploy.phlo_cost?.toLocaleString() || '0'}
                        {deploy.phlo_limit && deploy.phlo_price && (
                          <span className="text-muted" style={{ fontSize: '12px' }}>
                            {' '}(limit: {deploy.phlo_limit.toLocaleString()}, price: {deploy.phlo_price})
                          </span>
                        )}
                      </dd>
                      
                      {deploy.valid_after_block_number !== undefined && (
                        <>
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Valid After Block
                          </dt>
                          <dd style={{ fontSize: '13px', margin: 0 }}>
                            {deploy.valid_after_block_number}
                          </dd>
                        </>
                      )}
                      
                      {deploy.status && (
                        <>
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Status
                          </dt>
                          <dd style={{ fontSize: '13px', margin: 0 }}>
                            {deploy.status}
                          </dd>
                        </>
                      )}
                      
                      {deploy.seq_num !== undefined && (
                        <>
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Sequence
                          </dt>
                          <dd style={{ fontSize: '13px', margin: 0 }}>
                            {deploy.seq_num}
                          </dd>
                        </>
                      )}
                      
                      {deploy.shard_id && (
                        <>
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Shard ID
                          </dt>
                          <dd style={{ fontSize: '13px', margin: 0 }}>
                            {deploy.shard_id}
                          </dd>
                        </>
                      )}
                      
                      {deploy.errored && deploy.error_message && (
                        <>
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Error
                          </dt>
                          <dd className="text-error" style={{ fontSize: '13px', margin: 0 }}>
                            {deploy.error_message}
                          </dd>
                        </>
                      )}

                      {/* Show transfers from the transfers table if available */}
                      {deploy.transfers && deploy.transfers.length > 0 && (
                        <>
                          <dt style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Transfers
                          </dt>
                          <dd style={{ fontSize: '13px', margin: 0 }}>
                            {deploy.transfers.length} REV transfer{deploy.transfers.length > 1 ? 's' : ''}
                          </dd>
                        </>
                      )}
                    </dl>
                    
                    {/* Deployment Signature */}
                    {deploy.sig && (
                      <details style={{ marginTop: '0.75rem' }}>
                        <summary style={{ 
                          cursor: 'pointer', 
                          color: 'var(--asi-pulse-blue)', 
                          fontSize: '14px', 
                          padding: '0.5rem 0' 
                        }}>
                          View Deployment Signature
                        </summary>
                        <div style={{ 
                          margin: '0.5rem 0 0 0', 
                          padding: '1rem', 
                          background: 'var(--deep-space)', 
                          borderRadius: '6px', 
                          fontSize: '12px', 
                          border: '1px solid var(--border-color)' 
                        }}>
                          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                            <dt style={{ color: 'var(--text-tertiary)' }}>Signature:</dt>
                            <dd className="mono" style={{ margin: 0, wordBreak: 'break-all' }}>{deploy.sig}</dd>
                            
                            <dt style={{ color: 'var(--text-tertiary)' }}>Algorithm:</dt>
                            <dd style={{ margin: 0 }}>{deploy.sig_algorithm || 'secp256k1'}</dd>
                          </dl>
                        </div>
                      </details>
                    )}
                    
                    {deploy.term && (
                      <details style={{ marginTop: '0.75rem' }}>
                        <summary style={{ 
                          cursor: 'pointer', 
                          color: 'var(--asi-pulse-blue)', 
                          fontSize: '14px', 
                          padding: '0.5rem 0' 
                        }}>
                          View Rholang Code
                        </summary>
                        <pre style={{ 
                          margin: '0.5rem 0 0 0', 
                          padding: '1rem', 
                          background: 'var(--deep-space)', 
                          borderRadius: '6px', 
                          fontSize: '13px', 
                          lineHeight: '1.6', 
                          border: '1px solid var(--border-color)', 
                          maxHeight: '500px', 
                          overflow: 'auto' 
                        }}>
                          <code style={{ 
                            color: 'var(--asi-lime)', 
                            fontFamily: "'Fira Mono', 'SF Mono', Monaco, monospace", 
                            display: 'block',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {deploy.term
                              .replace(/\\"/g, '"')
                              .replace(/\\\\/g, '\\')
                              .replace(/\\n/g, '\n')
                              .replace(/\\t/g, '  ')}
                          </code>
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
};

export default BlockDetailPage;