export class WalletConnectService {
  private static instance: WalletConnectService | null = null;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new WalletConnectService();
    }
    return this.instance;
  }
  
  async init() {
    return Promise.resolve();
  }
  
  async connect(uri?: string) {
    return Promise.resolve();
  }
  
  async disconnect(topic: string) {
    return Promise.resolve();
  }
  
  async approveSession() {
    return Promise.resolve({
      topic: 'mock-session-topic',
      acknowledged: () => Promise.resolve(),
    });
  }
  
  async rejectSession() {
    return Promise.resolve();
  }
  
  async approveRequest() {
    return Promise.resolve();
  }
  
  async rejectRequest() {
    return Promise.resolve();
  }
  
  getPairings() {
    return [];
  }
  
  getActiveSessions() {
    return [];
  }
  
  on(event: string, handler: Function) {
    // Mock event listener
  }
  
  off(event: string, handler: Function) {
    // Mock event listener removal
  }
}