import { useCallback, useState } from 'react';
import type { ThemeMode } from '../types';

const STORAGE_KEY = 'jsonms-theme-mode';

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // SSR or restricted localStorage — silently fall back
  }
  return 'dark';
}

/**
 * Hook for managing the light/dark theme mode.
 * Persists selection in localStorage and respects the OS preference on first load.
 *
 * @returns `{ mode, toggle, setMode }`
 *
 * @example
 * const { mode, toggle } = useTheme();
 * return <button onClick={toggle}>{mode === 'dark' ? '☀️' : '🌙'}</button>;
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // ignore write errors
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  return { mode, toggle, setMode };
}
