import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from 'store';
import { logout, updateActivity } from 'store/authSlice';

/**
 * Hook that manages idle timeout and automatic logout
 */
export const useIdleTimer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, idleTimeout } = useSelector((state: RootState) => state.auth);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated || idleTimeout === 0) {
      return;
    }

    const timeoutMs = idleTimeout * 60 * 1000; // Convert minutes to milliseconds

    // Update activity timestamp
    const updateLastActivity = () => {
      lastActivityRef.current = Date.now();
      dispatch(updateActivity());
    };

    // Check for idle timeout
    const checkIdleTimeout = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= timeoutMs) {
        // User has been idle for too long, logout
        dispatch(logout());
        navigate('/login');
      } else {
        // Schedule next check
        const remainingTime = timeoutMs - timeSinceLastActivity;
        timeoutRef.current = setTimeout(checkIdleTimeout, Math.min(remainingTime, 60000)); // Check at least every minute
      }
    };

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    // Start checking for idle timeout
    timeoutRef.current = setTimeout(checkIdleTimeout, 60000); // Check every minute

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated, idleTimeout, dispatch, navigate]);
};