import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Send } from '../Send';
import authReducer from '../../../store/authSlice';
import walletReducer from '../../../store/walletSlice';
import themeReducer from '../../../store/themeSlice';
import { lightTheme } from '../../../styles/theme';
import { RChainService } from '../../../services/rchain';

// Mock dependencies
jest.mock('../../../services/rchain');
jest.mock('../../../components/PasswordModal', () => ({
  PasswordModal: ({ isOpen, onConfirm, onCancel }: any) => 
    isOpen ? (
      <div data-testid="password-modal">
        <input 
          type="password" 
          placeholder="Password" 
          data-testid="password-input"
          onChange={(e) => e.target.value}
        />
        <button onClick={() => onConfirm('test-password')}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

describe('Send Component', () => {
  let store: ReturnType<typeof configureStore>;
  let user: ReturnType<typeof userEvent.setup>;

  const mockAccount = {
    id: 'acc1',
    name: 'Test Account',
    address: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
    ethAddress: '0x1234567890123456789012345678901234567890',
    revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
    publicKey: 'pub123',
    privateKey: 'priv123',
    balance: '100',
  };

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();

    // Mock RChainService methods
    (RChainService.isValidRevAddress as jest.Mock) = jest.fn((address) => 
      address.startsWith('1111')
    );
    (RChainService.isValidAmount as jest.Mock) = jest.fn((amount) => 
      !isNaN(parseFloat(amount)) && parseFloat(amount) > 0
    );

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

  const renderSend = () => {
    return render(
      <Provider store={store}>
        <HashRouter>
          <ThemeProvider theme={lightTheme}>
            <Send />
          </ThemeProvider>
        </HashRouter>
      </Provider>
    );
  };

  describe('Form Rendering', () => {
    it('should render send form with all fields', () => {
      renderSend();

      expect(screen.getByText(/Send REV/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Recipient.*address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Amount/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
    });

    it('should show current account info', () => {
      renderSend();

      expect(screen.getByText('Test Account')).toBeInTheDocument();
      expect(screen.getByText(/Balance:.*100.*REV/)).toBeInTheDocument();
    });
  });

  describe('Address Validation', () => {
    it('should validate REV address format', async () => {
      renderSend();

      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i);
      
      // Invalid address
      await user.type(addressInput, 'invalid-address');
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(screen.getByText(/Invalid.*address/i)).toBeInTheDocument();
      });

      // Valid address
      await user.clear(addressInput);
      await user.type(addressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(screen.queryByText(/Invalid.*address/i)).not.toBeInTheDocument();
      });
    });

    it('should not allow sending to same address', async () => {
      renderSend();

      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i);
      await user.type(addressInput, mockAccount.revAddress);
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Cannot send to yourself/i)).toBeInTheDocument();
      });
    });
  });

  describe('Amount Validation', () => {
    it('should validate amount format', async () => {
      renderSend();

      const amountInput = screen.getByPlaceholderText(/Amount/i);
      
      // Invalid amount
      await user.type(amountInput, 'abc');
      fireEvent.blur(amountInput);

      await waitFor(() => {
        expect(screen.getByText(/Invalid amount/i)).toBeInTheDocument();
      });

      // Negative amount
      await user.clear(amountInput);
      await user.type(amountInput, '-10');
      fireEvent.blur(amountInput);

      await waitFor(() => {
        expect(screen.getByText(/Amount must be positive/i)).toBeInTheDocument();
      });

      // Valid amount
      await user.clear(amountInput);
      await user.type(amountInput, '10.5');
      fireEvent.blur(amountInput);

      await waitFor(() => {
        expect(screen.queryByText(/Invalid amount/i)).not.toBeInTheDocument();
      });
    });

    it('should check balance sufficiency', async () => {
      renderSend();

      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i);
      const amountInput = screen.getByPlaceholderText(/Amount/i);
      
      await user.type(addressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');
      await user.type(amountInput, '150'); // More than balance (100)
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
      });
    });

    it('should show MAX button and set maximum amount', async () => {
      renderSend();

      const maxButton = screen.getByRole('button', { name: /MAX/i });
      fireEvent.click(maxButton);

      const amountInput = screen.getByPlaceholderText(/Amount/i) as HTMLInputElement;
      expect(amountInput.value).toBe('100');
    });
  });

  describe('Transaction Submission', () => {
    it('should show password modal when sending', async () => {
      renderSend();

      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i);
      const amountInput = screen.getByPlaceholderText(/Amount/i);
      
      await user.type(addressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');
      await user.type(amountInput, '10');
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByTestId('password-modal')).toBeInTheDocument();
      });
    });

    it('should submit transaction with password', async () => {
      const mockTransfer = jest.fn().mockResolvedValue('deploy123');
      store.dispatch({
        type: 'wallet/sendTransaction/fulfilled',
        payload: {
          deployId: 'deploy123',
          transaction: {
            id: 'tx1',
            accountId: 'acc1',
            type: 'transfer',
            from: mockAccount.revAddress,
            to: '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
            amount: '10',
            timestamp: Date.now(),
            status: 'pending',
            deployId: 'deploy123',
          },
        },
      });

      renderSend();

      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i);
      const amountInput = screen.getByPlaceholderText(/Amount/i);
      
      await user.type(addressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');
      await user.type(amountInput, '10');
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      fireEvent.click(sendButton);

      // Wait for password modal
      await waitFor(() => {
        expect(screen.getByTestId('password-modal')).toBeInTheDocument();
      });

      // Confirm with password
      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Transaction sent successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle transaction errors', async () => {
      renderSend();

      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i);
      const amountInput = screen.getByPlaceholderText(/Amount/i);
      
      await user.type(addressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');
      await user.type(amountInput, '10');
      
      // Mock error
      store.dispatch({
        type: 'wallet/sendTransaction/rejected',
        error: { message: 'Network error' },
      });
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Fee Display', () => {
    it('should show estimated transaction fee', () => {
      renderSend();

      expect(screen.getByText(/Transaction Fee/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.001.*REV/i)).toBeInTheDocument(); // Default fee
    });

    it('should update total with fee', async () => {
      renderSend();

      const amountInput = screen.getByPlaceholderText(/Amount/i);
      await user.type(amountInput, '10');

      await waitFor(() => {
        expect(screen.getByText(/Total:.*10\.001.*REV/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recent Recipients', () => {
    it('should show recent recipients if available', () => {
      // Add transaction history
      store.dispatch({
        type: 'wallet/addTransaction',
        payload: {
          id: 'tx1',
          accountId: 'acc1',
          type: 'transfer',
          from: mockAccount.revAddress,
          to: '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
          amount: '5',
          timestamp: Date.now() - 3600000,
          status: 'completed',
        },
      });

      renderSend();

      expect(screen.getByText(/Recent Recipients/i)).toBeInTheDocument();
      expect(screen.getByText(/11113bv5/)).toBeInTheDocument();
    });

    it('should fill address when clicking recent recipient', () => {
      // Add transaction history
      store.dispatch({
        type: 'wallet/addTransaction',
        payload: {
          id: 'tx1',
          accountId: 'acc1',
          type: 'transfer',
          from: mockAccount.revAddress,
          to: '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
          amount: '5',
          timestamp: Date.now() - 3600000,
          status: 'completed',
        },
      });

      renderSend();

      const recentRecipient = screen.getByText(/11113bv5/);
      fireEvent.click(recentRecipient);

      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i) as HTMLInputElement;
      expect(addressInput.value).toContain('11113bv5');
    });
  });

  describe('Navigation', () => {
    it('should navigate back to dashboard on cancel', () => {
      renderSend();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(window.location.hash).toBe('#/');
    });

    it('should navigate to dashboard after successful send', async () => {
      renderSend();

      // Complete a successful transaction
      const addressInput = screen.getByPlaceholderText(/Recipient.*address/i);
      const amountInput = screen.getByPlaceholderText(/Amount/i);
      
      await user.type(addressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');
      await user.type(amountInput, '10');
      
      store.dispatch({
        type: 'wallet/sendTransaction/fulfilled',
        payload: {
          deployId: 'deploy123',
          transaction: {
            id: 'tx1',
            accountId: 'acc1',
            type: 'transfer',
            from: mockAccount.revAddress,
            to: '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT',
            amount: '10',
            timestamp: Date.now(),
            status: 'pending',
            deployId: 'deploy123',
          },
        },
      });

      await waitFor(() => {
        expect(window.location.hash).toBe('#/');
      }, { timeout: 3000 });
    });
  });
});