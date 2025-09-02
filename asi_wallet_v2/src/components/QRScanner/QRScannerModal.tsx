import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import jsQR from 'jsqr';
import { Button, Card } from '../';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  max-width: 500px;
  width: 90%;
  position: relative;
  background: ${props => props.theme.colors.background.primary};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.text.secondary};
  padding: 0.25rem;
  
  &:hover {
    color: ${props => props.theme.colors.text.primary};
  }
`;

const ScannerContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto 1.5rem;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
`;

const VideoElement = styled.video`
  width: 100%;
  height: auto;
  display: block;
`;

const CanvasElement = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const ScanOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    height: 60%;
    border: 2px solid ${props => props.theme.colors.primary};
    border-radius: 8px;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { 
      opacity: 0.8;
      transform: translate(-50%, -50%) scale(1);
    }
    50% { 
      opacity: 0.4;
      transform: translate(-50%, -50%) scale(1.05);
    }
  }
`;

const StatusMessage = styled.div<{ type: 'info' | 'error' | 'success' }>`
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1rem;
  background: ${props => {
    switch (props.type) {
      case 'error':
        return props.theme.colors.error + '15';
      case 'success':
        return props.theme.colors.success + '15';
      default:
        return props.theme.colors.primary + '15';
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'error':
        return props.theme.colors.error;
      case 'success':
        return props.theme.colors.success;
      default:
        return props.theme.colors.primary;
    }
  }};
`;

const PermissionRequest = styled.div`
  text-align: center;
  padding: 2rem 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.colors.background.secondary};
  color: ${props => props.theme.colors.text.primary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary}15;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ResultContainer = styled.div`
  background: ${props => props.theme.colors.background.secondary};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const ResultLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 0.5rem;
`;

const ResultValue = styled.div`
  font-family: monospace;
  font-size: 0.9rem;
  word-break: break-all;
  color: ${props => props.theme.colors.text.primary};
  background: ${props => props.theme.colors.background.primary};
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
`;

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
  title?: string;
  description?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan QR Code',
  description = 'Position the QR code within the scanning area'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const scanningRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isOpen, selectedDeviceId]);

  const initializeCamera = async () => {
    setError(null);
    setHasPermission(null);

    try {
      // Get available video devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 640 },
          height: { ideal: 480 },
          ...(selectedDeviceId && { deviceId: selectedDeviceId })
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        startScanning();
      }
    } catch (err) {
      console.error('Camera initialization failed:', err);
      setHasPermission(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError('Failed to access camera: ' + err.message);
        }
      } else {
        setError('Failed to access camera. Please check your permissions and try again.');
      }
    }
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;

    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode && qrCode.data) {
          setScannedData(qrCode.data);
          setIsScanning(false);
          
          // Draw detection overlay
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(
            qrCode.location.topLeftCorner.x,
            qrCode.location.topLeftCorner.y,
            qrCode.location.bottomRightCorner.x - qrCode.location.topLeftCorner.x,
            qrCode.location.bottomRightCorner.y - qrCode.location.topLeftCorner.y
          );
          
          return;
        }
      }

      if (isScanning) {
        scanningRef.current = requestAnimationFrame(scan);
      }
    };

    scanningRef.current = requestAnimationFrame(scan);
  };

  const cleanup = () => {
    if (scanningRef.current) {
      cancelAnimationFrame(scanningRef.current);
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsScanning(false);
    setScannedData(null);
    setError(null);
    setHasPermission(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (qrCode && qrCode.data) {
            setScannedData(qrCode.data);
          } else {
            setError('No QR code found in the uploaded image.');
          }
        }
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  };

  const handleUseScannedData = () => {
    if (scannedData) {
      onScanSuccess(scannedData);
      onClose();
    }
  };

  const handleRetry = () => {
    setScannedData(null);
    setError(null);
    if (hasPermission) {
      startScanning();
    } else {
      initializeCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3>{title}</h3>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {description && (
          <StatusMessage type="info">
            {description}
          </StatusMessage>
        )}

        {error && (
          <StatusMessage type="error">
            {error}
          </StatusMessage>
        )}

        {scannedData && (
          <>
            <StatusMessage type="success">
              QR code detected successfully!
            </StatusMessage>
            <ResultContainer>
              <ResultLabel>Scanned Data:</ResultLabel>
              <ResultValue>{scannedData}</ResultValue>
            </ResultContainer>
            <ButtonGroup>
              <Button variant="secondary" onClick={handleRetry}>
                Scan Another
              </Button>
              <Button onClick={handleUseScannedData}>
                Use This Data
              </Button>
            </ButtonGroup>
          </>
        )}

        {!scannedData && hasPermission === null && (
          <PermissionRequest>
            <p>Requesting camera permission...</p>
          </PermissionRequest>
        )}

        {!scannedData && hasPermission === false && (
          <PermissionRequest>
            <p>Camera access is required to scan QR codes.</p>
            <ButtonGroup>
              <Button onClick={initializeCamera}>
                Try Again
              </Button>
              <FileInputLabel>
                Upload Image
                <FileInput
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </FileInputLabel>
            </ButtonGroup>
          </PermissionRequest>
        )}

        {!scannedData && hasPermission === true && (
          <>
            <ScannerContainer>
              <VideoElement ref={videoRef} />
              <CanvasElement ref={canvasRef} />
              <ScanOverlay />
            </ScannerContainer>

            {devices.length > 1 && (
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                >
                  <option value="">Select Camera</option>
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <ButtonGroup>
              <FileInputLabel>
                Upload Image
                <FileInput
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </FileInputLabel>
            </ButtonGroup>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default QRScannerModal;