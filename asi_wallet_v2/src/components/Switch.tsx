import React from 'react';
import styled from 'styled-components';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SwitchContainer = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  cursor: pointer;
  
  &[data-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchSlider = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }) => theme.border};
  transition: 0.3s;
  border-radius: 24px;
  
  &::before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
  
  ${SwitchInput}:checked + & {
    background-color: ${({ theme }) => theme.primary};
  }
  
  ${SwitchInput}:checked + &::before {
    transform: translateX(24px);
  }
  
  ${SwitchInput}:disabled + & {
    background-color: ${({ theme }) => theme.border};
    cursor: not-allowed;
  }
`;

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };
  
  return (
    <SwitchContainer data-disabled={disabled}>
      <SwitchInput
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      <SwitchSlider />
    </SwitchContainer>
  );
};