import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Loader2 } from 'lucide-react';
import { useJSONMSContext } from '../core/JSONMSProvider';
import { HeroSection } from '../sections/HeroSection';
import { AboutSection } from '../sections/AboutSection';
import { SkillsSection } from '../sections/SkillsSection';
import { ProjectsSection } from '../sections/ProjectsSection';
import { ContactSection } from '../sections/ContactSection';
import { useTheme } from '../theme/useTheme';

export const AboutMePage: React.FC = () => {
  const { data, loading, error } = useJSONMSContext();
  const { theme, setTheme } = useTheme();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={48} color="var(--color-primary)" style={{ animation: 'spin 2s linear infinite' }} />
        <style>
          {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
        </style>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem', fontWeight: 500, letterSpacing: '0.05em' }}>Loading Experience...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: 500 }}>Error loading profile data. Check endpoint.</p>
      </div>
    );
  }

  const { settings, profile } = data;
  const sections = settings.sections;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="about-me-page"
      >
        <header 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '1.5rem 2rem',
            maxWidth: '100vw',
            margin: '0 auto',
            zIndex: 50,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'linear-gradient(to bottom, var(--color-bg), transparent)',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'var(--glass-bg)',
              border: 'var(--glass-border)',
              color: 'var(--color-text)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
        </header>

        <main style={{ paddingTop: '5rem', paddingBottom: '3rem' }}>
          {sections.hero && <HeroSection profile={profile} />}
          {sections.about && <AboutSection profile={profile} />}
          {sections.skills && <SkillsSection profile={profile} />}
          {sections.projects && <ProjectsSection profile={profile} />}
          {sections.contact && <ContactSection profile={profile} />}
        </main>

        <footer
          style={{
            textAlign: 'center',
            padding: '3rem 0',
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
            borderTop: '1px solid var(--color-border)',
            maxWidth: '52rem',
            margin: '0 auto',
          }}
        >
          <p>© {new Date().getFullYear()} {profile.name}. Designed with JSON.ms</p>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
};
