import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '', index = 0 }) => {
  return (
    <motion.span 
      className={`badge ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 + 0.2 }}
      whileHover={{ scale: 1.05, backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-text)' }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.35rem 1rem',
        backgroundColor: 'var(--color-bg-secondary)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        color: 'var(--color-text)',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.875rem',
        fontWeight: 600,
        border: 'var(--glass-border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'background-color 0.2s ease, color 0.2s ease',
        cursor: 'default',
      }}
    >
      {children}
    </motion.span>
  );
};
