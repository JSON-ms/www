import { useJSONMS } from '../hooks/useJSONMS';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  HeroSection,
  AboutSection,
  SkillsSection,
  ProjectsSection,
  ContactSection,
} from '../sections';

/**
 * `AboutMePage` orchestrates all sections based on the JSON.ms config.
 *
 * - Each section is conditionally rendered via `data.settings.sections.*`
 * - Loading and error states are handled gracefully
 * - All content is driven by JSON.ms data — zero hardcoded text
 */
export function AboutMePage() {
  const { data, loading, error } = useJSONMS();

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading profile…</p>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="error-screen" role="alert">
        <h2>Failed to load profile</h2>
        <p>{error ?? 'No data returned from the JSON.ms endpoint.'}</p>
      </div>
    );
  }

  // ─── Resolved sections config ─────────────────────────────────────────────
  const { sections } = data.settings;
  const { profile, contact } = data;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Sticky-free header — just the theme toggle pinned top-right */}
      <header className="page-header">
        <ThemeToggle />
      </header>

      <main className="page-main" id="main-content">
        {sections.hero && <HeroSection profile={profile} />}
        {sections.about && profile.bio && <AboutSection bio={profile.bio} />}
        {sections.skills && <SkillsSection skills={profile.skills} />}
        {sections.projects && <ProjectsSection projects={profile.projects} />}
        {sections.contact && <ContactSection links={contact.links} />}
      </main>
    </div>
  );
}
