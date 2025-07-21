import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { QRCodeCanvas } from 'qrcode.react';
import { RootState } from 'store';
import { Card, CardHeader, CardTitle, CardContent, Button } from 'components';

const ReceiveContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const AddressContainer = styled.div`
  background: ${({ theme }) => theme.surface};
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
`;

const AddressLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 16px;
`;

const AddressValue = styled.div`
  font-family: monospace;
  font-size: 18px;
  word-break: break-all;
  background: ${({ theme }) => theme.card};
  padding: 16px;
  border-radius: 8px;
  border: 2px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 16px;
`;

const CopyButton = styled(Button)`
  margin-top: 16px;
`;

const QRCodeContainer = styled.div`
  width: 256px;
  height: 256px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 24px auto;
  box-shadow: ${({ theme }) => theme.shadowLarge};
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 24px;
  border-bottom: 2px solid ${({ theme }) => theme.border};
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ active, theme }) => (active ? theme.primary : 'transparent')};
  color: ${({ active, theme }) => (active ? theme.primary : theme.text.secondary)};
  font-weight: ${({ active }) => (active ? '600' : '400')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primary};
  }
`;

const SuccessMessage = styled.div`
  background: ${({ theme }) => theme.success};
  color: ${({ theme }) => theme.text.inverse};
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
`;

const InfoBox = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const InfoTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 16px;
  color: ${({ theme }) => theme.text.primary};
`;

const InfoList = styled.ul`
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.text.secondary};
  
  li {
    margin-bottom: 4px;
  }
`;

export const Receive: React.FC = () => {
  const navigate = useNavigate();
  const { selectedAccount } = useSelector((state: RootState) => state.wallet);
  const [activeTab, setActiveTab] = useState<'rev' | 'eth'>('rev');
  const [copyMessage, setCopyMessage] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyMessage('Address copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 3000);
    });
  };

  if (!selectedAccount) {
    return (
      <ReceiveContainer>
        <Card>
          <CardContent>
            <p>Please select an account first.</p>
            <Button onClick={() => navigate('/accounts')}>Select Account</Button>
          </CardContent>
        </Card>
      </ReceiveContainer>
    );
  }

  const currentAddress = activeTab === 'rev' ? selectedAccount.revAddress : selectedAccount.ethAddress;
  const addressLabel = activeTab === 'rev' ? 'REV Address' : 'ETH Address';

  return (
    <ReceiveContainer>
      <Card>
        <CardHeader>
          <CardTitle>Receive Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          {copyMessage && <SuccessMessage>{copyMessage}</SuccessMessage>}

          <TabContainer>
            <Tab
              active={activeTab === 'rev'}
              onClick={() => setActiveTab('rev')}
            >
              REV Address
            </Tab>
            <Tab
              active={activeTab === 'eth'}
              onClick={() => setActiveTab('eth')}
            >
              ETH Address
            </Tab>
          </TabContainer>

          <AddressContainer>
            <AddressLabel>{addressLabel}</AddressLabel>
            <AddressValue>{currentAddress}</AddressValue>
            
            <QRCodeContainer>
              <QRCodeCanvas
                value={currentAddress}
                size={224}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </QRCodeContainer>

            <CopyButton
              variant="primary"
              onClick={() => copyToClipboard(currentAddress)}
              fullWidth
            >
              Copy {activeTab.toUpperCase()} Address
            </CopyButton>
            
            <Button
              variant="ghost"
              onClick={() => {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  const url = canvas.toDataURL('image/png');
                  const link = document.createElement('a');
                  link.download = `${activeTab}-address-qr.png`;
                  link.href = url;
                  link.click();
                }
              }}
              fullWidth
              style={{ marginTop: '8px' }}
            >
              Download QR Code
            </Button>
          </AddressContainer>

          <InfoBox>
            <InfoTitle>Important:</InfoTitle>
            <InfoList>
              <li>Only send REV tokens to the REV address</li>
              <li>The ETH address is for compatibility - mainly for address derivation</li>
              <li>Always double-check the address before sending</li>
              <li>Make sure you're on the correct network: {selectedAccount.name}</li>
            </InfoList>
          </InfoBox>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Button variant="ghost" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </ReceiveContainer>
  );
};