import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from './AnimatePresenceWrapper';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, Zap, Database, TrendingUp } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { GET_LATEST_BLOCKS, GET_LATEST_TRANSFERS, GET_LATEST_DEPLOYMENTS } from '../graphql/queries';

interface ActivityItem {
  id: string;
  type: 'block' | 'transfer' | 'deployment';
  title: string;
  description: string;
  timestamp: number;
  data: any;
  icon: React.ReactNode;
  color: string;
}

interface RealtimeActivityFeedProps {
  maxItems?: number;
  showConnectionStatus?: boolean;
  compact?: boolean;
  height?: string;
}

const RealtimeActivityFeed: React.FC<RealtimeActivityFeedProps> = ({
  maxItems = 50,
  showConnectionStatus = true,
  compact = false,
  height = '400px'
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  // const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch real-time data using GraphQL queries with polling
  const { data: blocksData } = useQuery(GET_LATEST_BLOCKS, {
    variables: { limit: 5 },
    pollInterval: 3000, // Poll every 3 seconds
  });
  
  const { data: transfersData } = useQuery(GET_LATEST_TRANSFERS, {
    variables: { limit: 5 },
    pollInterval: 3000,
  });
  
  const { data: deploymentsData } = useQuery(GET_LATEST_DEPLOYMENTS, {
    variables: { limit: 5 },
    pollInterval: 3000,
  });
  
  const blocks = blocksData?.blocks || [];
  const transfers = transfersData?.transfers || [];
  const deployments = deploymentsData?.deployments || [];

  // Convert data to activity items
  useEffect(() => {
    const newActivities: ActivityItem[] = [];

    // Add latest blocks
    blocks.slice(0, 5).forEach((block: any) => {
      newActivities.push({
        id: `block-${block.block_number}`,
        type: 'block',
        title: `Block #${block.block_number}`,
        description: `Proposed by ${block.proposer?.slice(0, 8) || 'Unknown'}... with ${block.deployment_count || 0} deployments`,
        timestamp: parseInt(block.timestamp) || Date.now(),
        data: block,
        icon: <Database size={16} />,
        color: '#10b981'
      });
    });

    // Add latest transfers
    transfers.slice(0, 5).forEach((transfer: any) => {
      newActivities.push({
        id: `transfer-${transfer.id}`,
        type: 'transfer',
        title: `Transfer: ${transfer.amount_rev || '0'} REV`,
        description: `From ${transfer.from_address?.slice(0, 8) || 'Unknown'}... to ${transfer.to_address?.slice(0, 8) || 'Unknown'}...`,
        timestamp: transfer.created_at ? new Date(transfer.created_at).getTime() : Date.now(),
        data: transfer,
        icon: <TrendingUp size={16} />,
        color: '#3b82f6'
      });
    });

    // Add latest deployments
    deployments.slice(0, 5).forEach((deployment: any) => {
      newActivities.push({
        id: `deployment-${deployment.deploy_id}`,
        type: 'deployment',
        title: `New Deployment`,
        description: `By ${deployment.deployer?.slice(0, 8) || 'Unknown'}... - ${deployment.deployment_type || 'Unknown type'}`,
        timestamp: parseInt(deployment.timestamp) || Date.now(),
        data: deployment,
        icon: <Zap size={16} />,
        color: '#f59e0b'
      });
    });

    // Sort by timestamp and limit
    const sortedActivities = newActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems);

    setActivities(sortedActivities);
  }, [blocks, transfers, deployments, maxItems]);

  // Auto-scroll to bottom when new activities arrive
  // useEffect(() => {
  //   if (isAutoScroll && scrollContainerRef.current) {
  //     scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  //   }
  // }, [activities, isAutoScroll]);

  const getConnectionStatusColor = () => {
    // Since connectionStatus is mocked as 'connected', always return connected color
    return '#10b981';
  };

  const getConnectionStatusText = () => {
    // Since connectionStatus is mocked as 'connected', always return 'Live'
    return 'Live';
  };

  if (compact) {
    return (
      <div className="asi-card live-activity" style={{ height }}>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} />
            <h3 style={{ margin: 0 }}>Live Activity</h3>
          </div>
          {showConnectionStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div 
                className="status-indicator" 
                style={{ 
                  background: getConnectionStatusColor(),
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {getConnectionStatusText()}
              </span>
            </div>
          )}
        </div>
        
        <div 
          ref={scrollContainerRef}
          // onScroll={handleScroll}
          style={{ 
            height: 'calc(100% - 60px)', 
            overflowY: 'auto',
            padding: '1rem 0'
          }}
        >
          <AnimatePresence>
            {activities.map(activity => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div 
                  style={{ 
                    color: activity.color,
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                >
                  {activity.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                    color: '#fff'
                  }}>
                    {activity.title}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#9ca3af',
                    marginBottom: '0.25rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {activity.description}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <Clock size={10} />
                    {activity.timestamp && !isNaN(activity.timestamp) 
                      ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                      : 'Just now'}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="asi-card live-activity" style={{ height }}>
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={24} />
          <div>
            <h2 style={{ margin: 0 }}>Real-time Network Activity</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af' }}>
              Live updates from the ASI Chain network
            </p>
          </div>
        </div>
        {showConnectionStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              className="status-indicator" 
              style={{ 
                background: getConnectionStatusColor(),
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                boxShadow: `0 0 10px ${getConnectionStatusColor()}`
              }}
            />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {getConnectionStatusText()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {activities.length} recent activities
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div 
        ref={scrollContainerRef}
        // onScroll={handleScroll}
        style={{ 
          height: 'calc(100% - 100px)', 
          overflowY: 'auto',
          padding: '1rem 0'
        }}
      >
        <AnimatePresence>
          {activities.map(activity => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1rem',
                marginBottom: '1rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.2s ease'
              }}
              whileHover={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: activity.color,
                scale: 1.02
              }}
            >
              <div 
                style={{ 
                  color: activity.color,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  backgroundColor: `${activity.color}20`,
                  flexShrink: 0
                }}
              >
                {activity.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#fff'
                }}>
                  {activity.title}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#d1d5db',
                  marginBottom: '0.75rem',
                  lineHeight: '1.4'
                }}>
                  {activity.description}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Clock size={12} />
                  {activity.timestamp && !isNaN(activity.timestamp) 
                    ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                    : 'Just now'}
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span style={{ color: activity.color }}>
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {activities.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1rem',
            color: '#6b7280' 
          }}>
            <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>No recent activity</p>
            <p style={{ fontSize: '0.875rem' }}>
              New blocks, transfers, and deployments will appear here in real-time
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeActivityFeed;