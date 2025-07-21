import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { CustomNetworkConfig } from '../CustomNetworkConfig';
import walletReducer from '../../../store/walletSlice';
import themeReducer from '../../../store/themeSlice';
import { lightTheme } from '../../../styles/theme';

describe('CustomNetworkConfig Component', () => {
  let store: ReturnType<typeof configureStore>;
  let user: ReturnType<typeof userEvent.setup>;

  const defaultNetworks = [
    {
      id: 'mainnet',
      name: 'RChain Mainnet',
      url: 'https://observer.mainnet.rchain.coop:443',
      readOnlyUrl: 'https://observer-asia.mainnet.rchain.coop:443',
      adminUrl: '',
      shardId: 'root',
    },
    {
      id: 'custom',
      name: 'Custom Network',
      url: 'http://localhost:40403',
      readOnlyUrl: 'http://localhost:40453',
      adminUrl: '',
      shardId: 'root',
    },
  ];

  beforeEach(() => {
    user = userEvent.setup();
    
    store = configureStore({
      reducer: {
        wallet: walletReducer,
        theme: themeReducer,
      },
      preloadedState: {
        wallet: {
          accounts: [],
          currentAccountId: null,
          networks: defaultNetworks,
          selectedNetwork: defaultNetworks[0], // mainnet
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

  const renderCustomNetworkConfig = () => {
    return render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <CustomNetworkConfig />
        </ThemeProvider>
      </Provider>
    );
  };

  describe('Initial Rendering', () => {
    it('should render custom network configuration card', () => {
      renderCustomNetworkConfig();

      expect(screen.getByText('Custom Network Configuration')).toBeInTheDocument();
      expect(screen.getByText(/Custom Network Setup/)).toBeInTheDocument();
    });

    it('should show info box with setup instructions', () => {
      renderCustomNetworkConfig();

      expect(screen.getByText(/Configure custom validator and read-only nodes/)).toBeInTheDocument();
      expect(screen.getByText(/F1R3Wallet custom network configuration/)).toBeInTheDocument();
    });

    it('should display validator node configuration', () => {
      renderCustomNetworkConfig();

      expect(screen.getByText('Custom network - validator node')).toBeInTheDocument();
      expect(screen.getByText('IP/Domain:')).toBeInTheDocument();
      expect(screen.getByText('gRPC Port:')).toBeInTheDocument();
      expect(screen.getByText('HTTP Port:')).toBeInTheDocument();
    });

    it('should display read-only node configuration', () => {
      renderCustomNetworkConfig();

      expect(screen.getByText('Custom network - read-only node')).toBeInTheDocument();
    });

    it('should show default values in disabled inputs', () => {
      renderCustomNetworkConfig();

      const ipInputs = screen.getAllByDisplayValue('localhost');
      expect(ipInputs).toHaveLength(2); // validator and read-only

      expect(screen.getByDisplayValue('40403')).toBeInTheDocument(); // validator HTTP
      expect(screen.getByDisplayValue('40401')).toBeInTheDocument(); // validator gRPC
      expect(screen.getByDisplayValue('40453')).toBeInTheDocument(); // read-only HTTP
      expect(screen.getByDisplayValue('40451')).toBeInTheDocument(); // read-only gRPC
    });

    it('should show direct links', () => {
      renderCustomNetworkConfig();

      expect(screen.getAllByText('Direct links:').length).toBe(2);
      expect(screen.getByText('gRPC: localhost:40401')).toBeInTheDocument();
      expect(screen.getByText('HTTP: http://localhost:40403')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should enable inputs when Edit Configuration is clicked', async () => {
      renderCustomNetworkConfig();

      const editButton = screen.getByRole('button', { name: 'Edit Configuration' });
      fireEvent.click(editButton);

      const ipInputs = screen.getAllByPlaceholderText('localhost');
      ipInputs.forEach(input => {
        expect(input).not.toBeDisabled();
      });
    });

    it('should show Save and Cancel buttons in edit mode', async () => {
      renderCustomNetworkConfig();

      const editButton = screen.getByRole('button', { name: 'Edit Configuration' });
      fireEvent.click(editButton);

      expect(screen.getByRole('button', { name: 'Save Configuration' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should update validator configuration', async () => {
      renderCustomNetworkConfig();

      const editButton = screen.getByRole('button', { name: 'Edit Configuration' });
      fireEvent.click(editButton);

      // Update validator host
      const ipInputs = screen.getAllByPlaceholderText('localhost');
      await user.clear(ipInputs[0]);
      await user.type(ipInputs[0], '192.168.1.100');

      // Update HTTP port
      const httpPortInput = screen.getByDisplayValue('40403');
      await user.clear(httpPortInput);
      await user.type(httpPortInput, '8080');

      // Check direct links update dynamically
      expect(screen.getByText('HTTP: http://192.168.1.100:8080')).toBeInTheDocument();
    });

    it('should update read-only configuration', async () => {
      renderCustomNetworkConfig();

      const editButton = screen.getByRole('button', { name: 'Edit Configuration' });
      fireEvent.click(editButton);

      // Update read-only host
      const ipInputs = screen.getAllByPlaceholderText('localhost');
      await user.clear(ipInputs[1]);
      await user.type(ipInputs[1], 'readonly.example.com');

      // Update gRPC port
      const grpcPortInput = screen.getByDisplayValue('40451');
      await user.clear(grpcPortInput);
      await user.type(grpcPortInput, '50051');

      // Check direct links update
      expect(screen.getByText('gRPC: readonly.example.com:50051')).toBeInTheDocument();
    });

    it('should save configuration changes', async () => {
      renderCustomNetworkConfig();

      const editButton = screen.getByRole('button', { name: 'Edit Configuration' });
      fireEvent.click(editButton);

      // Update validator host
      const ipInputs = screen.getAllByPlaceholderText('localhost');
      await user.clear(ipInputs[0]);
      await user.type(ipInputs[0], 'my-validator.com');

      const saveButton = screen.getByRole('button', { name: 'Save Configuration' });
      fireEvent.click(saveButton);

      // Should exit edit mode
      expect(screen.getByRole('button', { name: 'Edit Configuration' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save Configuration' })).not.toBeInTheDocument();

      // Value should be saved
      expect(screen.getByDisplayValue('my-validator.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('my-validator.com')).toBeDisabled();
    });

    it('should cancel configuration changes', async () => {
      renderCustomNetworkConfig();

      const editButton = screen.getByRole('button', { name: 'Edit Configuration' });
      fireEvent.click(editButton);

      // Update validator host
      const ipInputs = screen.getAllByPlaceholderText('localhost');
      await user.clear(ipInputs[0]);
      await user.type(ipInputs[0], 'my-validator.com');

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      // Should exit edit mode without saving
      expect(screen.getByRole('button', { name: 'Edit Configuration' })).toBeInTheDocument();
      expect(screen.getAllByDisplayValue('localhost')).toHaveLength(2);
    });
  });

  describe('Network Selection', () => {
    it('should show Use Custom Network button when not active', () => {
      renderCustomNetworkConfig();

      expect(screen.getByRole('button', { name: 'Use Custom Network' })).toBeInTheDocument();
    });

    it('should not show Use Custom Network button when custom is active', () => {
      // Set custom network as active
      store = configureStore({
        reducer: {
          wallet: walletReducer,
          theme: themeReducer,
        },
        preloadedState: {
          wallet: {
            accounts: [],
            currentAccountId: null,
            networks: defaultNetworks,
            selectedNetwork: defaultNetworks[1], // custom
            currentNetworkId: 'custom',
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

      renderCustomNetworkConfig();

      expect(screen.queryByRole('button', { name: 'Use Custom Network' })).not.toBeInTheDocument();
      expect(screen.getByText('(Active)')).toBeInTheDocument();
    });

    it('should activate custom network when Use Custom Network is clicked', async () => {
      renderCustomNetworkConfig();

      const useButton = screen.getByRole('button', { name: 'Use Custom Network' });
      fireEvent.click(useButton);

      // Should dispatch selectNetwork action
      await waitFor(() => {
        const state = store.getState();
        expect(state.wallet.currentNetworkId).toBeDefined();
      });
    });
  });

  describe('Direct Links', () => {
    it('should open validator links in new window', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      renderCustomNetworkConfig();

      const validatorHttpLink = screen.getAllByText(/HTTP: http:\/\/localhost:40403/)[0];
      fireEvent.click(validatorHttpLink);

      expect(mockOpen).toHaveBeenCalledWith('http://localhost:40403', '_blank');
    });

    it('should open read-only links in new window', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      renderCustomNetworkConfig();

      const readOnlyHttpLink = screen.getAllByText(/HTTP: http:\/\/localhost:40453/)[0];
      fireEvent.click(readOnlyHttpLink);

      expect(mockOpen).toHaveBeenCalledWith('http://localhost:40453', '_blank');
    });

    it('should open status endpoint for validator', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      renderCustomNetworkConfig();

      const validatorGrpcLink = screen.getAllByText(/gRPC: localhost:40401/)[0];
      fireEvent.click(validatorGrpcLink);

      expect(mockOpen).toHaveBeenCalledWith('http://localhost:40403/status', '_blank');
    });
  });

  describe('URL Construction', () => {
    it('should construct URLs correctly from input values', async () => {
      renderCustomNetworkConfig();

      const editButton = screen.getByRole('button', { name: 'Edit Configuration' });
      fireEvent.click(editButton);

      // Update to custom domain and ports
      const ipInputs = screen.getAllByPlaceholderText('localhost');
      await user.clear(ipInputs[0]);
      await user.type(ipInputs[0], 'rchain.example.com');

      const httpPortInput = screen.getByDisplayValue('40403');
      await user.clear(httpPortInput);
      await user.type(httpPortInput, '443');

      const grpcPortInput = screen.getByDisplayValue('40401');
      await user.clear(grpcPortInput);
      await user.type(grpcPortInput, '9090');

      // Check URL construction
      expect(screen.getByText('gRPC: rchain.example.com:9090')).toBeInTheDocument();
      expect(screen.getByText('HTTP: http://rchain.example.com:443')).toBeInTheDocument();
    });
  });

  describe('State Persistence', () => {
    it('should load existing custom network configuration', () => {
      // Create store with custom network already configured
      const customNetworks = [
        {
          id: 'custom',
          name: 'Custom Network',
          url: 'http://my-custom-node.com:8080',
          readOnlyUrl: 'http://my-readonly.com:8081',
          adminUrl: '',
          shardId: 'root',
        },
      ];

      store = configureStore({
        reducer: {
          wallet: walletReducer,
          theme: themeReducer,
        },
        preloadedState: {
          wallet: {
            accounts: [],
            currentAccountId: null,
            networks: customNetworks,
            selectedNetwork: customNetworks[0],
            currentNetworkId: 'custom',
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

      renderCustomNetworkConfig();

      // Should parse and display the custom values
      expect(screen.getByDisplayValue('my-custom-node.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('8080')).toBeInTheDocument();
      expect(screen.getByDisplayValue('my-readonly.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('8081')).toBeInTheDocument();
    });
  });
});