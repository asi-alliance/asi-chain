import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { RootState } from 'store';
import { loginWithPassword } from 'store/authSlice';
import { syncAccounts } from 'store/walletSlice';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from 'components';

const LoginContainer = styled.div`
  max-width: 400px;
  margin: 100px auto;
`;

const Logo = styled.h1`
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 40px;
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const ErrorMessage = styled.div`
  background: ${({ theme }) => theme.danger};
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const ActionButtons = styled.div`
  margin-top: 24px;
`;

const LinkButton = styled(Button)`
  margin-top: 16px;
  text-align: center;
`;

export const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, hasAccounts, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Show error message
    if (error) {
      setShowError(true);
      // Hide error after 5 seconds
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogin = async () => {
    if (!password.trim()) return;

    try {
      const resultAction = await dispatch(loginWithPassword({ password }) as any);
      
      if (loginWithPassword.fulfilled.match(resultAction)) {
        // Sync accounts to wallet state
        dispatch(syncAccounts(resultAction.payload));
        navigate('/');
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.trim()) {
      handleLogin();
    }
  };

  const handleCreateAccount = () => {
    navigate('/accounts');
  };

  if (!hasAccounts) {
    return (
      <LoginContainer>
        <Logo>ASI Wallet v2</Logo>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ marginBottom: '24px', textAlign: 'center' }}>
              No accounts found. Create your first account to get started.
            </p>
            <Button onClick={handleCreateAccount} fullWidth>
              Create Account
            </Button>
          </CardContent>
        </Card>
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <Logo>ASI Wallet v2</Logo>
      <Card>
        <CardHeader>
          <CardTitle>Unlock Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          {showError && error && (
            <ErrorMessage>{error}</ErrorMessage>
          )}

          <FormGroup>
            <Input
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your password"
              autoFocus
            />
          </FormGroup>

          <ActionButtons>
            <Button
              onClick={handleLogin}
              loading={isLoading}
              disabled={!password.trim()}
              fullWidth
            >
              Unlock
            </Button>

            <LinkButton
              variant="ghost"
              onClick={handleCreateAccount}
              fullWidth
            >
              Import or Create New Account
            </LinkButton>
          </ActionButtons>
        </CardContent>
      </Card>
    </LoginContainer>
  );
};