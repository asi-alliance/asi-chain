import React from 'react';
import { AnimatePresence as FramerAnimatePresence } from 'framer-motion';

// Wrapper to fix TypeScript issues with AnimatePresence in React 19
export const AnimatePresence: React.FC<{
  children: React.ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  initial?: boolean;
  custom?: any;
  exitBeforeEnter?: boolean;
  onExitComplete?: () => void;
}> = ({ children, ...props }) => {
  return (
    <>
      {/* @ts-ignore - TypeScript issue with framer-motion v11 and React 19 */}
      <FramerAnimatePresence {...props}>
        {children}
      </FramerAnimatePresence>
    </>
  );
};

export default AnimatePresence;