import React from 'react';
import { Section } from '../components/Section';
import { Profile } from '../types';

interface ContactSectionProps {
  profile: Profile;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ profile }) => {
  return (
    <Section id="contact" title="Contact">
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {profile.email && (
          <p style={{ fontSize: '1.125rem' }}>
            <span style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>Email:</span>
            <a 
              href={`mailto:${profile.email}`}
              style={{
                color: 'var(--color-text)',
                fontWeight: 500,
                textDecoration: 'underline',
              }}
            >
              {profile.email}
            </a>
          </p>
        )}
        
        {profile.social && profile.social.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
              Social
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {profile.social.map((link, index) => (
                <a 
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-text)',
                    textDecoration: 'underline',
                    fontWeight: 500,
                  }}
                >
                  {link.label || link.platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};
