import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_ALL_TRANSFERS } from '../graphql/queries';
import { Transfer, GenesisFunding } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useGenesisFunding } from '../hooks/useGenesisFunding';
import { formatGenesisFunding } from '../utils/parseGenesisFunding';

const TransfersPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const transfersPerPage = 10; // Changed to 10 to match old explorer

  // Get ALL transfers (not paginated) to merge with genesis funding
  const { data: queryData, loading: transfersLoading, error: transfersError } = useQuery(GET_ALL_TRANSFERS, {
    variables: { 
      limit: 1000, // Get all transfers to merge with genesis funding
      offset: 0 
    },
    pollInterval: 2000, // Poll every 2 seconds
  });

  // Get genesis funding events
  const { genesisFundings, loading: genesisFundingLoading, error: genesisFundingError } = useGenesisFunding();

  // Merge and sort ALL transfers with genesis funding
  const allTransferEventsSorted = useMemo(() => {
    const transfers = queryData?.transfers || [];
    const events: Array<Transfer | GenesisFunding> = [];
    
    // Add all regular transfers
    transfers.forEach((transfer: Transfer) => {
      events.push(transfer);
    });
    
    // Add genesis funding events only once
    genesisFundings.forEach((funding: GenesisFunding) => {
      events.push(funding);
    });
    

    // Sort by timestamp/created_at (newest first)
    events.sort((a, b) => {
      // Get timestamp in milliseconds for proper comparison
      let aTime: number;
      let bTime: number;
      
      if ('timestamp' in a) {
        // Genesis funding has timestamp in milliseconds
        aTime = a.timestamp;
      } else {
        // Regular transfers - use deployment timestamp if available, otherwise created_at
        if (a.deployment?.timestamp) {
          aTime = typeof a.deployment.timestamp === 'string' ? parseInt(a.deployment.timestamp) : a.deployment.timestamp;
        } else {
          aTime = new Date(a.created_at).getTime();
        }
      }
      
      if ('timestamp' in b) {
        // Genesis funding has timestamp in milliseconds
        bTime = b.timestamp;
      } else {
        // Regular transfers - use deployment timestamp if available, otherwise created_at
        if (b.deployment?.timestamp) {
          bTime = typeof b.deployment.timestamp === 'string' ? parseInt(b.deployment.timestamp) : b.deployment.timestamp;
        } else {
          bTime = new Date(b.created_at).getTime();
        }
      }
      
      return bTime - aTime; // Sort newest first
    });

    return events;
  }, [queryData?.transfers, genesisFundings]);

  // Apply client-side pagination to the sorted list
  const allTransferEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * transfersPerPage;
    const endIndex = startIndex + transfersPerPage;
    return allTransferEventsSorted.slice(startIndex, endIndex);
  }, [allTransferEventsSorted, currentPage, transfersPerPage]);

  const transferCount = allTransferEventsSorted.length;
  const totalPages = Math.ceil(transferCount / transfersPerPage);
  const loading = transfersLoading || genesisFundingLoading;
  const error = transfersError || genesisFundingError;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatTimestamp = (timestamp: string | number) => {
    try {
      // Convert to number if string
      const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
      // If timestamp looks like milliseconds (very large number), use directly
      // Otherwise multiply by 1000 to convert seconds to milliseconds
      const date = new Date(ts > 1e10 ? ts : ts * 1000);
      if (isNaN(date.getTime())) return 'Invalid date';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatRevAmount = (amount: number | string) => {
    const numAmount = parseFloat(amount.toString());
    if (isNaN(numAmount)) return '0';
    
    // If it's a whole number, show no decimals
    if (numAmount % 1 === 0) {
      return numAmount.toString();
    }
    // If it's >= 1, show up to 4 decimal places, removing trailing zeros
    else if (numAmount >= 1) {
      return parseFloat(numAmount.toFixed(4)).toString();
    }
    // If it's < 1, show up to 6 decimal places, removing trailing zeros
    else if (numAmount >= 0.000001) {
      return parseFloat(numAmount.toFixed(6)).toString();
    }
    // For very small amounts, use scientific notation
    else {
      return numAmount.toExponential(3);
    }
  };

  return (
    <section className="asi-card">
      <div className="section-header">
        <h2>REV Distribution & Transfers</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="status-indicator" style={{ background: 'var(--asi-lime)' }}></span>
            <span className="text-muted" style={{ fontSize: '14px' }}>Live Updates</span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Including Genesis Funding Events
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <span className="loading"></span>
          <p className="text-muted mt-2">Loading transfers...</p>
        </div>
      ) : error ? (
        <div className="status-message error">
          <strong>Error:</strong> {error.message}
        </div>
      ) : allTransferEvents.length === 0 ? (
        <p className="text-center text-muted">No REV transfers found</p>
      ) : (
        <div>
          {allTransferEvents.map((event: Transfer | GenesisFunding) => {
            // Check if it's a genesis funding event
            const isGenesisFunding = 'wallet_address' in event;
            
            if (isGenesisFunding) {
              const funding = event as GenesisFunding;
              return (
                <div key={funding.id} className="deployment-item fade-in" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--charcoal-500)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--asi-pulse-blue)' // Different color for genesis
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'start', 
                      marginBottom: '0.75rem' 
                    }}>
                      <h4 style={{ margin: 0, color: 'var(--asi-pulse-blue)', fontSize: '1.1rem' }}>
                        {formatGenesisFunding(funding.amount_rev)}
                      </h4>
                      <Link 
                        to="/block/0" 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 12px', fontSize: '13px' }}
                      >
                        Block #0 (Genesis)
                      </Link>
                    </div>
                    
                    <dl style={{ 
                      margin: 0, 
                      display: 'grid', 
                      gridTemplateColumns: '80px 1fr', 
                      gap: '0.5rem', 
                      alignItems: 'start' 
                    }}>
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        From
                      </dt>
                      <dd className="mono" style={{ fontSize: '11px', margin: 0, color: 'var(--asi-pulse-blue)' }}>
                        Genesis (System Mint)
                      </dd>
                      
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        To
                      </dt>
                      <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                        {funding.wallet_address}
                      </dd>
                      
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Time
                      </dt>
                      <dd style={{ fontSize: '12px', margin: 0 }}>
                        {formatTimestamp(funding.timestamp)}
                      </dd>
                      
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Status
                      </dt>
                      <dd style={{ fontSize: '12px', margin: 0 }}>
                        <span className="text-success">
                          ✓ Genesis Funding
                        </span>
                      </dd>
                      
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Type
                      </dt>
                      <dd style={{ fontSize: '12px', margin: 0 }}>
                        Initial Wallet Funding
                      </dd>
                    </dl>
                  </div>
                </div>
              );
            }
            
            // Regular transfer
            const transfer = event as Transfer;
            return (
            <div key={transfer.id} className="deployment-item fade-in" style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--charcoal-500)', 
                borderRadius: '8px', 
                border: '1px solid var(--asi-lime)' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'start', 
                  marginBottom: '0.75rem' 
                }}>
                  <h4 style={{ margin: 0, color: 'var(--asi-lime)', fontSize: '1.1rem' }}>
                    {formatRevAmount(transfer.amount_rev)} REV
                  </h4>
                  {(transfer.block || transfer.block_number) && (
                    <Link 
                      to={`/block/${transfer.block?.block_number || transfer.block_number}`} 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 12px', fontSize: '13px' }}
                    >
                      Block #{transfer.block?.block_number || transfer.block_number}
                    </Link>
                  )}
                </div>
                
                <dl style={{ 
                  margin: 0, 
                  display: 'grid', 
                  gridTemplateColumns: '80px 1fr', 
                  gap: '0.5rem', 
                  alignItems: 'start' 
                }}>
                  <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                    From
                  </dt>
                  <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                    {transfer.from_address}
                  </dd>
                  
                  <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                    To
                  </dt>
                  <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                    {transfer.to_address}
                  </dd>
                  
                  <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                    Time
                  </dt>
                  <dd style={{ fontSize: '12px', margin: 0 }}>
                    {formatTimestamp(transfer.block?.timestamp || transfer.deployment?.timestamp || transfer.created_at)}
                  </dd>
                  
                  <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                    Status
                  </dt>
                  <dd style={{ fontSize: '12px', margin: 0 }}>
                    <span className={transfer.status === 'success' || transfer.status === 'genesis_bond' ? 'text-success' : 'text-error'}>
                      {transfer.status === 'success' ? '✓ Success' : 
                       transfer.status === 'genesis_bond' ? '✓ Genesis Bond' : '✗ Failed'}
                    </span>
                  </dd>
                  
                  {transfer.amount_dust !== undefined && transfer.amount_dust !== null && (
                    <>
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Dust
                      </dt>
                      <dd style={{ fontSize: '12px', margin: 0 }}>
                        {transfer.amount_dust} dust
                      </dd>
                    </>
                  )}
                  
                  {transfer.deploy_id && (
                    <>
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Deploy ID
                      </dt>
                      <dd className="mono" style={{ fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                        {transfer.deploy_id.length > 40 
                          ? `${transfer.deploy_id.slice(0, 20)}...${transfer.deploy_id.slice(-20)}`
                          : transfer.deploy_id
                        }
                      </dd>
                    </>
                  )}
                  
                  
                  {transfer.block_number !== undefined && (
                    <>
                      <dt style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                        Block
                      </dt>
                      <dd style={{ fontSize: '12px', margin: 0 }}>
                        #{transfer.block_number}
                      </dd>
                    </>
                  )}
                </dl>
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
        </div>
      )}
    </section>
  );
};

export default TransfersPage;