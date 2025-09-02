import React from 'react';
import { useNavigate } from 'react-router-dom';
import TransactionTracker from '../components/TransactionTracker';

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleTransactionSelect = (transaction: any) => {
    // Navigate to the transaction detail page
    navigate(`/transaction/${transaction.id || transaction.deploy_id}`);
  };

  return (
    <div>
      <TransactionTracker 
        onTransactionSelect={handleTransactionSelect}
        embedded={false}
      />
    </div>
  );
};

export default TransactionsPage;