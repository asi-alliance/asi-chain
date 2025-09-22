import { 
  formatBalance, 
  formatBalanceCompact, 
  formatBalanceCard, 
  formatBalanceDashboard 
} from '../balanceUtils';

describe('balanceUtils', () => {
  describe('formatBalance', () => {
    it('should format zero balance', () => {
      expect(formatBalance(0)).toBe('0 REV');
      expect(formatBalance('0')).toBe('0 REV');
      expect(formatBalance(0, { showCurrency: false })).toBe('0');
    });

    it('should format very small numbers', () => {
      expect(formatBalance(0.0000001)).toBe('<0.000001 REV');
      expect(formatBalance(0.0000001, { showCurrency: false })).toBe('<0.000001');
    });

    it('should format large numbers with appropriate precision', () => {
      expect(formatBalance(1234.56789)).toBe('1234.57 REV');
      expect(formatBalance(1234.56789, { maxDecimals: 4 })).toBe('1234.57 REV');
    });

    it('should format small numbers with appropriate precision', () => {
      expect(formatBalance(0.123456789)).toBe('0.1235 REV');
      expect(formatBalance(0.00123456789)).toBe('0.001235 REV');
    });

    it('should handle invalid inputs', () => {
      expect(formatBalance('invalid')).toBe('0 REV');
      expect(formatBalance(NaN)).toBe('0 REV');
      expect(formatBalance(Infinity)).toBe('0 REV');
    });

    it('should respect custom options', () => {
      expect(formatBalance(1.23456789, { maxDecimals: 2 })).toBe('1.23 REV');
      expect(formatBalance(1.23456789, { minDecimals: 6 })).toBe('1.23 REV');
      expect(formatBalance(1.23456789, { showCurrency: false })).toBe('1.23');
    });
  });

  describe('formatBalanceCompact', () => {
    it('should format zero balance', () => {
      expect(formatBalanceCompact(0)).toBe('0 REV');
      expect(formatBalanceCompact('0')).toBe('0 REV');
    });

    it('should format very small numbers', () => {
      expect(formatBalanceCompact(0.00001)).toBe('<0.0001 REV');
    });

    it('should format large numbers with 2 decimals', () => {
      expect(formatBalanceCompact(1234.56789)).toBe('1234.57 REV');
    });

    it('should format medium numbers with 4 decimals', () => {
      expect(formatBalanceCompact(0.123456789)).toBe('0.1235 REV');
    });

    it('should format small numbers with 6 decimals', () => {
      expect(formatBalanceCompact(0.00123456789)).toBe('0.001235 REV');
    });
  });

  describe('formatBalanceCard', () => {
    it('should format zero balance', () => {
      expect(formatBalanceCard(0)).toBe('0 REV');
    });

    it('should format very small numbers', () => {
      expect(formatBalanceCard(0.0000001)).toBe('<0.000001 REV');
    });

    it('should format large numbers with 4 decimals', () => {
      expect(formatBalanceCard(1234.56789)).toBe('1234.5679 REV');
    });

    it('should format medium numbers with 6 decimals', () => {
      expect(formatBalanceCard(0.123456789)).toBe('0.123457 REV');
    });

    it('should format small numbers with 8 decimals', () => {
      expect(formatBalanceCard(0.00123456789)).toBe('0.001235 REV');
    });
  });

  describe('formatBalanceDashboard', () => {
    it('should format zero balance', () => {
      expect(formatBalanceDashboard(0)).toBe('0 REV');
    });

    it('should format very small numbers', () => {
      expect(formatBalanceDashboard(0.000000001)).toBe('<0.00000001 REV');
    });

    it('should format very large numbers with 2 decimals', () => {
      expect(formatBalanceDashboard(12345.6789)).toBe('12345.68 REV');
    });

    it('should format large numbers with 4 decimals', () => {
      expect(formatBalanceDashboard(1234.56789)).toBe('1234.57 REV');
    });

    it('should format medium numbers with 6 decimals', () => {
      expect(formatBalanceDashboard(0.123456789)).toBe('0.123457 REV');
    });

    it('should format small numbers with 8 decimals', () => {
      expect(formatBalanceDashboard(0.00123456789)).toBe('0.00123457 REV');
    });
  });

  describe('edge cases', () => {
    it('should handle string inputs correctly', () => {
      expect(formatBalance('123.456')).toBe('123.46 REV');
      expect(formatBalanceCompact('0.001')).toBe('0.001000 REV');
      expect(formatBalanceCard('0.000001')).toBe('0.00000100 REV');
      expect(formatBalanceDashboard('0.00000001')).toBe('0.00000001 REV');
    });

    it('should handle negative numbers', () => {
      expect(formatBalance(-123.456)).toBe('<0.000001 REV');
      expect(formatBalanceCompact(-0.001)).toBe('<0.0001 REV');
    });

    it('should handle very large numbers', () => {
      expect(formatBalance(999999999.999)).toBe('1000000000 REV');
      expect(formatBalanceCompact(999999999.999)).toBe('1000000000.00 REV');
    });
  });
});
