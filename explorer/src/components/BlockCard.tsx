import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Hash, FileCode, User } from 'lucide-react';
import { BlockCardProps } from '../types';
import { formatDistanceToNow } from 'date-fns';

const BlockCard: React.FC<BlockCardProps> = ({ block, showDetails = true }) => {
  const formatHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  const formatAddress = (address: string) => `${address.slice(0, 10)}...${address.slice(-10)}`;

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <Link 
          to={`/block/${block.block_number}`}
          className="text-lg font-semibold text-asi-blue hover:text-blue-700"
        >
          Block #{block.block_number.toLocaleString()}
        </Link>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{(() => {
            try {
              const timestamp = parseInt(block.timestamp.toString());
              const date = new Date(timestamp);
              if (isNaN(date.getTime())) return 'Invalid date';
              return formatDistanceToNow(date, { addSuffix: true });
            } catch (e) {
              return 'Invalid date';
            }
          })()}</span>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Hash:</span>
            <code className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
              {formatHash(block.block_hash)}
            </code>
          </div>
          
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Proposer:</span>
            <code className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
              {formatAddress(block.proposer)}
            </code>
          </div>
          
          {block.deployment_count > 0 && (
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Deployments:</span>
              <span className="font-medium text-gray-800">
                {block.deployment_count}
              </span>
            </div>
          )}
        </div>
      )}

      {!showDetails && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>{block.deployment_count} deployments</span>
            <span>•</span>
            <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {formatHash(block.block_hash)}
            </code>
          </div>
          <Link 
            to={`/block/${block.block_number}`}
            className="text-asi-blue hover:text-blue-700 font-medium"
          >
            View →
          </Link>
        </div>
      )}
    </div>
  );
};

export default BlockCard;