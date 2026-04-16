import type {
  JSONMSConfig,
  JSONMSSettings,
  ProfileData,
  ContactData,
  SectionVisibility,
} from '../types';

// ─── Default fallbacks (safe empty state) ────────────────────────────────────

const defaultSections: SectionVisibility = {
  hero: true,
  about: true,
  skills: true,
  projects: true,
  contact: true,
};

const defaultSettings: JSONMSSettings = {
  theme: 'dark',
  sections: defaultSections,
};

const defaultProfile: ProfileData = {
  name: '',
  role: '',
  bio: '',
  avatar: '',
  skills: [],
  projects: [],
};

const defaultContact: ContactData = {
  links: [],
};

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Normalizes a raw API response (any shape) into a fully typed JSONMSConfig.
 * Missing fields fall back to safe defaults.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeData(raw: Record<string, any>): JSONMSConfig {
  return {
    settings: {
      ...defaultSettings,
      ...(raw.settings ?? {}),
      sections: {
        ...defaultSections,
        ...(raw.settings?.sections ?? {}),
      },
    },
    profile: {
      ...defaultProfile,
      ...(raw.profile ?? {}),
    },
    contact: {
      ...defaultContact,
      ...(raw.contact ?? {}),
    },
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

/**
 * Fetches JSON data from a JSON.ms API endpoint and normalizes it.
 *
 * @param endpoint - Full URL or relative path to the data source.
 *                   Set VITE_JSONMS_ENDPOINT in .env to configure.
 */
export async function fetchJSONMSData(endpoint: string): Promise<JSONMSConfig> {
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `JSON.ms fetch failed: ${response.status} ${response.statusText} — ${endpoint}`
    );
  }

  const raw = await response.json();
  return normalizeData(raw);
}
