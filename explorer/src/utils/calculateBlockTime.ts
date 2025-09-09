/**
 * Calculate average block time from recent blocks
 */
export function calculateAverageBlockTime(blocks: Array<{ timestamp: string | number }>): number | null {
  if (!blocks || blocks.length < 2) return null;
  
  // Sort blocks by timestamp (oldest first)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const timeA = typeof a.timestamp === 'string' ? parseInt(a.timestamp) : a.timestamp;
    const timeB = typeof b.timestamp === 'string' ? parseInt(b.timestamp) : b.timestamp;
    return timeA - timeB;
  });
  
  let totalTime = 0;
  let count = 0;
  
  for (let i = 1; i < sortedBlocks.length; i++) {
    const currentTime = typeof sortedBlocks[i].timestamp === 'string' 
      ? parseInt(sortedBlocks[i].timestamp as string) 
      : sortedBlocks[i].timestamp as number;
    const prevTime = typeof sortedBlocks[i - 1].timestamp === 'string'
      ? parseInt(sortedBlocks[i - 1].timestamp as string)
      : sortedBlocks[i - 1].timestamp as number;
    
    const timeDiff = (currentTime - prevTime) / 1000; // Convert to seconds
    
    // Only count reasonable block times (between 1 and 60 seconds)
    if (timeDiff > 0 && timeDiff < 60) {
      totalTime += timeDiff;
      count++;
    }
  }
  
  return count > 0 ? totalTime / count : null;
}

/**
 * Calculate earliest and latest block times from blocks
 */
export function getBlockTimeRange(blocks: Array<{ timestamp: string | number }>): {
  earliest: number | null;
  latest: number | null;
} {
  if (!blocks || blocks.length === 0) {
    return { earliest: null, latest: null };
  }
  
  const timestamps = blocks.map(b => 
    typeof b.timestamp === 'string' ? parseInt(b.timestamp) : b.timestamp
  );
  
  return {
    earliest: Math.min(...timestamps),
    latest: Math.max(...timestamps)
  };
}