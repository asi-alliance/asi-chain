import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Input, Card } from '../';
import TwoFactorAuthService from '../../services/twoFactorAuth';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  max-width: 400px;
  width: 90%;
  position: relative;
`;

const ModalHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Icon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Description = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
  font-size: 0.9rem;
`;

const FormContainer = styled.div`
  margin-bottom: 2rem;
`;

const CodeInput = styled(Input)`
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 0.3rem;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.error}15;
  color: ${props => props.theme.colors.error};
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
`;

const WarningMessage = styled.div`
  background: ${props => props.theme.colors.warning}15;
  color: ${props => props.theme.colors.warning};
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  border: 1px solid ${props => props.theme.colors.border};
  
  &:hover {
    background: ${props => props.theme.colors.background.secondary};
  }
`;

const LockoutMessage = styled.div`
  text-align: center;
  padding: 1.5rem;
  color: ${props => props.theme.colors.error};
`;

const CountdownTimer = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 0.5rem;
`;

interface TwoFactorVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  allowCancel?: boolean;
}

export const TwoFactorVerificationModal: React.FC<TwoFactorVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Two-Factor Authentication',
  description = 'Please enter your 6-digit authentication code',
  allowCancel = true
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockTime, setUnlockTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showBackupOption, setShowBackupOption] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkLockStatus();
      setCode('');
      setError(null);
      setShowBackupOption(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLocked && unlockTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const unlockTimeMs = unlockTime.getTime();
        const timeLeft = Math.max(0, unlockTimeMs - now);
        
        if (timeLeft === 0) {
          setIsLocked(false);
          setUnlockTime(null);
          setCountdown(0);
          setError(null);
        } else {
          setCountdown(Math.ceil(timeLeft / 1000));
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocked, unlockTime]);

  const checkLockStatus = async () => {
    try {
      const lockStatus = await TwoFactorAuthService.isLocked();
      setIsLocked(lockStatus.locked);
      setUnlockTime(lockStatus.unlockTime || null);
      
      if (lockStatus.locked && lockStatus.unlockTime) {
        const timeLeft = lockStatus.unlockTime.getTime() - new Date().getTime();
        setCountdown(Math.ceil(timeLeft / 1000));
      }
    } catch (error) {
      console.error('Failed to check lock status:', error);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim() || code.length < 6) {
      setError('Please enter a valid code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isValid = await TwoFactorAuthService.verifyCode(code.trim());
      
      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setError('Invalid authentication code. Please try again.');
        setCode('');
        
        // Check if account got locked
        await checkLockStatus();
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
      console.error('2FA verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !isLocked) {
      handleSubmit();
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (allowCancel && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <Icon>[2FA]</Icon>
          <Title>{title}</Title>
          <Description>{description}</Description>
        </ModalHeader>

        {isLocked ? (
          <LockoutMessage>
            <h3>Account Temporarily Locked</h3>
            <p>Too many failed attempts. Please wait before trying again.</p>
            <CountdownTimer>
              {formatCountdown(countdown)}
            </CountdownTimer>
          </LockoutMessage>
        ) : (
          <>
            <FormContainer>
              {error && (
                <ErrorMessage>
                  {error}
                </ErrorMessage>
              )}

              {!showBackupOption ? (
                <>
                  <CodeInput
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyPress={handleKeyPress}
                    placeholder="000000"
                    maxLength={6}
                    disabled={isLoading}
                    autoFocus
                  />
                  
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <SecondaryButton
                      onClick={() => setShowBackupOption(true)}
                      disabled={isLoading}
                      size="small"
                    >
                      Use backup code instead
                    </SecondaryButton>
                  </div>
                </>
              ) : (
                <>
                  <WarningMessage>
                    Enter one of your backup codes. Each code can only be used once.
                  </WarningMessage>
                  
                  <CodeInput
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                    onKeyPress={handleKeyPress}
                    placeholder="BACKUP CODE"
                    maxLength={8}
                    disabled={isLoading}
                    autoFocus
                  />
                  
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <SecondaryButton
                      onClick={() => {
                        setShowBackupOption(false);
                        setCode('');
                        setError(null);
                      }}
                      disabled={isLoading}
                      size="small"
                    >
                      Use authenticator code instead
                    </SecondaryButton>
                  </div>
                </>
              )}
            </FormContainer>

            <ButtonGroup>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || code.length < (showBackupOption ? 4 : 6)}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
              
              {allowCancel && (
                <SecondaryButton onClick={handleClose} disabled={isLoading}>
                  Cancel
                </SecondaryButton>
              )}
            </ButtonGroup>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default TwoFactorVerificationModal;