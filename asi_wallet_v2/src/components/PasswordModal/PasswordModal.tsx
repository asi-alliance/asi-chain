import React, { useState } from 'react';
import styled from 'styled-components';
import { Input, Button } from 'components';

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
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 16px;
`;

const Description = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 24px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.danger};
  font-size: 14px;
  margin-top: 8px;
`;

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title?: string;
  description?: string;
  loading?: boolean;
  error?: string;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Enter Password',
  description = 'Please enter your password to continue.',
  loading = false,
  error,
}) => {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!password.trim()) {
      setLocalError('Password is required');
      return;
    }
    setLocalError('');
    onConfirm(password);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.trim()) {
      handleConfirm();
    }
  };

  const handleClose = () => {
    setPassword('');
    setLocalError('');
    onClose();
  };

  return (
    <Overlay onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>{title}</Title>
        <Description>{description}</Description>
        
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter password"
          autoFocus
        />

        {(error || localError) && (
          <ErrorMessage>{error || localError}</ErrorMessage>
        )}

        <Actions>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={loading}>
            Confirm
          </Button>
        </Actions>
      </Modal>
    </Overlay>
  );
};