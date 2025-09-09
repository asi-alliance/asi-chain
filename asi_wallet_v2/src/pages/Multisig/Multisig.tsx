import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loadMultisigWallets,
  createMultisigWallet,
  selectMultisigWallets,
  selectIsMultisigLoading,
  selectIsCreatingMultisig,
  selectMultisigError,
  clearError,
} from '../../store/multisigSlice';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../components';
import { MultisigWalletConfig } from '../../types/multisig';
import { CreateMultisigModal } from './CreateMultisigModal';

const MultisigContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const WalletsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const WalletCard = styled(Card)`
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid ${props => props.theme.colors.border};

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const WalletHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const WalletName = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
`;

const WalletStatus = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  background: ${props => {
    switch (props.status) {
      case 'deployed':
      case 'active':
        return props.theme.colors.success + '20';
      case 'pending':
        return props.theme.colors.warning + '20';
      case 'disabled':
        return props.theme.colors.error + '20';
      default:
        return props.theme.colors.text.secondary + '20';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'deployed':
      case 'active':
        return props.theme.colors.success;
      case 'pending':
        return props.theme.colors.warning;
      case 'disabled':
        return props.theme.colors.error;
      default:
        return props.theme.colors.text.secondary;
    }
  }};
`;

const WalletInfo = styled.div`
  margin-bottom: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const InfoLabel = styled.span`
  color: ${props => props.theme.colors.text.secondary};
`;

const InfoValue = styled.span`
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
`;

const ParticipantsList = styled.div`
  margin-bottom: 1rem;
`;

const ParticipantItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 0.25rem;
`;

const Address = styled.span`
  font-family: monospace;
  font-size: 0.75rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.error + '15'};
  color: ${props => props.theme.colors.error};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

const Spinner = styled.div`
  width: 2rem;
  height: 2rem;
  border: 3px solid ${props => props.theme.colors.border};
  border-top: 3px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const Multisig: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const wallets = useAppSelector(selectMultisigWallets);
  const isLoading = useAppSelector(selectIsMultisigLoading);
  const isCreating = useAppSelector(selectIsCreatingMultisig);
  const error = useAppSelector(selectMultisigError);

  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    dispatch(loadMultisigWallets());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleCreateWallet = () => {
    setShowCreateModal(true);
  };

  const handleWalletClick = (wallet: MultisigWalletConfig) => {
    navigate(`/multisig/${wallet.id}`);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'Active';
      case 'pending':
        return 'Not Deployed';
      case 'disabled':
        return 'Disabled';
      default:
        return status;
    }
  };

  if (isLoading && wallets.length === 0) {
    return (
      <MultisigContainer>
        <LoadingSpinner>
          <Spinner />
        </LoadingSpinner>
      </MultisigContainer>
    );
  }

  return (
    <MultisigContainer>
      <Header>
        <Title>Multi-Signature Wallets</Title>
        <Button onClick={handleCreateWallet} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Multisig Wallet'}
        </Button>
      </Header>

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      {wallets.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🏦</EmptyIcon>
          <h3>No Multi-Signature Wallets</h3>
          <p>Create your first multisig wallet to get started with enhanced security and shared ownership.</p>
          <Button onClick={handleCreateWallet} style={{ marginTop: '1rem' }}>
            Create Your First Multisig Wallet
          </Button>
        </EmptyState>
      ) : (
        <WalletsGrid>
          {wallets.map((wallet) => (
            <WalletCard key={wallet.id} onClick={() => handleWalletClick(wallet)}>
              <CardContent>
                <WalletHeader>
                  <div>
                    <WalletName>{wallet.name}</WalletName>
                    <WalletStatus status={wallet.status}>
                      {getStatusDisplay(wallet.status)}
                    </WalletStatus>
                  </div>
                </WalletHeader>

                {wallet.description && (
                  <p style={{ 
                    color: 'inherit', 
                    fontSize: '0.9rem', 
                    marginBottom: '1rem',
                    opacity: 0.8 
                  }}>
                    {wallet.description}
                  </p>
                )}

                <WalletInfo>
                  <InfoRow>
                    <InfoLabel>Threshold:</InfoLabel>
                    <InfoValue>{wallet.threshold} of {wallet.participants.length}</InfoValue>
                  </InfoRow>
                  
                  <InfoRow>
                    <InfoLabel>Network:</InfoLabel>
                    <InfoValue>{wallet.network}</InfoValue>
                  </InfoRow>

                  {wallet.contractAddress && (
                    <InfoRow>
                      <InfoLabel>Contract:</InfoLabel>
                      <InfoValue>
                        <Address>{formatAddress(wallet.contractAddress)}</Address>
                      </InfoValue>
                    </InfoRow>
                  )}

                  <InfoRow>
                    <InfoLabel>Created:</InfoLabel>
                    <InfoValue>
                      {new Date(wallet.createdAt).toLocaleDateString()}
                    </InfoValue>
                  </InfoRow>
                </WalletInfo>

                <ParticipantsList>
                  <InfoLabel style={{ marginBottom: '0.5rem', display: 'block' }}>
                    Participants:
                  </InfoLabel>
                  {wallet.participants.slice(0, 3).map((participant, index) => (
                    <ParticipantItem key={participant.address}>
                      <span>•</span>
                      <span>{participant.name || `Participant ${index + 1}`}</span>
                      <Address>{formatAddress(participant.address)}</Address>
                    </ParticipantItem>
                  ))}
                  {wallet.participants.length > 3 && (
                    <ParticipantItem>
                      <span>+{wallet.participants.length - 3} more participants</span>
                    </ParticipantItem>
                  )}
                </ParticipantsList>
              </CardContent>
            </WalletCard>
          ))}
        </WalletsGrid>
      )}

      <CreateMultisigModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </MultisigContainer>
  );
};

export default Multisig;