import React from 'react';

interface ASILogoProps {
  width?: number;
  height?: number;
  color?: string;
}

export const ASILogo: React.FC<ASILogoProps> = ({ 
  width = 40, 
  height = 40, 
  color = 'currentColor' 
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ASI Alliance Logo - Simplified version matching the official design */}
      <g>
        {/* Top nodes */}
        <circle cx="6" cy="4" r="3.5" />
        <circle cx="18" cy="4" r="3.5" />
        
        {/* Middle nodes */}
        <circle cx="3" cy="12" r="2.5" />
        <circle cx="21" cy="12" r="2.5" />
        
        {/* Center node */}
        <circle cx="12" cy="12" r="2" />
        
        {/* Bottom nodes */}
        <circle cx="6" cy="20" r="3.5" />
        <circle cx="18" cy="20" r="3.5" />
        
        {/* Connecting curves - organic shapes between nodes */}
        <path d="M 6 7.5 Q 9 9.5 10 12 Q 9 9.5 6 7.5 C 4.5 6.5 3.5 7 3.5 9.5 C 3.5 7 4.5 6.5 6 7.5" />
        <path d="M 18 7.5 Q 15 9.5 14 12 Q 15 9.5 18 7.5 C 19.5 6.5 20.5 7 20.5 9.5 C 20.5 7 19.5 6.5 18 7.5" />
        <path d="M 6 16.5 Q 9 14.5 10 12 Q 9 14.5 6 16.5 C 4.5 17.5 3.5 17 3.5 14.5 C 3.5 17 4.5 17.5 6 16.5" />
        <path d="M 18 16.5 Q 15 14.5 14 12 Q 15 14.5 18 16.5 C 19.5 17.5 20.5 17 20.5 14.5 C 20.5 17 19.5 17.5 18 16.5" />
      </g>
    </svg>
  );
};