import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    // Brand colors
    primary: string;
    primaryDark: string;
    secondary: string;
    danger: string;
    warning: string;
    success: string;
    info: string;
    
    // Core colors
    background: string;
    surface: string;
    card: string;
    
    // Text colors
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    
    // UI elements
    inputBg: string;
    
    // Borders and shadows
    border: string;
    borderLight: string;
    shadow: string;
    shadowLarge: string;
    
    // Additional theme properties
    error: string;
    textSecondary: string;
    
    // Gradients
    gradient: {
      primary: string;
      secondary: string;
      dark: string;
    };
  }
}