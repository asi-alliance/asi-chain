import { truncateText, truncateTextEnd, validateAccountName } from '../textUtils';

describe('textUtils', () => {
  describe('truncateText', () => {
    it('should return original text if shorter than max length', () => {
      expect(truncateText('Short', 10)).toBe('Short');
      expect(truncateText('', 10)).toBe('');
    });

    it('should truncate text with ellipsis in the middle', () => {
      expect(truncateText('Very Long Account Name That Should Be Truncated', 20)).toBe('Very Lon...runcated');
      expect(truncateText('This is a very long account name', 15)).toBe('This i...t name');
    });

    it('should handle edge cases', () => {
      expect(truncateText('Test', 3)).toBe('Tes');
      expect(truncateText('Test', 4)).toBe('Test');
      expect(truncateText('Test', 2)).toBe('Te');
    });

    it('should use custom ellipsis', () => {
      expect(truncateText('Very Long Name', 10, '...')).toBe('Ver...ame');
      expect(truncateText('Very Long Name', 10, '..')).toBe('Very..Name');
    });
  });

  describe('truncateTextEnd', () => {
    it('should return original text if shorter than max length', () => {
      expect(truncateTextEnd('Short', 10)).toBe('Short');
      expect(truncateTextEnd('', 10)).toBe('');
    });

    it('should truncate text with ellipsis at the end', () => {
      expect(truncateTextEnd('Very Long Account Name', 15)).toBe('Very Long Ac...');
      expect(truncateTextEnd('This is a test', 10)).toBe('This is...');
    });

    it('should handle edge cases', () => {
      expect(truncateTextEnd('Test', 3)).toBe('...');
      expect(truncateTextEnd('Test', 4)).toBe('Test');
    });
  });

  describe('validateAccountName', () => {
    it('should validate empty names', () => {
      expect(validateAccountName('')).toEqual({
        isValid: false,
        error: 'Account name is required'
      });
      expect(validateAccountName('   ')).toEqual({
        isValid: false,
        error: 'Account name is required'
      });
    });

    it('should validate name length', () => {
      const longName = 'A'.repeat(31);
      expect(validateAccountName(longName)).toEqual({
        isValid: false,
        error: 'Account name must be 30 characters or less'
      });
    });

    it('should validate valid names', () => {
      expect(validateAccountName('Valid Name')).toEqual({
        isValid: true
      });
      expect(validateAccountName('A'.repeat(30))).toEqual({
        isValid: true
      });
    });

    it('should validate invalid characters', () => {
      expect(validateAccountName('Invalid<Name')).toEqual({
        isValid: false,
        error: 'Account name contains invalid characters'
      });
      expect(validateAccountName('Invalid:Name')).toEqual({
        isValid: false,
        error: 'Account name contains invalid characters'
      });
      expect(validateAccountName('Invalid/Name')).toEqual({
        isValid: false,
        error: 'Account name contains invalid characters'
      });
    });

    it('should use custom max length', () => {
      const longName = 'A'.repeat(21);
      expect(validateAccountName(longName, 20)).toEqual({
        isValid: false,
        error: 'Account name must be 20 characters or less'
      });
    });
  });
});
