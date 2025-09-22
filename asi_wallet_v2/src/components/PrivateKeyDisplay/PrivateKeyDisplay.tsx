import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from 'components/Button';
import { Card, CardContent } from 'components/Card';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const SecurityWarning = styled.div`
  background: ${({ theme }) => `${theme.error}15`};
  border: 2px solid ${({ theme }) => theme.error};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
`;

const WarningIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const WarningTitle = styled.h3`
  color: ${({ theme }) => theme.error};
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 700;
`;

const WarningText = styled.p`
  color: ${({ theme }) => theme.text.primary};
  margin: 0 0 16px 0;
  line-height: 1.5;
  font-size: 14px;
`;

const KeySection = styled.div`
  margin-bottom: 24px;
`;

const KeyLabel = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.text.primary};
  font-size: 14px;
`;

const KeyContainer = styled.div`
  position: relative;
  background: ${({ theme }) => theme.surface};
  border: 2px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
  color: ${({ theme }) => theme.text.primary};
  min-height: 60px;
  display: flex;
  align-items: center;
`;

const KeyValue = styled.div<{ isVisible: boolean }>`
  flex: 1;
  filter: ${({ isVisible }) => isVisible ? 'none' : 'blur(8px)'};
  transition: filter 0.3s ease;
  user-select: ${({ isVisible }) => isVisible ? 'text' : 'none'};
`;

const ToggleButton = styled(Button)`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  font-size: 11px;
  min-width: auto;
`;

const CopyButton = styled(Button)`
  margin-top: 12px;
  width: 100%;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const InfoBox = styled.div`
  background: ${({ theme }) => `${theme.primary}10`};
  border: 1px solid ${({ theme }) => `${theme.primary}30`};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoTitle = styled.h4`
  color: ${({ theme }) => theme.primary};
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
`;

const InfoList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: ${({ theme }) => theme.text.secondary};
  font-size: 14px;
  line-height: 1.5;
`;

const InfoItem = styled.li`
  margin-bottom: 4px;
`;

interface PrivateKeyDisplayProps {
  privateKey: string;
  accountName: string;
  onContinue: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const PrivateKeyDisplay: React.FC<PrivateKeyDisplayProps> = ({
  privateKey,
  accountName,
  onContinue,
  onBack,
  showBackButton = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy private key:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = privateKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <Container>
      <SecurityWarning>
        <WarningIcon>🔐</WarningIcon>
        <WarningTitle>IMPORTANT: Save Your Private Key</WarningTitle>
        <WarningText>
          This is the only time you'll see your private key in plain text. 
          <strong> Save it somewhere safe!</strong> If you lose this key, you'll lose access to your account forever.
        </WarningText>
      </SecurityWarning>

      <Card>
        <CardContent>
          <KeySection>
            <KeyLabel>Account: {accountName}</KeyLabel>
            <KeyContainer>
              <KeyValue isVisible={isVisible}>
                {privateKey}
              </KeyValue>
              <ToggleButton
                variant="ghost"
                size="small"
                onClick={handleToggleVisibility}
              >
                {isVisible ? 'Hide' : 'Show'}
              </ToggleButton>
            </KeyContainer>
            <CopyButton
              variant="secondary"
              onClick={handleCopy}
              disabled={!isVisible}
            >
              {copied ? '✓ Copied!' : 'Copy Private Key'}
            </CopyButton>
          </KeySection>

          <InfoBox>
            <InfoTitle>What to do with your private key:</InfoTitle>
            <InfoList>
              <InfoItem>Write it down on paper and store it safely</InfoItem>
              <InfoItem>Never share it with anyone</InfoItem>
              <InfoItem>Don't store it in screenshots or unencrypted files</InfoItem>
              <InfoItem>Use it to import your wallet in other browsers</InfoItem>
              <InfoItem>Keep it offline when possible</InfoItem>
            </InfoList>
          </InfoBox>

          <ActionButtons>
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                style={{ flex: 1 }}
              >
                Back
              </Button>
            )}
            <Button
              onClick={onContinue}
              style={{ flex: 1 }}
            >
              I've Saved My Private Key
            </Button>
          </ActionButtons>
        </CardContent>
      </Card>
    </Container>
  );
};
