import sqlite3 from 'sqlite3';
import { FaucetRequest, DailyLimit } from '../types';

export class DatabaseService {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Create tables
        this.db.serialize(() => {
          // Faucet requests table
          this.db.run(`
            CREATE TABLE IF NOT EXISTS faucet_requests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              address TEXT NOT NULL,
              amount INTEGER NOT NULL,
              deploy_id TEXT,
              ip_address TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              status TEXT DEFAULT 'pending'
            )
          `);

          // Daily limits table
          this.db.run(`
            CREATE TABLE IF NOT EXISTS daily_limits (
              address TEXT PRIMARY KEY,
              date DATE NOT NULL,
              total_amount INTEGER DEFAULT 0,
              request_count INTEGER DEFAULT 0
            )
          `);

          resolve();
        });
      });
    });
  }

  async recordRequest(request: FaucetRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const { address, amount, deployId, ipAddress, status } = request;
      
      this.db.serialize(() => {
        // Insert request
        this.db.run(
          `INSERT INTO faucet_requests (address, amount, deploy_id, ip_address, status)
           VALUES (?, ?, ?, ?, ?)`,
          [address, amount, deployId || null, ipAddress, status],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
          }
        );

        // Update daily limits
        const today = new Date().toISOString().split('T')[0];
        this.db.run(
          `INSERT INTO daily_limits (address, date, total_amount, request_count)
           VALUES (?, ?, ?, 1)
           ON CONFLICT(address) DO UPDATE SET
           total_amount = total_amount + ?,
           request_count = request_count + 1
           WHERE date = ?`,
          [address, today, amount, amount, today],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }
        );
      });
    });
  }

  async getDailyStats(address: string): Promise<{ totalAmount: number; requestCount: number }> {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      
      this.db.get(
        `SELECT total_amount, request_count FROM daily_limits
         WHERE address = ? AND date = ?`,
        [address, today],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve({
            totalAmount: row?.total_amount || 0,
            requestCount: row?.request_count || 0
          });
        }
      );
    });
  }

  async getHourlyRequestCount(ipAddress: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      this.db.get(
        `SELECT COUNT(*) as count FROM faucet_requests
         WHERE ip_address = ? AND timestamp > ?`,
        [ipAddress, oneHourAgo],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(row?.count || 0);
        }
      );
    });
  }

  async getTotalDistributed(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT SUM(amount) as total FROM faucet_requests
         WHERE status = 'success'`,
        [],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(row?.total || 0);
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}