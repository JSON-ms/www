import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { themes } from './themes';
import { fontFamily, radius, transition } from './tokens';
import type { ThemeMode, ThemeTokens } from '../types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  mode: ThemeMode;
  tokens: ThemeTokens;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  tokens: themes.dark,
  toggle: () => {},
  setMode: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
  children: ReactNode;
}

/**
 * `ThemeProvider` writes theme tokens to CSS custom properties on `:root`
 * and exposes them to children via `useThemeContext()`.
 *
 * Pair it with `useTheme()` to get a controllable theme toggle.
 *
 * @example
 * const { mode, toggle, setMode } = useTheme();
 * return (
 *   <ThemeProvider mode={mode} toggle={toggle} setMode={setMode}>
 *     <App />
 *   </ThemeProvider>
 * );
 */
export function ThemeProvider({ mode, toggle, setMode, children }: ThemeProviderProps) {
  const tokens = themes[mode];

  useEffect(() => {
    const root = document.documentElement;

    // Color tokens
    root.style.setProperty('--color-bg', tokens.background);
    root.style.setProperty('--color-surface', tokens.surface);
    root.style.setProperty('--color-surface-hover', tokens.surfaceHover);
    root.style.setProperty('--color-text', tokens.text);
    root.style.setProperty('--color-text-muted', tokens.textMuted);
    root.style.setProperty('--color-primary', tokens.primary);
    root.style.setProperty('--color-primary-hover', tokens.primaryHover);
    root.style.setProperty('--color-border', tokens.border);
    root.style.setProperty('--shadow-card', tokens.cardShadow);
    root.style.setProperty('--glass-bg', tokens.glassBackground);
    root.style.setProperty('--glass-border', tokens.glassBorder);

    // Typography tokens
    root.style.setProperty('--font-sans', fontFamily.sans);
    root.style.setProperty('--font-mono', fontFamily.mono);

    // Radius tokens
    root.style.setProperty('--radius-sm', radius.sm);
    root.style.setProperty('--radius-md', radius.md);
    root.style.setProperty('--radius-lg', radius.lg);
    root.style.setProperty('--radius-xl', radius.xl);
    root.style.setProperty('--radius-full', radius.full);

    // Transition tokens
    root.style.setProperty('--transition-fast', transition.fast);
    root.style.setProperty('--transition-base', transition.base);
    root.style.setProperty('--transition-slow', transition.slow);

    // Mode attribute for any CSS [data-theme="dark"] selectors
    root.setAttribute('data-theme', mode);
  }, [mode, tokens]);

  return (
    <ThemeContext.Provider value={{ mode, tokens, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

/**
 * Reads the current theme tokens and mode from `ThemeProvider`.
 * Must be used inside a `<ThemeProvider>`.
 */
export function useThemeContext() {
  return useContext(ThemeContext);
}
