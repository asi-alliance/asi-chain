import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  connectHardwareWallet,
  disconnectHardwareWallet,
  selectAccount,
  clearError,
  fetchAdditionalAccounts,
  selectHardwareWalletState,
} from '../../store/hardwareWalletSlice';
import { Button } from '../Button';
import { Card } from '../Card';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.text.secondary};
  padding: 0.25rem;
  
  &:hover {
    color: ${props => props.theme.colors.text.primary};
  }
`;

const DeviceGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DeviceCard = styled.div<{ isSelected?: boolean }>`
  padding: 1.5rem;
  border: 2px solid ${props => props.isSelected 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.isSelected 
    ? `${props.theme.colors.primary}10` 
    : 'transparent'};

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => `${props.theme.colors.primary}05`};
  }
`;

const DeviceIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const ConnectionStep = styled.div`
  text-align: center;
  padding: 2rem 1rem;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 3rem;
  height: 3rem;
  border: 3px solid ${props => props.theme.colors.border};
  border-top: 3px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const AccountsList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const AccountItem = styled.div<{ isSelected?: boolean }>`
  padding: 1rem;
  border: 1px solid ${props => props.isSelected 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  background: ${props => props.isSelected 
    ? `${props.theme.colors.primary}10` 
    : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const AccountAddress = styled.div`
  font-family: monospace;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const AccountPath = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  background: ${props => `${props.theme.colors.error}15`};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

interface HardwareWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountSelected?: (account: any) => void;
}

export const HardwareWalletModal: React.FC<HardwareWalletModalProps> = ({
  isOpen,
  onClose,
  onAccountSelected,
}) => {
  const dispatch = useAppDispatch();
  const {
    isConnected,
    connectedDevice,
    accounts,
    selectedAccount,
    isConnecting,
    error,
    connectionStep,
    supportedDevices,
  } = useAppSelector(selectHardwareWalletState);

  const [selectedDevice, setSelectedDevice] = useState<'ledger' | 'trezor' | null>(null);
  const [selectedAccountLocal, setSelectedAccountLocal] = useState(selectedAccount);

  useEffect(() => {
    if (isOpen && error) {
      dispatch(clearError());
    }
  }, [isOpen, dispatch, error]);

  useEffect(() => {
    setSelectedAccountLocal(selectedAccount);
  }, [selectedAccount]);

  const handleDeviceSelect = (device: 'ledger' | 'trezor') => {
    setSelectedDevice(device);
  };

  const handleConnect = async () => {
    if (!selectedDevice) return;
    
    try {
      await dispatch(connectHardwareWallet(selectedDevice)).unwrap();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleAccountSelect = (account: any) => {
    setSelectedAccountLocal(account);
    dispatch(selectAccount(account));
  };

  const handleLoadMoreAccounts = () => {
    dispatch(fetchAdditionalAccounts(accounts.length));
  };

  const handleConfirm = () => {
    if (selectedAccountLocal && onAccountSelected) {
      onAccountSelected(selectedAccountLocal);
    }
    onClose();
  };

  const handleDisconnect = () => {
    dispatch(disconnectHardwareWallet());
    setSelectedDevice(null);
    setSelectedAccountLocal(null);
  };

  const renderDeviceSelection = () => (
    <>
      <h3>Select Hardware Wallet</h3>
      <DeviceGrid>
        <DeviceCard 
          isSelected={selectedDevice === 'ledger'}
          onClick={() => handleDeviceSelect('ledger')}
        >
          <DeviceIcon>🔷</DeviceIcon>
          <h4>Ledger</h4>
          <p>Nano S/X/S Plus</p>
        </DeviceCard>
        <DeviceCard 
          isSelected={selectedDevice === 'trezor'}
          onClick={() => handleDeviceSelect('trezor')}
        >
          <DeviceIcon>🔶</DeviceIcon>
          <h4>Trezor</h4>
          <p>Model T/One</p>
        </DeviceCard>
      </DeviceGrid>
      {selectedDevice && (
        <ButtonGroup>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConnect}>
            Connect {selectedDevice}
          </Button>
        </ButtonGroup>
      )}
    </>
  );

  const renderConnectionSteps = () => {
    const steps = {
      detecting: {
        title: 'Detecting Device',
        message: 'Please make sure your hardware wallet is connected and unlocked.',
      },
      connecting: {
        title: 'Connecting',
        message: 'Establishing connection with your hardware wallet...',
      },
      'fetching-accounts': {
        title: 'Fetching Accounts',
        message: 'Loading your wallet accounts...',
      },
    };

    const currentStep = steps[connectionStep as keyof typeof steps];
    
    return (
      <ConnectionStep>
        <LoadingSpinner />
        <h3>{currentStep?.title}</h3>
        <p>{currentStep?.message}</p>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </ConnectionStep>
    );
  };

  const renderAccountSelection = () => (
    <>
      <ModalHeader>
        <div>
          <h3>Select Account</h3>
          <p>Connected: {connectedDevice} wallet</p>
        </div>
        <Button variant="secondary" size="small" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </ModalHeader>
      
      <AccountsList>
        {accounts.map((account, index) => (
          <AccountItem
            key={account.address}
            isSelected={selectedAccountLocal?.address === account.address}
            onClick={() => handleAccountSelect(account)}
          >
            <AccountAddress>
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </AccountAddress>
            <AccountPath>
              {account.derivationPath} • Index {account.index}
            </AccountPath>
          </AccountItem>
        ))}
      </AccountsList>

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <Button variant="secondary" size="small" onClick={handleLoadMoreAccounts}>
          Load More Accounts
        </Button>
      </div>

      <ButtonGroup>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm}
          disabled={!selectedAccountLocal}
        >
          Use Selected Account
        </Button>
      </ButtonGroup>
    </>
  );

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>Hardware Wallet</h2>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        {!isConnected && !isConnecting && renderDeviceSelection()}
        {isConnecting && renderConnectionSteps()}
        {isConnected && renderAccountSelection()}
      </ModalContent>
    </ModalOverlay>
  );
};

export default HardwareWalletModal;