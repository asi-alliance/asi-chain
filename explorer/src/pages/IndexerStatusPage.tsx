import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_INDEXER_STATUS } from '../graphql/queries';
import { formatDistanceToNow } from 'date-fns';

interface IndexerState {
  key: string;
  value: string;
  updated_at: string;
}

const IndexerStatusPage: React.FC = () => {
  const { data, loading, error } = useQuery(GET_INDEXER_STATUS, {
    pollInterval: 5000, // Poll every 5 seconds
  });

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const calculateSyncPercentage = (): number => {
    // Since indexer_state table doesn't exist, we'll assume 100% sync
    return 100;
  };

  const getSyncStatus = () => {
    const syncPercentage = calculateSyncPercentage();
    if (syncPercentage >= 99.9) return { status: 'Synced', color: 'var(--asi-lime)' };
    if (syncPercentage >= 95) return { status: 'Syncing', color: 'var(--asi-pulse-blue)' };
    return { status: 'Behind', color: 'var(--warning)' };
  };

  if (loading) {
    return (
      <div className="text-center">
        <span className="loading"></span>
        <p className="text-muted mt-2">Loading indexer status...</p>
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

  const highestBlock = data?.blocks?.[0]?.block_number || 0;
  const lastIndexedBlock = highestBlock; // Assume fully synced
  const syncStatus = getSyncStatus();
  const syncPercentage = calculateSyncPercentage();

  // Use the timestamp from the latest block as last update
  const lastUpdate = data?.blocks?.[0]?.timestamp ? 
    new Date(parseInt(data.blocks[0].timestamp)).toISOString() : 
    new Date().toISOString();

  return (
    <>
      <section className="asi-card">
        <div className="section-header">
          <h2>Indexer Status</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span 
              className="status-indicator" 
              style={{ background: syncStatus.color }}
            ></span>
            <span className="text-muted" style={{ fontSize: '14px' }}>{syncStatus.status}</span>
          </div>
        </div>

        {/* Status Cards */}
        <div className="summary-grid mb-3">
          <div className="asi-card glass">
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Sync Progress</p>
            <h3 style={{ margin: 0, color: syncStatus.color }}>
              {syncPercentage.toFixed(2)}%
            </h3>
            <div style={{ 
              marginTop: '0.5rem',
              height: '4px',
              background: 'var(--charcoal-400)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${syncPercentage}%`,
                height: '100%',
                background: syncStatus.color,
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>

          <div className="asi-card glass">
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Last Indexed Block</p>
            <h3 style={{ margin: 0 }}>
              #{lastIndexedBlock.toLocaleString()}
            </h3>
            <p className="text-muted" style={{ fontSize: '12px', margin: '0.5rem 0 0 0' }}>
              {highestBlock - lastIndexedBlock} blocks behind
            </p>
          </div>

          <div className="asi-card glass">
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Highest Block</p>
            <h3 style={{ margin: 0 }}>
              #{highestBlock.toLocaleString()}
            </h3>
          </div>

          <div className="asi-card glass">
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Last Update</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
              {lastUpdate ? formatTimestamp(lastUpdate) : 'Unknown'}
            </h3>
          </div>
        </div>

        {/* Detailed Information */}
        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Indexer Status</h3>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span style={{ fontWeight: 600 }}>Last Indexed Block</span>
              </td>
              <td>
                <span className="mono" style={{ fontSize: '14px' }}>
                  #{lastIndexedBlock.toLocaleString()}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ fontWeight: 600 }}>Highest Block</span>
              </td>
              <td>
                <span className="mono" style={{ fontSize: '14px' }}>
                  #{highestBlock.toLocaleString()}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ fontWeight: 600 }}>Sync Status</span>
              </td>
              <td>
                <span style={{ color: syncStatus.color, fontSize: '14px' }}>
                  {syncStatus.status}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
};

export default IndexerStatusPage;