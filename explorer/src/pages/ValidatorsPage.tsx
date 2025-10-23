import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_ACTIVE_VALIDATORS } from '../graphql/queries';
import { Validator } from '../types';

const ValidatorsPage: React.FC = () => {
  const { data, loading, error } = useQuery(GET_ACTIVE_VALIDATORS, {
    pollInterval: 5000, // Poll every 5 seconds
  });

  const rawValidators = data?.validators || [];
  const validatorBonds = data?.validator_bonds || [];
  const allBlocks = data?.blocks || [];
  
  // Function to normalize validator keys for comparison
  // We need to extract just the first 8 and last 8 chars for comparison
  const normalizeValidatorKey = (key: string): string => {
    if (!key) return '';
    
    // If it's an abbreviated key (contains ellipsis like "04837a4c...b2df065f")
    if (key.includes('...')) {
      const parts = key.split('...');
      if (parts.length === 2) {
        // Extract first 8 and last 8 chars from abbreviated format
        return `${parts[0]}${parts[1]}`;
      }
    }
    
    // If it's a full key (64+ chars), extract first 8 and last 8
    if (key.length >= 64) {
      return `${key.slice(0, 8)}${key.slice(-8)}`;
    }
    
    // Return as-is if neither format matches
    return key;
  };
  
  // Deduplicate validators by normalized key prefix
  const validatorMap = new Map<string, any>();
  rawValidators.forEach((validator: any) => {
    const normalizedKey = normalizeValidatorKey(validator.public_key);
    const existing = validatorMap.get(normalizedKey);
    
    if (!existing) {
      validatorMap.set(normalizedKey, validator);
    } else {
      // Prefer the entry with more complete data
      // Keep the one with the full key if available
      if (validator.public_key.length > existing.public_key.length) {
        validatorMap.set(normalizedKey, validator);
      } else if (validator.public_key.length === existing.public_key.length) {
        // If both have same key length, keep the one with higher stake or more recent activity
        if ((validator.last_seen_block || 0) > (existing.last_seen_block || 0)) {
          validatorMap.set(normalizedKey, validator);
        }
      }
    }
  });
  
  const validators = Array.from(validatorMap.values());
  
  // Debug logging
  if (!loading) {
    if (error) {
      console.error('ValidatorsPage error:', error);
    } else {
      console.log('ValidatorsPage data:', {
        rawValidators: rawValidators.length,
        deduplicatedValidators: validators.length,
        validatorBonds: validatorBonds.length,
        blocks: allBlocks.length,
        sampleValidator: validators[0],
        sampleBond: validatorBonds[0]
      });
      
    }
  }
  
  // Create a map of validator public key to their latest bond
  // Map both full and normalized keys to handle duplicates
  const bondsByValidator: { [key: string]: any } = {};
  const bondsByNormalizedKey: { [key: string]: any } = {};
  
  validatorBonds.forEach((bond: any) => {
    const normalizedKey = normalizeValidatorKey(bond.validator_public_key);
    
    // Store by original key
    const existingBond = bondsByValidator[bond.validator_public_key];
    if (!existingBond || bond.block_number > existingBond.block_number) {
      bondsByValidator[bond.validator_public_key] = bond;
    }
    
    // Also store by normalized key for lookup
    const existingNormalizedBond = bondsByNormalizedKey[normalizedKey];
    if (!existingNormalizedBond || bond.block_number > existingNormalizedBond.block_number) {
      bondsByNormalizedKey[normalizedKey] = bond;
    }
  });
  
  // Count blocks proposed by each validator
  const blockProposedCounts: { [key: string]: number } = {};
  allBlocks.forEach((block: { proposer: string }) => {
    if (block.proposer) {
      blockProposedCounts[block.proposer] = (blockProposedCounts[block.proposer] || 0) + 1;
    }
  });
  
  // Calculate proper stake amounts with better formatting
  const calculateStake = (stake: number | string): string => {
    const stakeNum = typeof stake === 'string' ? parseFloat(stake) : stake;
    if (!stakeNum || stakeNum === 0 || isNaN(stakeNum)) return '0.00';
    // Stake values from API appear to already be in REV
    const revAmount = stakeNum;
    
    // Format based on size
    if (revAmount >= 1000000) {
      return (revAmount / 1000000).toFixed(2) + 'M';
    } else if (revAmount >= 1000) {
      return (revAmount / 1000).toFixed(2) + 'K';
    } else if (revAmount < 0.01) {
      return revAmount.toExponential(2);
    } else {
      return revAmount.toFixed(2);
    }
  };

  // Calculate raw stake for display without formatting
  const calculateRawStake = (stake: number | string): number => {
    const stakeNum = typeof stake === 'string' ? parseFloat(stake) : stake;
    if (!stakeNum || stakeNum === 0 || isNaN(stakeNum)) return 0;
    // Stake values from API appear to already be in REV
    return stakeNum;
  };

  // Calculate total stake using the latest bond stake for each validator
  const totalStake = validators.reduce((sum: number, validator: Validator) => {
    // Try to find bond by both original key and normalized key
    const normalizedKey = normalizeValidatorKey(validator.public_key);
    const latestBond = bondsByValidator[validator.public_key] || bondsByNormalizedKey[normalizedKey];
    let stake = 0;
    
    if (latestBond?.stake !== undefined && latestBond?.stake !== null) {
      // Handle both string and number types
      stake = typeof latestBond.stake === 'string' ? parseFloat(latestBond.stake) : latestBond.stake;
    } else if (validator.total_stake !== undefined && validator.total_stake !== null) {
      // Handle both string and number types
      stake = typeof validator.total_stake === 'string' ? parseFloat(validator.total_stake) : validator.total_stake;
    }
    
    // console.log(`Validator ${validator.public_key.substring(0,10)}... stake:`, stake, 'type:', typeof stake, 'source:', latestBond ? 'bond' : 'total_stake');
    return sum + stake;
  }, 0);

  // Debug logging (commented out for production)
  // if (validators.length > 0 && !loading) {
  //   console.log('=== Validator Stake Debug ===');
  //   console.log('Number of validators:', validators.length);
  //   console.log('Total stake raw:', totalStake);
  //   console.log('Total stake REV:', totalStake / 1e8);
  //   console.log('Average stake REV:', totalStake / 1e8 / validators.length);
  // }

  // Sort validators by their stake (bond or total_stake)
  const sortedValidators = [...validators].sort((a, b) => {
    const aNormalizedKey = normalizeValidatorKey(a.public_key);
    const bNormalizedKey = normalizeValidatorKey(b.public_key);
    const aLatestBond = bondsByValidator[a.public_key] || bondsByNormalizedKey[aNormalizedKey];
    const bLatestBond = bondsByValidator[b.public_key] || bondsByNormalizedKey[bNormalizedKey];
    
    let aStake = 0;
    if (aLatestBond?.stake !== undefined && aLatestBond?.stake !== null) {
      aStake = typeof aLatestBond.stake === 'string' ? parseFloat(aLatestBond.stake) : aLatestBond.stake;
    } else if (a.total_stake !== undefined && a.total_stake !== null) {
      aStake = typeof a.total_stake === 'string' ? parseFloat(a.total_stake) : a.total_stake;
    }
    
    let bStake = 0;
    if (bLatestBond?.stake !== undefined && bLatestBond?.stake !== null) {
      bStake = typeof bLatestBond.stake === 'string' ? parseFloat(bLatestBond.stake) : bLatestBond.stake;
    } else if (b.total_stake !== undefined && b.total_stake !== null) {
      bStake = typeof b.total_stake === 'string' ? parseFloat(b.total_stake) : b.total_stake;
    }
    
    return bStake - aStake;
  });

  const truncateKey = (key: string) => {
    if (!key || key.length < 32) return key;
    return `${key.slice(0, 16)}...${key.slice(-16)}`;
  };

  return (
    <section className="asi-card">
      <div className="section-header">
        <h2>Active Validators</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="status-indicator" style={{ background: 'var(--asi-lime)' }}></span>
            <span className="text-muted" style={{ fontSize: '14px' }}>Live Updates</span>
          </div>
          <a 
            href="/validator-history" 
            className="btn btn-secondary"
            style={{ fontSize: '14px', padding: '0.5rem 1rem' }}
          >
            View History →
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <span className="loading"></span>
          <p className="text-muted mt-2">Loading validators...</p>
        </div>
      ) : error ? (
        <div className="status-message error">
          <strong>Error:</strong> {error.message}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="summary-grid mb-3">
            <div className="asi-card glass">
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Total Validators</p>
              <h3 style={{ margin: 0 }}>{validators.length}</h3>
            </div>
            <div className="asi-card glass">
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Total REV Staked</p>
              <h3 style={{ margin: 0 }}>
                {calculateRawStake(totalStake).toLocaleString(undefined, { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                })} REV
              </h3>
            </div>
            <div className="asi-card glass">
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Avg. Stake</p>
              <h3 style={{ margin: 0 }}>
                {validators.length > 0 ? 
                  calculateRawStake(totalStake / validators.length).toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  }) : 
                  '0.00'
                } REV
              </h3>
            </div>
          </div>

          {/* Validators Table */}
          {validators.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem' }}>
              <p className="text-muted">No validator data available</p>
              <p className="text-muted" style={{ fontSize: '14px', marginTop: '0.5rem' }}>
                The validators table may be empty or still syncing
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Public Key</th>
                    <th>Stake (REV)</th>
                    <th>Stake %</th>
                    <th>Blocks Proposed</th>
                    <th>First Seen</th>
                    <th>Last Seen</th>
                    <th>Last Active</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedValidators.map((validator: Validator) => {
                    const normalizedKey = normalizeValidatorKey(validator.public_key);
                    const latestBond = bondsByValidator[validator.public_key] || bondsByNormalizedKey[normalizedKey];
                    const blocksProposed = blockProposedCounts[validator.public_key] || 0;
                    
                    // Use the same logic as total calculation
                    let stake = 0;
                    if (latestBond?.stake !== undefined && latestBond?.stake !== null) {
                      stake = typeof latestBond.stake === 'string' ? parseFloat(latestBond.stake) : latestBond.stake;
                    } else if (validator.total_stake !== undefined && validator.total_stake !== null) {
                      stake = typeof validator.total_stake === 'string' ? parseFloat(validator.total_stake) : validator.total_stake;
                    }
                    
                    const stakePercentage = totalStake > 0 ? (stake / totalStake * 100).toFixed(2) : '0.00';
                    
                    return (
                      <tr key={validator.public_key} className="fade-in">
                        <td className="hash-cell">
                          <span className="mono" title={validator.public_key}>
                            {truncateKey(validator.public_key)}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {calculateStake(stake)}
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {stakePercentage}%
                          </span>
                        </td>
                        <td className="text-center">
                          {blocksProposed.toLocaleString()}
                        </td>
                        <td>
                          {validator.first_seen_block ? `#${validator.first_seen_block}` : '--'}
                        </td>
                        <td>
                          {validator.last_seen_block ? `#${validator.last_seen_block}` : '--'}
                        </td>
                        <td>
                          {latestBond ? (
                            <span>#{latestBond.block_number.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted">Never bonded</span>
                          )}
                        </td>
                        <td>
                          <span className={validator.status === 'active' ? "text-success" : "text-muted"}>
                            {validator.status || (latestBond ? 'Bonded' : 'Unbonded')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ValidatorsPage;