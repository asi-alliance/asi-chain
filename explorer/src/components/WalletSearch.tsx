import React, { useState } from 'react';
import { WalletService, WalletBalance } from '../services/walletService';

interface WalletSearchProps {
  onSearch?: (address: string) => void;
}

const WalletSearch: React.FC<WalletSearchProps> = ({ onSearch }) => {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const searchWallet = async () => {
    if (!address.trim()) {
      setError('Please enter a valid REV address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use WalletService to get balance directly from RChain node
      const data = await WalletService.getWalletBalance(address.trim());
      setWalletData(data);
      setShowModal(true);
      
      if (onSearch) {
        onSearch(address.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      searchWallet();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setWalletData(null);
    setError(null);
  };

  return (
    <>
      <div className="asi-card wallet-search-card">
        <div className="wallet-search-content">
          <div className="wallet-search-info">
            <h3>Check Wallet Balance</h3>
            <p>Enter a REV address to view balance and transaction history</p>
          </div>
          <div className="wallet-search-controls">
            <input
              type="text"
              placeholder="Enter REV address (e.g., 111127RX5Zgi...)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="btn btn-primary"
              onClick={searchWallet}
              disabled={isLoading || !address.trim()}
            >
              <span style={{ marginRight: '0.5rem' }}>🔍</span>
              {isLoading ? 'Checking...' : 'Check Balance'}
            </button>
          </div>
        </div>
        {error && (
          <div className="status-message error" style={{ marginTop: '1rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Wallet Balance Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content asi-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--asi-lime)', margin: 0 }}>💰 Wallet Balance</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {walletData && (
                <>
                  <div className="wallet-info">
                    <div className="info-row">
                      <span className="label">Address:</span>
                      <div className="address-display">
                        <code className="address-text">{walletData.address}</code>
                      </div>
                    </div>
                    
                    <div className="balance-section asi-card glass">
                      <div className="balance-item">
                        <span className="balance-label">REV Balance:</span>
                        <span className="balance-value text-success">
                          {walletData.balance.rev.toFixed(8)} REV
                        </span>
                      </div>
                      <div className="balance-item">
                        <span className="balance-label">Dust Balance:</span>
                        <span className="balance-value text-info">
                          {walletData.balance.dust.toLocaleString()} dust
                        </span>
                      </div>
                    </div>
                    
                    {walletData.note && (
                      <div className="status-message info" style={{ marginTop: '1rem' }}>
                        <strong>Note:</strong> {walletData.note}
                      </div>
                    )}
                  </div>
                  
                  {walletData.transactions && walletData.transactions.length > 0 && (
                    <div className="transactions-section">
                      <h4 style={{ color: 'var(--off-white)', marginBottom: '1rem' }}>Recent Transactions</h4>
                      <div className="transactions-table">
                        <table style={{ marginTop: 0 }}>
                          <thead>
                            <tr>
                              <th>Transaction ID</th>
                              <th>Block</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {walletData.transactions.slice(0, 5).map((tx, index) => (
                              <tr key={index}>
                                <td className="hash-cell">
                                  <code>{tx.deploy_id?.substring(0, 20)}...</code>
                                </td>
                                <td>
                                  <span className="block-number">#{tx.block_number}</span>
                                </td>
                                <td>
                                  <span className={tx.errored || tx.error_message ? 'text-error' : 'text-success'}>
                                    {tx.errored || tx.error_message ? '✕ Failed' : '✓ Success'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletSearch;