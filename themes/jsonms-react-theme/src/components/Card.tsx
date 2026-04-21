import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  index?: number;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, index = 0 }) => {
  return (
    <motion.div 
      className={`card ${className}`} 
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={onClick ? { y: -5, scale: 1.02 } : { y: -5 }}
      style={{
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: 'var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
      onHoverStart={(e) => {
        const target = e.target as HTMLElement;
        target.style.boxShadow = 'var(--shadow-hover)';
      }}
      onHoverEnd={(e) => {
        const target = e.target as HTMLElement;
        target.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        }}
      />
      {children}
    </motion.div>
  );
};
