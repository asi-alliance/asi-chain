import { useQuery } from '@apollo/client';
import { GET_GENESIS_FUNDING_DEPLOYMENT } from '../graphql/queries';
import { parseGenesisFunding } from '../utils/parseGenesisFunding';
import { GenesisFunding } from '../types';

export function useGenesisFunding() {
  const { data, loading, error } = useQuery(GET_GENESIS_FUNDING_DEPLOYMENT);
  
  const genesisFundings: GenesisFunding[] = [];
  
  if (data?.deployments?.[0]) {
    const deployment = data.deployments[0];
    // Use the actual testnet genesis block timestamp instead of the deployment timestamp
    // The deployment timestamp (1565818101792) is from RChain mainnet in 2019
    // We'll use the testnet creation time which matches the genesis bonds
    const testnetGenesisTimestamp = 1754477009000; // Same as genesis bonds
    const parsedFundings = parseGenesisFunding(
      deployment.term,
      deployment.deploy_id,
      testnetGenesisTimestamp
    );
    
    // Convert to GenesisFunding format with proper IDs
    parsedFundings.forEach((funding, index) => {
      genesisFundings.push({
        id: `genesis_funding_${index + 1}`,
        wallet_address: funding.wallet_address,
        amount_dust: funding.amount_dust,
        amount_rev: funding.amount_rev,
        status: 'genesis_funding',
        timestamp: funding.timestamp,
        deploy_id: funding.deploy_id,
        created_at: deployment.created_at
      });
    });
  }
  
  return {
    genesisFundings,
    loading,
    error
  };
}