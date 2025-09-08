import React from 'react';
import styled from 'styled-components';
import { Card, CardHeader, CardTitle, CardContent, Button } from 'components';
import { WarningIcon } from 'components/Icons';
import { useNavigate } from 'react-router-dom';

const StubContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: 40px 20px;
`;

const WarningMessage = styled.div`
  background: ${({ theme }) => `${theme.warning}20`};
  border: 1px solid ${({ theme }) => `${theme.warning}40`};
  color: ${({ theme }) => theme.warning};
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 500px;

  .icon {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const FeatureDescription = styled.div`
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 24px;
  max-width: 400px;
  line-height: 1.5;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

interface AccountRequiredStubProps {
  title: string;
  description: string;
  features: string[];
  icon?: React.ReactNode;
}

export const AccountRequiredStub: React.FC<AccountRequiredStubProps> = ({
  title,
  description,
  features,
  icon
}) => {
  const navigate = useNavigate();

  return (
    <StubContainer>
      <Card style={{ maxWidth: '600px', width: '100%' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WarningMessage>
            <span className="icon"><WarningIcon size={20} color="currentColor" /></span>
            <div>
              <strong>Account Required!</strong><br />
              You need to create or import an account before you can use this feature.
            </div>
          </WarningMessage>
          
          <FeatureDescription>
            {description}
          </FeatureDescription>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>What you can do:</h4>
            <ul style={{ textAlign: 'left', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
              {features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>{feature}</li>
              ))}
            </ul>
          </div>

          <ActionButtons>
            <Button 
              onClick={() => navigate('/accounts')}
              variant="primary"
            >
              Create Account
            </Button>
            <Button 
              onClick={() => navigate('/accounts')}
              variant="ghost"
            >
              Import Account
            </Button>
          </ActionButtons>
        </CardContent>
      </Card>
    </StubContainer>
  );
};
