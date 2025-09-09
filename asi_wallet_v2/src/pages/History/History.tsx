import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from 'store';
import { Card, CardHeader, CardTitle, CardContent, Button } from 'components';
import TransactionHistoryService, { Transaction, TransactionFilter } from 'services/transactionHistory';
import { RChainService } from 'services/rchain';

const HistoryContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const FilterSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.text.secondary};
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text.primary};
  font-size: 14px;
  min-width: 150px;
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled(Card)`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.text.secondary};
`;

const TransactionTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.surface};
  border-bottom: 2px solid ${({ theme }) => theme.border};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.border};
  
  &:hover {
    background: ${({ theme }) => theme.surface};
  }
`;

const TableCell = styled.td<{ align?: string }>`
  padding: 12px;
  text-align: ${({ align }) => align || 'left'};
  font-size: 14px;
`;

const TableHeaderCell = styled.th<{ align?: string }>`
  padding: 12px;
  text-align: ${({ align }) => align || 'left'};
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.text.secondary};
`;

const StatusBadge = styled.span<{ status: 'pending' | 'confirmed' | 'failed' }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ status, theme }) => 
    status === 'confirmed' ? theme.success + '20' :
    status === 'failed' ? theme.danger + '20' :
    theme.warning + '20'
  };
  color: ${({ status, theme }) =>
    status === 'confirmed' ? theme.success :
    status === 'failed' ? theme.danger :
    theme.warning
  };
`;

const TypeBadge = styled.span<{ type: 'send' | 'receive' | 'deploy' }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ type, theme }) =>
    type === 'send' ? theme.primary + '20' :
    type === 'receive' ? theme.success + '20' :
    theme.secondary + '20'
  };
  color: ${({ type, theme }) =>
    type === 'send' ? theme.primary :
    type === 'receive' ? theme.success :
    theme.secondary
  };
`;

const AddressLink = styled.a`
  color: ${({ theme }) => theme.primary};
  text-decoration: none;
  font-family: monospace;
  font-size: 12px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${({ theme }) => theme.text.secondary};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const RefreshInfo = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
};

const formatAmount = (amount?: string): string => {
  if (!amount) return '-';
  try {
    // Use BigInt for large numbers
    const atomicAmount = BigInt(amount);
    const rev = Number(atomicAmount) / 100000000;
    return `${rev.toFixed(8)} REV`;
  } catch (error) {
    console.error('Error formatting amount:', amount, error);
    return `${amount} (raw)`;
  }
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString();
};

