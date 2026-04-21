import { parse } from 'yaml';
import { JSONMSData } from '../types';

export const parseData = (text: string): any => {
  try {
    const trimmed = text.trim();
    let parsed: any;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      parsed = JSON.parse(trimmed);
    } else {
      parsed = parse(trimmed);
    }

    return normalizeData(parsed);
  } catch (error) {
    console.error('Failed to parse data:', error);
    throw new Error('Data parsing failed. Ensure it is valid JSON or YAML.');
  }
};

const normalizeData = (data: any): JSONMSData => {
  // Ensure the object has the required structure even if fields are missing
  return {
    settings: {
      theme: data?.settings?.theme || 'system',
      sections: {
        hero: !!data?.settings?.sections?.hero,
        about: !!data?.settings?.sections?.about,
        skills: !!data?.settings?.sections?.skills,
        projects: !!data?.settings?.sections?.projects,
        contact: !!data?.settings?.sections?.contact,
      },
    },
    profile: {
      name: data?.profile?.name || '',
      role: data?.profile?.role || '',
      bio: data?.profile?.bio || '',
      avatar: data?.profile?.avatar || '',
      email: data?.profile?.email || '',
      location: data?.profile?.location || '',
      skills: data?.profile?.skills || [],
      projects: data?.profile?.projects || [],
      social: data?.profile?.social || [],
    },
  };
};
