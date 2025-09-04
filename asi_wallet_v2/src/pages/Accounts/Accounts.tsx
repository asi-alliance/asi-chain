import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { RootState } from 'store';
import { selectAccount, removeAccount, syncAccounts, fetchBalance, loadAccountsFromStorage } from 'store/walletSlice';
import { createAccountWithPassword, importAccountWithPassword, exportAccountKeyfile } from 'store/authSlice';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from 'components';
import { PasswordSetup } from 'components/PasswordSetup';
import { WarningIcon } from 'components/Icons';

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

const AddressContainer = styled.div`
    margin-bottom: 12px;
`;

const AddressRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
`;

const AddressLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.text.tertiary};
    min-width: 40px;
`;

const AddressValue = styled.span`
    font-family: monospace;
    font-size: 11px;
    color: ${({ theme }) => theme.text.secondary};
    flex: 1;
    word-break: break-all;
`;

const CopyButton = styled.button`
    padding: 4px 8px;
    background: ${({ theme }) => theme.primary};
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
        opacity: 0.9;
    }

    &:active {
        transform: scale(0.98);
    }
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
  align-items: flex-start;
  gap: 8px;
  
  .icon {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

export const Accounts: React.FC = () => {
  const dispatch = useDispatch();
  const { accounts, selectedAccount, selectedNetwork, isLoading } = useSelector((state: RootState) => state.wallet);
  const { unlockedAccounts, isAuthenticated, hasAccounts } = useSelector((state: RootState) => state.auth);

  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [pendingAccountName, setPendingAccountName] = useState('');
  const [pendingImport, setPendingImport] = useState<{
    name: string;
    value: string;
    type: 'private' | 'public' | 'eth' | 'rev';
  } | null>(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [importName, setImportName] = useState('');
  const [importValue, setImportValue] = useState('');
  const [importType, setImportType] = useState<'private' | 'public' | 'eth' | 'rev'>('private');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Load all accounts from storage on mount
  useEffect(() => {
    dispatch(loadAccountsFromStorage() as any);
  }, [dispatch]);

  // Sync unlocked accounts to wallet state (update existing accounts with unlocked data)
  useEffect(() => {
    if (unlockedAccounts.length > 0) {
      dispatch(syncAccounts(unlockedAccounts));
    }
  }, [unlockedAccounts, dispatch]);

  // Fetch balances for all accounts when component mounts or accounts/network changes
  useEffect(() => {
    if (accounts.length > 0 && selectedNetwork) {
      accounts.forEach(account => {
        dispatch(fetchBalance({ account, network: selectedNetwork }) as any);
      });
    }
  }, [accounts, selectedNetwork, dispatch]);

  // Auto-refresh balances every 30 seconds
  useEffect(() => {
    if (accounts.length > 0 && selectedNetwork) {
      const interval = setInterval(() => {
        accounts.forEach(account => {
          dispatch(fetchBalance({ account, network: selectedNetwork }) as any);
        });
      }, 30000); // 30 seconds

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
    if (newAccountName.trim()) {
      setPendingAccountName(newAccountName.trim());
      setShowPasswordSetup(true);
    }
  };

  const handlePasswordSet = async (password: string) => {
    if (pendingAccountName) {
      const resultAction = await dispatch(createAccountWithPassword({
        name: pendingAccountName,
        password
      }) as any);

      if (createAccountWithPassword.fulfilled.match(resultAction)) {
        // Sync the new account to wallet state
        dispatch(syncAccounts([resultAction.payload.account]));
      }

      setNewAccountName('');
      setPendingAccountName('');
      setShowPasswordSetup(false);
    } else if (pendingImport) {
      const resultAction = await dispatch(importAccountWithPassword({
        ...pendingImport,
        password
      }) as any);

      if (importAccountWithPassword.fulfilled.match(resultAction)) {
        // Sync the new account to wallet state
        dispatch(syncAccounts([resultAction.payload.account]));
      }

      setImportName('');
      setImportValue('');
      setPendingImport(null);
      setShowImportPassword(false);
    }
  };

  const handleImportAccount = () => {
    if (importName.trim() && importValue.trim()) {
      // Only private key imports need password
      if (importType === 'private') {
        setPendingImport({
          name: importName.trim(),
          value: importValue.trim(),
          type: importType
        });
        setShowImportPassword(true);
      } else {
        // For other types, we can't encrypt without private key
        dispatch(importAccountWithPassword({
          name: importName.trim(),
          value: importValue.trim(),
          type: importType,
          password: '' // No password needed for watch-only accounts
        }) as any).then((resultAction: any) => {
          if (importAccountWithPassword.fulfilled.match(resultAction)) {
            // Sync the new account to wallet state
            dispatch(syncAccounts([resultAction.payload.account]));
          }
        });
        setImportName('');
        setImportValue('');
      }
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

  const handleCopyAddress = async (address: string, addressType: string) => {
    const addressKey = `${addressType}-${address}`;
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error('Clipboard API not supported');
      }

      // Try modern clipboard API first
      await navigator.clipboard.writeText(address);
      setCopiedAddress(addressKey);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy with clipboard API:', err);

      // Fallback to legacy method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setCopiedAddress(addressKey);
          setTimeout(() => setCopiedAddress(null), 2000);
        } else {
          throw new Error('Legacy copy method failed');
        }
      } catch (fallbackErr) {
        console.error('Fallback copy method failed:', fallbackErr);
        // Could show a toast notification here if available
      }
    }
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
                  <span className="icon"><WarningIcon size={16} color="currentColor" /></span>
                  <span>
                    You have existing accounts. Creating a new account will not automatically log you in.
                    You'll need to unlock your existing accounts with your password.
                  </span>
                </WarningMessage>
              )}
              <Input
                label="Account Name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Enter account name"
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
                  <span className="icon"><WarningIcon size={16} color="currentColor" /></span>
                  <span>
                    You have existing accounts. Importing a new account will not automatically log you in.
                    You'll need to unlock your existing accounts with your password.
                  </span>
                </WarningMessage>
              )}
              <Input
                label="Account Name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Enter account name"
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
                      <AccountBalance>{parseFloat(account.balance).toFixed(2)} REV</AccountBalance>
                    </AccountHeader>

                    <AddressContainer>
                      <AddressRow>
                        <AddressLabel>REV:</AddressLabel>
                        <AddressValue>{formatAddress(account.revAddress)}</AddressValue>
                        <CopyButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyAddress(account.revAddress, 'rev');
                          }}
                        >
                          {copiedAddress === `rev-${account.revAddress}` ? 'Copied!' : 'Copy'}
                        </CopyButton>
                      </AddressRow>
                      <AddressRow>
                        <AddressLabel>ETH:</AddressLabel>
                        <AddressValue>{formatAddress(account.ethAddress)}</AddressValue>
                        <CopyButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyAddress(account.ethAddress, 'eth');
                          }}
                        >
                          {copiedAddress === `eth-${account.ethAddress}` ? 'Copied!' : 'Copy'}
                        </CopyButton>
                      </AddressRow>
                    </AddressContainer>

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
