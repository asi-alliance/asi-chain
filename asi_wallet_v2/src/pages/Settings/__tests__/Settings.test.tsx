import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { Settings } from '../Settings';
import walletReducer from '../../../store/walletSlice';
import themeReducer from '../../../store/themeSlice';
import { lightTheme } from '../../../styles/theme';

// Mock the CustomNetworkConfig component
jest.mock('../CustomNetworkConfig', () => ({
  CustomNetworkConfig: () => <div data-testid="custom-network-config">Custom Network Config Component</div>,
}));

describe('Settings Component', () => {
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
      id: 'testnet',
      name: 'RChain Testnet',
      url: 'https://observer.testnet.rchain.coop:443',
      readOnlyUrl: 'https://observer-asia.testnet.rchain.coop:443',
      adminUrl: '',
      shardId: 'root',
    },
    {
      id: 'local',
      name: 'Local Network',
      url: 'http://localhost:40403',
      readOnlyUrl: 'http://localhost:40453',
      adminUrl: 'http://localhost:40405',
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

  const renderSettings = () => {
    return render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Settings />
        </ThemeProvider>
      </Provider>
    );
  };

  describe('Network Display', () => {
    it('should render all predefined networks', () => {
      renderSettings();

      expect(screen.getByText('Network Settings')).toBeInTheDocument();
      expect(screen.getByText('RChain Mainnet')).toBeInTheDocument();
      expect(screen.getByText('RChain Testnet')).toBeInTheDocument();
      expect(screen.getByText('Local Network')).toBeInTheDocument();
      // Custom network is rendered separately
      expect(screen.getByTestId('custom-network-config')).toBeInTheDocument();
    });

    it('should show active network indicator', () => {
      renderSettings();

      const mainnetCard = screen.getByText('RChain Mainnet').closest('div');
      expect(mainnetCard?.textContent).toContain('(Active)');
    });

    it('should display network URLs in view mode', () => {
      renderSettings();

      expect(screen.getByText('https://observer.mainnet.rchain.coop:443')).toBeInTheDocument();
      expect(screen.getByText('https://observer-asia.mainnet.rchain.coop:443')).toBeInTheDocument();
    });
  });

  describe('Network Editing', () => {
    it('should enter edit mode when Edit Network is clicked', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]); // Edit mainnet

      // Should show input fields
      expect(screen.getByPlaceholderText('Enter network name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://validator.example.com:443')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://readonly.example.com:443')).toBeInTheDocument();
    });

    it('should update network values in edit mode', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]); // Edit mainnet

      const nameInput = screen.getByPlaceholderText('Enter network name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Mainnet');

      const urlInput = screen.getByPlaceholderText('https://validator.example.com:443');
      await user.clear(urlInput);
      await user.type(urlInput, 'https://new-validator.rchain.coop:443');

      expect(nameInput).toHaveValue('Updated Mainnet');
      expect(urlInput).toHaveValue('https://new-validator.rchain.coop:443');
    });

    it('should save network changes', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]); // Edit mainnet

      const nameInput = screen.getByPlaceholderText('Enter network name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Mainnet');

      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      fireEvent.click(saveButton);

      // Should exit edit mode and show updated name
      await waitFor(() => {
        expect(screen.getByText('Updated Mainnet')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Enter network name')).not.toBeInTheDocument();
      });
    });

    it('should cancel network changes', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]); // Edit mainnet

      const nameInput = screen.getByPlaceholderText('Enter network name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Mainnet');

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      // Should exit edit mode without saving
      expect(screen.getByText('RChain Mainnet')).toBeInTheDocument();
      expect(screen.queryByText('Updated Mainnet')).not.toBeInTheDocument();
    });

    it('should show admin URL field for local network', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[2]); // Edit local network (index 2)

      expect(screen.getByPlaceholderText('http://localhost:40405')).toBeInTheDocument();
      expect(screen.getByText(/Used for propose operations/)).toBeInTheDocument();
    });
  });

  describe('Custom Network', () => {
    it('should render custom network config component', () => {
      renderSettings();

      expect(screen.getByTestId('custom-network-config')).toBeInTheDocument();
    });

    it('should show Add Custom Network button', () => {
      renderSettings();

      expect(screen.getByRole('button', { name: 'Add Custom Network' })).toBeInTheDocument();
    });

    it('should show custom network form when Add Custom Network is clicked', async () => {
      renderSettings();

      const addButton = screen.getByRole('button', { name: 'Add Custom Network' });
      fireEvent.click(addButton);

      expect(screen.getByText('Add Custom Network')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('My Custom Network')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://my-validator.example.com:443')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://my-readonly.example.com:443')).toBeInTheDocument();
    });

    it('should validate required fields for custom network', async () => {
      renderSettings();

      const addButton = screen.getByRole('button', { name: 'Add Custom Network' });
      fireEvent.click(addButton);

      const addNetworkButton = screen.getByRole('button', { name: 'Add Network' });
      
      // Should be disabled without required fields
      expect(addNetworkButton).toBeDisabled();

      // Fill required fields
      const nameInput = screen.getByPlaceholderText('My Custom Network');
      const urlInput = screen.getByPlaceholderText('https://my-validator.example.com:443');
      
      await user.type(nameInput, 'My Network');
      await user.type(urlInput, 'https://my-node.com:443');

      // Should be enabled with required fields
      expect(addNetworkButton).not.toBeDisabled();
    });

    it('should add a new custom network', async () => {
      renderSettings();

      const addButton = screen.getByRole('button', { name: 'Add Custom Network' });
      fireEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText('My Custom Network');
      const urlInput = screen.getByPlaceholderText('https://my-validator.example.com:443');
      
      await user.type(nameInput, 'My Custom RChain');
      await user.type(urlInput, 'https://my-rchain.com:443');

      const addNetworkButton = screen.getByRole('button', { name: 'Add Network' });
      fireEvent.click(addNetworkButton);

      // Should exit add mode
      await waitFor(() => {
        expect(screen.queryByText('Add Custom Network')).not.toBeInTheDocument();
      });
    });

    it('should cancel adding custom network', async () => {
      renderSettings();

      const addButton = screen.getByRole('button', { name: 'Add Custom Network' });
      fireEvent.click(addButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      // Should exit add mode
      expect(screen.queryByText('Add Custom Network')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Custom Network' })).toBeInTheDocument();
    });
  });

  describe('Help Text and Labels', () => {
    it('should show help text for network URLs in edit mode', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText(/Used for state-changing operations/)).toBeInTheDocument();
      expect(screen.getByText(/Used for queries.*Leave empty to use validator URL/)).toBeInTheDocument();
    });

    it('should show status indicators in edit mode', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]);

      const labels = screen.getAllByText(/Node URL/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Network State Management', () => {
    it('should not allow editing multiple networks simultaneously', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]); // Edit mainnet

      // Other edit buttons should not be visible
      expect(screen.getAllByText('Edit Network')).toHaveLength(2); // Only testnet and local remain
    });

    it('should hide Add Custom Network button when editing', async () => {
      renderSettings();

      const editButtons = screen.getAllByText('Edit Network');
      fireEvent.click(editButtons[0]);

      expect(screen.queryByRole('button', { name: 'Add Custom Network' })).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should handle long network names gracefully', () => {
      const longNameNetworks = [
        {
          ...defaultNetworks[0],
          name: 'Very Long Network Name That Should Be Handled Properly',
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
            networks: longNameNetworks,
            selectedNetwork: longNameNetworks[0],
            currentNetworkId: longNameNetworks[0].id,
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

      renderSettings();

      expect(screen.getByText(/Very Long Network Name/)).toBeInTheDocument();
    });
  });
});