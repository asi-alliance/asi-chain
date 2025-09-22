import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { RootState } from 'store';
import { selectAccount, removeAccount, syncAccounts, fetchBalance } from 'store/walletSlice';
import { createAccountWithPassword, importAccountWithPassword, exportAccountKeyfile } from 'store/authSlice';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, PrivateKeyDisplay } from 'components';
import { PasswordSetup } from 'components/PasswordSetup';
import { SecureStorage } from 'services/secureStorage';
import { validateAccountName } from 'utils/textUtils';
import { formatBalanceCard } from 'utils/balanceUtils';

const AccountsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const AccountsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const AccountCard = styled(Card)<{ isSelected: boolean }>`
  border: 2px solid ${({ isSelected, theme }) => (isSelected ? theme.primary : theme.border)};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.primary};
    transform: translateY(-2px);
  }
`;

const AccountHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const AccountName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin: 0;
`;

const AccountBalance = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primary};
`;

const AccountAddress = styled.div`
  font-family: monospace;
  font-size: 12px;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 16px;
  word-break: break-all;
`;

const AccountActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const CreateAccountSection = styled.div`
  margin-bottom: 32px;
`;

const ImportAccountSection = styled.div`
  margin-bottom: 32px;
`;

const FormContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ImportTypeSelector = styled.select`
  padding: 12px 16px;
  border: 2px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text.primary};
  font-size: 16px;
  margin-bottom: 16px;
  width: 100%;
`;

const WarningMessage = styled.div`
  background: ${({ theme }) => `${theme.warning}20`};
  border: 1px solid ${({ theme }) => `${theme.warning}40`};
  color: ${({ theme }) => theme.warning};
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  .icon {
    font-size: 16px;
  }
`;

