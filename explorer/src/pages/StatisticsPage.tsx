import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { motion } from 'framer-motion';
import { AnimatePresence } from '../components/AnimatePresenceWrapper';
import { BarChart3, TrendingUp, Database, Activity } from 'lucide-react';
import { GET_NETWORK_STATS, GET_LATEST_BLOCKS } from '../graphql/queries';
import { NetworkStats } from '../types';
import { calculateAverageBlockTime, getBlockTimeRange } from '../utils/calculateBlockTime';
import { useGenesisFunding } from '../hooks/useGenesisFunding';
import NetworkDashboard from '../components/NetworkDashboard';
import BlockVisualization from '../components/BlockVisualization';

// Query to get recent blocks for calculating average block time
const GET_RECENT_BLOCKS = gql`
  query GetRecentBlocks {
    blocks(limit: 20, order_by: { block_number: desc }) {
      block_number
      timestamp
    }
  }
`;

// Query to get statistics without aggregates
const GET_STATISTICS_DATA = gql`
  query GetStatisticsData {
    # Get counts by fetching limited data
    blocks(limit: 1, order_by: { block_number: desc }) {
      block_number
    }
    deployments(limit: 1000, order_by: { timestamp: desc }) {
      deploy_id
      deployment_type
      error_message
      timestamp
    }
    transfers(limit: 1000, order_by: { created_at: desc }) {
      id
      amount_rev
      status
    }
    validators {
      public_key
      status
    }
  }
`;

const StatisticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'blocks' | 'legacy'>('dashboard');
  
  // Poll every 2 seconds for real-time updates
  const { data: networkStatsData, loading: networkLoading, error: networkError } = useQuery(GET_NETWORK_STATS, {
    pollInterval: 2000, // Poll every 2 seconds
  });
  
  // Get statistics data without aggregates
  const { data: statsData, loading: statsLoading, error: statsError } = useQuery(GET_STATISTICS_DATA, {
    pollInterval: 5000, // Poll every 5 seconds
  });
  
  // Get recent blocks for calculating average block time and visualization
  const { data: blocksData } = useQuery(GET_RECENT_BLOCKS, {
    pollInterval: 5000, // Poll every 5 seconds
  });

  // Get more blocks for comprehensive visualization
  const { data: moreBlocksData } = useQuery(GET_LATEST_BLOCKS, {
    variables: { limit: 100 },
    pollInterval: 5000,
  });

  const stats = networkStatsData?.network_stats?.[0] as NetworkStats;
  const blocks = moreBlocksData?.blocks || [];
  
  // Calculate aggregates from actual data
  const deployments = statsData?.deployments || [];
  const transfers = statsData?.transfers || [];
  const validators = statsData?.validators || [];
  const latestBlock = statsData?.blocks?.[0];
  
  // Calculate deployment statistics
  const totalDeployments = deployments.length;
  const failedDeployments = deployments.filter((d: any) => d.error_message && d.error_message.length > 0).length;
  // Since phlo_cost and phlo_price are not available, we'll set default values
  const avgPhloCost = 0; // Not available in this endpoint
  const avgPhloPrice = 1; // Default price
    
  // Calculate transfer statistics
  const totalTransfers = transfers.length;
  const failedTransfers = transfers.filter((t: any) => t.status !== 'success').length;
  const totalRevTransferred = transfers.reduce((sum: number, t: any) => sum + (parseFloat(t.amount_rev) || 0), 0);
  const avgRevAmount = transfers.length > 0 ? totalRevTransferred / transfers.length : 0;
  
  // Calculate validator statistics
  const totalValidators = validators.length;
  const activeValidators = validators.filter((v: any) => v.status === 'active').length;
  
  // Get genesis funding for complete transfer statistics
  const { genesisFundings } = useGenesisFunding();
  
  // Helper function to safely parse numeric values
  const safeParseFloat = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? null : parsed;
  };

  // Calculate average block time from recent blocks
  const avgBlockTime = blocksData?.blocks ? calculateAverageBlockTime(blocksData.blocks) : null;
  
  // Calculate total REV including genesis funding
  const genesisRevTotal = genesisFundings.reduce((sum, funding) => sum + funding.amount_rev, 0);
  const totalRevWithGenesis = (totalRevTransferred || 0) + genesisRevTotal;
  const totalTransfersWithGenesis = totalTransfers + genesisFundings.length;
  
  // Calculate success rates
  const deploymentSuccessRate = totalDeployments > 0 ? ((totalDeployments - failedDeployments) / totalDeployments * 100) : 100;
  const transferSuccessRate = totalTransfers > 0 ? ((totalTransfers - failedTransfers) / totalTransfers * 100) : 100;
  
  const loading = networkLoading || statsLoading;
  const error = networkError || statsError;

  if (loading && !networkStatsData && !statsData) {
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
        <p>Loading network statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="asi-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
          Error loading statistics
        </div>
        <p style={{ color: '#9ca3af' }}>{error.message}</p>
      </div>
    );
  }

  const tabs = [
    { 
      key: 'dashboard', 
      label: 'Network Dashboard', 
      icon: <Activity size={16} />,
      description: 'Real-time network monitoring and analytics'
    },
    { 
      key: 'blocks', 
      label: 'Block Visualization', 
      icon: <Database size={16} />,
      description: 'Interactive block data visualization'
    },
    { 
      key: 'legacy', 
      label: 'Legacy Stats', 
      icon: <BarChart3 size={16} />,
      description: 'Traditional statistics view'
    }
  ];

  const renderLegacyStats = () => (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Network Statistics</h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        <div className="asi-card">
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#10b981'
          }}>
            <Database size={20} />
            Block Statistics
          </h3>
          <div style={{ gap: '0.75rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Total Blocks:</span>
              <strong>{latestBlock?.block_number || 0}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Latest Block:</span>
              <strong>#{latestBlock?.block_number || 0}</strong>
            </div>
          </div>
        </div>
        
        <div className="asi-card">
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#f59e0b'
          }}>
            <Activity size={20} />
            Deployment Statistics
          </h3>
          <div style={{ gap: '0.75rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Total Deployments:</span>
              <strong>{totalDeployments}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Failed Deployments:</span>
              <strong style={{ color: '#ef4444' }}>
                {failedDeployments}
              </strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Average Cost:</span>
              <strong>{avgPhloCost > 0 ? `${avgPhloCost.toFixed(2)} phlo` : 'N/A'}</strong>
            </div>
          </div>
        </div>
        
        <div className="asi-card">
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#3b82f6'
          }}>
            <TrendingUp size={20} />
            Transfer Statistics
          </h3>
          <div style={{ gap: '0.75rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Total Transfers:</span>
              <strong>{totalTransfers}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Failed Transfers:</span>
              <strong style={{ color: '#ef4444' }}>
                {failedTransfers}
              </strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Total Volume:</span>
              <strong>{totalRevTransferred.toFixed(2)} REV</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Average Amount:</span>
              <strong>{avgRevAmount.toFixed(2)} REV</strong>
            </div>
          </div>
        </div>
        
        <div className="asi-card">
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#8b5cf6'
          }}>
            <BarChart3 size={20} />
            Validator Statistics
          </h3>
          <div style={{ gap: '0.75rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Total Validators:</span>
              <strong>{totalValidators}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Active Validators:</span>
              <strong style={{ color: '#10b981' }}>{stats?.active_validators || activeValidators}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>In Quarantine:</span>
              <strong style={{ color: '#f59e0b' }}>{stats?.validators_in_quarantine || 0}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <span>Consensus Participation:</span>
              <strong>{stats?.consensus_participation?.toFixed(1) || 0}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
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
              padding: '1rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === tab.key ? '#10b981' : 'transparent',
              color: activeTab === tab.key ? '#000' : '#9ca3af',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem'
            }}>
              {tab.icon}
              <span style={{ fontWeight: '600' }}>{tab.label}</span>
            </div>
            <div style={{
              fontSize: '0.75rem',
              opacity: 0.8
            }}>
              {tab.description}
            </div>
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
          {activeTab === 'dashboard' && <NetworkDashboard />}
          {activeTab === 'blocks' && (
            <BlockVisualization 
              blocks={blocks} 
              networkStats={stats}
              showInteractive={true}
            />
          )}
          {activeTab === 'legacy' && renderLegacyStats()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default StatisticsPage;