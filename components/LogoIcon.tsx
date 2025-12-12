import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number;
  color?: string;
  variant?: 'default' | 'simple' | 'full';
}

export function LogoIcon({ 
  className = '', 
  size = 24, 
  color = '#89bf47',
  variant = 'default'
}: LogoIconProps) {
  if (variant === 'simple') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Versão simples: círculos conectados */}
        <circle cx="20" cy="32" r="8" fill={color} />
        <circle cx="32" cy="32" r="8" fill={color} />
        <circle cx="44" cy="32" r="8" fill={color} />
        <line x1="28" y1="32" x2="36" y2="32" stroke="white" strokeWidth="2" />
        <line x1="40" y1="32" x2="48" y2="32" stroke="white" strokeWidth="2" />
      </svg>
    );
  }

  if (variant === 'full') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        
        {/* Círculos principais */}
        <circle cx="20" cy="32" r="10" fill="url(#logoGradient)" />
        <circle cx="32" cy="32" r="10" fill="url(#logoGradient)" />
        <circle cx="44" cy="32" r="10" fill="url(#logoGradient)" />
        
        {/* Linhas de conexão */}
        <line x1="30" y1="32" x2="34" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="32" x2="46" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round" />
        
        {/* Círculos internos */}
        <circle cx="20" cy="32" r="5" fill="white" fillOpacity="0.3" />
        <circle cx="32" cy="32" r="5" fill="white" fillOpacity="0.3" />
        <circle cx="44" cy="32" r="5" fill="white" fillOpacity="0.3" />
      </svg>
    );
  }

  // Versão default: design moderno com elementos organizados
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fundo circular */}
      <circle cx="32" cy="32" r="30" fill={color} />
      
      {/* Elementos organizados - representando gestão integrada */}
      {/* Quadrado superior esquerdo */}
      <rect x="18" y="18" width="10" height="10" rx="2" fill="white" fillOpacity="0.9" />
      
      {/* Círculo central */}
      <circle cx="32" cy="32" r="6" fill="white" fillOpacity="0.9" />
      
      {/* Quadrado inferior direito */}
      <rect x="36" y="36" width="10" height="10" rx="2" fill="white" fillOpacity="0.9" />
      
      {/* Linhas de conexão */}
      <line x1="28" y1="23" x2="28" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="36" x2="36" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      
      {/* Anel decorativo */}
      <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="1.5" fill="none" opacity="0.2" />
    </svg>
  );
}

export default LogoIcon;
