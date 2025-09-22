/**
 * Truncates text to a specified length, adding ellipsis in the middle
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the truncated text
 * @param ellipsis - The ellipsis character to use (default: '...')
 * @returns Truncated text with ellipsis in the middle
 */
export const truncateText = (text: string, maxLength: number, ellipsis: string = '...'): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }

  if (maxLength <= ellipsis.length) {
    return text.substring(0, maxLength);
  }

  const halfLength = Math.floor((maxLength - ellipsis.length) / 2);
  const start = text.substring(0, halfLength);
  const end = text.substring(text.length - halfLength);
  
  return `${start}${ellipsis}${end}`;
};

/**
 * Truncates text to a specified length, adding ellipsis at the end
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the truncated text
 * @param ellipsis - The ellipsis character to use (default: '...')
 * @returns Truncated text with ellipsis at the end
 */
export const truncateTextEnd = (text: string, maxLength: number, ellipsis: string = '...'): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
};

/**
 * Validates account name length and characters
 * @param name - The account name to validate
 * @param maxLength - Maximum allowed length (default: 30)
 * @returns Object with validation result and error message
 */
export const validateAccountName = (name: string, maxLength: number = 30): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Account name is required' };
  }

  if (name.length > maxLength) {
    return { isValid: false, error: `Account name must be ${maxLength} characters or less` };
  }

  // Check for invalid characters (optional - can be customized)
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return { isValid: false, error: 'Account name contains invalid characters' };
  }

  return { isValid: true };
};
