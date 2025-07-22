import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { pairWithUri } from '../store/walletConnectSlice';

export const useDeepLink = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Check URL parameters on mount and location change
    const params = new URLSearchParams(location.search);
    
    // Handle WalletConnect URI
    const uri = params.get('uri');
    if (uri && uri.startsWith('wc:')) {
      // Navigate to dashboard and open WalletConnect modal
      navigate('/');
      
      // Dispatch after a short delay to ensure components are mounted
      setTimeout(() => {
        dispatch(pairWithUri(uri));
      }, 500);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle custom actions
    const action = params.get('action');
    if (action) {
      handleCustomAction(action);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location, navigate, dispatch]);

  const handleCustomAction = (action: string) => {
    // Parse action string (e.g., "send?to=address&amount=100")
    const [actionType, actionParams] = action.split('?');
    const params = new URLSearchParams(actionParams || '');
    
    switch (actionType) {
      case 'send':
        navigate('/send', { 
          state: { 
            to: params.get('to'), 
            amount: params.get('amount') 
          } 
        });
        break;
      case 'connect':
        navigate('/');
        // Trigger WalletConnect modal
        setTimeout(() => {
          const event = new CustomEvent('open_walletconnect_modal');
          window.dispatchEvent(event);
        }, 500);
        break;
      default:
        console.log('Unknown action:', actionType);
    }
  };
};