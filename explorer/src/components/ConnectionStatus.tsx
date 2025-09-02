import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from './AnimatePresenceWrapper';
import { Wifi, WifiOff, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
// import { useConnectionStatus } from '../services/websocketService';

interface ConnectionStatusProps {
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  position = 'top-right',
  size = 'md'
}) => {
  // For now, assume we're connected if we can query GraphQL
  // In a real implementation, this would come from Apollo Client's networkStatus or a health check
  const [connectionStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error'>('connected');
  const [showTooltip, setShowTooltip] = useState(false);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [disconnectedDuration, setDisconnectedDuration] = useState<string>('');

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setLastConnected(new Date());
    }
  }, [connectionStatus]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (connectionStatus === 'disconnected' && lastConnected) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - lastConnected.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
          setDisconnectedDuration(`${minutes}m ${seconds % 60}s`);
        } else {
          setDisconnectedDuration(`${seconds}s`);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, lastConnected]);

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <CheckCircle size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />,
          color: '#10b981',
          bgColor: '#10b98120',
          text: 'Connected',
          description: 'Real-time updates active'
        };
      case 'connecting':
        return {
          icon: <RotateCcw size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} className="animate-spin" />,
          color: '#f59e0b',
          bgColor: '#f59e0b20',
          text: 'Connecting',
          description: 'Establishing connection...'
        };
      case 'reconnecting':
        return {
          icon: <RotateCcw size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} className="animate-spin" />,
          color: '#f59e0b',
          bgColor: '#f59e0b20',
          text: 'Reconnecting',
          description: 'Attempting to reconnect...'
        };
      case 'disconnected':
        return {
          icon: <WifiOff size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />,
          color: '#6b7280',
          bgColor: '#6b728020',
          text: 'Disconnected',
          description: disconnectedDuration ? `Offline for ${disconnectedDuration}` : 'No real-time updates'
        };
      case 'error':
        return {
          icon: <AlertTriangle size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />,
          color: '#ef4444',
          bgColor: '#ef444420',
          text: 'Error',
          description: 'Connection failed'
        };
      default:
        return {
          icon: <WifiOff size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />,
          color: '#6b7280',
          bgColor: '#6b728020',
          text: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const config = getStatusConfig();

  const getPositionStyles = () => {
    if (position === 'inline') return {};
    
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyles, top: '1rem', right: '1rem' };
      case 'top-left':
        return { ...baseStyles, top: '1rem', left: '1rem' };
      case 'bottom-right':
        return { ...baseStyles, bottom: '1rem', right: '1rem' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '1rem', left: '1rem' };
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          borderRadius: '6px'
        };
      case 'lg':
        return {
          padding: '1rem 1.25rem',
          fontSize: '1rem',
          borderRadius: '12px'
        };
      default: // md
        return {
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          borderRadius: '8px'
        };
    }
  };

  if (showDetails) {
    return (
      <div style={getPositionStyles()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${config.color}40`,
            color: '#fff',
            ...getSizeStyles()
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <motion.div
            animate={{
              rotate: connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 360 : 0
            }}
            transition={{
              duration: connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 1 : 0,
              repeat: connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? Infinity : 0,
              ease: 'linear'
            }}
            style={{ color: config.color }}
          >
            {config.icon}
          </motion.div>
          
          <div>
            <div style={{ fontWeight: '600', lineHeight: '1' }}>
              {config.text}
            </div>
            <div style={{ 
              fontSize: size === 'sm' ? '0.65rem' : '0.75rem', 
              color: '#9ca3af',
              lineHeight: '1',
              marginTop: '0.25rem'
            }}>
              {config.description}
            </div>
          </div>

          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  color: '#d1d5db'
                }}
              >
                WebSocket connection to ASI Chain
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: '4px solid rgba(0, 0, 0, 0.9)'
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={getPositionStyles()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size === 'sm' ? '32px' : size === 'lg' ? '48px' : '40px',
          height: size === 'sm' ? '32px' : size === 'lg' ? '48px' : '40px',
          backgroundColor: config.bgColor,
          border: `2px solid ${config.color}`,
          borderRadius: '50%',
          color: config.color,
          cursor: 'pointer',
          backdropFilter: 'blur(10px)'
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <motion.div
          animate={{
            rotate: connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 360 : 0
          }}
          transition={{
            duration: connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 1 : 0,
            repeat: connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? Infinity : 0,
            ease: 'linear'
          }}
        >
          {config.icon}
        </motion.div>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                color: '#d1d5db',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ fontWeight: '600' }}>{config.text}</div>
              <div style={{ color: '#9ca3af', marginTop: '0.25rem' }}>
                {config.description}
              </div>
              <div style={{
                position: 'absolute',
                top: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderBottom: '4px solid rgba(0, 0, 0, 0.9)'
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ConnectionStatus;