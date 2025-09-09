import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { SuccessIcon } from 'components/Icons';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Button, Input, Card } from '../';
import TwoFactorAuthService, { TwoFactorSecret } from '../../services/twoFactorAuth';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
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

const Step = styled.div<{ isActive: boolean }>`
  opacity: ${props => props.isActive ? 1 : 0.5};
  pointer-events: ${props => props.isActive ? 'auto' : 'none'};
  margin-bottom: 2rem;
`;

const StepNumber = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: bold;
  margin-right: 1rem;
`;

const StepTitle = styled.h3`
  display: inline-block;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const StepContent = styled.div`
  margin-left: 3rem;
  margin-top: 1rem;
`;

const QRContainer = styled.div`
  text-align: center;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  margin: 1rem 0;
  border: 1px solid ${props => props.theme.colors.border};
`;

const ManualEntry = styled.div`
  background: ${props => props.theme.colors.background.secondary};
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  font-family: monospace;
  word-break: break-all;
  font-size: 0.9rem;
`;

const BackupCodesContainer = styled.div`
  background: ${props => props.theme.colors.background.secondary};
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
  border: 2px solid ${props => props.theme.colors.warning};
`;

const BackupCodesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;
`;

const BackupCode = styled.div`
  background: ${props => props.theme.colors.background.primary};
  padding: 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  text-align: center;
  border: 1px solid ${props => props.theme.colors.border};
`;

const WarningMessage = styled.div`
  background: ${props => props.theme.colors.warning}15;
  color: ${props => props.theme.colors.warning};
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  font-size: 0.9rem;
`;

const SuccessMessage = styled.div`
  background: ${props => props.theme.colors.success}15;
  color: ${props => props.theme.colors.success};
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.error}15;
  color: ${props => props.theme.colors.error};
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const CopyButton = styled(Button)`
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
`;

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userIdentifier: string;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userIdentifier
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [secret, setSecret] = useState<TwoFactorSecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Generate new secret when modal opens
      const newSecret = TwoFactorAuthService.generateSecret(userIdentifier);
      setSecret(newSecret);
      setCurrentStep(1);
      setVerificationCode('');
      setBackupCodes([]);
      setError(null);
      setIsComplete(false);
    }
  }, [isOpen, userIdentifier]);

  const handleVerifyAndEnable = async () => {
    if (!secret || !verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await TwoFactorAuthService.enable2FA(
        secret.secret,
        verificationCode.trim()
      );

      if (result.success && result.backupCodes) {
        setBackupCodes(result.backupCodes);
        setCurrentStep(3);
      } else {
        setError(result.error || 'Failed to enable 2FA');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    setIsComplete(true);
    onSuccess();
    onClose();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const copyAllBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    copyToClipboard(codesText);
  };

  if (!isOpen || !secret) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>Enable Two-Factor Authentication</h2>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        {/* Step 1: Scan QR Code */}
        <Step isActive={currentStep === 1}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <StepNumber>1</StepNumber>
            <StepTitle>Scan QR Code</StepTitle>
          </div>
          <StepContent>
            <p>Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:</p>
            
            <QRContainer>
              <QRCode 
                value={secret.qrCodeUrl} 
                size={200}
                level="M"
                includeMargin={true}
              />
            </QRContainer>

            <p>Can't scan the QR code? Enter this key manually in your authenticator app:</p>
            <ManualEntry>
              {secret.manualEntryKey}
              <div style={{ marginTop: '0.5rem' }}>
                <CopyButton 
                  size="small" 
                  variant="secondary"
                  onClick={() => copyToClipboard(secret.manualEntryKey)}
                >
                  Copy Key
                </CopyButton>
              </div>
            </ManualEntry>

            <ButtonGroup>
              <Button onClick={() => setCurrentStep(2)}>
                I've Added This Account
              </Button>
            </ButtonGroup>
          </StepContent>
        </Step>

        {/* Step 2: Verify Setup */}
        <Step isActive={currentStep === 2}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <StepNumber>2</StepNumber>
            <StepTitle>Verify Setup</StepTitle>
          </div>
          <StepContent>
            <p>Enter the 6-digit code from your authenticator app to verify the setup:</p>
            
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2rem' }}
              maxLength={6}
            />

            <ButtonGroup>
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleVerifyAndEnable}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </ButtonGroup>
          </StepContent>
        </Step>

        {/* Step 3: Backup Codes */}
        <Step isActive={currentStep === 3}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <StepNumber>3</StepNumber>
            <StepTitle>Save Backup Codes</StepTitle>
          </div>
          <StepContent>
            <WarningMessage>
              <strong>Important:</strong> Save these backup codes in a secure location. 
              You can use them to access your account if you lose your authenticator device.
              Each code can only be used once.
            </WarningMessage>

            <BackupCodesContainer>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <strong>Backup Codes</strong>
                <CopyButton 
                  variant="secondary" 
                  size="small"
                  onClick={copyAllBackupCodes}
                >
                  Copy All
                </CopyButton>
              </div>
              <BackupCodesGrid>
                {backupCodes.map((code, index) => (
                  <BackupCode key={index}>
                    {code}
                  </BackupCode>
                ))}
              </BackupCodesGrid>
            </BackupCodesContainer>

            <SuccessMessage>
              <SuccessIcon size={20} />
              <span>Two-Factor Authentication has been successfully enabled!</span>
            </SuccessMessage>

            <ButtonGroup>
              <Button onClick={handleComplete}>
                I've Saved My Backup Codes
              </Button>
            </ButtonGroup>
          </StepContent>
        </Step>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TwoFactorSetupModal;