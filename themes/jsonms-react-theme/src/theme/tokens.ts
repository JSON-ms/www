/**
 * Design tokens — the single source of truth for spacing, typography,
 * border-radius, and transition speeds. These are theme-agnostic constants.
 */

export const fontFamily = {
  sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '32px',
  xl: '64px',
  '2xl': '96px',
  '3xl': '128px',
} as const;

export const radius = {
  sm: '6px',
  md: '12px',
  lg: '20px',
  xl: '28px',
  full: '9999px',
} as const;

export const transition = {
  fast: '150ms ease',
  base: '250ms ease',
  slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const fontSize = {
  xs: '0.75rem',    //  12px
  sm: '0.875rem',   //  14px
  base: '1rem',     //  16px
  lg: '1.125rem',   //  18px
  xl: '1.25rem',    //  20px
  '2xl': '1.5rem',  //  24px
  '3xl': '1.875rem',//  30px
  '4xl': '2.25rem', //  36px
  '5xl': '3rem',    //  48px
  '6xl': '3.75rem', //  60px
  '7xl': '4.5rem',  //  72px
} as const;

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;
