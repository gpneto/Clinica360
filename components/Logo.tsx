import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function Logo({ className = '', size = 24, color = '#89bf47' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Círculo central com cruz - representando saúde/cuidado */}
      <circle cx="32" cy="32" r="28" fill={color} opacity="0.15" />
      <circle cx="32" cy="32" r="20" fill={color} opacity="0.25" />
      
      {/* Linha horizontal central */}
      <line
        x1="12"
        y1="32"
        x2="52"
        y2="32"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Linha vertical central */}
      <line
        x1="32"
        y1="12"
        x2="32"
        y2="52"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Círculo externo decorativo */}
      <circle
        cx="32"
        cy="32"
        r="30"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />
      
      {/* Pontos decorativos nos cantos */}
      <circle cx="16" cy="16" r="2" fill={color} />
      <circle cx="48" cy="16" r="2" fill={color} />
      <circle cx="16" cy="48" r="2" fill={color} />
      <circle cx="48" cy="48" r="2" fill={color} />
    </svg>
  );
}

export default Logo;

