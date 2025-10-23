import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store';
import { selectAccount, fetchBalance } from 'store/walletSlice';
import { truncateText } from 'utils/textUtils';
import { formatBalanceCompact } from 'utils/balanceUtils';

const SwitcherContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SwitcherButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text.primary};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 180px;
  text-align: left;
  
  @media (max-width: 768px) {
    min-width: 140px;
  }

  &:hover {
    background: ${({ theme }) => theme.primary + '10'};
    border-color: ${({ theme }) => theme.primary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary};
  }
`;

const AccountInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const AccountName = styled.span`
  font-weight: 500;
  font-size: 14px;
  color: ${({ theme }) => theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
  
  @media (max-width: 768px) {
    max-width: 80px;
  }
`;

const AccountAddress = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.text.secondary};
  font-family: monospace;
  opacity: 0.8;
`;

const AccountBalance = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.primary};
  font-weight: 500;
`;

const LoadingSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 1px solid ${({ theme }) => theme.primary};
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ChevronIcon = styled.span<{ $isOpen: boolean }>`
  font-size: 12px;
  transition: transform 0.2s ease;
  transform: rotate(${({ $isOpen }) => $isOpen ? '180deg' : '0deg'});
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadowLarge};
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  margin-top: 4px;
`;

const DropdownItem = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${({ $isSelected, theme }) => $isSelected ? theme.primary + '10' : 'transparent'};
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => theme.surface};
  }

  &:focus {
    outline: none;
    background: ${({ theme }) => theme.primary + '10'};
  }
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: ${({ theme }) => theme.text.secondary};
  font-size: 14px;
`;

const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
};

// Remove the old formatBalance function since we're using the utility now

export const AccountSwitcher: React.FC = () => {
  const dispatch = useDispatch();
  const { accounts, selectedAccount, selectedNetwork } = useSelector((state: RootState) => state.wallet);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccountSelect = (accountId: string) => {
    dispatch(selectAccount(accountId));
    setIsOpen(false);
  };

  const fetchAllBalances = async () => {
    if (!selectedNetwork || accounts.length === 0) return;
    
    setIsLoadingBalances(true);
    
    // Fetch balances for all accounts
    const balancePromises = accounts.map(account => 
      dispatch(fetchBalance({ account, network: selectedNetwork }) as any)
    );
    
    try {
      await Promise.all(balancePromises);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Fetch balances when dropdown opens
    if (newIsOpen) {
      // Small delay to ensure dropdown is open before fetching
      setTimeout(() => {
        fetchAllBalances();
      }, 100);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Don't render if no accounts
  if (accounts.length === 0) {
    return null;
  }

  return (
    <SwitcherContainer ref={containerRef}>
      <SwitcherButton onClick={handleToggle} onKeyDown={handleKeyDown}>
        <AccountInfo>
          {selectedAccount ? (
            <>
              <AccountName title={selectedAccount.name}>
                {truncateText(selectedAccount.name, 20)}
              </AccountName>
              <AccountAddress>{formatAddress(selectedAccount.revAddress)}</AccountAddress>
            </>
          ) : (
            <AccountName>Select Account</AccountName>
          )}
        </AccountInfo>
        {selectedAccount && (
          <AccountBalance>
            {isLoadingBalances ? <LoadingSpinner /> : formatBalanceCompact(selectedAccount.balance)}
          </AccountBalance>
        )}
        <ChevronIcon $isOpen={isOpen}>▼</ChevronIcon>
      </SwitcherButton>

      <Dropdown $isOpen={isOpen}>
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <DropdownItem
              key={account.id}
              $isSelected={selectedAccount?.id === account.id}
              onClick={() => handleAccountSelect(account.id)}
            >
              <AccountInfo>
                <AccountName title={account.name}>
                  {truncateText(account.name, 25)}
                </AccountName>
                <AccountAddress>{formatAddress(account.revAddress)}</AccountAddress>
              </AccountInfo>
              <AccountBalance>
                {isLoadingBalances ? <LoadingSpinner /> : formatBalanceCompact(account.balance)}
              </AccountBalance>
            </DropdownItem>
          ))
        ) : (
          <EmptyState>No accounts available</EmptyState>
        )}
      </Dropdown>
    </SwitcherContainer>
  );
};