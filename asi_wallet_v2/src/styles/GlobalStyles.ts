import { createGlobalStyle } from 'styled-components';
import { Theme } from './theme';

export const GlobalStyles = createGlobalStyle<{ theme: Theme }>`
  /* Import modern fonts */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    background: ${({ theme }) => theme.background};
    color: ${({ theme }) => theme.text.primary};
    line-height: 1.5;
    font-weight: 400;
    transition: background-color 0.3s ease, color 0.3s ease;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Typography scale inspired by Qwello */
  h1 {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    margin-bottom: 1.5rem;
  }

  h2 {
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.01em;
    margin-bottom: 1.25rem;
  }

  h3 {
    font-size: 1.75rem;
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 1rem;
  }

  h4 {
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.4;
    margin-bottom: 0.75rem;
  }

  p {
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.text.secondary};
  }

  code {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    background: ${({ theme }) => theme.surface};
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
  }

  a {
    color: ${({ theme }) => theme.primary};
    text-decoration: none;
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.2s ease;
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &:active {
      transform: scale(0.98);
    }
  }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text.primary};
    border: 2px solid ${({ theme }) => theme.border};
    transition: all 0.2s ease;
    outline: none;

    &:focus {
      border-color: ${({ theme }) => theme.primary};
      background: ${({ theme }) => theme.card};
    }

    &::placeholder {
      color: ${({ theme }) => theme.text.tertiary};
    }
  }

  /* Modern scrollbar styling */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.surface};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.border};
    border-radius: 5px;
    
    &:hover {
      background: ${({ theme }) => theme.text.tertiary};
    }
  }

  /* Selection styling */
  ::selection {
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.background};
  }

  /* Focus styles */
  *:focus {
    outline: none;
  }

  *:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  /* Utility classes */
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  .slide-in {
    animation: slideIn 0.3s ease-out;
  }

  /* Glass morphism effect */
  .glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Responsive typography */
  @media (max-width: 768px) {
    html {
      font-size: 14px;
    }

    h1 {
      font-size: 2.5rem;
    }

    h2 {
      font-size: 2rem;
    }

    h3 {
      font-size: 1.5rem;
    }
  }

  /* Disable user select on UI elements */
  button, label {
    user-select: none;
  }

  /* Loading skeleton */
  .skeleton {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.surface} 0px,
      ${({ theme }) => theme.card} 40px,
      ${({ theme }) => theme.surface} 80px
    );
    background-size: 1000px 100%;
    animation: shimmer 1.5s infinite linear;
  }
`;