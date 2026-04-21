import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

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
        padding: '5rem 0',
        position: 'relative',
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          maxWidth: '52rem', // Slightly wider for a premium feel
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {title && (
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '2.5rem',
              color: 'var(--color-text)',
              letterSpacing: '-0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <span style={{ width: '2rem', height: '2px', backgroundColor: 'var(--color-primary)', display: 'block', borderRadius: '2px' }} />
            {title}
          </motion.h2>
        )}
        {children}
      </motion.div>
    </section>
  );
};
