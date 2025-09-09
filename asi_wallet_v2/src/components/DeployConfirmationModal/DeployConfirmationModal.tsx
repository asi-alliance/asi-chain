import React from 'react';
import styled from 'styled-components';
import { Button } from 'components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 16px;
  text-align: center;
`;

const Description = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 24px;
  text-align: center;
`;

const DeploymentDetails = styled.div`
  background: ${({ theme }) => theme.surface};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 500;
  min-width: 120px;
`;

const DetailValue = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.text.primary};
  font-weight: 600;
  text-align: right;
  flex: 1;
  word-break: break-word;
`;

const CodePreview = styled.div`
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  max-height: 200px;
  overflow-y: auto;
`;

const CodeContent = styled.pre`
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
  color: ${({ theme }) => theme.text.primary};
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const WarningText = styled.div`
  background: ${({ theme }) => `${theme.warning}20`};
  color: ${({ theme }) => theme.warning};
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid ${({ theme }) => `${theme.warning}40`};
`;

const AccountInfo = styled.div`
  background: ${({ theme }) => `${theme.primary}10`};
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid ${({ theme }) => `${theme.primary}30`};
`;

const AccountName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 4px;
`;

const AccountAddress = styled.div`
  font-family: monospace;
  font-size: 12px;
  color: ${({ theme }) => theme.text.secondary};
  word-break: break-all;
`;

interface DeploymentConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rholangCode: string;
  phloLimit: string;
  phloPrice: string;
  accountName: string;
  accountAddress: string;
  isExplore?: boolean;
  fileName?: string;
  loading?: boolean;
}

export const DeploymentConfirmationModal: React.FC<DeploymentConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  rholangCode,
  phloLimit,
  phloPrice,
  accountName,
  accountAddress,
  isExplore = false,
  fileName,
  loading = false,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 12)}...${address.substring(address.length - 10)}`;
  };

  const getCodePreview = (): string => {
    if (rholangCode.length <= 300) {
      return rholangCode;
    }
    return rholangCode.substring(0, 300) + '\n\n... (truncated)';
  };

  const estimatedCost = parseInt(phloLimit) * parseInt(phloPrice);

  return (
    <Overlay onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>
          {isExplore ? 'Confirm Exploration' : 'Confirm Deployment'}
        </Title>
        <Description>
          Please review the {isExplore ? 'exploration' : 'deployment'} details before proceeding.
        </Description>
        
        {!isExplore && (
          <WarningText>
            WARNING: This deployment will consume gas and cannot be reversed once confirmed.
          </WarningText>
        )}

        <AccountInfo>
          <AccountName>Deploying from: {accountName}</AccountName>
          <AccountAddress title={accountAddress}>
            {formatAddress(accountAddress)}
          </AccountAddress>
        </AccountInfo>

        <DeploymentDetails>
          {fileName && (
            <DetailRow>
              <DetailLabel>File:</DetailLabel>
              <DetailValue>{fileName}</DetailValue>
            </DetailRow>
          )}
          
          <DetailRow>
            <DetailLabel>Code Length:</DetailLabel>
            <DetailValue>{rholangCode.length} characters</DetailValue>
          </DetailRow>
          
          {!isExplore && (
            <>
              <DetailRow>
                <DetailLabel>Phlo Limit:</DetailLabel>
                <DetailValue>{phloLimit}</DetailValue>
              </DetailRow>
              
              <DetailRow>
                <DetailLabel>Phlo Price:</DetailLabel>
                <DetailValue>{phloPrice}</DetailValue>
              </DetailRow>
              
              <DetailRow>
                <DetailLabel>Estimated Cost:</DetailLabel>
                <DetailValue>{estimatedCost} phlo</DetailValue>
              </DetailRow>
            </>
          )}
        </DeploymentDetails>

        <CodePreview>
          <CodeContent>{getCodePreview()}</CodeContent>
        </CodePreview>

        <Actions>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            {isExplore ? 'Explore Contract' : 'Deploy Contract'}
          </Button>
        </Actions>
      </Modal>
    </Overlay>
  );
};