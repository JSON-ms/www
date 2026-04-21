import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '' }) => {
  return (
    <span 
      className={`badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text)',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.875rem',
        fontWeight: 500,
        border: '1px solid var(--color-border)',
      }}
    >
      {children}
    </span>
  );
};