export const History: React.FC = () => {
  const { selectedAccount, selectedNetwork } = useSelector((state: RootState) => state.wallet);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>({});
  const [stats, setStats] = useState<any>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const checkPendingTransactionStatuses = useCallback(async () => {
    if (!selectedNetwork) return;
    
    console.log('[History] Checking pending transaction statuses...');
    
    // Create RChain service instance
    const rchain = new RChainService(
      selectedNetwork.url,
      selectedNetwork.readOnlyUrl,
      selectedNetwork.adminUrl,
      selectedNetwork.shardId,
      selectedNetwork.graphqlUrl
    );
    
    // Get all pending transactions
    const pendingTxs = TransactionHistoryService.getFilteredTransactions({
      status: 'pending'
    });
    
    console.log(`[History] Found ${pendingTxs.length} pending transactions to check`);
    
    // Check status for each pending transaction
    for (const tx of pendingTxs) {
      if (tx.deployId) {
        try {
          console.log(`[History] Checking status for deploy ${tx.deployId}`);
          // Use shorter timeout for status checks
          const result = await rchain.waitForDeployResult(tx.deployId, 1);
          
          if (result.status === 'completed') {
            console.log(`[History] Deploy ${tx.deployId} is now confirmed!`);
            TransactionHistoryService.updateTransaction(tx.id, {
              status: 'confirmed',
              blockHash: result.blockHash
            });
          } else if (result.status === 'errored') {
            console.log(`[History] Deploy ${tx.deployId} failed`);
            TransactionHistoryService.updateTransaction(tx.id, {
              status: 'failed'
            });
          }
        } catch (error) {
          // Still pending or error checking, leave as is
          console.log(`[History] Deploy ${tx.deployId} still pending or error checking`);
        }
      }
    }
  }, [selectedNetwork]);

  const loadTransactions = useCallback(() => {
    let txs: Transaction[];
    
    // Get transactions for the selected account only
    if (selectedAccount) {
      txs = TransactionHistoryService.getAccountTransactions(selectedAccount.revAddress);
      
      // Apply additional filters
      if (filter.type) {
        txs = txs.filter(tx => tx.type === filter.type);
      }
      if (filter.status) {
        txs = txs.filter(tx => tx.status === filter.status);
      }
    } else {
      // No account selected, show empty
      txs = [];
    }

    // Filter by network if selected
    if (selectedNetwork) {
      txs = txs.filter(tx => tx.network === selectedNetwork.name);
    }

    setTransactions(txs);

    // Update statistics for the selected account only
    const statistics = TransactionHistoryService.getStatistics(
      selectedAccount?.revAddress
    );
    setStats(statistics);
  }, [selectedAccount, selectedNetwork, filter]);

  useEffect(() => {
    loadTransactions();
    // Check pending transaction statuses on load
    checkPendingTransactionStatuses().then(() => {
      // Reload transactions after status updates
      loadTransactions();
    });
  }, [loadTransactions, checkPendingTransactionStatuses]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[History] Auto-refreshing transactions...');
      checkPendingTransactionStatuses().then(() => {
        loadTransactions();
        setLastRefresh(new Date());
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadTransactions, checkPendingTransactionStatuses]);

  const handleExportJSON = () => {
    TransactionHistoryService.downloadTransactions('json');
  };

  const handleExportCSV = () => {
    TransactionHistoryService.downloadTransactions('csv');
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all transaction history? This cannot be undone.')) {
      TransactionHistoryService.clearHistory();
      loadTransactions();
    }
  };

  const handleFilterChange = (key: keyof TransactionFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  return (
    <HistoryContainer>
      <Card>
        <CardHeader>
          <CardTitle>
            Transaction History
            {selectedAccount && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: '8px', opacity: 0.7 }}>
                ({selectedAccount.name})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActionButtons>
            <RefreshInfo>
              <span>Auto-refresh: every 30s</span>
              <span>•</span>
              <span>Last: {lastRefresh.toLocaleTimeString()}</span>
              <Button 
                size="small" 
                variant="ghost" 
                onClick={async () => {
                  console.log('[History] Manual refresh triggered');
                  await checkPendingTransactionStatuses();
                  loadTransactions();
                  setLastRefresh(new Date());
                }}
              >
                🔄 Refresh
              </Button>
            </RefreshInfo>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="small" variant="ghost" onClick={handleExportJSON}>
                Export JSON
              </Button>
              <Button size="small" variant="ghost" onClick={handleExportCSV}>
                Export CSV
              </Button>
              <Button size="small" variant="ghost" onClick={handleClearHistory}>
                Clear History
              </Button>
            </div>
          </ActionButtons>

          <FilterSection>
            <FilterGroup>
              <FilterLabel>Type</FilterLabel>
              <FilterSelect
                value={filter.type || 'all'}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="send">Send</option>
                <option value="deploy">Deploy</option>
              </FilterSelect>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Status</FilterLabel>
              <FilterSelect
                value={filter.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
              </FilterSelect>
            </FilterGroup>
          </FilterSection>

          <StatsSection>
            <StatCard>
              <CardContent>
                <StatValue>{stats.total || 0}</StatValue>
                <StatLabel>Total Transactions</StatLabel>
              </CardContent>
            </StatCard>
            <StatCard>
              <CardContent>
                <StatValue>{stats.sent || 0}</StatValue>
                <StatLabel>Sent</StatLabel>
              </CardContent>
            </StatCard>
            <StatCard>
              <CardContent>
                <StatValue>{stats.deployed || 0}</StatValue>
                <StatLabel>Deployments</StatLabel>
              </CardContent>
            </StatCard>
          </StatsSection>

          {transactions.length > 0 ? (
            <TransactionTable>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>From</TableHeaderCell>
                    <TableHeaderCell>To</TableHeaderCell>
                    <TableHeaderCell align="right">Amount</TableHeaderCell>
                    <TableHeaderCell align="right">Gas</TableHeaderCell>
                    <TableHeaderCell>Details</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.timestamp)}</TableCell>
                      <TableCell>
                        <TypeBadge type={tx.type}>{tx.type}</TypeBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status}>{tx.status}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        {tx.from === 'Unknown' ? (
                          <span style={{ color: 'inherit', opacity: 0.5 }}>Unknown</span>
                        ) : (
                          <AddressLink href="#" onClick={(e) => e.preventDefault()}>
                            {formatAddress(tx.from)}
                          </AddressLink>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.to ? (
                          <AddressLink href="#" onClick={(e) => e.preventDefault()}>
                            {formatAddress(tx.to)}
                          </AddressLink>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">{formatAmount(tx.amount)}</TableCell>
                      <TableCell align="right">
                        {tx.gasCost ? `${tx.gasCost} phlo` : '-'}
                      </TableCell>
                      <TableCell>
                        {tx.note && <div style={{ fontSize: '12px', marginBottom: '4px' }}>{tx.note}</div>}
                        {tx.deployId && (
                          <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                            Deploy: {tx.deployId.substring(0, 16)}...
                          </div>
                        )}
                        {tx.blockHash && (
                          <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                            Block: {tx.blockHash.substring(0, 16)}...
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TransactionTable>
          ) : (
            <EmptyState>
              {selectedAccount ? (
                <>
                  <p>No transactions found for {selectedAccount.name}.</p>
                  <p>Your transaction history will appear here once you send, receive, or deploy contracts.</p>
                </>
              ) : (
                <p>Please select an account to view transaction history.</p>
              )}
            </EmptyState>
          )}
        </CardContent>
      </Card>
    </HistoryContainer>
  );
};