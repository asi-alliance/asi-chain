import React, { useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createMultisigWallet, selectIsCreatingMultisig } from '../../store/multisigSlice';
import { Button, Input, Card } from '../../components';
import { CreateMultisigWalletRequest } from '../../types/multisig';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.text.secondary};
  padding: 0.25rem;
  
  &:hover {
    color: ${props => props.theme.colors.text.primary};
  }
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 1rem;
  font-size: 1.1rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  color: ${props => props.theme.colors.text.secondary};
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const ParticipantsList = styled.div`
  margin-bottom: 1rem;
`;

const ParticipantItem = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background: ${props => props.theme.colors.background.secondary || 'transparent'};
`;

const ParticipantInput = styled(Input)`
  flex: 1;
`;

const RemoveButton = styled.button`
  background: ${props => props.theme.colors.error};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    background: ${props => props.theme.colors.error}CC;
  }
`;

const AddParticipantButton = styled(Button)`
  width: 100%;
  margin-bottom: 1rem;
`;

const ThresholdSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ThresholdInput = styled(Input)`
  width: 80px;
`;

const ThresholdInfo = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.secondary};
  background: ${props => props.theme.colors.primary}10;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const NetworkSelector = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.theme.colors.background.primary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  background: ${props => props.theme.colors.error}15;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
`;

interface Participant {
  address: string;
  name: string;
}

interface CreateMultisigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMultisigModal: React.FC<CreateMultisigModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const isCreating = useAppSelector(selectIsCreatingMultisig);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    network: 'mainnet',
    threshold: 2,
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { address: '', name: '' },
    { address: '', name: '' },
  ]);

  const [errors, setErrors] = useState<string[]>([]);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
    setParticipants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addParticipant = () => {
    setParticipants(prev => [...prev, { address: '', name: '' }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 2) {
      setParticipants(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): string[] => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('Wallet name is required');
    }

    if (formData.threshold < 1) {
      newErrors.push('Threshold must be at least 1');
    }

    const validParticipants = participants.filter(p => p.address.trim());
    
    if (validParticipants.length < 2) {
      newErrors.push('At least 2 participants are required');
    }

    if (formData.threshold > validParticipants.length) {
      newErrors.push('Threshold cannot be greater than the number of participants');
    }

    // Validate Ethereum addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    validParticipants.forEach((participant, index) => {
      if (!addressRegex.test(participant.address)) {
        newErrors.push(`Participant ${index + 1} has an invalid address`);
      }
    });

    // Check for duplicate addresses
    const addresses = validParticipants.map(p => p.address.toLowerCase());
    const uniqueAddresses = new Set(addresses);
    if (addresses.length !== uniqueAddresses.size) {
      newErrors.push('Duplicate participant addresses are not allowed');
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const validParticipants = participants
      .filter(p => p.address.trim())
      .map(p => ({
        address: p.address.trim(),
        name: p.name.trim() || `Participant`,
        publicKey: '', // Will be derived by the service
      }));

    const request: CreateMultisigWalletRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      participants: validParticipants,
      threshold: formData.threshold,
      network: formData.network,
    };

    try {
      await dispatch(createMultisigWallet(request)).unwrap();
      onClose();
      // Reset form
      setFormData({ name: '', description: '', network: 'mainnet', threshold: 2 });
      setParticipants([{ address: '', name: '' }, { address: '', name: '' }]);
      setErrors([]);
    } catch (error) {
      setErrors([error as string]);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
      setErrors([]);
    }
  };

  if (!isOpen) return null;

  const validParticipantCount = participants.filter(p => p.address.trim()).length + 1; // +1 for the current user

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>Create Multi-Signature Wallet</h2>
          <CloseButton onClick={handleClose} disabled={isCreating}>×</CloseButton>
        </ModalHeader>

        {errors.length > 0 && (
          <ErrorMessage>
            {errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </ErrorMessage>
        )}

        <FormSection>
          <SectionTitle>Wallet Information</SectionTitle>
          
          <FormGroup>
            <Label>Wallet Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="My Multisig Wallet"
              disabled={isCreating}
            />
          </FormGroup>

          <FormGroup>
            <Label>Description (Optional)</Label>
            <Input
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the purpose of this wallet"
              disabled={isCreating}
            />
          </FormGroup>

          <FormGroup>
            <Label>Network</Label>
            <NetworkSelector
              value={formData.network}
              onChange={(e) => handleInputChange('network', e.target.value)}
              disabled={isCreating}
            >
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
              <option value="local">Local Network</option>
            </NetworkSelector>
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Participants</SectionTitle>
          
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'inherit' }}>
            Add the addresses of other wallet participants. You will automatically be included as a participant.
          </div>

          <ParticipantsList>
            {participants.map((participant, index) => (
              <ParticipantItem key={index}>
                <ParticipantInput
                  placeholder={`Participant ${index + 1} Address (0x...)`}
                  value={participant.address}
                  onChange={(e) => handleParticipantChange(index, 'address', e.target.value)}
                  disabled={isCreating}
                />
                <ParticipantInput
                  placeholder="Name (Optional)"
                  value={participant.name}
                  onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                  style={{ maxWidth: '150px' }}
                  disabled={isCreating}
                />
                {participants.length > 2 && (
                  <RemoveButton
                    onClick={() => removeParticipant(index)}
                    disabled={isCreating}
                  >
                    Remove
                  </RemoveButton>
                )}
              </ParticipantItem>
            ))}
          </ParticipantsList>

          <AddParticipantButton
            variant="secondary"
            onClick={addParticipant}
            disabled={isCreating}
          >
            Add Another Participant
          </AddParticipantButton>
        </FormSection>

        <FormSection>
          <SectionTitle>Signature Threshold</SectionTitle>
          
          <ThresholdSelector>
            <Label style={{ margin: 0 }}>Required signatures:</Label>
            <ThresholdInput
              type="number"
              min="1"
              max={validParticipantCount}
              value={formData.threshold}
              onChange={(e) => handleInputChange('threshold', parseInt(e.target.value) || 1)}
              disabled={isCreating}
            />
            <span>of {validParticipantCount} participants</span>
          </ThresholdSelector>

          <ThresholdInfo>
            This wallet will require {formData.threshold} signature(s) to approve any transaction. 
            You can modify this threshold later through a governance proposal.
          </ThresholdInfo>
        </FormSection>

        <ButtonGroup>
          <Button variant="secondary" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Creating Wallet...' : 'Create Multisig Wallet'}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateMultisigModal;