/**
 * Environment variable helper that supports both build-time and runtime configuration
 */

declare global {
  interface Window {
    _env_?: {
      REACT_APP_WALLETCONNECT_PROJECT_ID?: string;
      REACT_APP_RCHAIN_HTTP_URL?: string;
      REACT_APP_RCHAIN_GRPC_URL?: string;
      REACT_APP_RCHAIN_READONLY_URL?: string;
    };
  }
}

export const getEnvVar = (key: string): string | undefined => {
  // First check runtime env (injected by Docker)
  if (window._env_ && window._env_[key as keyof typeof window._env_]) {
    return window._env_[key as keyof typeof window._env_];
  }
  
  // Fall back to build-time env
  return process.env[key];
};

export const env = {
  WALLETCONNECT_PROJECT_ID: getEnvVar('REACT_APP_WALLETCONNECT_PROJECT_ID') || '4c8ec18817ffbbce4b824f14928d0f8b',
  RCHAIN_HTTP_URL: getEnvVar('REACT_APP_RCHAIN_HTTP_URL') || 'http://localhost:40403',
  RCHAIN_GRPC_URL: getEnvVar('REACT_APP_RCHAIN_GRPC_URL') || 'http://localhost:40401',
  RCHAIN_READONLY_URL: getEnvVar('REACT_APP_RCHAIN_READONLY_URL') || 'http://localhost:40403',
};