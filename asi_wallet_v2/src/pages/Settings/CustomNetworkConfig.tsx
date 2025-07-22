import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import { updateNetwork, selectNetwork } from 'store/walletSlice';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from 'components';
import { Network } from 'types/wallet';

const ConfigSection = styled.div`
  margin-bottom: 32px;
`;

const ConfigTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.text.primary};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 8px;
`;

const DirectLinks = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: ${({ theme }) => theme.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const LinkTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 8px;
`;

const Link = styled.div`
  font-family: monospace;
  font-size: 13px;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 4px;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const InfoBox = styled.div`
  background: ${({ theme }) => theme.info}20;
  border: 1px solid ${({ theme }) => theme.info};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  
  h4 {
    margin: 0 0 8px 0;
    color: ${({ theme }) => theme.info};
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: ${({ theme }) => theme.text.primary};
  }
`;

export const CustomNetworkConfig: React.FC = () => {
  const dispatch = useDispatch();
  const { networks, selectedNetwork } = useSelector((state: RootState) => state.wallet);
  
  // State for custom network configuration
  const [validatorHost, setValidatorHost] = useState('localhost');
  const [validatorHttpPort, setValidatorHttpPort] = useState('40403');
  const [validatorGrpcPort, setValidatorGrpcPort] = useState('40401');
  
  const [readOnlyHost, setReadOnlyHost] = useState('localhost');
  const [readOnlyHttpPort, setReadOnlyHttpPort] = useState('40453');
  const [readOnlyGrpcPort, setReadOnlyGrpcPort] = useState('40451');
  
  const [isEditing, setIsEditing] = useState(false);

  // Find or create custom network
  const customNetwork = networks.find(n => n.id === 'custom') || {
    id: 'custom',
    name: 'Custom Network',
    url: 'http://localhost:40403',
    readOnlyUrl: 'http://localhost:40453',
  };

  // Load current custom network settings on mount
  useEffect(() => {
    if (customNetwork.url) {
      try {
        const validatorUrl = new URL(customNetwork.url);
        setValidatorHost(validatorUrl.hostname);
        setValidatorHttpPort(validatorUrl.port || '40403');
      } catch (e) {
        // Default values already set
      }
    }
    
    if (customNetwork.readOnlyUrl) {
      try {
        const readOnlyUrl = new URL(customNetwork.readOnlyUrl);
        setReadOnlyHost(readOnlyUrl.hostname);
        setReadOnlyHttpPort(readOnlyUrl.port || '40453');
      } catch (e) {
        // Default values already set
      }
    }
  }, [customNetwork]);

  const handleSave = () => {
    const updatedNetwork: Network = {
      id: 'custom',
      name: 'Custom Network',
      url: `http://${validatorHost}:${validatorHttpPort}`,
      readOnlyUrl: `http://${readOnlyHost}:${readOnlyHttpPort}`,
    };
    
    dispatch(updateNetwork(updatedNetwork));
    setIsEditing(false);
  };

  const handleUseCustomNetwork = () => {
    // Save the network first
    handleSave();
    // Then select it
    dispatch(selectNetwork('custom'));
  };

  const validatorGrpcUrl = `${validatorHost}:${validatorGrpcPort}`;
  const validatorHttpUrl = `http://${validatorHost}:${validatorHttpPort}`;
  const readOnlyGrpcUrl = `${readOnlyHost}:${readOnlyGrpcPort}`;
  const readOnlyHttpUrl = `http://${readOnlyHost}:${readOnlyHttpPort}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Custom Network Configuration
          {selectedNetwork.id === 'custom' && (
            <span style={{ fontSize: '12px', marginLeft: '8px', color: '#4caf50' }}>
              (Active)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InfoBox>
          <h4>🔧 Custom Network Setup</h4>
          <p>
            Configure custom validator and read-only nodes for local development or private networks. 
            This matches the F1R3Wallet custom network configuration.
          </p>
        </InfoBox>

        {/* Validator Node Configuration */}
        <ConfigSection>
          <ConfigTitle>Custom network - validator node</ConfigTitle>
          
          <FormRow>
            <FormGroup>
              <Label>IP/Domain:</Label>
              <Input
                value={validatorHost}
                onChange={(e) => setValidatorHost(e.target.value)}
                placeholder="localhost"
                disabled={!isEditing}
              />
            </FormGroup>
            <FormGroup>
              <Label>gRPC Port:</Label>
              <Input
                value={validatorGrpcPort}
                onChange={(e) => setValidatorGrpcPort(e.target.value)}
                placeholder="40401"
                disabled={!isEditing}
              />
            </FormGroup>
          </FormRow>
          
          <FormRow>
            <FormGroup>
              <Label>HTTP Port:</Label>
              <Input
                value={validatorHttpPort}
                onChange={(e) => setValidatorHttpPort(e.target.value)}
                placeholder="40403"
                disabled={!isEditing}
              />
            </FormGroup>
            <div />
          </FormRow>
          
          <DirectLinks>
            <LinkTitle>Direct links:</LinkTitle>
            <Link onClick={() => window.open(`${validatorHttpUrl}/status`, '_blank')}>
              gRPC: {validatorGrpcUrl}
            </Link>
            <Link onClick={() => window.open(validatorHttpUrl, '_blank')}>
              HTTP: {validatorHttpUrl}
            </Link>
          </DirectLinks>
        </ConfigSection>

        {/* Read-only Node Configuration */}
        <ConfigSection>
          <ConfigTitle>Custom network - read-only node</ConfigTitle>
          
          <FormRow>
            <FormGroup>
              <Label>IP/Domain:</Label>
              <Input
                value={readOnlyHost}
                onChange={(e) => setReadOnlyHost(e.target.value)}
                placeholder="localhost"
                disabled={!isEditing}
              />
            </FormGroup>
            <FormGroup>
              <Label>gRPC Port:</Label>
              <Input
                value={readOnlyGrpcPort}
                onChange={(e) => setReadOnlyGrpcPort(e.target.value)}
                placeholder="40451"
                disabled={!isEditing}
              />
            </FormGroup>
          </FormRow>
          
          <FormRow>
            <FormGroup>
              <Label>HTTP Port:</Label>
              <Input
                value={readOnlyHttpPort}
                onChange={(e) => setReadOnlyHttpPort(e.target.value)}
                placeholder="40453"
                disabled={!isEditing}
              />
            </FormGroup>
            <div />
          </FormRow>
          
          <DirectLinks>
            <LinkTitle>Direct links:</LinkTitle>
            <Link onClick={() => window.open(`${readOnlyHttpUrl}/status`, '_blank')}>
              gRPC: {readOnlyGrpcUrl}
            </Link>
            <Link onClick={() => window.open(readOnlyHttpUrl, '_blank')}>
              HTTP: {readOnlyHttpUrl}
            </Link>
          </DirectLinks>
        </ConfigSection>

        <ActionButtons>
          {!isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Edit Configuration
              </Button>
              {selectedNetwork.id !== 'custom' && (
                <Button variant="primary" onClick={handleUseCustomNetwork}>
                  Use Custom Network
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Save Configuration
              </Button>
            </>
          )}
        </ActionButtons>
      </CardContent>
    </Card>
  );
};