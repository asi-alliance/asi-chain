import React from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { disconnectSession } from '../../store/walletConnectSlice';
import { Card } from '../Card';
import { Button } from '../Button';

const Container = styled.div`
  margin-top: 24px;
`;

const Title = styled.h3`
  margin-bottom: 16px;
`;

const DAppList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DAppItem = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
`;

const DAppInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DAppIcon = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 8px;
`;

const DAppDetails = styled.div``;

const DAppName = styled.div`
  font-weight: 600;
`;

const DAppUrl = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${props => props.theme.textSecondary};
`;

export const ConnectedDApps: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sessions, connectedDapps } = useAppSelector(state => state.walletConnect);

  const handleDisconnect = async (topic: string) => {
    if (window.confirm('Are you sure you want to disconnect from this dApp?')) {
      await dispatch(disconnectSession(topic));
    }
  };

  if (sessions.length === 0) {
    return (
      <Container>
        <Title>Connected dApps</Title>
        <EmptyState>
          No dApps connected. Use WalletConnect to connect to your favorite dApps.
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Title>Connected dApps</Title>
      <DAppList>
        {sessions.map(session => {
          const dapp = connectedDapps[session.topic];
          if (!dapp) return null;

          return (
            <DAppItem key={session.topic}>
              <DAppInfo>
                {dapp.icons[0] && (
                  <DAppIcon src={dapp.icons[0]} alt={dapp.name} />
                )}
                <DAppDetails>
                  <DAppName>{dapp.name}</DAppName>
                  <DAppUrl>{dapp.url}</DAppUrl>
                </DAppDetails>
              </DAppInfo>
              <Button
                onClick={() => handleDisconnect(session.topic)}
                variant="secondary"
                size="small"
              >
                Disconnect
              </Button>
            </DAppItem>
          );
        })}
      </DAppList>
    </Container>
  );
};