// Transaction History Service - Browser-based transaction tracking

export interface Transaction {
  id: string;
  timestamp: Date;
  type: 'send' | 'receive' | 'deploy';
  from: string;
  to?: string;
  amount?: string;
  deployId?: string;
  blockHash?: string;
  gasCost?: string;
  status: 'pending' | 'confirmed' | 'failed';
  contractCode?: string;
  note?: string;
  network: string;
  detectedBy?: 'balance_change' | 'manual' | 'auto'; // How the receive was detected
}

export interface TransactionFilter {
  type?: 'send' | 'receive' | 'deploy';
  status?: 'pending' | 'confirmed' | 'failed';
  from?: string;
  to?: string;
  startDate?: Date;
  endDate?: Date;
  network?: string;
}

class TransactionHistoryService {
  private static readonly STORAGE_KEY = 'asi_wallet_transaction_history';
  private static readonly MAX_TRANSACTIONS = 10000; // Limit to prevent storage issues
  private static readonly VERSION = '1.0';

  // Save a new transaction
  static addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
    const transactions = this.getTransactions();
    
    const newTransaction: Transaction = {
      ...transaction,
      id: this.generateTransactionId(),
      timestamp: new Date(transaction.timestamp) // Ensure it's a Date object
    };

    // Add to beginning (newest first)
    transactions.unshift(newTransaction);

    // Limit total transactions
    if (transactions.length > this.MAX_TRANSACTIONS) {
      transactions.splice(this.MAX_TRANSACTIONS);
    }

