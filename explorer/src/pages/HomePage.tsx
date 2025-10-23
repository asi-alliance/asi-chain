import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_NETWORK_STATS, GET_LATEST_BLOCKS, SEARCH_BLOCKS_BY_HASH, SEARCH_BLOCKS_BY_NUMBER } from '../graphql/queries';
import { Block, NetworkStats } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { calculateAverageBlockTime } from '../utils/calculateBlockTime';
import RealtimeActivityFeed from '../components/RealtimeActivityFeed';
import ConnectionStatus from '../components/ConnectionStatus';
// import { useRealtimeBlocks, useRealtimeNetworkStats } from '../services/websocketService';

// Query to get recent blocks for calculating average block time
const GET_RECENT_BLOCKS = gql`
  query GetRecentBlocks {
    blocks(limit: 20, order_by: { block_number: desc }) {
      block_number
      timestamp
    }
  }
`;

const HomePage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const blocksPerPage = 20;
  

  // Get initial network statistics with polling
  const { data: statsData, loading: statsLoading } = useQuery(GET_NETWORK_STATS, {
    pollInterval: 3000, // Poll every 3 seconds
  });

  // Get recent blocks for calculating average block time
  const { data: blocksData } = useQuery(GET_RECENT_BLOCKS, {
    pollInterval: 5000, // Poll every 5 seconds
  });

  // Get paginated blocks with polling - use search query if present
  const isSearching = searchQuery.trim().length > 0;
  const searchTerm = searchQuery.trim();
  const isNumericSearch = /^\d+$/.test(searchTerm);
  
  // Choose the appropriate query based on search type
  let queryToUse = GET_LATEST_BLOCKS;
  let queryVariables: any = { 
    limit: blocksPerPage, 
    offset: (currentPage - 1) * blocksPerPage 
  };

  if (isSearching) {
    if (isNumericSearch) {
      queryToUse = SEARCH_BLOCKS_BY_NUMBER;
      queryVariables = {
        blockNumber: parseInt(searchTerm),
        limit: blocksPerPage,
        offset: (currentPage - 1) * blocksPerPage
      };
    } else {
      queryToUse = SEARCH_BLOCKS_BY_HASH;
      queryVariables = {
        search: `%${searchTerm}%`,
        limit: blocksPerPage,
        offset: (currentPage - 1) * blocksPerPage
      };
    }
  }
  
  const { data: blocksQueryData, loading: blocksLoading } = useQuery(queryToUse, {
    variables: queryVariables,
    pollInterval: isSearching ? 0 : 2000, // Don't poll when searching
    skip: isSearching && !searchTerm, // Skip query if searching but no term
  });


  const stats = statsData?.network_stats?.[0] as NetworkStats;
  const blocks = blocksQueryData?.blocks || [];
  // Use the actual latest block number from blocks table for consistency
  const latestBlockFromData = blocksData?.blocks?.[0]?.block_number || blocks?.[0]?.block_number || 0;
  const totalBlocks = typeof latestBlockFromData === 'string' ? parseInt(latestBlockFromData) : latestBlockFromData;
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  
  // Helper function to safely parse numeric values
  const safeParseFloat = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? null : parsed;
  };


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

  const truncateHash = (hash: string) => {
    if (!hash || hash.length < 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  // Calculate average block time from recent blocks
  const avgBlockTime = blocksData?.blocks ? calculateAverageBlockTime(blocksData.blocks) : null;
  // Use the actual latest block from blocks table, not network_stats
  const latestBlockNumber = blocksData?.blocks?.[0]?.block_number || blocks?.[0]?.block_number || '-';

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Filter blocks on current page like old explorer
      setCurrentPage(1); // Reset to first page when searching
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <>
      {/* Connection Status Indicator */}
      <ConnectionStatus position="top-right" showDetails={true} size="md" />
      
      {/* Main Dashboard Grid */}
      <div style={{ 
        // display: 'grid', 
        // gridTemplateColumns: '2fr 1fr', 
        // gap: '2rem',
        // marginBottom: '2rem'
        display: "flex",
        flexWrap: "wrap",
        columnGap: "2rem",
        justifyContent: "center"
      }}>
        {/* Left Column - Main Content */}
        <div  style={{ flex: "auto" }}>
          {/* Summary Cards Row */}
          <div className="summary-grid">
            <div className="asi-card glass">
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Latest Block</p>
              <h3 className="text-success" style={{ margin: 0 }}>
                {statsLoading ? '-' : latestBlockNumber}
              </h3>
            </div>
            <div className="asi-card glass">
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Active Validators</p>
              <h3 style={{ margin: 0 }}>
                {stats?.active_validators || stats?.total_validators || '-'}
              </h3>
            </div>
            <div className="asi-card glass">
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Avg Block Time</p>
              <h3 style={{ margin: 0 }}>
                {avgBlockTime !== null ? `${(avgBlockTime as number).toFixed(1)}s` : 'N/A'}
              </h3>
            </div>
            <div className="asi-card glass">
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Network Status</p>
              <h3 className="text-success" style={{ margin: 0 }}>
                {blocks.length > 0 ? 'Active' : 'Inactive'}
              </h3>
            </div>
          </div>
        </div>
        
        {/* Right Column - Real-time Activity Feed */}
        <RealtimeActivityFeed 
          maxItems={30} 
          showConnectionStatus={false} 
          compact={true}
          height="400px"
        />
      </div>
      
      {/* Recent Blocks Section */}
      <section className="asi-card">
        <div className="section-header">
          <h2 style={isSearching && searchQuery.length > 20 ? { fontSize: '1.5rem' } : {}}>
            {isSearching ? (
              <>
                Search Results for <span style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>"{searchQuery}"</span>
              </>
            ) : 'Recent Blocks'}
          </h2>
          <div className="section-controls">
            <div className="search-box">
              <input 
                type="text"
                placeholder="Search by block number or hash..."
                style={{ flex: '0 1 300px', marginRight: '0.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={handleSearch}
              />
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px 16px' }}
                onClick={() => setCurrentPage(1)}
                disabled={searchQuery === ""}
              >
                Search
              </button>
              {isSearching && (
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '8px 16px' }}
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-indicator" style={{ background: 'var(--asi-lime)' }}></span>
              <span className="text-muted" style={{ fontSize: '14px' }}>Live Updates</span>
            </div>
          </div>
        </div>
        
        {blocksLoading ? (
          <div className="text-center">
            <span className="loading"></span>
            <p className="text-muted mt-2">Loading blocks...</p>
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem' }}>
            <p className="text-muted">No blocks found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Hash</th>
                  <th>Validator</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block: Block) => (
                  <tr key={block.block_number}>
                    <td>
                      <Link to={`/block/${block.block_number}`} className="block-number">
                        {block.block_number}
                      </Link>
                    </td>
                    <td className="hash-cell">
                      <Link to={`/block/${block.block_number}`}>
                        {truncateHash(block.block_hash)}
                      </Link>
                    </td>
                    <td className="mono">
                      {truncateHash(block.proposer)}
                    </td>
                    <td className="timestamp">
                      {formatTimestamp(block.timestamp)}
                    </td>
                    <td>
                      <span className="text-success">✓ Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <>
            <div className="pagination-controls" style={{ marginTop: '2rem' }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                ← Previous
              </button>
              <div className="pagination-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="text-muted">Page</span>
                <input 
                  type="number"
                  value={currentPage}
                  min="1"
                  max={totalPages}
                  style={{ width: '80px', textAlign: 'center' }}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') return; // Don't update on empty input
                    const page = parseInt(value);
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                      goToPage(page);
                    }
                  }}
                  onBlur={(e) => {
                    // Reset to current page if invalid
                    if (e.target.value === '' || parseInt(e.target.value) < 1 || parseInt(e.target.value) > totalPages) {
                      e.target.value = currentPage.toString();
                    }
                  }}
                />
                <span className="text-muted">of {totalPages}</span>
              </div>
              <button 
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                Next →
              </button>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <span className="text-muted">
                Showing {((currentPage - 1) * blocksPerPage) + 1}-{Math.min(currentPage * blocksPerPage, totalBlocks)} of {totalBlocks} blocks
              </span>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default HomePage;