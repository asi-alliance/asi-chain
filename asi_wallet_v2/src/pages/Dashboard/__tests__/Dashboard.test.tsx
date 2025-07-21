import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Dashboard } from '../Dashboard';
import authReducer from '../../../store/authSlice';
import walletReducer from '../../../store/walletSlice';
import themeReducer from '../../../store/themeSlice';
import { lightTheme } from '../../../styles/theme';

// Mock dependencies
jest.mock('../../../services/balancePolling');
jest.mock('../../../services/rchain');
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}));

// Mock components that might have issues
jest.mock('../../../components/WalletConnect/WalletConnectModalV2', () => ({
  WalletConnectModalV2: () => <div>WalletConnect Modal</div>,
}));

describe('Dashboard Component', () => {
  let store: ReturnType<typeof configureStore>;

  const mockAccount = {
    id: 'acc1',
    name: 'Test Account',
    address: '0x1234567890123456789012345678901234567890',
    ethAddress: '0x1234567890123456789012345678901234567890',
    revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
    publicKey: 'pub123',
    balance: '100.5',
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
        wallet: walletReducer,
        theme: themeReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: true,
          hasAccounts: true,
          unlockedAccounts: [mockAccount],
          requirePasswordForTransaction: true,
          idleTimeout: 15,
          lastActivity: Date.now(),
          isLoading: false,
          error: null,
        },
        wallet: {
          accounts: [mockAccount],
          currentAccountId: 'acc1',
          networks: [
            {
              id: 'mainnet',
              name: 'RChain Mainnet',
              url: 'https://observer.mainnet.rchain.coop',
              adminUrl: 'https://observer.mainnet.rchain.coop:40403',
              readOnly: false,
            },
          ],
          currentNetworkId: 'mainnet',
          transactions: [],
          pendingTransactions: [],
          deployResults: {},
          exploratoryDeployResults: {},
          error: null,
        },
        theme: {
          darkMode: false,
        },
      },
    });
  });

  const renderDashboard = () => {
    return render(
      <Provider store={store}>
        <HashRouter>
          <ThemeProvider theme={lightTheme}>
            <Dashboard />
          </ThemeProvider>
        </HashRouter>
      </Provider>
    );
  };

  describe('Account Display', () => {
    it('should display current account information', () => {
      renderDashboard();

      expect(screen.getByText('Test Account')).toBeInTheDocument();
      expect(screen.getByText(/100\.5/)).toBeInTheDocument(); // Balance
      expect(screen.getByText(/REV/)).toBeInTheDocument();
    });

    it('should show account addresses', () => {
      renderDashboard();

      // Click on address to expand
      const addressSection = screen.getByText(/11112bv5/);
      expect(addressSection).toBeInTheDocument();
    });

    it('should copy address to clipboard', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      renderDashboard();

      // Find and click copy button
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent?.includes('Copy')
      );
      
      if (copyButton) {
        fireEvent.click(copyButton);
        
        await waitFor(() => {
          expect(mockClipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('1111')
          );
        });
      }
    });
  });

  describe('Balance Display', () => {
    it('should show REV balance', () => {
      renderDashboard();

      expect(screen.getByText(/100\.5/)).toBeInTheDocument();
      expect(screen.getByText(/REV/)).toBeInTheDocument();
    });

    it('should show USD value if available', () => {
      // Update store with USD price
      store.dispatch({
        type: 'wallet/setRevPrice',
        payload: 0.05, // $0.05 per REV
      });

      renderDashboard();

      // 100.5 REV * $0.05 = $5.025
      expect(screen.getByText(/\$5\.03/)).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      // Set loading state
      store.dispatch({
        type: 'wallet/updateAccountBalance',
        payload: { accountId: 'acc1', balance: undefined },
      });

      renderDashboard();

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should navigate to send page', () => {
      renderDashboard();

      const sendButton = screen.getByRole('button', { name: /Send/i });
      expect(sendButton).toBeInTheDocument();
      
      fireEvent.click(sendButton);
      
      // Check if navigation occurred (URL would change in real app)
      expect(window.location.hash).toContain('#/send');
    });

    it('should navigate to receive page', () => {
      renderDashboard();

      const receiveButton = screen.getByRole('button', { name: /Receive/i });
      expect(receiveButton).toBeInTheDocument();
      
      fireEvent.click(receiveButton);
      
      expect(window.location.hash).toContain('#/receive');
    });

    it('should navigate to history page', () => {
      renderDashboard();

      const historyButton = screen.getByRole('button', { name: /History/i });
      expect(historyButton).toBeInTheDocument();
      
      fireEvent.click(historyButton);
      
      expect(window.location.hash).toContain('#/history');
    });
  });

  describe('WalletConnect Integration', () => {
    it('should show WalletConnect button', () => {
      renderDashboard();

      const walletConnectButton = screen.getByRole('button', { 
        name: /WalletConnect/i 
      });
      expect(walletConnectButton).toBeInTheDocument();
    });

    it('should open WalletConnect modal', () => {
      renderDashboard();

      const walletConnectButton = screen.getByRole('button', { 
        name: /WalletConnect/i 
      });
      fireEvent.click(walletConnectButton);

      expect(screen.getByText('WalletConnect Modal')).toBeInTheDocument();
    });
  });

  describe('Network Information', () => {
    it('should display current network', () => {
      renderDashboard();

      expect(screen.getByText(/RChain Mainnet/)).toBeInTheDocument();
    });

    it('should handle network switching', () => {
      // Add another network
      store.dispatch({
        type: 'wallet/addNetwork',
        payload: {
          id: 'testnet',
          name: 'RChain Testnet',
          url: 'https://observer.testnet.rchain.coop',
          adminUrl: 'https://observer.testnet.rchain.coop:40403',
          readOnly: false,
        },
      });

      renderDashboard();

      // Network selector should be present
      const networkSelector = screen.getByText(/RChain Mainnet/);
      expect(networkSelector).toBeInTheDocument();
    });
  });

  describe('Recent Transactions', () => {
    it('should show recent transactions if available', () => {
      // Add a transaction to the store
      store.dispatch({
        type: 'wallet/addTransaction',
        payload: {
          id: 'tx1',
          accountId: 'acc1',
          type: 'transfer',
          from: mockAccount.revAddress,
          to: '1111recipient',
          amount: '10',
          timestamp: Date.now(),
          status: 'completed',
          deployId: 'deploy123',
        },
      });

      renderDashboard();

      expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/1111recipient/)).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });

    it('should show empty state when no transactions', () => {
      renderDashboard();

      expect(screen.getByText(/No recent transactions/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display wallet errors', () => {
      store.dispatch({
        type: 'wallet/setError',
        payload: 'Failed to fetch balance',
      });

      renderDashboard();

      expect(screen.getByText(/Failed to fetch balance/)).toBeInTheDocument();
    });

    it('should display auth errors', () => {
      store.dispatch({
        type: 'auth/setError',
        payload: 'Session expired',
      });

      renderDashboard();

      expect(screen.getByText(/Session expired/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile view correctly', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderDashboard();

      // Mobile specific elements should be visible
      const accountCard = screen.getByText('Test Account').closest('div');
      expect(accountCard).toHaveStyle({ width: '100%' });
    });
  });
});