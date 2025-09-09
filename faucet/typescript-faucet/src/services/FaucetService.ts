import { RChainService } from './RChainService';
import { DatabaseService } from '../database/DatabaseService';
import { importPrivateKey, validateRevAddress } from '../utils/crypto';
import { FaucetConfig, TransferResult, FaucetStats } from '../types';

export class FaucetService {
  private rchainService: RChainService;
  private db: DatabaseService;
  private config: FaucetConfig;
  private faucetRevAddress: string;

  constructor(config: FaucetConfig) {
    this.config = config;
    this.rchainService = new RChainService(
      config.validatorUrl,
      config.readOnlyUrl,
      undefined,
      'root',
      config.graphqlUrl
    );
    this.db = new DatabaseService(config.databasePath);
    
    // Derive faucet REV address from private key
    const keyPair = importPrivateKey(config.privateKey);
    this.faucetRevAddress = keyPair.revAddress;
    
    console.log('Faucet initialized with REV address:', this.faucetRevAddress);
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
    console.log('Faucet service initialized');
  }

  async requestTokens(address: string, ipAddress: string): Promise<TransferResult> {
    try {
      // Validate address format
      if (!validateRevAddress(address)) {
        return {
          success: false,
          error: 'Invalid REV address format. Address must start with "1111" and be properly formatted.'
        };
      }

      // Check daily limit
      const dailyStats = await this.db.getDailyStats(address);
      if (dailyStats.requestCount >= this.config.maxRequestsPerDay) {
        return {
          success: false,
          error: `Daily limit reached (${this.config.maxRequestsPerDay} requests)`
        };
      }

      // Check hourly limit for IP
      const hourlyCount = await this.db.getHourlyRequestCount(ipAddress);
      if (hourlyCount >= this.config.maxRequestsPerHour) {
        return {
          success: false,
          error: `Rate limit exceeded. Please try again later.`
        };
      }

      // Convert amount to dust (1 REV = 10^8 dust)
      const amountInDust = (this.config.faucetAmount * 100000000).toString();

      // Send the transfer
      const result = await this.rchainService.transfer(
        this.faucetRevAddress,
        address,
        amountInDust,
        this.config.privateKey
      );

      if (result.success) {
        // Record successful request
        await this.db.recordRequest({
          address,
          amount: this.config.faucetAmount,
          deployId: result.deployId,
          ipAddress,
          timestamp: new Date(),
          status: 'success'
        });

        return {
          success: true,
          deployId: result.deployId,
          message: `Successfully sent ${this.config.faucetAmount} REV to ${address}`
        };
      } else {
        // Record failed request
        await this.db.recordRequest({
          address,
          amount: this.config.faucetAmount,
          ipAddress,
          timestamp: new Date(),
          status: 'failed'
        });

        return result;
      }
    } catch (error: any) {
      console.error('Error processing faucet request:', error);
      return {
        success: false,
        error: error.message || 'Internal server error'
      };
    }
  }

  async getStats(): Promise<FaucetStats> {
    try {
      // Get faucet balance
      const balanceDust = await this.rchainService.getBalance(this.faucetRevAddress);
      const balance = parseFloat(balanceDust) / 100000000; // Convert from dust to REV

      // Get distributed amount
      const distributed = await this.db.getTotalDistributed();

      // Check if node is accessible
      const isOnline = await this.rchainService.isNodeAccessible();

      return {
        balance,
        distributed,
        status: isOnline ? 'online' : 'offline'
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        balance: 0,
        distributed: 0,
        status: 'offline'
      };
    }
  }
}