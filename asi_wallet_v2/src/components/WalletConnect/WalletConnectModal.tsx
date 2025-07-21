import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { QRCodeCanvas } from 'qrcode.react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { pairWithUri, clearError } from '../../store/walletConnectSlice';
import { Card } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';

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
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.text};
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const Title = styled.h2`
  margin-bottom: 24px;
  text-align: center;
`;

const QRContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 32px 0;
  padding: 24px;
  background: white;
  border-radius: 12px;
`;

const Instructions = styled.p`
  text-align: center;
  margin-bottom: 24px;
  opacity: 0.8;
`;

const Divider = styled.div`
  text-align: center;
  margin: 24px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: ${props => props.theme.border};
  }

  span {
    background: ${props => props.theme.background};
    padding: 0 16px;
    position: relative;
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.error};
  text-align: center;
  margin-top: 16px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  margin-top: 16px;
  color: ${props => props.theme.primary};
`;

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { isConnecting, error } = useAppSelector(state => state.walletConnect);
  const [uri, setUri] = useState('');
  const [inputMode, setInputMode] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleConnect = async () => {
    if (uri.trim()) {
      await dispatch(pairWithUri(uri.trim()));
      if (!error) {
        onClose();
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('wc:')) {
        setUri(text);
        await dispatch(pairWithUri(text));
        if (!error) {
          onClose();
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>×</CloseButton>
        <Title>Connect to dApp</Title>

        {!inputMode ? (
          <>
            <Instructions>
              Scan this QR code with your dApp or paste the connection URI below
            </Instructions>

            <QRContainer>
              <QRCodeCanvas
                value={uri || 'wc:placeholder'}
                size={256}
                level="M"
                includeMargin={false}
              />
            </QRContainer>

            <Button onClick={handlePaste} fullWidth>
              Paste from Clipboard
            </Button>

            <Divider>
              <span>OR</span>
            </Divider>

            <Button onClick={() => setInputMode(true)} variant="secondary" fullWidth>
              Enter URI Manually
            </Button>
          </>
        ) : (
          <>
            <Instructions>
              Paste the WalletConnect URI from your dApp
            </Instructions>

            <Input
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="wc:..."
              disabled={isConnecting}
            />

            <Button
              onClick={handleConnect}
              disabled={!uri.trim() || isConnecting}
              fullWidth
              style={{ marginTop: '16px' }}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>

            <Button
              onClick={() => {
                setInputMode(false);
                setUri('');
              }}
              variant="secondary"
              fullWidth
              style={{ marginTop: '8px' }}
            >
              Back
            </Button>
          </>
        )}

        {isConnecting && <LoadingMessage>Connecting to dApp...</LoadingMessage>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </ModalContent>
    </ModalOverlay>
  );
};