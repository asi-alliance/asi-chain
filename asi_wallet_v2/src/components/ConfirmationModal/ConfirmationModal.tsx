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
  max-width: 500px;
  width: 90%;
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

const TransactionDetails = styled.div`
  background: ${({ theme }) => theme.surface};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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
`;

const DetailValue = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.text.primary};
  font-weight: 600;
  word-break: break-all;
  text-align: right;
  max-width: 60%;
`;

const AmountValue = styled(DetailValue)`
  color: ${({ theme }) => theme.primary};
  font-size: 16px;
  font-weight: 700;
`;

const AddressValue = styled(DetailValue)`
  font-family: monospace;
  font-size: 12px;
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

interface TransactionConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  recipient: string;
  senderAddress: string;
  senderName: string;
  estimatedFee?: string;
  loading?: boolean;
}

export const TransactionConfirmationModal: React.FC<TransactionConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  recipient,
  senderAddress,
  senderName,
  estimatedFee = '0.001',
  loading = false,
}) => {
  if (!isOpen) return null;

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 12)}...${address.substring(address.length - 10)}`;
  };

  const totalAmount = (parseFloat(amount) + parseFloat(estimatedFee)).toFixed(8);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Confirm Transaction</Title>
        <Description>
          Please review the transaction details before sending.
        </Description>
        
        <WarningText>
          WARNING: This transaction cannot be reversed once sent. Please verify all details carefully.
        </WarningText>

        <TransactionDetails>
          <DetailRow>
            <DetailLabel>From Account:</DetailLabel>
            <DetailValue>{senderName}</DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>From Address:</DetailLabel>
            <AddressValue title={senderAddress}>
              {formatAddress(senderAddress)}
            </AddressValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>To Address:</DetailLabel>
            <AddressValue title={recipient}>
              {formatAddress(recipient)}
            </AddressValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>Amount:</DetailLabel>
            <AmountValue>{amount} REV</AmountValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>Estimated Fee:</DetailLabel>
            <DetailValue>{estimatedFee} REV</DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>Total Cost:</DetailLabel>
            <AmountValue>{totalAmount} REV</AmountValue>
          </DetailRow>
        </TransactionDetails>

        <Actions>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            Confirm & Send
          </Button>
        </Actions>
      </Modal>
    </Overlay>
  );
};