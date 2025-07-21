import React from 'react';
import styled from 'styled-components';
import { ProposalTypes } from '@walletconnect/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { approveSession, rejectSession } from '../../store/walletConnectSlice';
import { Card } from '../Card';
import { Button } from '../Button';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
`;

const ModalContent = styled(Card)`
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const DAppInfo = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const DAppIcon = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 20px;
  margin-bottom: 16px;
`;

const DAppName = styled.h2`
  margin-bottom: 8px;
`;

const DAppUrl = styled.p`
  color: ${props => props.theme.textSecondary};
  margin-bottom: 16px;
`;

const DAppDescription = styled.p`
  opacity: 0.8;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  margin-bottom: 12px;
  font-size: 14px;
  text-transform: uppercase;
  opacity: 0.7;
`;

const PermissionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const PermissionItem = styled.li`
  padding: 8px 16px;
  background: ${props => props.theme.background};
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '✓';
    color: ${props => props.theme.primary};
    font-weight: bold;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`;

const ChainBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  border-radius: 16px;
  font-size: 12px;
  margin-right: 8px;
`;

interface SessionProposalModalProps {
  proposal: ProposalTypes.Struct | null;
  onClose: () => void;
}

export const SessionProposalModal: React.FC<SessionProposalModalProps> = ({ proposal, onClose }) => {
  const dispatch = useAppDispatch();
  const { selectedAccount } = useAppSelector(state => state.wallet);

  if (!proposal) return null;

  const params = (proposal as any).params;
  const { proposer, requiredNamespaces } = params;
  const chains: string[] = requiredNamespaces?.rchain?.chains || [];
  const methods: string[] = requiredNamespaces?.rchain?.methods || [];
  const events: string[] = requiredNamespaces?.rchain?.events || [];

  const handleApprove = async () => {
    if (selectedAccount?.address) {
      await dispatch(approveSession({ proposal, address: selectedAccount.address }));
      onClose();
    }
  };

  const handleReject = async () => {
    await dispatch(rejectSession(proposal.id));
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <DAppInfo>
          {proposer.metadata.icons[0] && (
            <DAppIcon src={proposer.metadata.icons[0]} alt={proposer.metadata.name} />
          )}
          <DAppName>{proposer.metadata.name}</DAppName>
          <DAppUrl>{proposer.metadata.url}</DAppUrl>
          {proposer.metadata.description && (
            <DAppDescription>{proposer.metadata.description}</DAppDescription>
          )}
        </DAppInfo>

        <Section>
          <SectionTitle>Chains</SectionTitle>
          <div>
            {chains.map(chain => (
              <ChainBadge key={chain}>
                {chain.replace('rchain:', 'RChain ')}
              </ChainBadge>
            ))}
          </div>
        </Section>

        <Section>
          <SectionTitle>Permissions Requested</SectionTitle>
          <PermissionList>
            {methods.map(method => (
              <PermissionItem key={method}>
                {method.replace('rchain_', '').replace(/([A-Z])/g, ' $1').trim()}
              </PermissionItem>
            ))}
          </PermissionList>
        </Section>

        {events.length > 0 && (
          <Section>
            <SectionTitle>Events</SectionTitle>
            <PermissionList>
              {events.map(event => (
                <PermissionItem key={event}>
                  {event.replace(/([A-Z])/g, ' $1').trim()}
                </PermissionItem>
              ))}
            </PermissionList>
          </Section>
        )}

        <ButtonGroup>
          <Button onClick={handleReject} variant="secondary" fullWidth>
            Reject
          </Button>
          <Button onClick={handleApprove} fullWidth>
            Connect
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};