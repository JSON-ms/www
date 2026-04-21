import React from 'react';
import { useJSONMS } from '../core/useJSONMS';
import { HeroSection } from '../sections/HeroSection';
import { AboutSection } from '../sections/AboutSection';
import { SkillsSection } from '../sections/SkillsSection';
import { ProjectsSection } from '../sections/ProjectsSection';
import { ContactSection } from '../sections/ContactSection';
import { useTheme } from '../theme/useTheme';

export const AboutMePage: React.FC = () => {
  const { data, loading, error } = useJSONMS();
  const { theme, setTheme } = useTheme();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>Loading profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'red', fontSize: '1.25rem' }}>Error loading data. Please check your endpoint.</p>
      </div>
    );
  }

  const { settings, profile } = data;
  const sections = settings.sections;

  return (
    <div className="about-me-page">
      <header 
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '1rem 2rem',
          maxWidth: '48rem',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      <main>
        {sections.hero && <HeroSection profile={profile} />}
        {sections.about && <AboutSection profile={profile} />}
        {sections.skills && <SkillsSection profile={profile} />}
        {sections.projects && <ProjectsSection profile={profile} />}
        {sections.contact && <ContactSection profile={profile} />}
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '2rem 0',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
        }}
      >
        <p>© {new Date().getFullYear()} {profile.name}. All rights reserved.</p>
      </footer>
    </div>
  );
};
