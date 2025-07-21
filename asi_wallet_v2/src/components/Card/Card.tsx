import styled, { css } from 'styled-components';

interface CardProps {
  noPadding?: boolean;
  hoverable?: boolean;
  glass?: boolean;
}

export const Card = styled.div<CardProps>`
  background: ${({ theme, glass }) => 
    glass 
      ? 'rgba(27, 31, 33, 0.7)' /* Charcoal 700 with transparency */
      : theme.card
  };
  border-radius: 8px; /* ASI Wallet spec: 8px for cards */
  padding: ${({ noPadding }) => (noPadding ? '0' : '24px')};
  box-shadow: ${({ theme }) => theme.shadow};
  border: 1px solid ${({ theme, glass }) => 
    glass 
      ? theme.borderLight
      : theme.border
  };
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  ${({ glass }) =>
    glass &&
    css`
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    `}

  ${({ hoverable }) =>
    hoverable &&
    css`
      cursor: pointer;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${({ theme }) => theme.shadowLarge};
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: ${({ theme }) => theme.shadow};
      }
    `}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

export const CardTitle = styled.h2`
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  line-height: 36px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin: 0;
  letter-spacing: -0.02em;
`;

export const CardContent = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 26px;
  font-weight: 400;
  color: ${({ theme }) => theme.text.secondary};
  
  p {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  /* For numerical/hash values */
  code, .mono {
    font-family: 'Fira Mono', monospace;
    font-weight: 500;
    font-size: 13px;
    line-height: 20px;
    color: ${({ theme }) => theme.text.primary};
  }
`;