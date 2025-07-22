import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { RootState } from 'store';
import { updateNetwork, addNetwork } from 'store/walletSlice';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from 'components';
import { Network } from 'types/wallet';
import { CustomNetworkConfig } from './CustomNetworkConfig';

const SettingsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const NetworkCard = styled(Card)`
  margin-bottom: 24px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 8px;
`;

const HelpText = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.text.secondary};
  margin-top: 4px;
`;

const URLInputGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
`;

const StatusIndicator = styled.span<{ status: 'online' | 'offline' | 'checking' }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 8px;
  background-color: ${({ status, theme }) => 
    status === 'online' ? theme.success : 
    status === 'offline' ? theme.danger : 
    theme.warning
  };
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

export const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const { networks, selectedNetwork } = useSelector((state: RootState) => state.wallet);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [isCustomNetwork, setIsCustomNetwork] = useState(false);

  const handleEditNetwork = (network: Network) => {
    setEditingNetwork({ ...network });
    setIsCustomNetwork(network.id === 'custom');
  };

  const handleSaveNetwork = () => {
    if (editingNetwork) {
      if (isCustomNetwork && !networks.find(n => n.id === editingNetwork.id)) {
        // Adding a new custom network
        dispatch(addNetwork(editingNetwork));
      } else {
        // Updating an existing network
        dispatch(updateNetwork(editingNetwork));
      }
      setEditingNetwork(null);
      setIsCustomNetwork(false);
    }
  };

  const handleAddCustomNetwork = () => {
    setIsCustomNetwork(true);
    // Create a new empty network object for adding
    setEditingNetwork({
      id: '', // Will be assigned by the addNetwork action
      name: '',
      url: '',
      readOnlyUrl: '',
      adminUrl: '',
      shardId: 'root'
    });
  };

  const handleCancelEdit = () => {
    setEditingNetwork(null);
    setIsCustomNetwork(false);
  };

  const updateEditingNetwork = (field: keyof Network, value: string) => {
    if (editingNetwork) {
      setEditingNetwork({ ...editingNetwork, [field]: value });
    }
  };

  return (
    <SettingsContainer>
      <h2>Network Settings</h2>
      
      {/* Custom Network Configuration Section */}
      <CustomNetworkConfig />
      
      <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>Predefined Networks</h3>
      
      {networks.filter(n => n.id !== 'custom').map((network) => (
        <NetworkCard key={network.id}>
          <CardHeader>
            <CardTitle>
              {network.name}
              {network.id === selectedNetwork.id && (
                <span style={{ fontSize: '12px', marginLeft: '8px', color: '#4caf50' }}>
                  (Active)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingNetwork?.id === network.id ? (
              <>
                <FormGroup>
                  <Label>Network Name</Label>
                  <Input
                    value={editingNetwork.name}
                    onChange={(e) => updateEditingNetwork('name', e.target.value)}
                    placeholder="Enter network name"
                  />
                </FormGroup>

                <URLInputGroup>
                  <FormGroup>
                    <Label>
                      Validator Node URL
                      <StatusIndicator status="checking" />
                    </Label>
                    <Input
                      value={editingNetwork.url}
                      onChange={(e) => updateEditingNetwork('url', e.target.value)}
                      placeholder="https://validator.example.com:443"
                    />
                    <HelpText>
                      Used for state-changing operations (transfers, deploys)
                    </HelpText>
                  </FormGroup>

                  <FormGroup>
                    <Label>
                      Read-Only Node URL
                      <StatusIndicator status="checking" />
                    </Label>
                    <Input
                      value={editingNetwork.readOnlyUrl || ''}
                      onChange={(e) => updateEditingNetwork('readOnlyUrl', e.target.value)}
                      placeholder="https://readonly.example.com:443"
                    />
                    <HelpText>
                      Used for queries (balance checks, exploratory deploys). 
                      Leave empty to use validator URL for all operations.
                    </HelpText>
                  </FormGroup>

                  {network.id === 'local' && (
                    <FormGroup>
                      <Label>
                        Admin Node URL
                        <StatusIndicator status="checking" />
                      </Label>
                      <Input
                        value={editingNetwork.adminUrl || ''}
                        onChange={(e) => updateEditingNetwork('adminUrl', e.target.value)}
                        placeholder="http://localhost:40405"
                      />
                      <HelpText>
                        Used for propose operations (local networks only)
                      </HelpText>
                    </FormGroup>
                  )}
                </URLInputGroup>

                <ActionButtons>
                  <Button variant="secondary" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSaveNetwork}>
                    Save Changes
                  </Button>
                </ActionButtons>
              </>
            ) : (
              <>
                <FormGroup>
                  <Label>Validator URL</Label>
                  <div>{network.url}</div>
                </FormGroup>
                {network.readOnlyUrl && (
                  <FormGroup>
                    <Label>Read-Only URL</Label>
                    <div>{network.readOnlyUrl}</div>
                  </FormGroup>
                )}
                {network.adminUrl && (
                  <FormGroup>
                    <Label>Admin URL</Label>
                    <div>{network.adminUrl}</div>
                  </FormGroup>
                )}
                <Button 
                  variant="secondary" 
                  onClick={() => handleEditNetwork(network)}
                  style={{ marginTop: '16px' }}
                >
                  Edit Network
                </Button>
              </>
            )}
          </CardContent>
        </NetworkCard>
      ))}

      {!isCustomNetwork && !editingNetwork && (
        <Button variant="primary" onClick={handleAddCustomNetwork}>
          Add Custom Network
        </Button>
      )}

      {isCustomNetwork && editingNetwork && (
        <NetworkCard>
          <CardHeader>
            <CardTitle>Add Custom Network</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGroup>
              <Label>Network Name</Label>
              <Input
                value={editingNetwork.name}
                onChange={(e) => updateEditingNetwork('name', e.target.value)}
                placeholder="My Custom Network"
              />
            </FormGroup>

            <URLInputGroup>
              <FormGroup>
                <Label>Validator Node URL (Required)</Label>
                <Input
                  value={editingNetwork.url}
                  onChange={(e) => updateEditingNetwork('url', e.target.value)}
                  placeholder="https://my-validator.example.com:443"
                />
                <HelpText>
                  Used for state-changing operations (transfers, deploys)
                </HelpText>
              </FormGroup>

              <FormGroup>
                <Label>Read-Only Node URL (Optional)</Label>
                <Input
                  value={editingNetwork.readOnlyUrl || ''}
                  onChange={(e) => updateEditingNetwork('readOnlyUrl', e.target.value)}
                  placeholder="https://my-readonly.example.com:443"
                />
                <HelpText>
                  Used for queries. Leave empty to use validator URL for all operations.
                </HelpText>
              </FormGroup>

              <FormGroup>
                <Label>Admin Node URL (Optional)</Label>
                <Input
                  value={editingNetwork.adminUrl || ''}
                  onChange={(e) => updateEditingNetwork('adminUrl', e.target.value)}
                  placeholder="http://localhost:40405"
                />
                <HelpText>
                  Used for propose operations (local validator nodes only)
                </HelpText>
              </FormGroup>
            </URLInputGroup>

            <ActionButtons>
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveNetwork}
                disabled={!editingNetwork.name || !editingNetwork.url}
              >
                Add Network
              </Button>
            </ActionButtons>
          </CardContent>
        </NetworkCard>
      )}
    </SettingsContainer>
  );
};