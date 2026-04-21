import React, { ReactNode } from 'react';

interface SectionProps {
  id?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ id, title, children, className = '' }) => {
  return (
    <section 
      id={id} 
      className={`section ${className}`}
      style={{
        padding: '4rem 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div 
        style={{
          maxWidth: '48rem',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {title && (
          <h2 
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '2rem',
              color: 'var(--color-text)',
              letterSpacing: '-0.025em',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
};
