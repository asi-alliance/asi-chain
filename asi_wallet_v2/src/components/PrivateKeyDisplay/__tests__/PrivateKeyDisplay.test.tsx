import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { PrivateKeyDisplay } from '../PrivateKeyDisplay';
import { lightTheme } from '../../../styles/theme';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('PrivateKeyDisplay', () => {
  const mockPrivateKey = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890';
  const mockAccountName = 'Test Account';
  const mockOnContinue = jest.fn();
  const mockOnBack = jest.fn();

  const renderWithTheme = (component: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lightTheme}>
        {component}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockClear();
  });

  it('renders private key display with security warning', () => {
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('IMPORTANT: Save Your Private Key')).toBeInTheDocument();
    expect(screen.getByText(/This is the only time you'll see your private key in plain text/)).toBeInTheDocument();
    expect(screen.getByText('Account: Test Account')).toBeInTheDocument();
  });

  it('initially hides private key with blur effect', () => {
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    const keyValue = screen.getByText(mockPrivateKey);
    expect(keyValue).toHaveStyle('filter: blur(8px)');
  });

  it('toggles private key visibility when show/hide button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    const toggleButton = screen.getByText('Show');
    const keyValue = screen.getByText(mockPrivateKey);

    // Initially blurred
    expect(keyValue).toHaveStyle('filter: blur(8px)');

    // Click show
    await user.click(toggleButton);
    expect(screen.getByText('Hide')).toBeInTheDocument();
    expect(keyValue).toHaveStyle('filter: none');

    // Click hide
    await user.click(screen.getByText('Hide'));
    expect(screen.getByText('Show')).toBeInTheDocument();
    expect(keyValue).toHaveStyle('filter: blur(8px)');
  });

  it('copies private key to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    mockWriteText.mockResolvedValue(undefined);

    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    // First show the private key
    await user.click(screen.getByText('Show'));
    
    // Wait for the copy button to be enabled
    await waitFor(() => {
      const copyButton = screen.getByText('Copy Private Key');
      expect(copyButton).not.toBeDisabled();
    });
    
    // Then copy it
    const copyButton = screen.getByText('Copy Private Key');
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(mockPrivateKey);
    expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
  });

  it('disables copy button when private key is hidden', () => {
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    const copyButton = screen.getByText('Copy Private Key');
    expect(copyButton).toBeDisabled();
  });

  it('calls onContinue when continue button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByText('I\'ve Saved My Private Key');
    await user.click(continueButton);

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('shows back button when showBackButton is true', () => {
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
        onBack={mockOnBack}
        showBackButton={true}
      />
    );

    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
        onBack={mockOnBack}
        showBackButton={true}
      />
    );

    const backButton = screen.getByText('Back');
    await user.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('displays security instructions', () => {
    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('What to do with your private key:')).toBeInTheDocument();
    expect(screen.getByText('Write it down on paper and store it safely')).toBeInTheDocument();
    expect(screen.getByText('Never share it with anyone')).toBeInTheDocument();
    expect(screen.getByText('Don\'t store it in screenshots or unencrypted files')).toBeInTheDocument();
    expect(screen.getByText('Use it to import your wallet in other browsers')).toBeInTheDocument();
    expect(screen.getByText('Keep it offline when possible')).toBeInTheDocument();
  });

  it('handles clipboard API failure gracefully', async () => {
    const user = userEvent.setup();
    mockWriteText.mockRejectedValue(new Error('Clipboard API not available'));

    // Mock document.execCommand as fallback
    const mockExecCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: mockExecCommand,
      writable: true,
    });

    renderWithTheme(
      <PrivateKeyDisplay
        privateKey={mockPrivateKey}
        accountName={mockAccountName}
        onContinue={mockOnContinue}
      />
    );

    // Show and copy
    await user.click(screen.getByText('Show'));
    
    // Wait for the copy button to be enabled
    await waitFor(() => {
      const copyButton = screen.getByText('Copy Private Key');
      expect(copyButton).not.toBeDisabled();
    });
    
    await user.click(screen.getByText('Copy Private Key'));

    // Should fallback to execCommand
    expect(mockExecCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
  });
});