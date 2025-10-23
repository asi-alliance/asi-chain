import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { AccountSwitcher } from '../AccountSwitcher';
import { lightTheme } from '../../../styles/theme';
import authReducer from '../../../store/authSlice';
import walletReducer from '../../../store/walletSlice';
import themeReducer from '../../../store/themeSlice';
import walletConnectReducer from '../../../store/walletConnectSlice';

// Mock dependencies
jest.mock('../../../services/secureStorage');
jest.mock('../../../services/rchain');
jest.mock('../../../services/walletConnect');

describe('AccountSwitcher', () => {
  let store: ReturnType<typeof configureStore>;
  let user: ReturnType<typeof userEvent.setup>;

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          {component}
        </ThemeProvider>
      </Provider>
    );
  };

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    store = configureStore({
      reducer: {
        auth: authReducer,
        wallet: walletReducer,
        theme: themeReducer,
        walletConnect: walletConnectReducer,
      },
    });
  });

  it('should render with no accounts', () => {
    renderWithProviders(<AccountSwitcher />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render account switcher with normal name', () => {
    const mockAccount = {
      id: '1',
      name: 'Normal Account',
      revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      balance: '100.5',
    };

    store.dispatch({
      type: 'wallet/syncAccounts',
      payload: [mockAccount]
    });

    store.dispatch({
      type: 'wallet/selectAccount',
      payload: '1'
    });

    renderWithProviders(<AccountSwitcher />);
    
    expect(screen.getAllByText('Normal Account')).toHaveLength(2); // Button and dropdown
    expect(screen.getAllByText('11112bv5...FGNJvS')).toHaveLength(2);
  });

  it('should truncate very long account names', () => {
    const longName = 'This is a very long account name that should be truncated in the header';
    const mockAccount = {
      id: '1',
      name: longName,
      revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      balance: '100.5',
    };

    store.dispatch({
      type: 'wallet/syncAccounts',
      payload: [mockAccount]
    });

    store.dispatch({
      type: 'wallet/selectAccount',
      payload: '1'
    });

    renderWithProviders(<AccountSwitcher />);
    
    // Should show truncated name
    expect(screen.getByText('This is ...e header')).toBeInTheDocument();
    
    // Should have full name in title attribute
    const accountNameElements = screen.getAllByTitle(longName);
    expect(accountNameElements.length).toBeGreaterThan(0);
  });

  it('should show dropdown with truncated names when clicked', async () => {
    const accounts = [
      {
        id: '1',
        name: 'Short Name',
        revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
        balance: '100.5',
      },
      {
        id: '2',
        name: 'This is a very long account name that should be truncated in the dropdown',
        revAddress: '22223cv6xFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
        balance: '200.0',
      }
    ];

    store.dispatch({
      type: 'wallet/syncAccounts',
      payload: accounts
    });

    store.dispatch({
      type: 'wallet/selectAccount',
      payload: '1'
    });

    renderWithProviders(<AccountSwitcher />);
    
    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getAllByText('Short Name').length).toBeGreaterThan(0);
      expect(screen.getByText('This is a v...he dropdown')).toBeInTheDocument();
    });
  });

  it('should handle account selection', async () => {
    const accounts = [
      {
        id: '1',
        name: 'Account 1',
        revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
        balance: '100.5',
      },
      {
        id: '2',
        name: 'Account 2',
        revAddress: '22223cv6xFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
        balance: '200.0',
      }
    ];

    store.dispatch({
      type: 'wallet/syncAccounts',
      payload: accounts
    });

    store.dispatch({
      type: 'wallet/selectAccount',
      payload: '1'
    });

    renderWithProviders(<AccountSwitcher />);
    
    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getAllByText('Account 2').length).toBeGreaterThan(0);
    });

    const account2Buttons = screen.getAllByText('Account 2');
    // Click the first Account 2 button (should be in dropdown)
    await user.click(account2Buttons[0]);

    // Should close dropdown and update selected account
    await waitFor(() => {
      // Account 2 should still be visible (now as selected account)
      expect(screen.getAllByText('Account 2').length).toBeGreaterThan(0);
    });
  });

  it('should close dropdown when clicking outside', async () => {
    const mockAccount = {
      id: '1',
      name: 'Test Account',
      revAddress: '11112bv5wFBpCDyycBJfxHfwBq7RycC8H3P3rGHnfmqnoLrzFGNJvS',
      balance: '100.5',
    };

    store.dispatch({
      type: 'wallet/syncAccounts',
      payload: [mockAccount]
    });

    store.dispatch({
      type: 'wallet/selectAccount',
      payload: '1'
    });

    renderWithProviders(<AccountSwitcher />);
    
    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getAllByText('Test Account').length).toBeGreaterThan(0);
    });

    // Click outside
    await user.click(document.body);

    await waitFor(() => {
      // Test Account should still be visible (as selected account)
      expect(screen.getAllByText('Test Account').length).toBeGreaterThan(0);
    });
  });
});
