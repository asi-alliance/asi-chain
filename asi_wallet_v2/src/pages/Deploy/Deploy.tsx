import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { RootState } from 'store';
import { RChainService } from 'services/rchain';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, DeploymentConfirmationModal } from 'components';
import TransactionHistoryService from 'services/transactionHistory';
import { SuccessIcon, ErrorIcon, PendingIcon } from 'components/Icons';

const DeployContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const CodeEditor = styled.textarea`
  width: 100%;
  height: 300px;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  background: ${({ theme }) => theme.surface};
  border: 2px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.text.primary};
  resize: vertical;
  margin-bottom: 16px;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.text.secondary};
    opacity: 0.7;
  }

  /* Force better contrast in dark mode */
  &::-webkit-input-placeholder {
    color: ${({ theme }) => theme.text.secondary};
  }
  &::-moz-placeholder {
    color: ${({ theme }) => theme.text.secondary};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
`;

const ResultContainer = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const ResultTitle = styled.h4`
  margin: 0 0 12px 0;
  color: ${({ theme }) => theme.text.primary};
`;

const ResultContent = styled.pre`
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: ${({ theme }) => theme.text.secondary};
  white-space: pre-wrap;
  word-break: break-all;
`;

const ErrorMessage = styled.div`
  background: ${({ theme }) => theme.danger};
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
`;

const SuccessMessage = styled.div`
  background: ${({ theme }) => theme.success};
  color: ${({ theme }) => theme.text.inverse};
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  word-break: break-all;
  
  /* Force inverse text for all content */
  * {
    color: ${({ theme }) => theme.text.inverse} !important;
  }
  
  .deploy-id {
    font-family: monospace;
    font-size: 12px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid ${({ theme }) => `${theme.text.inverse}20`};
    color: ${({ theme }) => theme.text.inverse};
    opacity: 0.9;
    line-height: 1.4;
  }
`;

const exampleContract = `new stdout(\`rho:io:stdout\`), deployerId(\`rho:rchain:deployerId\`) in {
  stdout!("Hello from ASI Wallet!") |
  deployerId!("Deploy successful")
}`;

