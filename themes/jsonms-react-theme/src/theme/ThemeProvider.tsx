import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useJSONMSContext } from '../core/JSONMSProvider';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { data } = useJSONMSContext();
  
  // Default to system, but override if JSON.ms provides a preference
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    if (data?.settings?.theme) {
      setTheme(data.settings.theme);
    }
  }, [data?.settings?.theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (t: Theme) => {
      root.removeAttribute('data-theme');
      
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') {
          root.setAttribute('data-theme', 'dark');
        }
      } else if (t === 'dark') {
        root.setAttribute('data-theme', 'dark');
      }
    };

    applyTheme(theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
