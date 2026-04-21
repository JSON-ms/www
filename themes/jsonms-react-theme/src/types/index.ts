export interface Skill {
  name: string;
  level?: string;
  icon?: string; // Optional URL or identifier
}

export interface Project {
  title: string;
  description: string;
  url?: string;
  repository?: string;
  image?: string;
  tags?: string[];
}

export interface SocialLink {
  platform: string;
  url: string;
  label?: string;
}

export interface Profile {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  email?: string;
  location?: string;
  skills: Skill[];
  projects: Project[];
  social: SocialLink[];
}

export interface SectionSettings {
  hero: boolean;
  about: boolean;
  skills: boolean;
  projects: boolean;
  contact: boolean;
}

export interface ThemeSettings {
  theme: 'light' | 'dark' | 'system';
  sections: SectionSettings;
}

export interface JSONMSData {
  settings: ThemeSettings;
  profile: Profile;
}
