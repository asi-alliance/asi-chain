import React, { useState } from 'react';
import styled from 'styled-components';
import { generateKeyPair, importPrivateKey } from 'utils/crypto';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from 'components';

const KeyGeneratorContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const KeyDisplay = styled.div`
  margin-top: 24px;
  padding: 20px;
  background: ${({ theme }) => theme.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const KeyField = styled.div`
  margin-bottom: 16px;
  &:last-child {
    margin-bottom: 0;
  }
`;

const KeyLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 8px;
`;

const KeyValue = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const KeyText = styled.input`
  flex: 1;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  background: ${({ theme }) => theme.background};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.text.primary};
  cursor: text;
  user-select: all;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary};
  }
`;

const CopyButton = styled.button`
  padding: 8px 16px;
  background: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

const ErrorMessage = styled.div`
  background: ${({ theme }) => theme.danger};
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
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

interface GeneratedKeys {
  privateKey: string;
  publicKey: string;
  ethAddress: string;
  revAddress: string;
}

export const KeyGenerator: React.FC = () => {
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKeys | null>(null);
  const [importKey, setImportKey] = useState('');
  const [importedKeys, setImportedKeys] = useState<GeneratedKeys | null>(null);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerateNew = () => {
    try {
      setError('');
      setImportedKeys(null);
      const keys = generateKeyPair();
      setGeneratedKeys(keys);
    } catch (err: any) {
      setError(err.message || 'Failed to generate keys');
      console.error('Key generation error:', err);
    }
  };

  const handleImport = () => {
    setError('');
    setGeneratedKeys(null);
    
    try {
      if (!importKey.trim()) {
        throw new Error('Please enter a private key');
      }
      
      // Remove 0x prefix if present
      const cleanKey = importKey.trim().replace(/^0x/, '');
      
      // Validate hex format
      if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
        throw new Error('Private key must be 64 hexadecimal characters');
      }
      
      const keys = importPrivateKey(cleanKey);
      setImportedKeys(keys);
      setImportKey('');
    } catch (err: any) {
      setError(err.message || 'Invalid private key');
    }
  };

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderKeyDisplay = (keys: GeneratedKeys, title: string) => (
    <KeyDisplay>
      <h3 style={{ marginTop: 0, marginBottom: 20 }}>{title}</h3>
      
      <KeyField>
        <KeyLabel>Private Key (Keep Secret!)</KeyLabel>
        <KeyValue>
          <KeyText 
            value={keys.privateKey} 
            readOnly 
            onClick={(e) => e.currentTarget.select()}
          />
          <CopyButton onClick={() => handleCopy(keys.privateKey, 'private')}>
            {copiedField === 'private' ? 'Copied!' : 'Copy'}
          </CopyButton>
        </KeyValue>
      </KeyField>

      <KeyField>
        <KeyLabel>Public Key</KeyLabel>
        <KeyValue>
          <KeyText 
            value={keys.publicKey} 
            readOnly 
            onClick={(e) => e.currentTarget.select()}
          />
          <CopyButton onClick={() => handleCopy(keys.publicKey, 'public')}>
            {copiedField === 'public' ? 'Copied!' : 'Copy'}
          </CopyButton>
        </KeyValue>
      </KeyField>

      <KeyField>
        <KeyLabel>Ethereum Address</KeyLabel>
        <KeyValue>
          <KeyText 
            value={keys.ethAddress} 
            readOnly 
            onClick={(e) => e.currentTarget.select()}
          />
          <CopyButton onClick={() => handleCopy(keys.ethAddress, 'eth')}>
            {copiedField === 'eth' ? 'Copied!' : 'Copy'}
          </CopyButton>
        </KeyValue>
      </KeyField>

      <KeyField>
        <KeyLabel>REV Address</KeyLabel>
        <KeyValue>
          <KeyText 
            value={keys.revAddress} 
            readOnly 
            onClick={(e) => e.currentTarget.select()}
          />
          <CopyButton onClick={() => handleCopy(keys.revAddress, 'rev')}>
            {copiedField === 'rev' ? 'Copied!' : 'Copy'}
          </CopyButton>
        </KeyValue>
      </KeyField>
    </KeyDisplay>
  );

  return (
    <KeyGeneratorContainer>
      <h2>Key Generator</h2>
      
      <InfoBox>
        <h4>About Keys</h4>
        <p>
          Generate new keypairs or derive addresses from existing private keys. 
          The ETH address is compatible with MetaMask and all Ethereum wallets. 
          The REV address is specific to the RChain network.
        </p>
      </InfoBox>

      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Generate New Keypair</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ marginBottom: 20 }}>
              Generate a completely new random keypair. Make sure to save your private key securely!
            </p>
            
            {error && !importKey && <ErrorMessage>{error}</ErrorMessage>}
            
            <Button onClick={handleGenerateNew} variant="primary">
              Generate New Keypair
            </Button>
            
            {generatedKeys && renderKeyDisplay(generatedKeys, 'Generated Keys')}
          </CardContent>
        </Card>
      </Section>

      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Import Private Key</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ marginBottom: 20 }}>
              Enter a 64-character hexadecimal private key to derive its public key and addresses.
            </p>
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <ActionButtons>
              <Input
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                placeholder="Enter private key (64 hex characters)"
                style={{ flex: 1 }}
              />
              <Button onClick={handleImport} variant="primary">
                Import
              </Button>
            </ActionButtons>
            
            {importedKeys && renderKeyDisplay(importedKeys, 'Imported Key Details')}
          </CardContent>
        </Card>
      </Section>
    </KeyGeneratorContainer>
  );
};