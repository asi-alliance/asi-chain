// ASI Wallet Brand Guide v0.1 - Dark theme (default)
export const darkTheme = {
  // New nested colors structure for components expecting theme.colors
  colors: {
    primary: '#93E27C', // ASI Lime - Logos, primary CTAs, confirmed states
    primaryDark: '#82C96D', // Darkened ASI Lime for hover states
    secondary: '#33E4FF', // ASI Pulse Blue - AI insights, live updates
    danger: '#FF4D4F', // Alert Red - Errors, critical warnings
    success: '#93E27C', // Using ASI Lime for success states
    warning: '#FFB84D',
    info: '#33E4FF', // Using ASI Pulse Blue for info
    error: '#FF4D4F', // Same as danger
    border: '#272B2E', // Using Charcoal 500 for borders
    borderLight: 'rgba(255, 255, 255, 0.1)', // For glass effects
    
    // Nested background colors
    background: {
      primary: '#0D1012', // Deep Space - Global background
      secondary: '#1B1F21', // Charcoal 700 - Card/modal surfaces
      tertiary: '#272B2E', // Charcoal 500 - Tertiary surfaces
    },
    
    // Nested text colors
    text: {
      primary: '#F7F9FA', // Off-White - High readability text
      secondary: '#b8b8b8', // Secondary text
      tertiary: '#757575', // Tertiary text
      inverse: '#0D1012', // Deep Space for text on light backgrounds
    },
  },
  
  // Keep old structure for backward compatibility
  primary: '#93E27C', // ASI Lime - Logos, primary CTAs, confirmed states
  primaryDark: '#82C96D', // Darkened ASI Lime for hover states
  secondary: '#33E4FF', // ASI Pulse Blue - AI insights, live updates
  danger: '#FF4D4F', // Alert Red - Errors, critical warnings
  success: '#93E27C', // Using ASI Lime for success states
  warning: '#FFB84D',
  info: '#33E4FF', // Using ASI Pulse Blue for info
  
  // Core colors - ASI Wallet surfaces
  background: '#0D1012', // Deep Space - Global background
  surface: '#1B1F21', // Charcoal 700 - Card/modal surfaces
  card: '#1B1F21', // Charcoal 700 - Card surfaces
  
  // Text colors - ASI Wallet
  text: {
    primary: '#F7F9FA', // Off-White - High readability text
    secondary: '#b8b8b8', // Secondary text
    tertiary: '#757575', // Tertiary text
    inverse: '#0D1012', // Deep Space for text on light backgrounds
  },
  
  // UI elements
  inputBg: '#272B2E', // Charcoal 500 - Secondary buttons, inputs
  
  // Borders and shadows
  border: '#272B2E', // Using Charcoal 500 for borders
  borderLight: 'rgba(255, 255, 255, 0.1)', // For glass effects
  shadow: '0 1px 4px rgba(0, 0, 0, 0.32)', // Elevation 1
  shadowLarge: '0 4px 12px rgba(0, 0, 0, 0.36)', // Elevation 2
  
  // Additional colors
  error: '#FF4D4F', // Same as danger
  textSecondary: '#b8b8b8', // Same as text.secondary
  
  // Modern gradients
  gradient: {
    primary: 'linear-gradient(135deg, #93E27C 0%, #82C96D 100%)', // ASI Lime gradient
    secondary: 'linear-gradient(135deg, #33E4FF 0%, #00B8D4 100%)', // ASI Pulse Blue gradient
    dark: 'linear-gradient(135deg, #1B1F21 0%, #0D1012 100%)', // Deep Space gradient
  },
};

// Light theme - ASI Wallet Brand Guide v0.1
export const lightTheme = {
  // New nested colors structure for components expecting theme.colors
  colors: {
    primary: '#5A9C4F', // Darker ASI Lime for light mode contrast
    primaryDark: '#4A8240',
    secondary: '#00A3CC', // Darker ASI Pulse Blue for light mode
    danger: '#E43A3C', // Darker Alert Red for light mode
    success: '#5A9C4F',
    warning: '#f57c00',
    info: '#00A3CC',
    error: '#E43A3C', // Same as danger
    border: '#E0E4E6',
    borderLight: 'rgba(0, 0, 0, 0.05)',
    
    // Nested background colors
    background: {
      primary: '#F7F9FA', // Off-White as background in light mode
      secondary: '#FFFFFF',
      tertiary: '#F0F2F3',
    },
    
    // Nested text colors
    text: {
      primary: '#0D1012', // Deep Space for primary text
      secondary: '#5a5a5a',
      tertiary: '#757575',
      inverse: '#F7F9FA', // Off-White for inverse text
    },
  },
  
  // Keep old structure for backward compatibility
  primary: '#5A9C4F', // Darker ASI Lime for light mode contrast
  primaryDark: '#4A8240',
  secondary: '#00A3CC', // Darker ASI Pulse Blue for light mode
  danger: '#E43A3C', // Darker Alert Red for light mode
  success: '#5A9C4F',
  warning: '#f57c00',
  info: '#00A3CC',
  
  // Light mode surfaces
  background: '#F7F9FA', // Off-White as background in light mode
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Text colors for light mode
  text: {
    primary: '#0D1012', // Deep Space for primary text
    secondary: '#5a5a5a',
    tertiary: '#757575',
    inverse: '#F7F9FA', // Off-White for inverse text
  },
  
  // UI elements
  inputBg: '#F0F2F3', // Light grey for inputs
  
  // Borders and shadows
  border: '#E0E4E6',
  borderLight: 'rgba(0, 0, 0, 0.05)',
  shadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
  shadowLarge: '0 4px 12px rgba(0, 0, 0, 0.12)',
  
  // Additional colors
  error: '#E43A3C', // Same as danger
  textSecondary: '#5a5a5a', // Same as text.secondary
  
  // Gradients adapted for light mode
  gradient: {
    primary: 'linear-gradient(135deg, #5A9C4F 0%, #6BB05E 100%)',
    secondary: 'linear-gradient(135deg, #00A3CC 0%, #33B8DB 100%)',
    dark: 'linear-gradient(135deg, #FFFFFF 0%, #F7F9FA 100%)',
  },
};

export type Theme = typeof lightTheme;