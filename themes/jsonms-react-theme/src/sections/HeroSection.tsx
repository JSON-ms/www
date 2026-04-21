import React from 'react';
import { motion } from 'framer-motion';
import { Section } from '../components/Section';
import { Profile } from '../types';

interface HeroSectionProps {
  profile: Profile;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ profile }) => {
  return (
    <Section id="hero" className="hero-section">
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '2rem',
          paddingTop: '2rem',
        }}
      >
        {profile.avatar && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative' }}
          >
            <div 
              style={{
                position: 'absolute',
                inset: '-10px',
                background: 'var(--color-primary)',
                filter: 'blur(20px)',
                opacity: 0.3,
                borderRadius: 'var(--radius-full)',
                zIndex: -1,
                animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              style={{
                width: '10rem',
                height: '10rem',
                borderRadius: 'var(--radius-full)',
                objectFit: 'cover',
                border: '3px solid var(--color-bg)',
                boxShadow: 'var(--shadow-md)',
              }}
            />
          </motion.div>
        )}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <h1 
            style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: '1rem',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(to right, var(--color-text), var(--color-text-muted))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {profile.name}
          </h1>
          <p 
            style={{
              fontSize: '1.5rem',
              color: 'var(--color-text-muted)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            {profile.role}
          </p>
        </motion.div>
      </div>
    </Section>
  );
};
