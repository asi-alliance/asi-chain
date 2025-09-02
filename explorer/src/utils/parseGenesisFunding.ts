/**
 * Utility to parse genesis wallet funding from RevGenerator deployment
 */

export interface GenesisFunding {
  wallet_address: string;
  amount_dust: number;
  amount_rev: number;
  status: 'genesis_funding';
  timestamp: number;
  deploy_id: string;
}

/**
 * Parses the genesis deployment term to extract wallet funding information
 */
export function parseGenesisFunding(deploymentTerm: string, deployId: string, timestamp: number): GenesisFunding[] {
  const fundings: GenesisFunding[] = [];
  
  try {
    // Look for the match pattern with wallet addresses and amounts
    // Pattern: match [("address1", amount1), ("address2", amount2), ...]
    const matchRegex = /match\s*\[\s*(?:\("([^"]+)",\s*(\d+)\)(?:\s*,\s*)?)+\s*\]/g;
    const match = matchRegex.exec(deploymentTerm);
    
    if (match) {
      // Extract individual wallet funding entries
      const entryRegex = /\("([^"]+)",\s*(\d+)\)/g;
      let entryMatch;
      
      while ((entryMatch = entryRegex.exec(deploymentTerm)) !== null) {
        const walletAddress = entryMatch[1];
        const amountDust = parseInt(entryMatch[2]);
        const amountRev = amountDust / 100000000; // Convert from dust to REV (8 decimal places)
        
        fundings.push({
          wallet_address: walletAddress,
          amount_dust: amountDust,
          amount_rev: amountRev,
          status: 'genesis_funding',
          timestamp,
          deploy_id: deployId
        });
      }
    }
  } catch (error) {
    console.error('Error parsing genesis funding:', error);
  }
  
  return fundings;
}

/**
 * Formats genesis funding amount for display
 */
export function formatGenesisFunding(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M REV';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K REV';
  } else {
    return amount.toFixed(2) + ' REV';
  }
}

/**
 * Known genesis deployment ID containing wallet funding data
 */
export const GENESIS_FUNDING_DEPLOY_ID = "3045022100f39285089f6e50247620e71b79161ddc371c94e453f6bc12afd78bfe857640dd0220614965bda9c405816d6b5c7af9ad415149593a08e763835b621769059402524e";