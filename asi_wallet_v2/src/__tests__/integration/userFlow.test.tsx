import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../../App';
import authReducer from '../../store/authSlice';
import walletReducer from '../../store/walletSlice';
import themeReducer from '../../store/themeSlice';
import walletConnectReducer from '../../store/walletConnectSlice';
import { SecureStorage } from '../../services/secureStorage';
import * as crypto from '../../utils/crypto';

// Mock dependencies
jest.mock('../../services/secureStorage');
jest.mock('../../utils/crypto');
jest.mock('../../services/rchain');
jest.mock('../../services/walletConnect');

// Mock components that use Monaco Editor or other complex dependencies
jest.mock('../../pages/IDE', () => ({
  IDE: () => <div>IDE Component</div>,
}));

describe('User Flow Integration Tests', () => {
  let store: ReturnType<typeof configureStore>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Reset localStorage
    (window.localStorage.getItem as jest.Mock).mockClear();
    (window.localStorage.setItem as jest.Mock).mockClear();
    
    // Set up default mocks for SecureStorage
    (SecureStorage.getSettings as jest.Mock).mockReturnValue({
      requirePasswordForTransaction: true,
      idleTimeout: 15,
    });
    (SecureStorage.saveSettings as jest.Mock).mockImplementation(() => {});
    (SecureStorage.clearSession as jest.Mock).mockImplementation(() => {});
    
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        auth: authReducer,
        wallet: walletReducer,
        theme: themeReducer,
        walletConnect: walletConnectReducer,
      },
    });
  });

  const renderApp = () => {
    return render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  };

  describe('First Time User Flow', () => {
    it('should guide new user through account creation', async () => {
      // Mock no existing accounts
      (SecureStorage.hasPasswordHash as jest.Mock).mockReturnValue(false);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([]);

      renderApp();

      // Should redirect to accounts page for first-time setup
      await waitFor(() => {
        expect(screen.getByText(/create.*account/i)).toBeInTheDocument();
      });

      // Click create account button
      const createButton = screen.getByRole('button', { name: /create.*account/i });
      await user.click(createButton);

      // Fill in account creation form
      const nameInput = screen.getByPlaceholderText(/account.*name/i);
      await user.type(nameInput, 'My First Wallet');

      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'SecurePassword123!');

      const confirmPasswordInput = screen.getByPlaceholderText(/confirm.*password/i);
      await user.type(confirmPasswordInput, 'SecurePassword123!');

      // Mock successful account creation
      const mockKeyPair = {
        privateKey: 'mock-private-key',
        publicKey: 'mock-public-key',
        ethAddress: '0x1234567890123456789012345678901234567890',
        revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };
      (crypto.generateKeyPair as jest.Mock).mockReturnValue(mockKeyPair);
      (SecureStorage.saveAccount as jest.Mock).mockReturnValue({
        id: 'acc-1',
        name: 'My First Wallet',
        ...mockKeyPair,
        privateKey: undefined,
        encryptedPrivateKey: 'encrypted',
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Should show success and redirect to dashboard
      await waitFor(() => {
        expect(screen.getByText(/My First Wallet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Returning User Flow', () => {
    beforeEach(() => {
      // Mock existing account
      (SecureStorage.hasPasswordHash as jest.Mock).mockReturnValue(true);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        {
          id: 'existing-acc',
          name: 'Existing Account',
          address: '0x123',
          ethAddress: '0x123',
          publicKey: 'pub123',
          revAddress: '1111existing',
          encryptedPrivateKey: 'encrypted',
        },
      ]);
    });

    it('should allow user to login and send transaction', async () => {
      renderApp();

      // Should show login screen
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
      });

      // Enter password
      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'UserPassword123!');

      // Mock successful login
      (SecureStorage.verifyPassword as jest.Mock).mockReturnValue(true);

      // Click login
      const loginButton = screen.getByRole('button', { name: /unlock/i });
      await user.click(loginButton);

      // Should redirect to dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Navigate to send page
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Fill in send form
      const toAddressInput = screen.getByPlaceholderText(/recipient.*address/i);
      await user.type(toAddressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');

      const amountInput = screen.getByPlaceholderText(/amount/i);
      await user.type(amountInput, '10.5');

      // Mock balance check
      store.dispatch({
        type: 'wallet/updateAccountBalance',
        payload: { accountId: 'existing-acc', balance: '100' },
      });

      // Submit transaction
      const sendTransactionButton = screen.getByRole('button', { name: /send.*transaction/i });
      await user.click(sendTransactionButton);

      // Should show password modal for transaction
      await waitFor(() => {
        expect(screen.getByText(/confirm.*transaction/i)).toBeInTheDocument();
      });

      // Enter password again
      const txPasswordInput = screen.getByPlaceholderText(/password/i);
      await user.type(txPasswordInput, 'UserPassword123!');

      // Confirm transaction
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/transaction.*sent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Settings Flow', () => {
    beforeEach(() => {
      // Setup authenticated state
      (SecureStorage.hasPasswordHash as jest.Mock).mockReturnValue(true);
      (SecureStorage.verifyPassword as jest.Mock).mockReturnValue(true);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        {
          id: 'acc1',
          name: 'Test Account',
          revAddress: '1111test',
        },
      ]);
    });

    it('should allow user to add and persist custom network', async () => {
      renderApp();

      // Login first
      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'password');
      const loginButton = screen.getByRole('button', { name: /unlock/i });
      await user.click(loginButton);

      // Navigate to settings
      await waitFor(() => {
        const settingsLink = screen.getByRole('link', { name: /settings/i });
        expect(settingsLink).toBeInTheDocument();
      });

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      await user.click(settingsLink);

      // Click Add Custom Network
      await waitFor(() => {
        expect(screen.getByText(/network.*settings/i)).toBeInTheDocument();
      });

      const addNetworkButton = screen.getByRole('button', { name: /add.*custom.*network/i });
      await user.click(addNetworkButton);

      // Fill in network details
      const nameInput = screen.getByPlaceholderText(/my.*custom.*network/i);
      await user.type(nameInput, 'Test Network');

      const urlInput = screen.getByPlaceholderText(/validator.*example/i);
      await user.type(urlInput, 'https://test-network.example.com:443');

      // Save network
      const saveButton = screen.getByRole('button', { name: /add.*network/i });
      await user.click(saveButton);

      // Verify localStorage was called
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'asi_wallet_networks',
        expect.stringContaining('Test Network')
      );

      // Simulate page refresh by remounting
      const { unmount } = renderApp();
      unmount();

      // Mock loading saved networks
      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify([
          {
            id: 'custom-123456',
            name: 'Test Network',
            url: 'https://test-network.example.com:443',
          },
        ])
      );

      renderApp();

      // Login again
      const passwordInput2 = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput2, 'password');
      const loginButton2 = screen.getByRole('button', { name: /unlock/i });
      await user.click(loginButton2);

      // Navigate back to settings
      const settingsLink2 = screen.getByRole('link', { name: /settings/i });
      await user.click(settingsLink2);

      // Verify custom network persisted
      await waitFor(() => {
        expect(screen.getByText('Test Network')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle network errors gracefully', async () => {
      // Setup authenticated state
      (SecureStorage.hasPasswordHash as jest.Mock).mockReturnValue(true);
      (SecureStorage.verifyPassword as jest.Mock).mockReturnValue(true);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        {
          id: 'acc1',
          name: 'Test Account',
          revAddress: '1111test',
          balance: '10',
        },
      ]);

      renderApp();

      // Login
      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'password');
      const loginButton = screen.getByRole('button', { name: /unlock/i });
      await user.click(loginButton);

      // Try to send transaction with insufficient balance
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      const toAddressInput = screen.getByPlaceholderText(/recipient.*address/i);
      await user.type(toAddressInput, '11113bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvT');

      const amountInput = screen.getByPlaceholderText(/amount/i);
      await user.type(amountInput, '100'); // More than balance

      const sendTransactionButton = screen.getByRole('button', { name: /send.*transaction/i });
      await user.click(sendTransactionButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/insufficient.*balance/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid addresses', async () => {
      // Setup authenticated state
      (SecureStorage.hasPasswordHash as jest.Mock).mockReturnValue(true);
      (SecureStorage.verifyPassword as jest.Mock).mockReturnValue(true);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        {
          id: 'acc1',
          name: 'Test Account',
          revAddress: '1111test',
        },
      ]);

      renderApp();

      // Login
      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'password');
      const loginButton = screen.getByRole('button', { name: /unlock/i });
      await user.click(loginButton);

      // Navigate to send
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Enter invalid address
      const toAddressInput = screen.getByPlaceholderText(/recipient.*address/i);
      await user.type(toAddressInput, 'invalid-address');

      const amountInput = screen.getByPlaceholderText(/amount/i);
      await user.type(amountInput, '1');

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid.*address/i)).toBeInTheDocument();
      });
    });
  });
});