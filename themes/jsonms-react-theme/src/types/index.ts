// ─── Theme ───────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  border: string;
  cardShadow: string;
  glassBackground: string;
  glassBorder: string;
}

// ─── Data Shapes ─────────────────────────────────────────────────────────────

export interface Project {
  title: string;
  description: string;
  tags: string[];
  url?: string;
  stars?: number;
}

export interface ContactLink {
  label: string;
  href: string;
  /** Supported: 'github' | 'linkedin' | 'twitter' | 'mail' | 'globe' | any custom string */
  icon: string;
}

export interface SectionVisibility {
  hero: boolean;
  about: boolean;
  skills: boolean;
  projects: boolean;
  contact: boolean;
}

export interface JSONMSSettings {
  theme: ThemeMode;
  sections: SectionVisibility;
}

export interface ProfileData {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  skills: string[];
  projects: Project[];
}

export interface ContactData {
  links: ContactLink[];
}

// ─── Top-Level API Shape ─────────────────────────────────────────────────────

export interface JSONMSConfig {
  settings: JSONMSSettings;
  profile: ProfileData;
  contact: ContactData;
}

// ─── Context State ────────────────────────────────────────────────────────────

export interface JSONMSState {
  data: JSONMSConfig | null;
  loading: boolean;
  error: string | null;
}
