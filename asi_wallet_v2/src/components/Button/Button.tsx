import React from 'react';
import styled, { css } from 'styled-components';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
}

const ButtonBase = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  border-radius: 8px; /* ASI Wallet spec: 8px for buttons */
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: none;
  outline: none;
  text-transform: none;
  letter-spacing: -0.01em;
  
  /* ASI Wallet elevation system */
  box-shadow: ${({ theme }) => theme.shadow};
  
  &:hover:not(:disabled) {
    box-shadow: ${({ theme }) => theme.shadowLarge};
  }
  
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.secondary};
    outline-offset: 2px;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  ${({ size }) => {
    switch (size) {
      case 'small':
        return css`
          padding: 10px 16px;
          font-size: 14px;
          line-height: 22px;
          min-height: 40px; /* Touch-friendly minimum */
        `;
      case 'large':
        return css`
          padding: 16px 32px;
          font-size: 18px;
          line-height: 26px;
          min-height: 52px;
        `;
      default:
        return css`
          padding: 12px 24px;
          font-size: 16px;
          line-height: 24px;
          min-height: 44px; /* Touch-friendly minimum */
        `;
    }
  }}

  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}

  ${({ variant, theme }) => {
    switch (variant) {
      case 'secondary':
        return css`
          background: transparent;
          color: ${theme.primary};
          border: 2px solid ${theme.primary};
          box-shadow: none;
          
          &:hover:not(:disabled) {
            background: ${theme.primary}1F; /* 12% opacity as per brand guide */
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
          }
          
          &:disabled {
            opacity: 0.3;
          }
        `;
      case 'danger':
        return css`
          background: ${theme.danger};
          color: white;
          font-weight: 600;
          
          &:hover:not(:disabled) {
            background: #E43A3C; /* Darkened as per brand guide */
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${theme.primary};
          border: 2px solid ${theme.primary};
          box-shadow: none;
          
          &:hover:not(:disabled) {
            background: ${theme.primary}1F;
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
      default: // Primary button - ASI Lime bg with Deep Space text
        return css`
          background: ${theme.primary};
          color: ${theme.text.inverse};
          font-weight: 600;
          
          &:hover:not(:disabled) {
            background: ${theme.primaryDark}; /* Darkened ASI Lime */
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
    }
  }}

  ${({ loading }) =>
    loading &&
    css`
      color: transparent;
      pointer-events: none;
      
      &::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        margin: auto;
        border: 3px solid transparent;
        border-top-color: currentColor;
        border-right-color: currentColor;
        border-radius: 50%;
        animation: spin 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        filter: drop-shadow(0 0 2px rgba(177, 252, 171, 0.4));
      }
      
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `}
`;

const RippleContainer = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
`;

const Ripple = styled.span`
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0);
  animation: ripple 0.4s ease-out;
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled,
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples([...ripples, { x, y, id }]);
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    }
    
    onClick?.(e);
  };
  
  return (
    <ButtonBase
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      loading={loading}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {children}
      <RippleContainer>
        {ripples.map(({ x, y, id }) => (
          <Ripple
            key={id}
            style={{
              left: x - 10,
              top: y - 10,
              width: 20,
              height: 20,
            }}
          />
        ))}
      </RippleContainer>
    </ButtonBase>
  );
};