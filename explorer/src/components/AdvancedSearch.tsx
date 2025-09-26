import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from './AnimatePresenceWrapper';
import { useQuery, useLazyQuery } from '@apollo/client';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  Hash, 
  User, 
  Activity, 
  FileText,
  ChevronDown,
  Clock,
  TrendingUp,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Block, Transfer, Deployment } from '../types';

// Enhanced GraphQL queries for advanced search
import { gql } from '@apollo/client';

const ADVANCED_SEARCH_BLOCKS = gql`
  query AdvancedSearchBlocks(
    $search: String,
    $proposer: String,
    $minBlockNumber: bigint,
    $maxBlockNumber: bigint,
    $startDate: timestamptz,
    $endDate: timestamptz,
    $limit: Int = 10,
    $offset: Int = 0
  ) {
    blocks(
      where: {
        _and: [
          { block_hash: { _ilike: $search } }
          { proposer: { _ilike: $proposer } }
          { block_number: { _gte: $minBlockNumber } }
          { block_number: { _lte: $maxBlockNumber } }
          { timestamp: { _gte: $startDate } }
          { timestamp: { _lte: $endDate } }
        ]
      }
      order_by: { block_number: desc }
      limit: $limit
      offset: $offset
    ) {
      block_number
      block_hash
      parent_hash
      timestamp
      proposer
      deployment_count
      state_hash
      finalization_status
      created_at
    }
    blocks_aggregate(
      where: {
        _and: [
          { block_hash: { _ilike: $search } }
          { proposer: { _ilike: $proposer } }
          { block_number: { _gte: $minBlockNumber } }
          { block_number: { _lte: $maxBlockNumber } }
          { timestamp: { _gte: $startDate } }
          { timestamp: { _lte: $endDate } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const ADVANCED_SEARCH_TRANSFERS = gql`
  query AdvancedSearchTransfers(
    $fromAddress: String,
    $toAddress: String,
    $minAmount: numeric,
    $maxAmount: numeric,
    $status: String,
    $startDate: timestamptz,
    $endDate: timestamptz,
    $limit: Int = 10,
    $offset: Int = 0
  ) {
    transfers(
      where: {
        _and: [
          { from_address: { _ilike: $fromAddress } }
          { to_address: { _ilike: $toAddress } }
          { amount_rev: { _gte: $minAmount } }
          { amount_rev: { _lte: $maxAmount } }
          { status: { _ilike: $status } }
          { created_at: { _gte: $startDate } }
          { created_at: { _lte: $endDate } }
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
        timestamp
      }
      block {
        block_number
        timestamp
        proposer
      }
    }
    transfers_aggregate(
      where: {
        _and: [
          { from_address: { _ilike: $fromAddress } }
          { to_address: { _ilike: $toAddress } }
          { amount_rev: { _gte: $minAmount } }
          { amount_rev: { _lte: $maxAmount } }
          { status: { _ilike: $status } }
          { created_at: { _gte: $startDate } }
          { created_at: { _lte: $endDate } }
        ]
      }
    ) {
      aggregate {
        count
        sum {
          amount_rev
        }
        avg {
          amount_rev
        }
      }
    }
  }
`;

const ADVANCED_SEARCH_DEPLOYMENTS = gql`
  query AdvancedSearchDeployments(
    $deployer: String,
    $deploymentType: String,
    $status: String,
    $errored: Boolean,
    $minPhloCost: numeric,
    $maxPhloCost: numeric,
    $startDate: timestamptz,
    $endDate: timestamptz,
    $limit: Int = 10,
    $offset: Int = 0
  ) {
    deployments(
      where: {
        _and: [
          { deployer: { _ilike: $deployer } }
          { deployment_type: { _ilike: $deploymentType } }
          { status: { _ilike: $status } }
          { errored: { _eq: $errored } }
          { phlo_cost: { _gte: $minPhloCost } }
          { phlo_cost: { _lte: $maxPhloCost } }
          { timestamp: { _gte: $startDate } }
          { timestamp: { _lte: $endDate } }
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
    }
    deployments_aggregate(
      where: {
        _and: [
          { deployer: { _ilike: $deployer } }
          { deployment_type: { _ilike: $deploymentType } }
          { status: { _ilike: $status } }
          { errored: { _eq: $errored } }
          { phlo_cost: { _gte: $minPhloCost } }
          { phlo_cost: { _lte: $maxPhloCost } }
          { timestamp: { _gte: $startDate } }
          { timestamp: { _lte: $endDate } }
        ]
      }
    ) {
      aggregate {
        count
        sum {
          phlo_cost
        }
        avg {
          phlo_cost
        }
      }
    }
  }
`;

const QUICK_SEARCH = gql`
  query QuickSearch($query: String!) {
    # Search blocks by number or hash
    blocks(
      where: {
        _or: [
          { block_hash: { _ilike: $query } }
          { block_number: { _eq: $query } }
        ]
      }
      limit: 5
      order_by: { block_number: desc }
    ) {
      block_number
      block_hash
      proposer
      timestamp
    }
    
    # Search transfers by addresses
    transfers(
      where: {
        _or: [
          { from_address: { _ilike: $query } }
          { to_address: { _ilike: $query } }
          { deploy_id: { _ilike: $query } }
        ]
      }
      limit: 5
      order_by: { created_at: desc }
    ) {
      id
      deploy_id
      from_address
      to_address
      amount_rev
      status
      created_at
    }
    
    # Search deployments by deployer or deploy_id
    deployments(
      where: {
        _or: [
          { deployer: { _ilike: $query } }
          { deploy_id: { _ilike: $query } }
        ]
      }
      limit: 5
      order_by: { timestamp: desc }
    ) {
      deploy_id
      deployer
      deployment_type
      timestamp
      errored
    }
  }
`;

interface SearchFilters {
  searchType: 'all' | 'blocks' | 'transfers' | 'deployments';
  query: string;
  
  // Block filters
  proposer: string;
  minBlockNumber: string;
  maxBlockNumber: string;
  
  // Transfer filters
  fromAddress: string;
  toAddress: string;
  minAmount: string;
  maxAmount: string;
  transferStatus: string;
  
  // Deployment filters
  deployer: string;
  deploymentType: string;
  deploymentStatus: string;
  errored: boolean | null;
  minPhloCost: string;
  maxPhloCost: string;
  
  // Date filters
  startDate: string;
  endDate: string;
}

interface SearchResult {
  type: 'block' | 'transfer' | 'deployment';
  data: Block | Transfer | Deployment;
  id: string;
  title: string;
  description: string;
  timestamp: number;
}

interface AdvancedSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  embedded?: boolean;
  placeholder?: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onResultSelect,
  embedded = false,
  placeholder = "Search blocks, transactions, addresses..."
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [filters, setFilters] = useState<SearchFilters>({
    searchType: 'all',
    query: '',
    proposer: '',
    minBlockNumber: '',
    maxBlockNumber: '',
    fromAddress: '',
    toAddress: '',
    minAmount: '',
    maxAmount: '',
    transferStatus: '',
    deployer: '',
    deploymentType: '',
    deploymentStatus: '',
    errored: null,
    minPhloCost: '',
    maxPhloCost: '',
    startDate: '',
    endDate: ''
  });

  // Lazy query hooks for different search types
  const [searchBlocks, { data: blocksData, loading: blocksLoading }] = useLazyQuery(ADVANCED_SEARCH_BLOCKS);
  const [searchTransfers, { data: transfersData, loading: transfersLoading }] = useLazyQuery(ADVANCED_SEARCH_TRANSFERS);
  const [searchDeployments, { data: deploymentsData, loading: deploymentsLoading }] = useLazyQuery(ADVANCED_SEARCH_DEPLOYMENTS);
  const [quickSearch, { data: quickSearchData, loading: quickSearchLoading }] = useLazyQuery(QUICK_SEARCH);

  // Debounced search function
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const debouncedSearch = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery, searchFilters);
    }, 300);
  }, []);

  const performSearch = async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim() && !hasActiveFilters(searchFilters)) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      if (searchQuery.trim() && !hasActiveFilters(searchFilters)) {
        // Quick search when only query is provided
        await quickSearch({
          variables: {
            query: `%${searchQuery}%`
          }
        });
      } else {
        // Advanced search with filters
        const limit = 20;
        const offset = (currentPage - 1) * limit;
        
        if (searchFilters.searchType === 'all' || searchFilters.searchType === 'blocks') {
          const blockVariables = {
            search: searchQuery ? `%${searchQuery}%` : null,
            proposer: searchFilters.proposer ? `%${searchFilters.proposer}%` : null,
            minBlockNumber: searchFilters.minBlockNumber || null,
            maxBlockNumber: searchFilters.maxBlockNumber || null,
            startDate: searchFilters.startDate || null,
            endDate: searchFilters.endDate || null,
            limit,
            offset
          };
          
          await searchBlocks({ variables: blockVariables });
        }
        
        if (searchFilters.searchType === 'all' || searchFilters.searchType === 'transfers') {
          const transferVariables = {
            fromAddress: searchFilters.fromAddress ? `%${searchFilters.fromAddress}%` : null,
            toAddress: searchFilters.toAddress ? `%${searchFilters.toAddress}%` : null,
            minAmount: searchFilters.minAmount || null,
            maxAmount: searchFilters.maxAmount || null,
            status: searchFilters.transferStatus ? `%${searchFilters.transferStatus}%` : null,
            startDate: searchFilters.startDate || null,
            endDate: searchFilters.endDate || null,
            limit,
            offset
          };
          
          await searchTransfers({ variables: transferVariables });
        }
        
        if (searchFilters.searchType === 'all' || searchFilters.searchType === 'deployments') {
          const deploymentVariables = {
            deployer: searchFilters.deployer ? `%${searchFilters.deployer}%` : null,
            deploymentType: searchFilters.deploymentType ? `%${searchFilters.deploymentType}%` : null,
            status: searchFilters.deploymentStatus ? `%${searchFilters.deploymentStatus}%` : null,
            errored: searchFilters.errored,
            minPhloCost: searchFilters.minPhloCost || null,
            maxPhloCost: searchFilters.maxPhloCost || null,
            startDate: searchFilters.startDate || null,
            endDate: searchFilters.endDate || null,
            limit,
            offset
          };
          
          await searchDeployments({ variables: deploymentVariables });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const hasActiveFilters = (searchFilters: SearchFilters) => {
    return Object.entries(searchFilters).some(([key, value]) => {
      if (key === 'searchType' || key === 'query') return false;
      return value !== '' && value !== null;
    });
  };

  // Process search results
  useEffect(() => {
    const results: SearchResult[] = [];
    
    if (quickSearchData) {
      // Process quick search results
      quickSearchData.blocks?.forEach((block: Block) => {
        results.push({
          type: 'block',
          data: block,
          id: `block-${block.block_number}`,
          title: `Block #${block.block_number}`,
          description: `Proposed by ${block.proposer.slice(0, 12)}...`,
          timestamp: block.timestamp
        });
      });
      
      quickSearchData.transfers?.forEach((transfer: Transfer) => {
        results.push({
          type: 'transfer',
          data: transfer,
          id: `transfer-${transfer.id}`,
          title: `Transfer: ${transfer.amount_rev} REV`,
          description: `From ${transfer.from_address.slice(0, 12)}... to ${transfer.to_address.slice(0, 12)}...`,
          timestamp: new Date(transfer.created_at).getTime()
        });
      });
      
      quickSearchData.deployments?.forEach((deployment: Deployment) => {
        results.push({
          type: 'deployment',
          data: deployment,
          id: `deployment-${deployment.deploy_id}`,
          title: `Deployment by ${deployment.deployer.slice(0, 12)}...`,
          description: deployment.deployment_type || 'Unknown type',
          timestamp: deployment.timestamp
        });
      });
    }
    
    if (blocksData) {
      blocksData.blocks?.forEach((block: Block) => {
        results.push({
          type: 'block',
          data: block,
          id: `block-${block.block_number}`,
          title: `Block #${block.block_number}`,
          description: `${block.deployment_count} deployments • ${block.finalization_status || 'Unknown status'}`,
          timestamp: block.timestamp
        });
      });
      setTotalResults(blocksData.blocks_aggregate?.aggregate?.count || 0);
    }
    
    if (transfersData) {
      transfersData.transfers?.forEach((transfer: Transfer) => {
        results.push({
          type: 'transfer',
          data: transfer,
          id: `transfer-${transfer.id}`,
          title: `${transfer.amount_rev} REV Transfer`,
          description: `${transfer.status} • Block #${transfer.block_number}`,
          timestamp: new Date(transfer.created_at).getTime()
        });
      });
      if (!totalResults) {
        setTotalResults(transfersData.transfers_aggregate?.aggregate?.count || 0);
      }
    }
    
    if (deploymentsData) {
      deploymentsData.deployments?.forEach((deployment: Deployment) => {
        results.push({
          type: 'deployment',
          data: deployment,
          id: `deployment-${deployment.deploy_id}`,
          title: `${deployment.deployment_type || 'Deployment'}`,
          description: `${deployment.phlo_cost} phlo • ${deployment.errored ? 'Failed' : 'Success'}`,
          timestamp: deployment.timestamp
        });
      });
      if (!totalResults) {
        setTotalResults(deploymentsData.deployments_aggregate?.aggregate?.count || 0);
      }
    }
    
    // Sort results by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);
    setSearchResults(results);
  }, [quickSearchData, blocksData, transfersData, deploymentsData]);

  const handleInputChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
    debouncedSearch(value, filters);
    setIsOpen(true);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    debouncedSearch(newFilters.query, newFilters);
  };

  const handleResultSelect = (result: SearchResult) => {
    setIsOpen(false);
    setSelectedResult(-1);
    
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      // Default navigation behavior
      switch (result.type) {
        case 'block':
          navigate(`/block/${(result.data as Block).block_number}`);
          break;
        case 'transfer':
          // Navigate to transfer or deployment detail page
          const transfer = result.data as Transfer;
          if (transfer.deploy_id) {
            // Could navigate to deployment page with transfer highlighted
            navigate(`/deployments?highlight=${transfer.deploy_id}`);
          }
          break;
        case 'deployment':
          navigate(`/deployments?highlight=${(result.data as Deployment).deploy_id}`);
          break;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedResult(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedResult(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedResult >= 0) {
          handleResultSelect(searchResults[selectedResult]);
        } else if (searchResults.length > 0) {
          handleResultSelect(searchResults[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedResult(-1);
        break;
    }
  };

  const clearFilters = () => {
    setFilters({
      searchType: 'all',
      query: '',
      proposer: '',
      minBlockNumber: '',
      maxBlockNumber: '',
      fromAddress: '',
      toAddress: '',
      minAmount: '',
      maxAmount: '',
      transferStatus: '',
      deployer: '',
      deploymentType: '',
      deploymentStatus: '',
      errored: null,
      minPhloCost: '',
      maxPhloCost: '',
      startDate: '',
      endDate: ''
    });
    setSearchResults([]);
    setIsOpen(false);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'block':
        return <Database size={16} style={{ color: '#10b981' }} />;
      case 'transfer':
        return <TrendingUp size={16} style={{ color: '#3b82f6' }} />;
      case 'deployment':
        return <FileText size={16} style={{ color: '#f59e0b' }} />;
      default:
        return <Hash size={16} />;
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedResult(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchContainerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Main Search Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={filters.query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '0.75rem 3rem 0.75rem 2.5rem',
            fontSize: '1rem',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          className="search-input"
        />
        
        <Search 
          size={20} 
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af'
          }}
        />
        
        <div style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {(isSearching || quickSearchLoading || blocksLoading || transfersLoading || deploymentsLoading) && (
            <div className="loading" style={{ width: '16px', height: '16px' }} />
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '0.25rem',
              border: 'none',
              background: 'transparent',
              color: showFilters ? '#10b981' : '#9ca3af',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Advanced Filters"
          >
            <Filter size={16} />
          </button>
          
          {filters.query && (
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, query: '' }));
                setSearchResults([]);
                setIsOpen(false);
              }}
              style={{
                padding: '0.25rem',
                border: 'none',
                background: 'transparent',
                color: '#9ca3af',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        <div className="advanced-searcher">

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: '0.5rem',
              padding: '1rem',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              position: 'absolute',
              zIndex: 5,
              width: '100%',
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h4 style={{ margin: 0, color: '#fff' }}>Filters</h4>
              <button
                onClick={clearFilters}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Clear All
              </button>
            </div>
            
            {/* Search Type Filter */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem',
                color: '#d1d5db',
                fontWeight: '500'
              }}>
                Search Type
              </label>
              <select
                value={filters.searchType}
                onChange={(e) => handleFilterChange('searchType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: '#121313',
                  color: '#fff'
                }}
              >
                <option value="all">All Types</option>
                <option value="blocks">Blocks</option>
                <option value="transfers">Transfers</option>
                <option value="deployments">Deployments</option>
              </select>
            </div>

            {/* Date Range Filters */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem',
                  color: '#d1d5db',
                  fontWeight: '500'
                }}>
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    
                  }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem',
                  color: '#d1d5db',
                  fontWeight: '500'
                }}>
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
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

            {/* Block-specific filters */}
            {(filters.searchType === 'all' || filters.searchType === 'blocks') && (
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Block Filters</h5>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '0.75rem'
                }}>
                  <input
                    type="text"
                    placeholder="Proposer address"
                    value={filters.proposer}
                    onChange={(e) => handleFilterChange('proposer', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Min block number"
                    value={filters.minBlockNumber}
                    onChange={(e) => handleFilterChange('minBlockNumber', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Max block number"
                    value={filters.maxBlockNumber}
                    onChange={(e) => handleFilterChange('maxBlockNumber', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Transfer-specific filters */}
            {(filters.searchType === 'all' || filters.searchType === 'transfers') && (
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Transfer Filters</h5>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '0.75rem'
                }}>
                  <input
                    type="text"
                    placeholder="From address"
                    value={filters.fromAddress}
                    onChange={(e) => handleFilterChange('fromAddress', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="To address"
                    value={filters.toAddress}
                    onChange={(e) => handleFilterChange('toAddress', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Min amount (REV)"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Max amount (REV)"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <select
                    value={filters.transferStatus}
                    onChange={(e) => handleFilterChange('transferStatus', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  >
                    <option value="">Any Status</option>
                    <option value="success">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            )}

            {/* Deployment-specific filters */}
            {(filters.searchType === 'all' || filters.searchType === 'deployments') && (
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b' }}>Deployment Filters</h5>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '0.75rem'
                }}>
                  <input
                    type="text"
                    placeholder="Deployer address"
                    value={filters.deployer}
                    onChange={(e) => handleFilterChange('deployer', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Deployment type"
                    value={filters.deploymentType}
                    onChange={(e) => handleFilterChange('deploymentType', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Min phlo cost"
                    value={filters.minPhloCost}
                    onChange={(e) => handleFilterChange('minPhloCost', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Max phlo cost"
                    value={filters.maxPhloCost}
                    onChange={(e) => handleFilterChange('maxPhloCost', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  />
                  <select
                    value={filters.errored === null ? '' : filters.errored.toString()}
                    onChange={(e) => handleFilterChange('errored', e.target.value === '' ? null : e.target.value === 'true')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff'
                    }}
                  >
                    <option value="">Any Status</option>
                    <option value="false">Successful</option>
                    <option value="true">Failed</option>
                  </select>
                </div>
              </div>
            )}
          </motion.div>
        )}
        </div>
      </AnimatePresence>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (searchResults.length > 0 || isSearching) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            {isSearching && (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                <div className="loading" style={{ marginBottom: '0.5rem' }} />
                Searching...
              </div>
            )}
            
            {searchResults.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleResultSelect(result)}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  backgroundColor: selectedResult === index ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={() => setSelectedResult(index)}
                onMouseLeave={() => setSelectedResult(-1)}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem'
                }}>
                  <div style={{ marginTop: '0.125rem' }}>
                    {getResultIcon(result.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '500',
                      color: '#fff',
                      marginBottom: '0.25rem'
                    }}>
                      {truncateText(result.title, 60)}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#9ca3af',
                      marginBottom: '0.25rem'
                    }}>
                      {truncateText(result.description, 80)}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}
                      <span style={{ margin: '0 0.25rem' }}>•</span>
                      <span style={{ 
                        textTransform: 'capitalize',
                        color: result.type === 'block' ? '#10b981' : 
                              result.type === 'transfer' ? '#3b82f6' : '#f59e0b'
                      }}>
                        {result.type}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {searchResults.length === 0 && !isSearching && filters.query && (
              <div style={{ 
                padding: '2rem 1rem', 
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <Search size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No results found for "{filters.query}"</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
            
            {totalResults > searchResults.length && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                textAlign: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                color: '#9ca3af',
                fontSize: '0.875rem'
              }}>
                Showing {searchResults.length} of {totalResults} results
                {totalResults > 20 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setCurrentPage(prev => prev + 1);
                        performSearch(filters.query, filters);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        color: '#10b981',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Load More Results
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedSearch;