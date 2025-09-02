import { Core } from '@walletconnect/core';
import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet';
import { SessionTypes, SignClientTypes, ProposalTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { buildApprovedNamespaces } from '@walletconnect/utils';
import { SecureStorage } from './secureStorage';
import { env } from '../utils/env';

export interface WalletConnectSession {
  topic: string;
  peerMetadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  namespaces: SessionTypes.Namespaces;
  expiry: number;
}

export interface SignRequest {
  id: number;
  topic: string;
  params: {
    chainId: string;
    request: {
      method: string;
      params: any[];
    };
  };
  verifyContext?: any;
}

class WalletConnectService {
  private web3wallet: IWeb3Wallet | null = null;
  private initialized = false;
  private initializing = false;
  private initializationPromise: Promise<void> | null = null;
  private projectId = env.WALLETCONNECT_PROJECT_ID;
  private relayUrl = 'wss://relay.walletconnect.com';

  async initialize(): Promise<void> {
    // Return existing initialization if in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Already initialized
    if (this.initialized) {
      return Promise.resolve();
    }
    
    // Start new initialization
    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }
  
  private async _doInitialize(): Promise<void> {
    if (this.initialized || this.initializing) return;
    
    this.initializing = true;

    // Set up global error handler for WalletConnect errors
    this.setupGlobalErrorHandler();

    try {
      // Clean up problematic keys that might cause "No matching key" errors
      this.cleanupProblematicKeys();

      const core = new Core({
        projectId: this.projectId,
        relayUrl: this.relayUrl,
      });

      console.log('[WalletConnect] Initializing Web3Wallet...');
      console.log('[WalletConnect] Project ID:', this.projectId);
      console.log('[WalletConnect] Origin:', window.location.origin);
      
      this.web3wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: 'ASI Wallet',
          description: 'ASI Wallet - A modern wallet for the ASI Chain network',
          url: window.location.origin,  // Use actual origin instead of hardcoded URL
          icons: ['https://asiwallet.app/logo192.png'],
        },
      });
      
      console.log('[WalletConnect] Web3Wallet initialized successfully');

      this.setupEventListeners();
      this.patchWalletConnectMethods();
      this.initialized = true;
      this.initializing = false;

      // Restore saved sessions
      await this.restoreSessions();
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      this.initializing = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.web3wallet) return;

    // Session proposal listener
    this.web3wallet.on('session_proposal', this.onSessionProposal);

    // Session request listener
    this.web3wallet.on('session_request', this.onSessionRequest);

    // Session delete listener
    this.web3wallet.on('session_delete', this.onSessionDelete);

    // Auth request listener
    this.web3wallet.on('auth_request', this.onAuthRequest);
    
    // Listen for pairing delete events
    this.web3wallet.core.pairing.events.on('pairing_delete', (pairing: any) => {
      console.log('[WalletConnect] Pairing deleted:', pairing);
    });
  }

  private setupGlobalErrorHandler(): void {
    // Error handling has been temporarily disabled to expose the underlying issue.
  }

  private patchWalletConnectMethods(): void {
    // Method patching has been temporarily disabled to expose the underlying issue.
  }

  private onSessionProposal = async (proposal: SignClientTypes.EventArguments['session_proposal']) => {
    console.log('[WalletConnect] Session proposal received:', proposal);
    console.log('[WalletConnect] Proposal ID:', proposal.id);
    console.log('[WalletConnect] Proposer:', proposal.params.proposer);
    // This will be handled by the UI component
    window.dispatchEvent(new CustomEvent('walletconnect_session_proposal', { detail: proposal }));
  };

  private onSessionRequest = async (request: SignClientTypes.EventArguments['session_request']) => {
    window.dispatchEvent(new CustomEvent('walletconnect_session_request', { detail: request }));
  };

  private onSessionDelete = async ({ topic }: { topic: string }) => {
    console.error('❌ [EVENT] Session deleted:', topic);
    try {
      await this.removeSession(topic);
      window.dispatchEvent(new CustomEvent('walletconnect_session_delete', { detail: { topic } }));
    } catch (error) {
      console.warn('Error handling session delete event:', error);
      window.dispatchEvent(new CustomEvent('walletconnect_session_delete', { detail: { topic } }));
    }
  };

  private onAuthRequest = async (request: any) => {
    console.log('Auth request received:', request);
    window.dispatchEvent(new CustomEvent('walletconnect_auth_request', { detail: request }));
  };

  isReady(): boolean {
    return this.initialized && this.web3wallet !== null;
  }

  async waitForReady(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    while (!this.isReady()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('WalletConnect initialization timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async pair(uri: string): Promise<void> {
    await this.waitForReady();
    if (!this.web3wallet) {
      console.error('FATAL: Pair called before web3wallet is initialized.');
      throw new Error('WalletConnect not initialized');
    }
    
    console.log(`[WalletConnect] Attempting to pair with URI:`, uri);
    console.log(`[WalletConnect] Current pairings:`, this.web3wallet.core.pairing.pairings.values);
    
    try {
      await this.web3wallet.core.pairing.pair({ uri });
      console.log('[WalletConnect] Successfully paired with URI');
      console.log('[WalletConnect] Updated pairings:', this.web3wallet.core.pairing.pairings.values);
    } catch (error: any) {
      console.error('[WalletConnect] Pairing Error:', {
        message: error.message,
        stack: error.stack,
        uri,
      });
      throw new Error(`Pairing failed: ${error.message}`);
    }
  }

  async approveSession(proposal: ProposalTypes.Struct, address: string): Promise<string> {
    if (!this.web3wallet) throw new Error('WalletConnect not initialized');

    try {
      const { id } = proposal;
      const params = (proposal as any).params;
      // const { requiredNamespaces } = params; // Not used but available for future use

      // Build approved namespaces for RChain
      const namespaces = buildApprovedNamespaces({
        proposal: params,
        supportedNamespaces: {
          rchain: {
            chains: ['rchain:01', 'rchain:testnet'],
            methods: ['rchain_sendTransaction', 'rchain_signMessage', 'rchain_getBalance'],
            events: ['accountsChanged', 'chainChanged'],
            accounts: [`rchain:01:${address}`, `rchain:testnet:${address}`],
          },
        },
      });

      const session = await this.web3wallet.approveSession({
        id,
        namespaces,
      });

      // Save session
      await this.saveSession(session);

      return session.topic;
    } catch (error) {
      console.error('Failed to approve session:', error);
      throw error;
    }
  }

  async rejectSession(id: number): Promise<void> {
    if (!this.web3wallet) throw new Error('WalletConnect not initialized');

    try {
      await this.web3wallet.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED'),
      });
    } catch (error) {
      console.error('Failed to reject session:', error);
      throw error;
    }
  }

  async respondToRequest(topic: string, id: number, response: any): Promise<void> {
    if (!this.web3wallet) throw new Error('WalletConnect not initialized');

    try {
      await this.web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          result: response,
        },
      });
    } catch (error) {
      console.error(`❌ [ERROR] Failed to respond to request ID ${id}:`, error);
      throw error;
    }
  }

  async rejectRequest(topic: string, id: number, message?: string): Promise<void> {
    if (!this.web3wallet) throw new Error('WalletConnect not initialized');

    try {
      await this.web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: {
            code: 5000,
            message: message || 'User rejected request',
          },
        },
      });
    } catch (error) {
      console.error('Failed to reject request:', error);
      throw error;
    }
  }

  async disconnect(topic: string): Promise<void> {
    if (!this.web3wallet) throw new Error('WalletConnect not initialized');

    try {
      // Check if session exists before trying to disconnect
      const activeSessions = this.getActiveSessions();
      const sessionExists = activeSessions.some(session => session.topic === topic);
      
      if (sessionExists) {
        await this.web3wallet.disconnectSession({
          topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });
      } else {
        console.warn('Session not found, may have been already disconnected:', topic);
      }
      
      // Always try to remove from storage, even if disconnect failed
      await this.removeSession(topic);
    } catch (error: any) {
      console.error('Failed to disconnect session:', error);
      // Removed special handling to allow the original error to surface.
      throw error;
    }
  }

  getActiveSessions(): SessionTypes.Struct[] {
    if (!this.web3wallet) return [];
    return Object.values(this.web3wallet.getActiveSessions());
  }

  private cleanupProblematicKeys(): void {
    try {
      const keysToRemove: string[] = [];
      
      // Only remove keys that are known to cause issues
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wc@2:')) {
          // Remove history keys that reference non-existent sessions
          if (key.includes(':history:') || key.includes(':messages:')) {
            keysToRemove.push(key);
          }
        }
      }
      
      if (keysToRemove.length > 0) {
        console.log(`[WalletConnect] Cleaning ${keysToRemove.length} problematic keys`);
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('[WalletConnect] Error cleaning problematic keys:', error);
    }
  }

  async clearWcStorage(): Promise<void> {
    try {
      // Clear only WalletConnect keys that belong to this wallet instance
      // Avoid clearing DApp keys which might be on the same origin
      const walletPrefix = "wc@2:web3wallet:";
      const corePrefix = "wc@2:core:";
      const keystorePrefix = "wc@2:keychain:";
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(walletPrefix) || key.startsWith(corePrefix) || key.startsWith(keystorePrefix))) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        console.log(`Clearing ${keysToRemove.length} wallet-specific WalletConnect keys...`);
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Wallet WalletConnect storage cleared successfully.');
      }
    } catch (error) {
      console.error('Failed to clear WalletConnect storage:', error);
    }
  }
  
  // Add method to reset WalletConnect completely when needed
  async reset(): Promise<void> {
    this.initialized = false;
    this.initializing = false;
    this.initializationPromise = null;
    this.web3wallet = null;
    await this.clearWcStorage();
  }

  // Session persistence
  private async saveSession(session: SessionTypes.Struct): Promise<void> {
    const storage = new SecureStorage();
    const sessions = await this.getSavedSessions();
    sessions[session.topic] = session;
    await storage.setItem('walletconnect_sessions', JSON.stringify(sessions));
  }

  private async removeSession(topic: string): Promise<void> {
    const storage = new SecureStorage();
    const sessions = await this.getSavedSessions();
    delete sessions[topic];
    await storage.setItem('walletconnect_sessions', JSON.stringify(sessions));
  }

  private async getSavedSessions(): Promise<Record<string, SessionTypes.Struct>> {
    const storage = new SecureStorage();
    const sessionsStr = await storage.getItem('walletconnect_sessions');
    return sessionsStr ? JSON.parse(sessionsStr) : {};
  }

  private async restoreSessions(): Promise<void> {
    // Sessions are automatically restored by WalletConnect SDK
    // We just need to ensure our UI is updated
    const activeSessions = this.getActiveSessions();
    if (activeSessions.length > 0) {
      window.dispatchEvent(new CustomEvent('walletconnect_sessions_restored', { detail: activeSessions }));
    }
  }

  // QR Code generation helper
  generateQRCodeData(uri: string): string {
    return uri;
  }
}

export const walletConnectService = new WalletConnectService();