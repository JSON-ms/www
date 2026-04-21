import React from 'react';
import { Section } from '../components/Section';
import { Profile } from '../types';

interface AboutSectionProps {
  profile: Profile;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ profile }) => {
  if (!profile.bio) return null;

  return (
    <Section id="about" title="About Me">
      <p 
        style={{
          fontSize: '1.25rem',
          lineHeight: 1.8,
          color: 'var(--color-text)',
          fontWeight: 400,
        }}
      >
        {profile.bio}
      </p>
    </Section>
  );
};
