import React from 'react';
import { Section } from '../components/Section';
import { Profile } from '../types';

interface AboutSectionProps {
  profile: Profile;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ profile }) => {
  if (!profile.bio) return null;

  return (
    <Section id="about" title="About">
      <p 
        style={{
          fontSize: '1.125rem',
          lineHeight: 1.75,
          color: 'var(--color-text)',
        }}
      >
        {profile.bio}
      </p>
    </Section>
  );
};