    this.saveTransactions(transactions);
    return newTransaction;
  }

  // Update transaction status
  static updateTransaction(
    id: string, 
    updates: Partial<Pick<Transaction, 'status' | 'blockHash' | 'gasCost'>>
  ): Transaction | null {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(tx => tx.id === id);
    
    if (index === -1) return null;

    transactions[index] = {
      ...transactions[index],
      ...updates
    };

    this.saveTransactions(transactions);
    return transactions[index];
  }

  // Get all transactions
  static getTransactions(): Transaction[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const data = JSON.parse(stored);
      
      // Version check
      if (data.version !== this.VERSION) {
        console.log('Transaction history version mismatch, clearing...');
        return [];
      }

      // Parse dates
      return data.transactions.map((tx: any) => ({
        ...tx,
        timestamp: new Date(tx.timestamp)
      }));
    } catch (error) {
      console.error('Error loading transaction history:', error);
      return [];
    }
  }

  // Get filtered transactions
  static getFilteredTransactions(filter: TransactionFilter): Transaction[] {
    const transactions = this.getTransactions();
    
    return transactions.filter(tx => {
      if (filter.type && tx.type !== filter.type) return false;
      if (filter.status && tx.status !== filter.status) return false;
      if (filter.from && tx.from.toLowerCase() !== filter.from.toLowerCase()) return false;
      if (filter.to && tx.to?.toLowerCase() !== filter.to.toLowerCase()) return false;
      if (filter.network && tx.network !== filter.network) return false;
      
      const txDate = new Date(tx.timestamp);
      if (filter.startDate && txDate < filter.startDate) return false;
      if (filter.endDate && txDate > filter.endDate) return false;
      
      return true;
    });
  }

  // Get transactions for a specific account (sent from this account or received by this account)
  static getAccountTransactions(address: string): Transaction[] {
    const transactions = this.getTransactions();
    return transactions.filter(tx => 
      tx.from.toLowerCase() === address.toLowerCase() || 
      (tx.type === 'receive' && tx.to?.toLowerCase() === address.toLowerCase())
    );
  }
  
  // Get all transactions involving an account (as sender or receiver)
  static getAccountRelatedTransactions(address: string): Transaction[] {
    const transactions = this.getTransactions();
    return transactions.filter(tx => 
      tx.from.toLowerCase() === address.toLowerCase() || 
      tx.to?.toLowerCase() === address.toLowerCase()
    );
  }

  // Get transaction by ID
  static getTransaction(id: string): Transaction | null {
    const transactions = this.getTransactions();
    return transactions.find(tx => tx.id === id) || null;
  }

  // Get transaction statistics
  static getStatistics(address?: string) {
    const transactions = address 
      ? this.getAccountTransactions(address)
      : this.getTransactions();

    const stats = {
      total: transactions.length,
      sent: 0,
      received: 0,
      deployed: 0,
      pending: 0,
      confirmed: 0,
      failed: 0,
      totalSent: '0',
      totalReceived: '0',
      totalGas: '0'
    };

    transactions.forEach(tx => {
      // Type counts
      if (tx.type === 'send') stats.sent++;
      else if (tx.type === 'receive') stats.received++;
      else if (tx.type === 'deploy') stats.deployed++;

      // Status counts
      if (tx.status === 'pending') stats.pending++;
      else if (tx.status === 'confirmed') stats.confirmed++;
      else if (tx.status === 'failed') stats.failed++;

      // Amount totals (only for confirmed transactions)
      if (tx.status === 'confirmed' && tx.amount) {
        if (tx.type === 'send') {
          stats.totalSent = (BigInt(stats.totalSent) + BigInt(tx.amount)).toString();
        } else if (tx.type === 'receive') {
          stats.totalReceived = (BigInt(stats.totalReceived) + BigInt(tx.amount)).toString();
        }
      }

      // Gas total
      if (tx.gasCost) {
        stats.totalGas = (BigInt(stats.totalGas) + BigInt(tx.gasCost)).toString();
      }
    });

    return stats;
  }

  // Export transactions
  static exportTransactions(format: 'json' | 'csv' = 'json'): string {
    const transactions = this.getTransactions();
    
    if (format === 'json') {
      return JSON.stringify(transactions, null, 2);
    }
    
    // CSV format
    const headers = [
      'Date',
      'Time',
      'Type',
      'Status',
      'From',
      'To',
      'Amount',
      'Gas Cost',
      'Deploy ID',
      'Block Hash',
      'Network',
      'Note'
    ];
    
    const rows = transactions.map(tx => {
      const date = new Date(tx.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        tx.type,
        tx.status,
        tx.from,
        tx.to || '',
        tx.amount || '',
        tx.gasCost || '',
        tx.deployId || '',
        tx.blockHash || '',
        tx.network,
        tx.note || ''
      ].map(val => `"${val}"`).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }

  // Download transactions
  static downloadTransactions(format: 'json' | 'csv' = 'json') {
    const data = this.exportTransactions(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asi-wallet-transactions-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear all transactions
  static clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Clear old transactions
  static clearOldTransactions(daysToKeep: number = 90): number {
    const transactions = this.getTransactions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const filtered = transactions.filter(tx => 
      new Date(tx.timestamp) > cutoffDate
    );
    
    const removed = transactions.length - filtered.length;
    if (removed > 0) {
      this.saveTransactions(filtered);
    }
    
    return removed;
  }

  // Detect and record a received transaction based on balance increase
  static detectReceivedTransaction(
    toAddress: string,
    previousBalance: string,
    newBalance: string,
    network: string
  ): Transaction | null {
    const prevBalanceNum = BigInt(previousBalance);
    const newBalanceNum = BigInt(newBalance);
    
    console.log(`[Receive Detection] Address: ${toAddress}`);
    console.log(`[Receive Detection] Previous balance: ${previousBalance} (${prevBalanceNum})`);
    console.log(`[Receive Detection] New balance: ${newBalance} (${newBalanceNum})`);
    
    // Only record if balance increased
    if (newBalanceNum <= prevBalanceNum) {
      console.log('[Receive Detection] No increase detected, skipping');
      return null;
    }
    
    const amount = (newBalanceNum - prevBalanceNum).toString();
    console.log(`[Receive Detection] Amount received: ${amount} atomic units`);
    
    // Check if we already have a recent receive transaction with this amount
    // to avoid duplicates from multiple balance checks
    const recentTransactions = this.getAccountTransactions(toAddress)
      .filter(tx => tx.type === 'receive' && tx.status === 'confirmed')
      .filter(tx => {
        const txTime = new Date(tx.timestamp).getTime();
        const now = Date.now();
        return (now - txTime) < 60000; // Within last minute
      });
    
    const isDuplicate = recentTransactions.some(tx => tx.amount === amount);
    if (isDuplicate) {
      return null;
    }
    
    // Create a receive transaction
    const transaction = this.addTransaction({
      timestamp: new Date(),
      type: 'receive',
      from: 'Unknown', // We don't know the sender
      to: toAddress,
      amount: amount,
      status: 'confirmed',
      network: network,
      detectedBy: 'balance_change',
      note: 'Detected from balance increase'
    });
    
    console.log(`[Receive Detection] Created transaction:`, {
      to: toAddress,
      amount: amount,
      amountInREV: (Number(amount) / 100000000).toFixed(8)
    });
    
    return transaction;
  }

  // Private helper methods
  private static saveTransactions(transactions: Transaction[]): void {
    try {
      const data = {
        version: this.VERSION,
        transactions: transactions
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving transaction history:', error);
      // If storage is full, remove oldest transactions
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const reduced = transactions.slice(0, Math.floor(transactions.length * 0.9));
        this.saveTransactions(reduced);
      }
    }
  }

  private static generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default TransactionHistoryService;