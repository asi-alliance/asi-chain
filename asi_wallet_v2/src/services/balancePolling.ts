// Balance Polling Service - Automatic background balance checking

import { store } from 'store';
import { fetchBalance } from 'store/walletSlice';
import TransactionHistoryService from './transactionHistory';

interface PollingConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastPollTime?: Date;
}

class BalancePollingService {
  private static readonly STORAGE_KEY = 'asi_wallet_balance_polling_config';
  private static pollingInterval: NodeJS.Timeout | null = null;
  private static isPolling = false;

  // Default configuration
  private static readonly DEFAULT_CONFIG: PollingConfig = {
    enabled: false,
    intervalMinutes: 5, // Default 5 minutes
  };

  // Get polling configuration
  static getConfig(): PollingConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading polling config:', error);
    }
    return this.DEFAULT_CONFIG;
  }

  // Save polling configuration
  static saveConfig(config: PollingConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving polling config:', error);
    }
  }

  // Enable polling
  static enable(intervalMinutes?: number): void {
    const config = this.getConfig();
    config.enabled = true;
    if (intervalMinutes) {
      config.intervalMinutes = intervalMinutes;
    }
    this.saveConfig(config);
    this.start();
  }

  // Disable polling
  static disable(): void {
    const config = this.getConfig();
    config.enabled = false;
    this.saveConfig(config);
    this.stop();
  }

  // Start polling
  static start(): void {
    const config = this.getConfig();
    
    if (!config.enabled) {
      console.log('Balance polling is disabled');
      return;
    }

    // Clear any existing interval
    this.stop();

    console.log(`Starting balance polling every ${config.intervalMinutes} minutes`);

    // Perform initial poll
    this.pollBalances();

    // Set up interval
    const intervalMs = config.intervalMinutes * 60 * 1000;
    this.pollingInterval = setInterval(() => {
      this.pollBalances();
    }, intervalMs);
  }

  // Stop polling
  static stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Balance polling stopped');
    }
  }

  // Perform balance polling for all accounts
  static async pollBalances(): Promise<void> {
    if (this.isPolling) {
      console.log('Balance polling already in progress, skipping...');
      return;
    }

    this.isPolling = true;
    const state = store.getState();
    const { accounts, selectedNetwork } = state.wallet;
    const { isAuthenticated } = state.auth;

    // Only poll if authenticated and has accounts
    if (!isAuthenticated || accounts.length === 0) {
      this.isPolling = false;
      return;
    }

    console.log(`[Balance Polling] Starting poll for ${accounts.length} accounts on ${selectedNetwork.name}...`);

    try {
      // Store current balances before fetching
      const previousBalances = new Map<string, string>();
      accounts.forEach(account => {
        const prevBalance = account.balance || '0';
        previousBalances.set(account.id, prevBalance);
        console.log(`[Balance Polling] Account ${account.name}: current balance = ${prevBalance} REV`);
      });

      // Fetch balance for each account
      for (const account of accounts) {
        try {
          console.log(`[Balance Polling] Fetching balance for ${account.name}...`);
          
          // Dispatch the fetchBalance action
          const result = await store.dispatch(fetchBalance({ account, network: selectedNetwork }));
          
          if (result.payload) {
            const newBalance = (result.payload as any).balance;
            const oldBalance = previousBalances.get(account.id) || '0';
            console.log(`[Balance Polling] ${account.name}: ${oldBalance} → ${newBalance} REV`);
          }
          
          // Small delay between requests to avoid overwhelming the node
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`[Balance Polling] Failed for account ${account.name}:`, error);
        }
      }

      // Update last poll time
      const config = this.getConfig();
      config.lastPollTime = new Date();
      this.saveConfig(config);

      console.log('[Balance Polling] Completed successfully');
    } catch (error) {
      console.error('[Balance Polling] Error:', error);
    } finally {
      this.isPolling = false;
    }
  }

  // Get time until next poll
  static getTimeUntilNextPoll(): string {
    const config = this.getConfig();
    
    if (!config.enabled || !config.lastPollTime) {
      return 'Not scheduled';
    }

    const lastPoll = new Date(config.lastPollTime);
    const nextPoll = new Date(lastPoll.getTime() + config.intervalMinutes * 60 * 1000);
    const now = new Date();
    const msRemaining = nextPoll.getTime() - now.getTime();

    if (msRemaining <= 0) {
      return 'Polling now...';
    }

    const minutesRemaining = Math.floor(msRemaining / 60000);
    const secondsRemaining = Math.floor((msRemaining % 60000) / 1000);

    if (minutesRemaining > 0) {
      return `${minutesRemaining}m ${secondsRemaining}s`;
    } else {
      return `${secondsRemaining}s`;
    }
  }

  // Initialize polling on app start
  static initialize(): void {
    const config = this.getConfig();
    if (config.enabled) {
      // Wait a bit before starting to ensure app is fully loaded
      setTimeout(() => {
        this.start();
      }, 5000);
    }
  }

  // Update interval
  static updateInterval(intervalMinutes: number): void {
    const config = this.getConfig();
    config.intervalMinutes = intervalMinutes;
    this.saveConfig(config);
    
    // Restart polling if enabled
    if (config.enabled) {
      this.start();
    }
  }

  // Check if polling is enabled
  static isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  // Get current interval in minutes
  static getIntervalMinutes(): number {
    return this.getConfig().intervalMinutes;
  }
}

export default BalancePollingService;