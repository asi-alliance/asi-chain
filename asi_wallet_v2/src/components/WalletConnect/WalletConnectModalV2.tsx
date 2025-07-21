import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import QrScanner from 'qr-scanner';
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

const TabContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px;
  background: ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? props.theme.text.inverse : props.theme.primary};
  border: 2px solid ${props => props.theme.primary};
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? props.theme.primary : props.theme.primary + '1F'};
  }
`;

const Instructions = styled.p`
  text-align: center;
  margin-bottom: 24px;
  opacity: 0.8;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto 24px;
  aspect-ratio: 1;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ScanOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 250px;
  height: 250px;
  border: 3px solid ${props => props.theme.primary};
  border-radius: 12px;
  
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 30px;
    height: 30px;
    border: 3px solid ${props => props.theme.primary};
  }
  
  &::before {
    top: -3px;
    left: -3px;
    border-right: none;
    border-bottom: none;
  }
  
  &::after {
    bottom: -3px;
    right: -3px;
    border-left: none;
    border-top: none;
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

const FileInput = styled.input`
  display: none;
`;

const FileUploadButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: transparent;
  color: ${props => props.theme.primary};
  border: 2px solid ${props => props.theme.primary};
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  
  &:hover {
    background: ${props => props.theme.primary}1F;
  }
`;

type ConnectionMode = 'scan' | 'paste';

interface WalletConnectModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletConnectModalV2: React.FC<WalletConnectModalV2Props> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { isConnecting, error, initializing, initialized } = useAppSelector(state => state.walletConnect);
  const [mode, setMode] = useState<ConnectionMode>('paste');
  const [uri, setUri] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (mode === 'scan' && isOpen && !isScanning) {
      startScanning();
    } else if (!isOpen || mode !== 'scan') {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [mode, isOpen]);

  const startScanning = async () => {
    try {
      setScanError(null);
      setIsScanning(true);

      if (videoRef.current) {
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (result.data.startsWith('wc:')) {
              handleUri(result.data);
              stopScanning();
            }
          },
          {
            highlightScanRegion: false,
            highlightCodeOutline: false,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
      }
    } catch (err: any) {
      setScanError(err.message || 'Camera access denied');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleUri = async (inputUri: string) => {
    if (inputUri.trim().startsWith('wc:')) {
      await dispatch(pairWithUri(inputUri.trim()));
      if (!error) {
        onClose();
      }
    } else {
      setScanError('Invalid WalletConnect URI');
    }
  };

  const handleConnect = async () => {
    await handleUri(uri);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('wc:')) {
        setUri(text);
        await handleUri(text);
      } else {
        setScanError('Clipboard does not contain a valid WalletConnect URI');
      }
    } catch (err) {
      setScanError('Failed to read clipboard');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const result = await QrScanner.scanImage(file);
        if (result.startsWith('wc:')) {
          await handleUri(result);
        } else {
          setScanError('QR code does not contain a valid WalletConnect URI');
        }
      } catch (err) {
        setScanError('Failed to scan QR code from image');
      }
    }
  };

  const handleClose = () => {
    stopScanning();
    setUri('');
    setScanError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={handleClose}>×</CloseButton>
        <Title>Connect to dApp</Title>

        <TabContainer>
          <Tab active={mode === 'paste'} onClick={() => setMode('paste')}>
            Paste URI
          </Tab>
          <Tab active={mode === 'scan'} onClick={() => setMode('scan')}>
            Scan QR Code
          </Tab>
        </TabContainer>

        {mode === 'paste' ? (
          <>
            <Instructions>
              Paste the WalletConnect URI from your dApp
            </Instructions>

            <Input
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="wc:..."
              disabled={isConnecting || initializing}
            />

            <Button
              onClick={handlePaste}
              variant="secondary"
              fullWidth style={{ marginBottom: '12px' }}
              disabled={isConnecting || initializing}
            >
              Paste from Clipboard
            </Button>

            <Button
              onClick={handleConnect}
              disabled={!uri.trim() || isConnecting || initializing}
              fullWidth
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </>
        ) : (
          <>
            <Instructions>
              Scan the QR code displayed by your dApp
            </Instructions>

            {!scanError && (
              <VideoContainer>
                <Video ref={videoRef} />
                {isScanning && <ScanOverlay />}
              </VideoContainer>
            )}

            <FileInput
              ref={fileInputRef}
              id="qr-file-input"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
            />
            <FileUploadButton onClick={() => fileInputRef.current?.click()}>
              Upload QR Code Image
            </FileUploadButton>

            {scanError && (
              <Button onClick={startScanning} variant="secondary" fullWidth style={{ marginTop: '12px' }}>
                Try Again
              </Button>
            )}
          </>
        )}

        {isConnecting && <LoadingMessage>Connecting to dApp...</LoadingMessage>}
        {initializing && <LoadingMessage>Initializing WalletConnect service...</LoadingMessage>}
        {(error || scanError) && <ErrorMessage>{error || scanError}</ErrorMessage>}
      </ModalContent>
    </ModalOverlay>
  );
};