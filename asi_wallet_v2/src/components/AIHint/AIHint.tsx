import React from 'react';
import styled, { css, keyframes } from 'styled-components';

interface AIHintProps {
  children: React.ReactNode;
  onClick?: () => void;
  pulse?: boolean;
}

const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(51, 228, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(51, 228, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(51, 228, 255, 0);
  }
`;

const AIHintPill = styled.div<{ clickable?: boolean; pulse?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${({ theme }) => `${theme.secondary}33`}; /* 20% opacity */
  color: ${({ theme }) => theme.secondary};
  border-radius: 20px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  
  ${({ pulse }) =>
    pulse &&
    css`
      animation: ${pulseAnimation} 2s infinite;
    `}
  
  ${({ clickable }) =>
    clickable &&
    css`
      &:hover {
        background: ${({ theme }) => `${theme.secondary}4D`}; /* 30% opacity */
        transform: translateY(-1px);
      }
      
      &:active {
        transform: translateY(0);
      }
    `}
`;

const AIIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: ${({ theme }) => theme.secondary};
    border-radius: 50%;
    box-shadow: 
      0 0 0 2px ${({ theme }) => `${theme.secondary}33`},
      0 0 8px ${({ theme }) => `${theme.secondary}66`};
  }
`;

export const AIHint: React.FC<AIHintProps> = ({ children, onClick, pulse = false }) => {
  return (
    <AIHintPill clickable={!!onClick} onClick={onClick} pulse={pulse}>
      <AIIcon />
      {children}
    </AIHintPill>
  );
};