export const Deploy: React.FC = () => {
  const navigate = useNavigate();
  const { selectedAccount, selectedNetwork } = useSelector((state: RootState) => state.wallet);
  const { unlockedAccounts } = useSelector((state: RootState) => state.auth);

  const [code, setCode] = useState(exampleContract);
  const [phloLimit, setPhloLimit] = useState('100000000');
  const [phloPrice, setPhloPrice] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [deployId, setDeployId] = useState('');
  const [showDeployConfirmation, setShowDeployConfirmation] = useState(false);
  const [showExploreConfirmation, setShowExploreConfirmation] = useState(false);

  // Helper function to check if account is unlocked
  const isAccountUnlocked = (account: any): boolean => {
    return unlockedAccounts.some(unlockedAcc => unlockedAcc.id === account?.id);
  };

  const handleDeployClick = () => {
    if (!selectedAccount || !code.trim()) return;
    setShowDeployConfirmation(true);
  };

  const handleConfirmDeploy = async () => {
    if (!selectedAccount) return;

    // Issue #37 & #38: Final validation before deployment
    const balance = parseFloat(selectedAccount.balance || '0');
    const phloLimitNum = parseInt(phloLimit);
    const minGasCost = phloLimitNum * parseFloat(phloPrice) / 1000000000;
    
    if (balance <= 0 || balance < minGasCost) {
      setError('Transaction aborted: Insufficient balance');
      setShowDeployConfirmation(false);
      return;
    }
    
    if (isNaN(phloLimitNum) || phloLimitNum <= 0) {
      setError('Transaction aborted: Invalid phlo limit');
      setShowDeployConfirmation(false);
      return;
    }

    setShowDeployConfirmation(false);
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const rchain = new RChainService(selectedNetwork.url, selectedNetwork.readOnlyUrl, selectedNetwork.adminUrl, selectedNetwork.shardId);
      
      // Find the private key from unlocked accounts
      const unlockedAccount = unlockedAccounts.find(acc => acc.id === selectedAccount.id);
      const privateKey = unlockedAccount?.privateKey;

      if (!privateKey) {
        throw new Error('Account is locked. Please unlock your account first.');
      }

      const deployResult = await rchain.sendDeploy(code, privateKey, parseInt(phloLimit));
      setDeployId(deployResult);

      // Add to transaction history
      const historyTx = TransactionHistoryService.addTransaction({
        timestamp: new Date(),
        type: 'deploy',
        from: selectedAccount.revAddress,
        deployId: deployResult,
        status: 'pending',
        contractCode: code.substring(0, 100) + (code.length > 100 ? '...' : ''), // Store preview
        network: selectedNetwork.name
      });

      // Try to get deploy result with enhanced status checking
      try {
        const finalResult = await rchain.waitForDeployResult(deployResult);
        
        if (finalResult.status === 'completed') {
          setResult({
            ...finalResult,
            deployId: deployResult,
            message: `${finalResult.message}`,
            blockHash: finalResult.blockHash,
            cost: finalResult.cost
          });
          
          // Update transaction history
          TransactionHistoryService.updateTransaction(historyTx.id, {
            status: 'confirmed',
            blockHash: finalResult.blockHash,
            gasCost: finalResult.cost?.toString()
          });
        } else if (finalResult.status === 'errored') {
          setError(`[ERROR] Deploy execution failed: ${finalResult.error}`);
          TransactionHistoryService.updateTransaction(historyTx.id, {
            status: 'failed'
          });
        } else if (finalResult.status === 'system_error') {
          setError(`[ERROR] System error: ${finalResult.error}`);
          TransactionHistoryService.updateTransaction(historyTx.id, {
            status: 'failed'
          });
        } else {
          setResult(finalResult);
        }
      } catch (resultError) {
        console.log('Could not fetch deploy result:', resultError);
        // Set a basic success result since we got a deploy ID
        setResult({
          deployId: deployResult,
          status: 'submitted',
          message: '[PENDING] Deploy submitted successfully. It may still be processing or pending block inclusion.'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Deploy failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreClick = () => {
    if (!code.trim()) return;
    setShowExploreConfirmation(true);
  };

  const handleConfirmExplore = async () => {
    setShowExploreConfirmation(false);
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const rchain = new RChainService(selectedNetwork.url, selectedNetwork.readOnlyUrl, selectedNetwork.adminUrl, selectedNetwork.shardId);
      const exploreResult = await rchain.exploreDeployData(code);
      setResult({ type: 'explore', data: exploreResult });
    } catch (err: any) {
      setError(err.message || 'Explore failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    setCode(exampleContract);
  };

  const clearCode = () => {
    setCode('');
  };

  if (!selectedAccount) {
    return (
      <DeployContainer>
        <Card>
          <CardContent>
            <p>Please select an account first.</p>
            <Button onClick={() => navigate('/accounts')}>Select Account</Button>
          </CardContent>
        </Card>
      </DeployContainer>
    );
  }

  return (
    <DeployContainer>
      <Card>
        <CardHeader>
          <CardTitle>Deploy Rholang Contract</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {deployId && (
            <SuccessMessage>
              <div>Deploy submitted successfully!</div>
              <div className="deploy-id">Deploy ID: {deployId}</div>
            </SuccessMessage>
          )}

          <FormGroup>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Rholang Code
            </label>
            <CodeEditor
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your Rholang code here..."
              disabled={isLoading}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Button variant="ghost" size="small" onClick={loadExample}>
                Load Example
              </Button>
              <Button variant="ghost" size="small" onClick={clearCode}>
                Clear
              </Button>
            </div>
          </FormGroup>

          <FormRow>
            <Input
              label="Phlo Limit"
              value={phloLimit}
              onChange={(e) => setPhloLimit(e.target.value)}
              type="number"
              disabled={isLoading}
            />
            <Input
              label="Phlo Price"
              value={phloPrice}
              onChange={(e) => setPhloPrice(e.target.value)}
              type="number"
              disabled={isLoading}
            />
          </FormRow>


          <ActionButtons>
            <Button variant="ghost" onClick={() => navigate('/')}>
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={handleExploreClick}
              loading={isLoading}
              disabled={!code.trim()}
            >
              Explore (Read-only)
            </Button>
            <Button
              onClick={handleDeployClick}
              loading={isLoading}
              disabled={!code.trim() || !selectedAccount || !isAccountUnlocked(selectedAccount)}
            >
              Deploy
            </Button>
          </ActionButtons>

          {result && (
            <ResultContainer>
              <ResultTitle>
                {result.type === 'explore' ? 'Explore Result' : 'Deploy Result'}
              </ResultTitle>
              <ResultContent>
                {JSON.stringify(result.data || result, null, 2)}
              </ResultContent>
            </ResultContainer>
          )}
        </CardContent>
      </Card>

      {/* Deploy Confirmation Modal */}
      <DeploymentConfirmationModal
        isOpen={showDeployConfirmation}
        onClose={() => setShowDeployConfirmation(false)}
        onConfirm={handleConfirmDeploy}
        rholangCode={code}
        phloLimit={phloLimit}
        phloPrice={phloPrice}
        accountName={selectedAccount?.name || ''}
        accountAddress={selectedAccount?.revAddress || ''}
        loading={isLoading}
      />

      {/* Explore Confirmation Modal */}
      <DeploymentConfirmationModal
        isOpen={showExploreConfirmation}
        onClose={() => setShowExploreConfirmation(false)}
        onConfirm={handleConfirmExplore}
        rholangCode={code}
        phloLimit={phloLimit}
        phloPrice={phloPrice}
        accountName={selectedAccount?.name || ''}
        accountAddress={selectedAccount?.revAddress || ''}
        isExplore={true}
        loading={isLoading}
      />
    </DeployContainer>
  );
};