export const Accounts: React.FC = () => {
  const dispatch = useDispatch();
  const { accounts, selectedAccount, selectedNetwork, isLoading } = useSelector((state: RootState) => state.wallet);
  const { unlockedAccounts, isAuthenticated, hasAccounts } = useSelector((state: RootState) => state.auth);

  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [pendingAccountName, setPendingAccountName] = useState('');
  const [pendingPrivateKey, setPendingPrivateKey] = useState('');
  const [pendingImport, setPendingImport] = useState<{
    name: string;
    value: string;
    type: 'private' | 'public' | 'eth' | 'rev';
  } | null>(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [importName, setImportName] = useState('');
  const [importValue, setImportValue] = useState('');
  const [importType, setImportType] = useState<'private' | 'public' | 'eth' | 'rev'>('private');
  const [newAccountNameError, setNewAccountNameError] = useState('');
  const [importNameError, setImportNameError] = useState('');

  useEffect(() => {
    if (unlockedAccounts.length > 0) {
      dispatch(syncAccounts(unlockedAccounts));
    }
  }, [unlockedAccounts, dispatch]);

  useEffect(() => {
    if (accounts.length > 0 && selectedNetwork) {
      accounts.forEach(account => {
        dispatch(fetchBalance({ account, network: selectedNetwork }) as any);
      });
    }
  }, [accounts, selectedNetwork, dispatch]);

  useEffect(() => {
    if (accounts.length > 0 && selectedNetwork) {
      const interval = setInterval(() => {
        accounts.forEach(account => {
          dispatch(fetchBalance({ account, network: selectedNetwork }) as any);
        });
      }, 30000); 
      return () => clearInterval(interval);
    }
  }, [accounts, selectedNetwork, dispatch]);

  const handleRefreshBalances = () => {
    if (accounts.length > 0 && selectedNetwork) {
      accounts.forEach(account => {
        dispatch(fetchBalance({ account, network: selectedNetwork }) as any);
      });
    }
  };

  const handleCreateAccount = () => {
    const trimmedName = newAccountName.trim();
    const validation = validateAccountName(trimmedName);
    
    if (!validation.isValid) {
      setNewAccountNameError(validation.error || 'Invalid account name');
      return;
    }
    
    setNewAccountNameError('');
    setPendingAccountName(trimmedName);
    setShowPasswordSetup(true);
  };

  const handlePasswordSet = async (password: string) => {
    if (pendingAccountName) {
      const resultAction = await dispatch(createAccountWithPassword({ 
        name: pendingAccountName, 
        password 
      }) as any);
      
      if (createAccountWithPassword.fulfilled.match(resultAction)) {
        setPendingPrivateKey(resultAction.payload.account.privateKey || '');
        setShowPasswordSetup(false);
        setShowPrivateKey(true);
      }
    } else if (pendingImport) {
      const resultAction = await dispatch(importAccountWithPassword({
        ...pendingImport,
        password
      }) as any);
      
      if (importAccountWithPassword.fulfilled.match(resultAction)) {
        dispatch(syncAccounts([resultAction.payload.account]));
      }
      
      setImportName('');
      setImportValue('');
      setPendingImport(null);
      setShowImportPassword(false);
    }
  };

  const handlePrivateKeyAcknowledged = () => {
    dispatch(syncAccounts(SecureStorage.getEncryptedAccounts().map(acc => ({
      ...acc,
      privateKey: undefined, 
    }))));
    
    setNewAccountName('');
    setPendingAccountName('');
    setPendingPrivateKey('');
    setShowPrivateKey(false);
  };

  const handleImportAccount = () => {
    const trimmedName = importName.trim();
    const trimmedValue = importValue.trim();
    
    if (!trimmedName || !trimmedValue) {
      return;
    }
    
    const validation = validateAccountName(trimmedName);
    if (!validation.isValid) {
      setImportNameError(validation.error || 'Invalid account name');
      return;
    }
    
    setImportNameError('');
    
    if (importType === 'private') {
      setPendingImport({
        name: trimmedName,
        value: trimmedValue,
        type: importType
      });
      setShowImportPassword(true);
    } else {
      dispatch(importAccountWithPassword({
        name: trimmedName,
        value: trimmedValue,
        type: importType,
        password: '' 
      }) as any).then((resultAction: any) => {
        if (importAccountWithPassword.fulfilled.match(resultAction)) {
          dispatch(syncAccounts([resultAction.payload.account]));
        }
      });
      setImportName('');
      setImportValue('');
    }
  };

  const handleSelectAccount = (accountId: string) => {
    dispatch(selectAccount(accountId));
  };

  const handleRemoveAccount = (accountId: string) => {
    if (window.confirm('Are you sure you want to remove this account?')) {
      dispatch(removeAccount(accountId));
    }
  };

  const handleExportKeyfile = (accountId: string) => {
    dispatch(exportAccountKeyfile({ accountId }) as any);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const getImportPlaceholder = () => {
    switch (importType) {
      case 'private':
        return 'Enter private key (64 hex characters)';
      case 'public':
        return 'Enter public key (130 hex characters)';
      case 'eth':
        return 'Enter Ethereum address (0x...)';
      case 'rev':
        return 'Enter REV address';
      default:
        return 'Enter value';
    }
  };

  if (showPasswordSetup) {
    return (
      <AccountsContainer>
        <Card>
          <CardContent>
            <PasswordSetup
              title="Set Password for New Account"
              onPasswordSet={handlePasswordSet}
              onCancel={() => {
                setShowPasswordSetup(false);
                setPendingAccountName('');
              }}
            />
          </CardContent>
        </Card>
      </AccountsContainer>
    );
  }

  if (showPrivateKey) {
    return (
      <AccountsContainer>
        <PrivateKeyDisplay
          privateKey={pendingPrivateKey}
          accountName={pendingAccountName}
          onContinue={handlePrivateKeyAcknowledged}
          onBack={() => {
            setShowPrivateKey(false);
            setShowPasswordSetup(true);
          }}
          showBackButton={true}
        />
      </AccountsContainer>
    );
  }

  if (showImportPassword) {
    return (
      <AccountsContainer>
        <Card>
          <CardContent>
            <PasswordSetup
              title="Set Password for Imported Account"
              onPasswordSet={handlePasswordSet}
              onCancel={() => {
                setShowImportPassword(false);
                setPendingImport(null);
              }}
            />
          </CardContent>
        </Card>
      </AccountsContainer>
    );
  }

  return (
    <AccountsContainer>
      <FormContainer>
        <CreateAccountSection>
          <Card>
            <CardHeader>
              <CardTitle>Create New Account</CardTitle>
            </CardHeader>
            <CardContent>
              {hasAccounts && !isAuthenticated && (
                <WarningMessage>
                  <span className="icon">⚠️</span>
                  <span>
                    You have existing accounts. Creating a new account will not automatically log you in. 
                    You'll need to unlock your existing accounts with your password.
                  </span>
                </WarningMessage>
              )}
              <Input
                label="Account Name"
                value={newAccountName}
                onChange={(e) => {
                  setNewAccountName(e.target.value);
                  if (newAccountNameError) {
                    setNewAccountNameError('');
                  }
                }}
                placeholder="Enter account name (max 30 characters)"
                error={newAccountNameError}
                maxLength={30}
              />
              <Button
                onClick={handleCreateAccount}
                disabled={!newAccountName.trim()}
                fullWidth
              >
                Create Account
              </Button>
            </CardContent>
          </Card>
        </CreateAccountSection>

        <ImportAccountSection>
          <Card>
            <CardHeader>
              <CardTitle>Import Account</CardTitle>
            </CardHeader>
            <CardContent>
              {hasAccounts && !isAuthenticated && (
                <WarningMessage>
                  <span className="icon">⚠️</span>
                  <span>
                    You have existing accounts. Importing a new account will not automatically log you in. 
                    You'll need to unlock your existing accounts with your password.
                  </span>
                </WarningMessage>
              )}
              <Input
                label="Account Name"
                value={importName}
                onChange={(e) => {
                  setImportName(e.target.value);
                  if (importNameError) {
                    setImportNameError('');
                  }
                }}
                placeholder="Enter account name (max 30 characters)"
                error={importNameError}
                maxLength={30}
              />
              
              <ImportTypeSelector
                value={importType}
                onChange={(e) => setImportType(e.target.value as any)}
              >
                <option value="private">Private Key</option>
                <option value="eth">Ethereum Address (Watch Only)</option>
                <option value="rev">REV Address (Watch Only)</option>
              </ImportTypeSelector>

              <Input
                label="Value"
                value={importValue}
                onChange={(e) => setImportValue(e.target.value)}
                placeholder={getImportPlaceholder()}
                type={importType === 'private' ? 'password' : 'text'}
              />
              
              <Button
                onClick={handleImportAccount}
                disabled={!importName.trim() || !importValue.trim()}
                fullWidth
              >
                Import Account
              </Button>
            </CardContent>
          </Card>
        </ImportAccountSection>
      </FormContainer>

      <Card>
        <CardHeader>
          <CardTitle>Your Accounts ({accounts.length})</CardTitle>
          <Button
            variant="ghost"
            size="small"
            onClick={handleRefreshBalances}
            loading={isLoading}
          >
            Refresh Balances
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p>No accounts found. Create or import an account to get started.</p>
          ) : (
            <AccountsGrid>
              {accounts.map((account) => {
                const isUnlocked = unlockedAccounts.some(a => a.id === account.id);
                return (
                  <AccountCard
                    key={account.id}
                    isSelected={selectedAccount?.id === account.id}
                    onClick={() => handleSelectAccount(account.id)}
                  >
                    <AccountHeader>
                      <AccountName>{account.name}</AccountName>
                      <AccountBalance>{formatBalanceCard(account.balance)}</AccountBalance>
                    </AccountHeader>
                    
                    <AccountAddress>
                      {formatAddress(account.revAddress)}
                    </AccountAddress>
                    
                    <AccountActions>
                      {selectedAccount?.id === account.id && (
                        <span style={{ fontSize: '12px', color: '#7ED321', fontWeight: '600' }}>
                          SELECTED
                        </span>
                      )}
                      {isUnlocked && (
                        <span style={{ fontSize: '12px', color: '#4A90E2', fontWeight: '600', marginLeft: '8px' }}>
                          UNLOCKED
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportKeyfile(account.id);
                        }}
                      >
                        Export
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAccount(account.id);
                        }}
                      >
                        Remove
                      </Button>
                    </AccountActions>
                  </AccountCard>
                );
              })}
            </AccountsGrid>
          )}
        </CardContent>
      </Card>
    </AccountsContainer>
  );
};