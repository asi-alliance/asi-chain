/**
 * Formats a balance value for display with appropriate precision
 * @param balance - The balance value as string or number
 * @param options - Formatting options
 * @returns Formatted balance string
 */
export const formatBalance = (
  balance: string | number, 
  options: {
    showCurrency?: boolean;
    maxDecimals?: number;
    minDecimals?: number;
    significantDigits?: number;
  } = {}
): string => {
  const {
    showCurrency = true,
    maxDecimals = 8,
    minDecimals = 0,
    significantDigits = 6
  } = options;

  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  
  if (isNaN(num) || !isFinite(num)) {
    return showCurrency ? '0 REV' : '0';
  }

  if (num === 0) {
    return showCurrency ? '0 REV' : '0';
  }

  if (num < 0.000001) {
    return showCurrency ? '<0.000001 REV' : '<0.000001';
  }

  let decimals = minDecimals;
  
  if (num >= 1) {
    decimals = Math.min(maxDecimals, 2);
  } else if (num >= 0.01) {
    decimals = Math.min(maxDecimals, 4);
  } else if (num >= 0.0001) {
    decimals = Math.min(maxDecimals, 6);
  } else {
    decimals = Math.min(maxDecimals, 8);
  }

  const formatted = num.toFixed(decimals);
  
  const trimmed = parseFloat(formatted).toString();
  
  return showCurrency ? `${trimmed} REV` : trimmed;
};

/**
 * Formats balance for display in account switcher (compact format)
 * @param balance - The balance value as string or number
 * @returns Formatted balance string
 */
export const formatBalanceCompact = (balance: string | number): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  
  if (isNaN(num) || !isFinite(num)) {
    return '0 REV';
  }

  if (num === 0) {
    return '0 REV';
  }

  if (num < 0.0001) {
    return '<0.0001 REV';
  }

  if (num >= 1) {
    return `${num.toFixed(2)} REV`;
  } else if (num >= 0.01) {
    return `${num.toFixed(4)} REV`;
  } else {
    return `${num.toFixed(6)} REV`;
  }
};

/**
 * Formats balance for display in account cards (medium precision)
 * @param balance - The balance value as string or number
 * @returns Formatted balance string
 */
export const formatBalanceCard = (balance: string | number): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  
  if (isNaN(num) || !isFinite(num)) {
    return '0 REV';
  }

  if (num === 0) {
    return '0 REV';
  }

  if (num < 0.000001) {
    return '<0.000001 REV';
  }

  if (num >= 1) {
    return `${num.toFixed(4)} REV`;
  } else if (num >= 0.001) {
    return `${num.toFixed(6)} REV`;
  } else {
    return `${num.toFixed(8)} REV`;
  }
};

/**
 * Formats balance for display on dashboard (high precision)
 * @param balance - The balance value as string or number
 * @returns Formatted balance string
 */
export const formatBalanceDashboard = (balance: string | number): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  
  if (isNaN(num) || !isFinite(num)) {
    return '0 REV';
  }

  if (num === 0) {
    return '0 REV';
  }

  if (num < 0.00000001) {
    return '<0.00000001 REV';
  }

  if (num >= 1000) {
    return `${num.toFixed(2)} REV`;
  } else if (num >= 1) {
    const truncated = Math.floor(num * 100) / 100;
    return `${truncated.toFixed(2)} REV`;
  } else if (num >= 0.01) {
    return `${num.toFixed(6)} REV`;
  } else {
    return `${num.toFixed(8)} REV`;
  }
};
