import React from 'react';
import { Mail, GitBranch, MessageCircle, Users, Link as LinkIcon, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Section } from '../components/Section';
import { Profile } from '../types';

interface ContactSectionProps {
  profile: Profile;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ profile }) => {
  const getIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('github')) return <GitBranch size={20} />;
    if (p.includes('twitter')) return <MessageCircle size={20} />;
    if (p.includes('linkedin')) return <Users size={20} />;
    return <LinkIcon size={20} />;
  };

  return (
    <Section id="contact" title="Get in Touch">
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {profile.email && (
            <motion.a 
              href={`mailto:${profile.email}`}
              whileHover={{ x: 5, color: 'var(--color-primary)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1.25rem',
                color: 'var(--color-text)',
                fontWeight: 500,
                textDecoration: 'none',
                width: 'fit-content',
              }}
            >
              <Mail size={24} style={{ color: 'var(--color-text-muted)' }} />
              {profile.email}
            </motion.a>
          )}
          {profile.location && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1.125rem',
                color: 'var(--color-text-muted)',
              }}
            >
              <MapPin size={24} />
              {profile.location}
            </div>
          )}
        </div>
        
        {profile.social && profile.social.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Social Profiles
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              {profile.social.map((link, index) => (
                <motion.a 
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, color: 'var(--color-primary)' }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--color-text)',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  {getIcon(link.platform)}
                  {link.label || link.platform}
                </motion.a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};
