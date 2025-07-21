import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { validatePassword, PasswordValidation } from 'utils/encryption';
import { Input, Button } from 'components';

const Container = styled.div`
  max-width: 400px;
  margin: 0 auto;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 24px;
`;

const ValidationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0;
`;

const ValidationItem = styled.li<{ valid: boolean }>`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: ${({ valid, theme }) => (valid ? theme.success : theme.text.secondary)};
  font-size: 14px;

  &:before {
    content: ${({ valid }) => (valid ? '"✓"' : '"○"')};
    margin-right: 8px;
    font-weight: bold;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.danger};
  font-size: 14px;
  margin-top: 8px;
`;

const ButtonContainer = styled.div`
  margin-top: 24px;
`;

interface PasswordSetupProps {
  onPasswordSet: (password: string) => void;
  onCancel?: () => void;
  title?: string;
  submitLabel?: string;
}

export const PasswordSetup: React.FC<PasswordSetupProps> = ({
  onPasswordSet,
  onCancel,
  title = 'Set Password',
  submitLabel = 'Continue'
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validation, setValidation] = useState<PasswordValidation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (password) {
      setValidation(validatePassword(password));
    } else {
      setValidation(null);
    }
  }, [password]);

  const handleSubmit = () => {
    setError('');

    if (!validation?.isValid) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    onPasswordSet(password);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validation?.isValid && password === confirmPassword) {
      handleSubmit();
    }
  };

  return (
    <Container>
      <Title>{title}</Title>
      
      <Input
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
        onKeyPress={handleKeyPress}
      />

      {validation && (
        <ValidationList>
          <ValidationItem valid={validation.minLength}>
            At least 8 characters
          </ValidationItem>
          <ValidationItem valid={validation.hasUpperCase}>
            One uppercase letter
          </ValidationItem>
          <ValidationItem valid={validation.hasLowerCase}>
            One lowercase letter
          </ValidationItem>
          <ValidationItem valid={validation.hasDigit}>
            One number
          </ValidationItem>
          <ValidationItem valid={validation.hasSpecialChar}>
            One special character
          </ValidationItem>
        </ValidationList>
      )}

      <Input
        type="password"
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        onKeyPress={handleKeyPress}
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ButtonContainer>
        <Button
          onClick={handleSubmit}
          disabled={!validation?.isValid || password !== confirmPassword}
          fullWidth
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            fullWidth
            style={{ marginTop: '8px' }}
          >
            Cancel
          </Button>
        )}
      </ButtonContainer>
    </Container>
  );
};