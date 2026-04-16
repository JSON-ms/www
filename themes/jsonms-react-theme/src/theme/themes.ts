import type { ThemeTokens } from '../types';

/**
 * Built-in light and dark theme token sets.
 * Use `extendTheme()` to create custom variants.
 */
export const themes: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    background: '#f2f2f8',
    surface: '#ffffff',
    surfaceHover: '#eeeef8',
    text: '#0c0c1d',
    textMuted: '#6b7280',
    primary: '#6c63ff',
    primaryHover: '#5a52e8',
    border: '#e0e0ee',
    cardShadow: '0 4px 32px rgba(108, 99, 255, 0.1), 0 1px 4px rgba(0,0,0,0.06)',
    glassBackground: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(108, 99, 255, 0.18)',
  },
  dark: {
    background: '#07070f',
    surface: '#0f0f1c',
    surfaceHover: '#17172a',
    text: '#eaeaf8',
    textMuted: '#888899',
    primary: '#6c63ff',
    primaryHover: '#7d75ff',
    border: '#1e1e35',
    cardShadow: '0 4px 40px rgba(0, 0, 0, 0.6), 0 1px 4px rgba(0,0,0,0.4)',
    glassBackground: 'rgba(15, 15, 28, 0.72)',
    glassBorder: 'rgba(108, 99, 255, 0.22)',
  },
};

/**
 * Create a custom theme variant by extending a built-in base.
 *
 * @example
 * const myTheme = extendTheme('dark', { primary: '#ff6584' });
 */
export function extendTheme(
  base: 'light' | 'dark',
  overrides: Partial<ThemeTokens>
): ThemeTokens {
  return { ...themes[base], ...overrides };
}
