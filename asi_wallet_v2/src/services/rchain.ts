import axios, { AxiosInstance } from 'axios';
import { signDeploy } from 'utils/crypto';

export interface Deploy {
  term: string;
  phloLimit: number;
  phloPrice: number;
  validAfterBlockNumber: number;
  timestamp: number;
  shardId?: string;
}

export interface SignedDeploy extends Deploy {
  deployer: string;
  sig: string;
  sigAlgorithm: string;
}

export class RChainService {
  private validatorClient: AxiosInstance;
  private readOnlyClient: AxiosInstance;
  private adminClient?: AxiosInstance;
  private nodeUrl: string;
  private readOnlyUrl: string;
  private adminUrl?: string;
  private shardId: string;

  constructor(nodeUrl: string, readOnlyUrl?: string, adminUrl?: string, shardId: string = 'root') {
    this.nodeUrl = nodeUrl;
    this.readOnlyUrl = readOnlyUrl || nodeUrl; // Fallback to validator URL if no read-only URL
    this.adminUrl = adminUrl;
    this.shardId = shardId;
    
    // Validator client for state-changing operations
    this.validatorClient = axios.create({
      baseURL: nodeUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Read-only client for queries
    this.readOnlyClient = axios.create({
      baseURL: this.readOnlyUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Admin client for propose operations (local networks)
    if (adminUrl) {
      this.adminClient = axios.create({
        baseURL: adminUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Real RNode HTTP API call with intelligent routing
  private async rnodeHttp(apiMethod: string, data?: any): Promise<any> {
    const postMethods = ['prepare-deploy', 'deploy', 'data-at-name', 'explore-deploy', 'propose'];
    const isPost = !!data && postMethods.includes(apiMethod);
    const method = isPost ? 'POST' : 'GET';
    const url = `/api/${apiMethod}`;

    // Determine which client to use based on operation type
    let client: AxiosInstance;
    let nodeDescription: string;
    
    if (apiMethod === 'propose' && this.adminClient) {
      // Propose operations use admin client (for local networks)
      client = this.adminClient;
      nodeDescription = `Admin Node at ${this.adminUrl}`;
    } else if (apiMethod === 'explore-deploy' || (this.isReadOnlyOperation(apiMethod) && !isPost)) {
      // explore-deploy ALWAYS goes to read-only node, even though it's a POST
      // Other read operations use read-only client only for GET requests
      client = this.readOnlyClient;
      nodeDescription = `Read-Only Node at ${this.readOnlyUrl}`;
    } else {
      // Write operations use validator client
      client = this.validatorClient;
      nodeDescription = `Validator Node at ${this.nodeUrl}`;
    }

    try {
      // F1R3wallet sends explore-deploy as plain text, not JSON
      const isExploreDeployString = apiMethod === 'explore-deploy' && typeof data === 'string';
      
      const response = await client.request({
        method,
        url,
        data: isPost ? data : undefined,
        headers: isExploreDeployString ? {
          'Content-Type': 'text/plain'
        } : undefined,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`RNode API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error(`Network Error: Unable to connect to ${nodeDescription}`);
      } else {
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }
  
  // Helper method to determine if an operation is read-only
  private isReadOnlyOperation(apiMethod: string): boolean {
    const readOnlyMethods = [
      'explore-deploy',      // For balance checks and exploratory deploys
      'blocks',              // Block information
      'status',              // Node status
      'deploy',              // GET only - to check deploy status
      'light-blocks-by-heights',
      'deploy-service',
      'data-at-name'
    ];
    
    return readOnlyMethods.includes(apiMethod);
  }

  // Get balance using real Rholang code (from F1R3FLY wallet)
  async getBalance(revAddress: string): Promise<string> {
    const checkBalanceRho = `
      new return, rl(\`rho:registry:lookup\`), RevVaultCh, vaultCh in {
        rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
        for (@(_, RevVault) <- RevVaultCh) {
          @RevVault!("findOrCreate", "${revAddress}", *vaultCh) |
          for (@maybeVault <- vaultCh) {
            match maybeVault {
              (true, vault) => @vault!("balance", *return)
              (false, err)  => return!(err)
            }
          }
        }
      }
    `;

    try {
      const result = await this.exploreDeployData(checkBalanceRho);
      
      if (result && result.length > 0) {
        // F1R3wallet expects the balance to be directly in expr[0].ExprInt.data
        const firstExpr = result[0];
        
        // Check if it's a direct integer (balance)
        if (firstExpr?.ExprInt?.data !== undefined) {
          return firstExpr.ExprInt.data.toString();
        }
        
        // Check if it's an error string
        if (firstExpr?.ExprString?.data !== undefined) {
          console.error('Balance check error:', firstExpr.ExprString.data);
          return '0';
        }
      }
      
      console.log('Balance check: No valid result', result);
      return '0';
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  // Transfer REV using real Rholang code (from F1R3FLY wallet)
  async transfer(fromAddress: string, toAddress: string, amount: string, privateKey: string): Promise<string> {
    const transferRho = `
      new rl(\`rho:registry:lookup\`), RevVaultCh in {
        rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
        for (@(_, RevVault) <- RevVaultCh) {
          new vaultCh, vaultTo, revVaultkeyCh,
          deployerId(\`rho:rchain:deployerId\`),
          deployId(\`rho:rchain:deployId\`)
          in {
            match ("${fromAddress}", "${toAddress}", ${amount}) {
              (revAddrFrom, revAddrTo, amount) => {
                @RevVault!("findOrCreate", revAddrFrom, *vaultCh) |
                @RevVault!("findOrCreate", revAddrTo, *vaultTo) |
                @RevVault!("deployerAuthKey", *deployerId, *revVaultkeyCh) |
                for (@vault <- vaultCh; key <- revVaultkeyCh; _ <- vaultTo) {
                  match vault {
                    (true, vault) => {
                      new resultCh in {
                        @vault!("transfer", revAddrTo, amount, *key, *resultCh) |
                        for (@result <- resultCh) {
                          match result {
                            (true , _  ) => deployId!((true, "Transfer successful (not yet finalized)."))
                            (false, err) => deployId!((false, err))
                          }
                        }
                      }
                    }
                    err => {
                      deployId!((false, "REV vault cannot be found or created."))
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    return await this.sendDeploy(transferRho, privateKey);
  }

  // Send deploy (like F1R3FLY wallet)
  async sendDeploy(rholangCode: string, privateKey: string, phloLimit: number = 500000): Promise<string> {
    try {
      // Get latest block number
      const blocks = await this.rnodeHttp('blocks/1');
      const blockNumber = blocks && blocks.length > 0 ? blocks[0].blockNumber : 0;

      // Create deploy data
      const deployData: Deploy = {
        term: rholangCode,
        phloLimit,
        phloPrice: 1,
        validAfterBlockNumber: blockNumber,
        timestamp: Date.now(),
        shardId: this.shardId
      };

      // Sign the deploy
      const signedDeploy = signDeploy(deployData, privateKey);

      // Format for Web API (like f1r3wallet)
      const webDeploy = {
        data: {
          term: deployData.term,
          timestamp: deployData.timestamp,
          phloPrice: deployData.phloPrice,
          phloLimit: deployData.phloLimit,
          validAfterBlockNumber: deployData.validAfterBlockNumber,
          shardId: deployData.shardId
        },
        sigAlgorithm: signedDeploy.sigAlgorithm,
        signature: signedDeploy.sig,
        deployer: signedDeploy.deployer
      };

      // Debug logging
      console.log('Deploy data:', deployData);
      console.log('Signed deploy:', signedDeploy);
      console.log('Web deploy:', JSON.stringify(webDeploy, null, 2));

      // Send to RNode
      const result = await this.rnodeHttp('deploy', webDeploy);
      
      console.log('Deploy result:', result);
      
      // The deploy result should contain a signature which is the deploy ID
      // The Web API returns the signature string, sometimes with a prefix
      if (typeof result === 'string') {
        // Extract just the deploy ID if it has the "Success! DeployId is: " prefix
        const deployIdMatch = result.match(/DeployId is:\s*([a-fA-F0-9]+)/);
        if (deployIdMatch) {
          return deployIdMatch[1];
        }
        // If no prefix, assume the whole string is the deploy ID
        return result;
      }
      
      return result.signature || result.deployId || result;
    } catch (error: any) {
      console.error('Deploy failed:', error);
      throw new Error(`Deploy failed: ${error.message}`);
    }
  }

  // Explore deploy (read-only, like F1R3FLY wallet)
  async exploreDeployData(rholangCode: string): Promise<any> {
    try {
      console.log('Sending explore-deploy to:', this.readOnlyUrl);
      
      // F1R3wallet sends the Rholang code directly as a string, not as a deploy object
      const result = await this.rnodeHttp('explore-deploy', rholangCode);
      
      console.log('Explore-deploy result:', result);
      return result.expr;
    } catch (error: any) {
      console.error('Explore deploy failed:', error);
      if (error.message.includes('Network Error')) {
        console.error('Make sure your local RChain node is running and accessible at:', this.readOnlyUrl);
      }
      throw new Error(`Explore failed: ${error.message}`);
    }
  }

  // Get latest block number
  async getLatestBlockNumber(): Promise<number> {
    try {
      const blocks = await this.rnodeHttp('blocks/1');
      return blocks && blocks.length > 0 ? blocks[0].blockNumber : 0;
    } catch (error) {
      console.error('Error getting latest block:', error);
      return 0;
    }
  }

  // Enhanced deploy status checking (based on f1r3wallet approach)
  async waitForDeployResult(deployId: string, maxAttempts: number = 15): Promise<any> {
    console.log(`Waiting for deploy result: ${deployId}`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Step 1: Check if deploy exists in a block
        const deployResult = await this.readOnlyClient.get(`/api/deploy/${deployId}`);
        
        if (deployResult.data && deployResult.data.blockHash) {
          console.log(`Deploy ${deployId} found in block ${deployResult.data.blockHash} after ${i + 1} attempts`);
          
          // Step 2: Get full block info to check deploy details
          try {
            const blockResult = await this.readOnlyClient.get(`/api/block/${deployResult.data.blockHash}`);
            
            if (blockResult.data && blockResult.data.deploys) {
              // Find our specific deploy in the block
              const deploy = blockResult.data.deploys.find((d: any) => d.sig === deployId);
              
              if (deploy) {
                // Check for deploy execution errors
                if (deploy.errored) {
                  return {
                    status: 'errored',
                    error: 'Deploy execution failed',
                    blockHash: deployResult.data.blockHash,
                    deploy: deploy
                  };
                }
                
                if (deploy.systemdeployerror) {
                  return {
                    status: 'system_error',
                    error: deploy.systemdeployerror,
                    blockHash: deployResult.data.blockHash,
                    deploy: deploy
                  };
                }
                
                // Deploy succeeded and is in a block
                return {
                  status: 'completed',
                  message: 'Deploy successfully included in block',
                  blockHash: deployResult.data.blockHash,
                  cost: deploy.cost,
                  deploy: deploy
                };
              }
            }
          } catch (blockError) {
            console.log(`Could not get block details for ${deployResult.data.blockHash}:`, blockError);
          }
          
          // Deploy found but couldn't get block details - still a success
          return {
            status: 'completed',
            message: 'Deploy successfully included in block',
            blockHash: deployResult.data.blockHash,
            deployId: deployId
          };
        }
        
      } catch (error: any) {
        // Continue polling if deploy not found yet
        console.log(`Waiting for deploy ${deployId}... (${i + 1}/${maxAttempts})`);
        if (error.response?.status === 404 || error.response?.status === 400) {
          // Deploy not found yet, continue polling
        } else {
          console.error(`Error checking deploy ${deployId}:`, error.message);
        }
      }
      
      // Wait 3 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    throw new Error(`Deploy ${deployId} not found in any block after ${maxAttempts} attempts (45 seconds). The deploy may still be processing or pending block inclusion.`);
  }

  // Check if node is accessible (checks validator node by default)
  async isNodeAccessible(nodeType: 'validator' | 'readOnly' | 'admin' = 'validator'): Promise<boolean> {
    try {
      let client: AxiosInstance;
      
      switch (nodeType) {
        case 'readOnly':
          client = this.readOnlyClient;
          break;
        case 'admin':
          if (!this.adminClient) return false;
          client = this.adminClient;
          break;
        default:
          client = this.validatorClient;
      }
      
      const response = await client.get('/api/status');
      return !!response.data;
    } catch {
      return false;
    }
  }
  
  // Propose block (for local networks with validator nodes)
  async propose(): Promise<any> {
    if (!this.adminClient) {
      throw new Error('Admin URL not configured. Propose is only available for local networks.');
    }
    
    try {
      return await this.rnodeHttp('propose', {});
    } catch (error: any) {
      throw new Error(`Propose failed: ${error.message}`);
    }
  }
}