import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_LATEST_BLOCKS } from '../graphql/queries';
import { Block } from '../types';
import BlockCard from '../components/BlockCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChevronLeft } from 'lucide-react';

const BlocksPage: React.FC = () => {
  const [limit] = useState(20);
  
  const { data, loading, error, fetchMore } = useQuery(GET_LATEST_BLOCKS, {
    variables: { limit },
    notifyOnNetworkStatusChange: true,
  });

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Blocks</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  const blocks = data?.blocks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blocks</h1>
          <p className="text-gray-600 mt-1">
            Explore all blocks on the ASI Chain network
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Showing {blocks.length} blocks
        </div>
      </div>

      {/* Blocks List */}
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No blocks found</p>
          </div>
        ) : (
          blocks.map((block: Block) => (
            <BlockCard key={block.block_number} block={block} showDetails={true} />
          ))
        )}
      </div>

      {/* Pagination */}
      {blocks.length >= limit && (
        <div className="flex items-center justify-center space-x-4 py-6">
          <button 
            className="btn-secondary flex items-center space-x-2"
            onClick={() => fetchMore({
              variables: { limit: limit + 20 }
            })}
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Load More</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default BlocksPage;