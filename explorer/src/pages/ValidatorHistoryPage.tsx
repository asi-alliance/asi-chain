import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { formatDistanceToNow } from 'date-fns';

const GET_VALIDATOR_HISTORY = gql`
  query GetValidatorHistory($blockNumber: bigint) {
    validator_bonds(
      where: { block_number: { _eq: $blockNumber } }
      order_by: { stake: desc }
    ) {
      block_number
      stake
      validator_public_key
    }
    validators {
      public_key
      name
    }
    blocks(where: { block_number: { _eq: $blockNumber } }) {
      block_number
      timestamp
      block_hash
      proposer
    }
  }
`;

const GET_BLOCK_RANGE = gql`
  query GetBlockRange {
    blocks(order_by: { block_number: desc }, limit: 1) {
      block_number
    }
  }
`;

const ValidatorHistoryPage: React.FC = () => {
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  
  const { data: rangeData } = useQuery(GET_BLOCK_RANGE);
  const maxBlock = rangeData?.blocks?.[0]?.block_number || 0;
  const minBlock = 0; // We don't need min block for this functionality
  
  const { data, loading, error } = useQuery(GET_VALIDATOR_HISTORY, {
    variables: { blockNumber: selectedBlock || maxBlock },
    skip: !selectedBlock && !maxBlock,
  });

  const handleBlockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= minBlock && value <= maxBlock) {
      setSelectedBlock(value);
    }
  };

  const truncateKey = (key: string) => {
    if (!key || key.length < 32) return key;
    return `${key.slice(0, 16)}...${key.slice(-16)}`;
  };

  const formatTimestamp = (timestamp: string | number) => {
    try {
      const ts = parseInt(timestamp.toString());
      const date = new Date(ts);
      if (isNaN(date.getTime())) return 'Invalid date';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const calculateStake = (stake: number | string): string => {
    const stakeNum = typeof stake === 'string' ? parseFloat(stake) : stake;
    if (!stakeNum || stakeNum === 0 || isNaN(stakeNum)) return '0.00';
    // Stake values from API appear to already be in REV
    const revAmount = stakeNum;
    
    if (revAmount >= 1000000) {
      return (revAmount / 1000000).toFixed(2) + 'M';
    } else if (revAmount >= 1000) {
      return (revAmount / 1000).toFixed(2) + 'K';
    } else {
      return revAmount.toFixed(2);
    }
  };

  const validators = data?.validator_bonds || [];
  const allValidators = data?.validators || [];
  const currentBlock = selectedBlock || maxBlock;
  const blockInfo = data?.blocks?.[0];
  
  // Create a map of public key to validator info
  const validatorMap: { [key: string]: any } = {};
  allValidators.forEach((v: any) => {
    validatorMap[v.public_key] = v;
  });

  // Debug stake values
  if (validators.length > 0) {
    console.log('Validator History Debug:');
    console.log('First validator stake:', validators[0].stake);
    console.log('Type of stake:', typeof validators[0].stake);
    console.log('All stakes:', validators.map((v: any) => v.stake));
  }

  // Calculate total stake for percentage
  const totalStake = validators.reduce((sum: number, v: any) => {
    // Handle both string and number types
    const stake = typeof v.stake === 'string' ? parseFloat(v.stake) : v.stake;
    return sum + (stake || 0);
  }, 0);

  return (
    <section className="asi-card">
      <div className="section-header">
        <h2>Validator History</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="block-input" className="text-muted" style={{ fontSize: '14px' }}>
              Block:
            </label>
            <input
              id="block-input"
              type="number"
              min={minBlock}
              max={maxBlock}
              value={currentBlock}
              onChange={handleBlockChange}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--charcoal-500)',
                color: 'var(--text-primary)',
                width: '120px'
              }}
            />
            <span className="text-muted" style={{ fontSize: '12px' }}>
              ({minBlock.toLocaleString()} - {maxBlock.toLocaleString()})
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <span className="loading"></span>
          <p className="text-muted mt-2">Loading validator history...</p>
        </div>
      ) : error ? (
        <div className="status-message error">
          <strong>Error:</strong> {error.message}
        </div>
      ) : (
        <>
          {/* Block Information */}
          {blockInfo && (
            <div className="summary-grid mb-3">
              <div className="asi-card glass">
                <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Block Number</p>
                <h3 style={{ margin: 0 }}>#{currentBlock.toLocaleString()}</h3>
              </div>
              <div className="asi-card glass">
                <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Block Time</p>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                  {formatTimestamp(blockInfo.timestamp)}
                </h3>
              </div>
              <div className="asi-card glass">
                <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Proposer</p>
                <h3 style={{ margin: 0, fontSize: '1rem' }} className="mono">
                  {truncateKey(blockInfo.proposer)}
                </h3>
              </div>
              <div className="asi-card glass">
                <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Active Validators</p>
                <h3 style={{ margin: 0 }}>{validators.length}</h3>
              </div>
            </div>
          )}

          {/* Validators Table */}
          {validators.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem' }}>
              <p className="text-muted">No validator data available for block #{currentBlock}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Validator Public Key</th>
                    <th>Stake (REV)</th>
                    <th>Stake %</th>
                    <th>Proposer</th>
                  </tr>
                </thead>
                <tbody>
                  {validators.map((bond: any, index: number) => {
                    const stakePercentage = totalStake > 0 
                      ? ((bond.stake / totalStake) * 100).toFixed(2) 
                      : '0.00';
                    const isProposer = bond.validator_public_key === blockInfo?.proposer;
                    
                    return (
                      <tr key={bond.validator_public_key} className="fade-in">
                        <td className="text-center">{index + 1}</td>
                        <td className="hash-cell">
                          <span className="mono" title={bond.validator_public_key}>
                            {truncateKey(bond.validator_public_key)}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {calculateStake(bond.stake)} REV
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {stakePercentage}%
                          </span>
                        </td>
                        <td className="text-center">
                          {isProposer && (
                            <span className="text-success" title="Block Proposer">
                              ✓ Proposer
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Summary */}
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                background: 'var(--charcoal-500)', 
                borderRadius: '8px' 
              }}>
                <dl style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem', 
                  margin: 0 
                }}>
                  <div>
                    <dt className="text-muted" style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                      Total Stake
                    </dt>
                    <dd style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      {(totalStake / 1e8).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} REV
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted" style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                      Average Stake
                    </dt>
                    <dd style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      {validators.length > 0 
                        ? (totalStake / validators.length / 1e8).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : '0.00'
                      } REV
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted" style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                      Min Stake
                    </dt>
                    <dd style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      {validators.length > 0 
                        ? (Math.min(...validators.map((v: any) => v.stake || 0)) / 1e8).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : '0.00'
                      } REV
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted" style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                      Max Stake
                    </dt>
                    <dd style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      {validators.length > 0 
                        ? (Math.max(...validators.map((v: any) => v.stake || 0)) / 1e8).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : '0.00'
                      } REV
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ValidatorHistoryPage;