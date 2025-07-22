import React, { useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { respondToRequest, rejectRequest, removeSessionRequest } from '../../store/walletConnectSlice';
import { sendTransaction, fetchBalance } from '../../store/walletSlice';
import { Card } from '../Card';
import { Button } from '../Button';
import { SignRequest } from '../../services/walletConnect';
import { RChainService } from '../../services/rchain';

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
  z-index: 1002;
`;

const ModalContent = styled(Card)`
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  margin-bottom: 8px;
`;

const DAppName = styled.p`
  color: ${props => props.theme.textSecondary};
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 8px;
`;

const Value = styled.div`
  padding: 12px;
  background: ${props => props.theme.background};
  border-radius: 8px;
  word-break: break-all;
  font-family: monospace;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.error};
  text-align: center;
  margin-top: 16px;
`;

const WarningBox = styled.div`
  background: ${props => props.theme.warning}20;
  border: 1px solid ${props => props.theme.warning};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: center;
`;

interface TransactionApprovalModalProps {
  request: SignRequest | null;
  onClose: () => void;
}

export const TransactionApprovalModal: React.FC<TransactionApprovalModalProps> = ({ request, onClose }) => {
  const dispatch = useAppDispatch();
  const { connectedDapps } = useAppSelector(state => state.walletConnect);
  const { selectedAccount, selectedNetwork } = useAppSelector(state => state.wallet);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const dapp = connectedDapps[request.topic];
  const { method, params } = request.params.request;

  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      let result;

      switch (method) {
        case 'rchain_sendTransaction':
          // Process the transaction
          const txParams = params[0];
          // For now, we'll need to handle RChain transactions differently
          // This is a placeholder - actual implementation would need RChain-specific logic
          const txResult = await dispatch(sendTransaction({
            from: selectedAccount!,
            to: txParams.to,
            amount: txParams.amount,
            network: selectedNetwork!,
            password: undefined // Would need to prompt for password if required
          } as any)).unwrap();
          result = txResult;
          break;

        case 'rchain_signMessage':
          // Sign message logic would go here
          result = { signature: 'mock_signature' };
          break;

        case 'rchain_getBalance':
          // Get balance logic
          if (!selectedAccount || !selectedAccount.revAddress) {
            throw new Error('No account selected or invalid address');
          }
          
          try {
            // Fetch the actual balance
            const balanceResult = await dispatch(fetchBalance({ 
              account: selectedAccount, 
              network: selectedNetwork! 
            })).unwrap();
            
            // Return balance in the expected format
            result = { 
              balance: balanceResult.balance || '0',
              address: selectedAccount.revAddress 
            };
          } catch (balanceError: any) {
            console.error('Balance check error:', balanceError);
            // If balance check fails, return a more informative error
            result = { 
              error: balanceError.message || 'Failed to fetch balance',
              address: selectedAccount.revAddress 
            };
          }
          break;

        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      await dispatch(respondToRequest({
        topic: request.topic,
        id: request.id,
        response: result
      }));

      dispatch(removeSessionRequest(request.id));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    await dispatch(rejectRequest({
      topic: request.topic,
      id: request.id,
      message: 'User rejected the request'
    }));
    dispatch(removeSessionRequest(request.id));
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Transaction Request</Title>
          {dapp && <DAppName>from {dapp.name}</DAppName>}
        </Header>

        <Section>
          <Label>Method</Label>
          <Value>{method}</Value>
        </Section>

        <Section>
          <Label>Chain</Label>
          <Value>{request.params.chainId}</Value>
        </Section>

        {method === 'rchain_sendTransaction' && params[0] && (
          <>
            {params[0].to && (
              <Section>
                <Label>To</Label>
                <Value>{params[0].to}</Value>
              </Section>
            )}
            {params[0].amount && (
              <Section>
                <Label>Amount</Label>
                <Value>{params[0].amount} REV</Value>
              </Section>
            )}
            {params[0].deploy && (
              <Section>
                <Label>Deploy Code</Label>
                <Value>{params[0].deploy}</Value>
              </Section>
            )}
          </>
        )}

        {method === 'rchain_signMessage' && params[0] && (
          <Section>
            <Label>Message</Label>
            <Value>{params[0]}</Value>
          </Section>
        )}

        <WarningBox>
          Please review the transaction details carefully before approving
        </WarningBox>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonGroup>
          <Button 
            onClick={handleReject} 
            variant="secondary" 
            fullWidth
            disabled={isProcessing}
          >
            Reject
          </Button>
          <Button 
            onClick={handleApprove} 
            fullWidth
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Approve'}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};