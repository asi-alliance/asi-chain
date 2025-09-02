export interface WalletBalance {
  address: string;
  balance: {
    dust: number;
    rev: number;
  };
  transactions: any[];
  note?: string;
}

export interface RChainExploreResponse {
  expr?: Array<{
    ExprInt?: { data: string };
    ExprString?: { data: string };
  }>;
  error?: string;
}

/**
 * Wallet Service - Implements the same balance checking logic as the old explorer
 * 
 * This service directly queries the RChain node using the explore-deploy endpoint
 * to execute Rholang code that queries the RevVault contract for wallet balances.
 */
export class WalletService {
  private static readonly RCHAIN_NODE_URL = process.env.NODE_ENV === 'development' ? '' : (process.env.REACT_APP_RCHAIN_NODE_URL || 'http://localhost:40453');
  private static readonly GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  private static readonly EXPLORE_ENDPOINT = '/api/explore-deploy';
  private static readonly REV_DUST_RATIO = 100_000_000; // 1 REV = 100,000,000 dust
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Generate Rholang code to query wallet balance from RevVault contract
   */
  private static generateBalanceQuery(address: string): string {
    return `new return, rl(\`rho:registry:lookup\`), RevVaultCh, vaultCh in {
  rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
  for (@(_, RevVault) <- RevVaultCh) {
    @RevVault!("findOrCreate", "${address}", *vaultCh) |
    for (@maybeVault <- vaultCh) {
      match maybeVault {
        (true, vault) => @vault!("balance", *return)
        (false, err)  => return!(err)
      }
    }
  }
}`;
  }

  /**
   * Validate REV address format
   */
  private static isValidAddress(address: string): boolean {
    // REV addresses can have different formats:
    // 1. Base58-encoded starting with "111" (54+ chars): 111127RX5ZgiAdRaQy4AWy57RdvAAckdELReEBxzvWYVvdnR32PiHA
    // 2. Hex-encoded (64-66 chars): 04a936f4e0cda4688ec61fa17cf3cbaed6a450ac8e633490596587ce22b78fe6621861d4fa442f7c9f8070acb846f40d8844dca94fda398722d6a4664041a7b39b
    
    // Check for base58 format starting with "111"
    if (address.startsWith('111') && address.length >= 54) {
      const base58Pattern = /^111[1-9A-HJ-NP-Za-km-z]{51,}$/;
      return base58Pattern.test(address);
    }
    
    // Check for hex format (public key addresses)
    if (address.length >= 64 && address.length <= 68) {
      const hexPattern = /^[0-9a-fA-F]+$/;
      return hexPattern.test(address);
    }
    
    // Basic length check for other formats
    return address.length >= 32 && address.length <= 100;
  }

  /**
   * Convert dust units to REV tokens
   */
  private static dustToRev(dust: number): number {
    return dust / this.REV_DUST_RATIO;
  }

  /**
   * Parse the RChain explore-deploy response to extract balance
   */
  private static parseBalanceResponse(response: RChainExploreResponse): number {
    if (response.error) {
      throw new Error(`RChain node error: ${response.error}`);
    }

    if (!response.expr || response.expr.length === 0) {
      return 0; // No response means uninitialized vault
    }

    const firstExpr = response.expr[0];
    
    if (firstExpr.ExprInt && firstExpr.ExprInt.data) {
      // Balance returned as integer (dust units)
      return parseInt(firstExpr.ExprInt.data, 10);
    }
    
    if (firstExpr.ExprString && firstExpr.ExprString.data) {
      // Error message returned as string
      const errorMsg = firstExpr.ExprString.data;
      if (errorMsg.includes('Vault does not exist') || errorMsg.includes('not found')) {
        return 0; // Uninitialized vault
      }
      throw new Error(`RevVault error: ${errorMsg}`);
    }

    return 0; // Default to 0 if no recognizable response
  }

  /**
   * Query RChain node for wallet balance
   */
  private static async queryRChainNode(rholangCode: string): Promise<RChainExploreResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${this.RCHAIN_NODE_URL}${this.EXPLORE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: rholangCode,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - RChain node did not respond within 30 seconds');
        }
        if (error.message.includes('fetch')) {
          throw new Error('Cannot connect to RChain node. Please ensure it is running and accessible.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get related transactions for the wallet address
   * This queries the indexer database for deployments that reference the address
   */
  private static async getRelatedTransactions(address: string): Promise<any[]> {
    try {
      // Query the GraphQL endpoint for deployments containing this address
      const query = `
        query GetRelatedTransactions($searchTerm: String!) {
          deployments(
            where: {
              _or: [
                { term: { _ilike: $searchTerm } },
                { deployer: { _eq: $searchTerm } }
              ]
            }
            order_by: { timestamp: desc }
            limit: 10
          ) {
            deploy_id
            deployer
            block_number
            timestamp
            errored
            error_message
            deployment_type
          }
        }
      `;

      const response = await fetch(WalletService.GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hasura-Admin-Secret': 'myadminsecretkey',
        },
        body: JSON.stringify({
          query,
          variables: {
            searchTerm: `%${address}%`,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data?.deployments || [];
      }
    } catch (error) {
      console.warn('Could not fetch related transactions:', error);
    }

    return [];
  }

  /**
   * Get wallet balance and transaction history
   * Main public method that implements the same logic as the old explorer
   */
  public static async getWalletBalance(address: string): Promise<WalletBalance> {
    // Validate address format
    if (!this.isValidAddress(address)) {
      throw new Error('Invalid address format. Please enter a valid REV address (base58 starting with "111" or hex format).');
    }

    try {
      // Generate Rholang query
      const rholangCode = this.generateBalanceQuery(address);

      // Query RChain node
      const response = await this.queryRChainNode(rholangCode);

      // Parse balance response
      const balanceDust = this.parseBalanceResponse(response);
      const balanceRev = this.dustToRev(balanceDust);

      // Get related transactions (async, don't block on failure)
      const transactions = await this.getRelatedTransactions(address);

      // Prepare result
      const result: WalletBalance = {
        address,
        balance: {
          dust: balanceDust,
          rev: balanceRev,
        },
        transactions,
      };

      // Add note for uninitialized addresses
      if (balanceDust === 0 && transactions.length === 0) {
        result.note = 'This address has not been initialized yet or has no transaction history.';
      }

      return result;

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve wallet balance');
    }
  }

  /**
   * Check if RChain node is accessible
   */
  public static async checkNodeConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.RCHAIN_NODE_URL}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default WalletService;