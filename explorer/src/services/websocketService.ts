import { useSubscription } from '@apollo/client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Block, Transfer, Deployment, NetworkStats } from '../types';
import {
  SUBSCRIBE_TO_NEW_BLOCKS,
  SUBSCRIBE_TO_NEW_TRANSFERS,
  SUBSCRIBE_TO_NETWORK_ACTIVITY,
  SUBSCRIBE_TO_NETWORK_STATS,
  SUBSCRIBE_TO_NEW_DEPLOYMENTS
} from '../graphql/queries';

// WebSocket connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// Real-time update types
export interface RealtimeUpdate {
  type: 'block' | 'transfer' | 'deployment' | 'network_stats';
  data: any;
  timestamp: number;
}

// WebSocket service class for managing real-time updates
class WebSocketService {
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusSubscribers: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Listen for network status changes
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline() {
    this.updateConnectionStatus('connecting');
    this.attemptReconnection();
  }

  private handleOffline() {
    this.updateConnectionStatus('disconnected');
  }

  public updateConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.statusSubscribers.forEach(callback => callback(status));
  }

  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionStatus('error');
      return;
    }

    this.updateConnectionStatus('reconnecting');
    this.reconnectAttempts++;

    setTimeout(() => {
      // Attempt to reconnect logic would go here
      // For now, we'll simulate a successful reconnection
      this.updateConnectionStatus('connected');
      this.reconnectAttempts = 0;
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeSubscribers = this.subscribers.get(eventType);
      if (typeSubscribers) {
        typeSubscribers.delete(callback);
        if (typeSubscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  subscribeToConnectionStatus(callback: (status: ConnectionStatus) => void) {
    this.statusSubscribers.add(callback);
    // Return unsubscribe function
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  emit(eventType: string, data: any) {
    const typeSubscribers = this.subscribers.get(eventType);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => callback(data));
    }
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  disconnect() {
    this.updateConnectionStatus('disconnected');
    this.subscribers.clear();
    this.statusSubscribers.clear();
  }
}

// Singleton instance
export const websocketService = new WebSocketService();

// Custom hooks for real-time data
export const useRealtimeBlocks = (limit: number = 10) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data, loading: subscriptionLoading, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_NEW_BLOCKS,
    {
      variables: { limit },
      onSubscriptionData: ({ subscriptionData }) => {
        if (subscriptionData.data?.blocks) {
          setBlocks(subscriptionData.data.blocks);
          setLoading(false);
          
          // Emit to websocket service for other components
          websocketService.emit('new_blocks', subscriptionData.data.blocks);
        }
      },
      onSubscriptionComplete: () => {
        websocketService.updateConnectionStatus('connected');
      },
      onError: (err) => {
        setError(err);
        websocketService.updateConnectionStatus('error');
      }
    }
  );

  useEffect(() => {
    setLoading(subscriptionLoading);
    setError(subscriptionError || null);
  }, [subscriptionLoading, subscriptionError]);

  return { blocks, loading, error };
};

export const useRealtimeTransfers = (limit: number = 20) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data, loading: subscriptionLoading, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_NEW_TRANSFERS,
    {
      variables: { limit },
      onSubscriptionData: ({ subscriptionData }) => {
        if (subscriptionData.data?.transfers) {
          setTransfers(subscriptionData.data.transfers);
          setLoading(false);
          
          // Emit to websocket service for other components
          websocketService.emit('new_transfers', subscriptionData.data.transfers);
        }
      }
    }
  );

  useEffect(() => {
    setLoading(subscriptionLoading);
    setError(subscriptionError || null);
  }, [subscriptionLoading, subscriptionError]);

  return { transfers, loading, error };
};

export const useRealtimeDeployments = (limit: number = 20) => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data, loading: subscriptionLoading, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_NEW_DEPLOYMENTS,
    {
      variables: { limit },
      onSubscriptionData: ({ subscriptionData }) => {
        if (subscriptionData.data?.deployments) {
          setDeployments(subscriptionData.data.deployments);
          setLoading(false);
          
          // Emit to websocket service for other components
          websocketService.emit('new_deployments', subscriptionData.data.deployments);
        }
      }
    }
  );

  useEffect(() => {
    setLoading(subscriptionLoading);
    setError(subscriptionError || null);
  }, [subscriptionLoading, subscriptionError]);

  return { deployments, loading, error };
};

export const useRealtimeNetworkStats = () => {
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data, loading: subscriptionLoading, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_NETWORK_STATS,
    {
      onSubscriptionData: ({ subscriptionData }) => {
        if (subscriptionData.data) {
          setNetworkStats(subscriptionData.data);
          setLoading(false);
          
          // Emit to websocket service for other components
          websocketService.emit('network_stats_update', subscriptionData.data);
        }
      }
    }
  );

  useEffect(() => {
    setLoading(subscriptionLoading);
    setError(subscriptionError || null);
  }, [subscriptionLoading, subscriptionError]);

  return { networkStats, loading, error };
};

export const useRealtimeNetworkActivity = () => {
  const [activity, setActivity] = useState<{ blocks: Block[], transfers: Transfer[] }>({
    blocks: [],
    transfers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data, loading: subscriptionLoading, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_NETWORK_ACTIVITY,
    {
      onSubscriptionData: ({ subscriptionData }) => {
        if (subscriptionData.data) {
          setActivity({
            blocks: subscriptionData.data.blocks || [],
            transfers: subscriptionData.data.transfers || []
          });
          setLoading(false);
          
          // Emit to websocket service for other components
          websocketService.emit('network_activity', subscriptionData.data);
        }
      }
    }
  );

  useEffect(() => {
    setLoading(subscriptionLoading);
    setError(subscriptionError || null);
  }, [subscriptionLoading, subscriptionError]);

  return { activity, loading, error };
};

// Connection status hook
export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>(websocketService.getConnectionStatus());

  useEffect(() => {
    const unsubscribe = websocketService.subscribeToConnectionStatus(setStatus);
    return unsubscribe;
  }, []);

  return status;
};

// Custom hook for subscribing to specific events
export const useWebSocketSubscription = (eventType: string) => {
  const [data, setData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = websocketService.subscribe(eventType, (newData) => {
      setData(newData);
      setLastUpdate(Date.now());
    });

    return unsubscribe;
  }, [eventType]);

  return { data, lastUpdate };
};

// Utility function to format real-time updates
export const formatRealtimeUpdate = (update: RealtimeUpdate): string => {
  const timeAgo = Math.floor((Date.now() - update.timestamp) / 1000);
  const timeString = timeAgo < 60 ? 'just now' : `${Math.floor(timeAgo / 60)}m ago`;
  
  switch (update.type) {
    case 'block':
      return `New block #${update.data.block_number} - ${timeString}`;
    case 'transfer':
      return `New transfer: ${update.data.amount_rev} REV - ${timeString}`;
    case 'deployment':
      return `New deployment by ${update.data.deployer.slice(0, 8)}... - ${timeString}`;
    case 'network_stats':
      return `Network stats updated - ${timeString}`;
    default:
      return `Unknown update - ${timeString}`;
  }
};

export default websocketService;