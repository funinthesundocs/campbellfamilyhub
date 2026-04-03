import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ThemeSettings } from '../types';

type Theme = 'original' | 'light' | 'dark' | 'custom';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark' | 'original' | 'custom';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function applyThemeColors(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', theme.bg_primary);
  root.style.setProperty('--bg-secondary', theme.bg_secondary);
  root.style.setProperty('--bg-tertiary', theme.bg_tertiary);
  root.style.setProperty('--text-primary', theme.text_primary);
  root.style.setProperty('--text-secondary', theme.text_secondary);
  root.style.setProperty('--text-muted', theme.text_muted);
  root.style.setProperty('--accent-primary', theme.accent_primary);
  root.style.setProperty('--accent-secondary', theme.accent_secondary);
  root.style.setProperty('--border-default', theme.border_default);
  root.style.setProperty('--border-interactive', theme.border_interactive);

  root.style.setProperty('--accent-primary-rgb', hexToRgb(theme.accent_primary));
  root.style.setProperty('--accent-secondary-rgb', hexToRgb(theme.accent_secondary));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState<Theme>(theme);

  useEffect(() => {
    const root = document.documentElement;

    const loadTheme = async () => {
      const { data, error } = await supabase
        .from('theme_settings')
        .select('*')
        .eq('theme_name', theme)
        .maybeSingle();

      if (data && !error) {
        applyThemeColors(data as ThemeSettings);
        setResolvedTheme(theme);
        root.classList.remove('light', 'dark', 'original', 'custom');
        root.classList.add(theme);
      } else {
        root.classList.remove('light', 'dark', 'original', 'custom');
        root.classList.add(theme);
        setResolvedTheme(theme);
      }
    };

    loadTheme();
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
