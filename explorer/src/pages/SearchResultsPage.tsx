import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatePresence } from '../components/AnimatePresenceWrapper';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download, 
  Eye,
  Database,
  TrendingUp,
  FileText,
  Calendar,
  User,
  Hash,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AdvancedSearch from '../components/AdvancedSearch';
import { Block, Transfer, Deployment } from '../types';

interface SearchResult {
  type: 'block' | 'transfer' | 'deployment';
  data: Block | Transfer | Deployment;
  id: string;
  title: string;
  description: string;
  timestamp: number;
  relevanceScore: number;
}

const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'relevance' | 'timestamp' | 'type'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'blocks' | 'transfers' | 'deployments'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchStats, setSearchStats] = useState({
    blocks: 0,
    transfers: 0,
    deployments: 0,
    totalTime: 0
  });

  const query = searchParams.get('q') || '';
  const resultsPerPage = 20;

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, sortBy, sortOrder, filterType, currentPage]);

  const performSearch = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      // Simulate search API call
      // In a real implementation, this would call your GraphQL endpoint
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock search results - replace with actual GraphQL query
      const mockResults: SearchResult[] = [
        {
          type: 'block',
          data: {
            block_number: 12345,
            block_hash: '0x1234567890abcdef',
            parent_hash: '0x9876543210fedcba',
            timestamp: Date.now() - 120000,
            proposer: '0xabcdef1234567890',
            deployment_count: 5,
            created_at: new Date().toISOString()
          } as Block,
          id: 'block-12345',
          title: 'Block #12345',
          description: 'Contains 5 deployments, proposed by 0xabcdef12...',
          timestamp: Date.now() - 120000,
          relevanceScore: 0.95
        },
        {
          type: 'transfer',
          data: {
            id: 1,
            from_address: '0x1111111111111111',
            to_address: '0x2222222222222222',
            amount_rev: 100,
            status: 'success',
            block_number: 12344,
            created_at: new Date().toISOString()
          } as Transfer,
          id: 'transfer-1',
          title: '100 REV Transfer',
          description: 'From 0x111111... to 0x222222... in block #12344',
          timestamp: Date.now() - 180000,
          relevanceScore: 0.87
        },
        {
          type: 'deployment',
          data: {
            deploy_id: '0xdeployment123',
            deployer: '0x3333333333333333',
            term: 'contract code here',
            timestamp: Date.now() - 240000,
            deployment_type: 'smart_contract',
            phlo_cost: 1000,
            errored: false,
            created_at: new Date().toISOString()
          } as Deployment,
          id: 'deployment-123',
          title: 'Smart Contract Deployment',
          description: 'Deployed by 0x333333... with 1000 phlo cost',
          timestamp: Date.now() - 240000,
          relevanceScore: 0.72
        }
      ];

      // Filter by type
      const filteredResults = filterType === 'all' 
        ? mockResults 
        : mockResults.filter(result => {
            // Map plural filter types to singular result types
            const singularType = filterType.replace(/s$/, ''); // Remove trailing 's'
            return result.type === singularType;
          });

      // Sort results
      const sortedResults = [...filteredResults].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'relevance':
            comparison = b.relevanceScore - a.relevanceScore;
            break;
          case 'timestamp':
            comparison = b.timestamp - a.timestamp;
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
        }
        
        return sortOrder === 'desc' ? comparison : -comparison;
      });

      setSearchResults(sortedResults);
      setTotalResults(sortedResults.length);
      
      // Update search stats
      const stats = filteredResults.reduce((acc, result) => {
        acc[result.type + 's'] = (acc[result.type + 's'] || 0) + 1;
        return acc;
      }, { blocks: 0, transfers: 0, deployments: 0 } as any);
      
      setSearchStats({
        ...stats,
        totalTime: Date.now() - startTime
      });
      
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultSelect = (result: any) => {
    // Navigation handled by AdvancedSearch component
    // Result might not have relevanceScore from AdvancedSearch
  };

  const exportResults = (format: 'csv' | 'json') => {
    const dataToExport = searchResults.map(result => ({
      type: result.type,
      title: result.title,
      description: result.description,
      timestamp: new Date(result.timestamp).toISOString(),
      relevanceScore: result.relevanceScore,
      ...result.data
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results-${query}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Simple CSV export - in production, use a proper CSV library
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => JSON.stringify((row as any)[header] || '')).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results-${query}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'block':
        return <Database size={20} style={{ color: '#10b981' }} />;
      case 'transfer':
        return <TrendingUp size={20} style={{ color: '#3b82f6' }} />;
      case 'deployment':
        return <FileText size={20} style={{ color: '#f59e0b' }} />;
      default:
        return <Hash size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'block': return '#10b981';
      case 'transfer': return '#3b82f6';
      case 'deployment': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderGridView = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '1.5rem'
    }}>
      {searchResults.map((result, index) => (
        <motion.div
          key={result.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="asi-card"
          style={{
            padding: '1.5rem',
            cursor: 'pointer',
            border: `1px solid ${getTypeColor(result.type)}20`,
            transition: 'all 0.2s ease'
          }}
          whileHover={{
            scale: 1.02,
            borderColor: getTypeColor(result.type)
          }}
          onClick={() => handleResultSelect(result)}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '0.5rem',
              borderRadius: '8px',
              backgroundColor: `${getTypeColor(result.type)}20`
            }}>
              {getResultIcon(result.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                marginBottom: '0.5rem'
              }}>
                {result.title}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#d1d5db',
                lineHeight: '1.4'
              }}>
                {result.description}
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#9ca3af'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Clock size={12} />
              {formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}
            </div>
            <div style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: `${getTypeColor(result.type)}20`,
              color: getTypeColor(result.type),
              textTransform: 'capitalize',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {result.type}
            </div>
          </div>
          
          <div style={{
            marginTop: '0.75rem',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${result.relevanceScore * 100}%`,
              backgroundColor: getTypeColor(result.type),
              borderRadius: '2px'
            }} />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="asi-card">
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Description</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Relevance</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {searchResults.map((result, index) => (
              <motion.tr
                key={result.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer'
                }}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                onClick={() => handleResultSelect(result)}
              >
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {getResultIcon(result.type)}
                    <span style={{
                      color: getTypeColor(result.type),
                      textTransform: 'capitalize',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {result.type}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#fff'
                  }}>
                    {result.title}
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#d1d5db',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {result.description}
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af'
                  }}>
                    {formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${result.relevanceScore * 100}%`,
                        backgroundColor: getTypeColor(result.type),
                        borderRadius: '2px'
                      }} />
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af'
                    }}>
                      {Math.round(result.relevanceScore * 100)}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResultSelect(result);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: `1px solid ${getTypeColor(result.type)}`,
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: getTypeColor(result.type),
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Eye size={12} />
                    View
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>Search Results</h1>
        
        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <AdvancedSearch 
            onResultSelect={handleResultSelect}
            placeholder={`Search for "${query}" in blocks, transfers, deployments...`}
          />
        </div>

        {/* Search Stats */}
        {query && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            fontSize: '0.875rem',
            color: '#9ca3af',
            marginBottom: '1rem'
          }}>
            <span>
              Found <strong>{totalResults}</strong> results for "<strong>{query}</strong>"
            </span>
            <span>
              Search completed in <strong>{searchStats.totalTime}ms</strong>
            </span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {searchStats.blocks > 0 && (
                <span style={{ color: '#10b981' }}>
                  {searchStats.blocks} blocks
                </span>
              )}
              {searchStats.transfers > 0 && (
                <span style={{ color: '#3b82f6' }}>
                  {searchStats.transfers} transfers
                </span>
              )}
              {searchStats.deployments > 0 && (
                <span style={{ color: '#f59e0b' }}>
                  {searchStats.deployments} deployments
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="asi-card" style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Left side controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Filter by type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff'
                }}
              >
                <option value="all">All Types</option>
                <option value="blocks">Blocks</option>
                <option value="transfers">Transfers</option>
                <option value="deployments">Deployments</option>
              </select>
            </div>

            {/* Sort controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff'
                }}
              >
                <option value="relevance">Relevance</option>
                <option value="timestamp">Date</option>
                <option value="type">Type</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff'
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Right side controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* View mode toggle */}
            <div style={{
              display: 'flex',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  backgroundColor: viewMode === 'list' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: viewMode === 'list' ? '#10b981' : '#9ca3af',
                  cursor: 'pointer'
                }}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  backgroundColor: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: viewMode === 'grid' ? '#10b981' : '#9ca3af',
                  cursor: 'pointer'
                }}
              >
                <Grid size={16} />
              </button>
            </div>

            {/* Export dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    exportResults(e.target.value as 'csv' | 'json');
                    e.target.value = '';
                  }
                }}
                style={{
                  padding: '0.5rem 2rem 0.5rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  appearance: 'none'
                }}
              >
                <option value="">Export...</option>
                <option value="json">Export as JSON</option>
                <option value="csv">Export as CSV</option>
              </select>
              <Download 
                size={14} 
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#9ca3af'
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: '#9ca3af'
            }}
          >
            <div className="loading" style={{ marginRight: '1rem' }} />
            Searching...
          </motion.div>
        ) : searchResults.length === 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="asi-card"
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}
          >
            <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Results Found</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Try adjusting your search terms or using different filters
            </p>
            <button
              onClick={() => {
                setSearchParams({});
                setFilterType('all');
                setSearchResults([]);
              }}
              className="btn btn-secondary"
            >
              Clear Search
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {viewMode === 'grid' ? renderGridView() : renderListView()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalResults > resultsPerPage && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '2rem'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          
          <span style={{ color: '#9ca3af' }}>
            Page {currentPage} of {Math.ceil(totalResults / resultsPerPage)}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= Math.ceil(totalResults / resultsPerPage)}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;