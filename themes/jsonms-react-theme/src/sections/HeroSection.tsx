import React from 'react';
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
          gap: '1.5rem',
        }}
      >
        {profile.avatar && (
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            style={{
              width: '8rem',
              height: '8rem',
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
              border: '2px solid var(--color-border)',
            }}
          />
        )}
        <div>
          <h1 
            style={{
              fontSize: '3rem',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '0.5rem',
              letterSpacing: '-0.05em',
            }}
          >
            {profile.name}
          </h1>
          <p 
            style={{
              fontSize: '1.25rem',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            {profile.role}
          </p>
        </div>
      </div>
    </Section>
  );
};
