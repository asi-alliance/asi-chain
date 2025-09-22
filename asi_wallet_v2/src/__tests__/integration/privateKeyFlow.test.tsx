import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Accounts } from '../../pages/Accounts/Accounts';
import { Settings } from '../../pages/Settings/Settings';
import authReducer from '../../store/authSlice';
import walletReducer from '../../store/walletSlice';
import themeReducer from '../../store/themeSlice';
import walletConnectReducer from '../../store/walletConnectSlice';
import { SecureStorage } from '../../services/secureStorage';
import * as crypto from '../../utils/crypto';
import { lightTheme } from '../../styles/theme';

jest.mock('../../services/secureStorage');
jest.mock('../../utils/crypto');
jest.mock('../../services/rchain');
jest.mock('../../services/walletConnect');

describe('Private Key Flow Integration Tests', () => {
  let store: ReturnType<typeof configureStore>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Reset localStorage
    (window.localStorage.getItem as jest.Mock).mockClear();
    (window.localStorage.setItem as jest.Mock).mockClear();
    
    (SecureStorage.getSettings as jest.Mock).mockReturnValue({
      requirePasswordForTransaction: true,
      idleTimeout: 15,
    });
    (SecureStorage.saveSettings as jest.Mock).mockImplementation(() => {});
    (SecureStorage.clearSession as jest.Mock).mockImplementation(() => {});
    (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([]);
    
    store = configureStore({
      reducer: {
        auth: authReducer,
        wallet: walletReducer,
        theme: themeReducer,
        walletConnect: walletConnectReducer,
      },
    });
  });

  const renderAccounts = () => {
    return render(
      <Provider store={store}>
        <HashRouter>
          <ThemeProvider theme={lightTheme}>
            <Accounts />
          </ThemeProvider>
        </HashRouter>
      </Provider>
    );
  };

  const renderSettings = () => {
    return render(
      <Provider store={store}>
        <HashRouter>
          <ThemeProvider theme={lightTheme}>
            <Settings />
          </ThemeProvider>
        </HashRouter>
      </Provider>
    );
  };

  describe('Account Creation with Private Key Display', () => {
    it('should show private key after successful account creation', async () => {
      (SecureStorage.hasPasswordHash as jest.Mock).mockReturnValue(false);
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([]);

      const mockKeyPair = {
        privateKey: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        publicKey: 'mock-public-key',
        ethAddress: '0x1234567890123456789012345678901234567890',
        revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };
      (crypto.generateKeyPair as jest.Mock).mockReturnValue(mockKeyPair);
      (SecureStorage.saveAccount as jest.Mock).mockReturnValue({
        id: 'acc-1',
        name: 'Test Account',
        ...mockKeyPair,
        privateKey: undefined,
        encryptedPrivateKey: 'encrypted',
      });

      renderAccounts();

      const nameInput = screen.getByPlaceholderText(/account.*name/i);
      await user.type(nameInput, 'Test Account');

      const createButton = screen.getByRole('button', { name: /create.*account/i });
      await user.click(createButton);

      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'SecurePassword123!');

      const confirmPasswordInput = screen.getByPlaceholderText(/confirm.*password/i);
      await user.type(confirmPasswordInput, 'SecurePassword123!');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('IMPORTANT: Save Your Private Key')).toBeInTheDocument();
        expect(screen.getByText('Account: Test Account')).toBeInTheDocument();
        expect(screen.getByText(mockKeyPair.privateKey)).toBeInTheDocument();
      });
    });

    it('should allow copying private key to clipboard', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });

      const mockKeyPair = {
        privateKey: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        publicKey: 'mock-public-key',
        ethAddress: '0x1234567890123456789012345678901234567890',
        revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };
      (crypto.generateKeyPair as jest.Mock).mockReturnValue(mockKeyPair);
      (SecureStorage.saveAccount as jest.Mock).mockReturnValue({
        id: 'acc-1',
        name: 'Test Account',
        ...mockKeyPair,
        privateKey: undefined,
        encryptedPrivateKey: 'encrypted',
      });

      renderAccounts();

      const nameInput = screen.getByPlaceholderText(/account.*name/i);
      await user.type(nameInput, 'Test Account');

      const createButton = screen.getByRole('button', { name: /create.*account/i });
      await user.click(createButton);

      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'SecurePassword123!');

      const confirmPasswordInput = screen.getByPlaceholderText(/confirm.*password/i);
      await user.type(confirmPasswordInput, 'SecurePassword123!');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('IMPORTANT: Save Your Private Key')).toBeInTheDocument();
      });

      const showButton = screen.getByText('Show');
      await user.click(showButton);

      const copyButton = screen.getByText('Copy Private Key');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockKeyPair.privateKey);
      expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
    });

    it('should complete account creation after acknowledging private key', async () => {
      const mockKeyPair = {
        privateKey: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        publicKey: 'mock-public-key',
        ethAddress: '0x1234567890123456789012345678901234567890',
        revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      };
      (crypto.generateKeyPair as jest.Mock).mockReturnValue(mockKeyPair);
      (SecureStorage.saveAccount as jest.Mock).mockReturnValue({
        id: 'acc-1',
        name: 'Test Account',
        ...mockKeyPair,
        privateKey: undefined,
        encryptedPrivateKey: 'encrypted',
      });

      renderAccounts();

      const nameInput = screen.getByPlaceholderText(/account.*name/i);
      await user.type(nameInput, 'Test Account');

      const createButton = screen.getByRole('button', { name: /create.*account/i });
      await user.click(createButton);

      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'SecurePassword123!');

      const confirmPasswordInput = screen.getByPlaceholderText(/confirm.*password/i);
      await user.type(confirmPasswordInput, 'SecurePassword123!');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('IMPORTANT: Save Your Private Key')).toBeInTheDocument();
      });

      const continueButton = screen.getByText('I\'ve Saved My Private Key');
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('Your Accounts (1)')).toBeInTheDocument();
        expect(screen.getByText('Test Account')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Private Key Management', () => {
    it('should show private key management section in settings', async () => {
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        {
          id: 'acc-1',
          name: 'Test Account',
          revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
        },
      ]);

      renderSettings();

      expect(screen.getByText('Private Keys Management')).toBeInTheDocument();
      expect(screen.getByText('View and export your private keys. Keep them safe and never share them with anyone.')).toBeInTheDocument();
      expect(screen.getByText('Test Account')).toBeInTheDocument();
      expect(screen.getByText('View Private Key')).toBeInTheDocument();
    });

    it('should prompt for password when viewing private key', async () => {
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        {
          id: 'acc-1',
          name: 'Test Account',
          revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
        },
      ]);

      renderSettings();

      const viewButton = screen.getByText('View Private Key');
      await user.click(viewButton);

      expect(screen.getByText('Enter Password to View Private Key')).toBeInTheDocument();
    });

    it('should show private key after correct password', async () => {
      // Mock existing accounts
      (SecureStorage.getEncryptedAccounts as jest.Mock).mockReturnValue([
        {
          id: 'acc-1',
          name: 'Test Account',
          revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
        },
      ]);

      const mockPrivateKey = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890';
      (SecureStorage.unlockAccount as jest.Mock).mockReturnValue({
        id: 'acc-1',
        name: 'Test Account',
        privateKey: mockPrivateKey,
      });

      renderSettings();

      const viewButton = screen.getByText('View Private Key');
      await user.click(viewButton);

      const passwordInput = screen.getByPlaceholderText(/password/i);
      await user.type(passwordInput, 'SecurePassword123!');

      const unlockButton = screen.getByRole('button', { name: /unlock/i });
      await user.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByText('IMPORTANT: Save Your Private Key')).toBeInTheDocument();
        expect(screen.getByText('Account: Test Account')).toBeInTheDocument();
        expect(screen.getByText(mockPrivateKey)).toBeInTheDocument();
      });
    });
  });
});
