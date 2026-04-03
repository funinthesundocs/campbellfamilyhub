import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../ui/Card';
import ColorPicker from './ColorPicker';
import type { ThemeSettings } from '../../types';
import { Palette } from 'lucide-react';

type ThemeName = 'original' | 'dark' | 'light';

const themeLabels: Record<ThemeName, string> = {
  original: 'Gray',
  dark: 'Dark',
  light: 'Light',
};

const colorFields: Array<{ key: keyof Omit<ThemeSettings, 'id' | 'theme_name' | 'updated_at'>; label: string }> = [
  { key: 'bg_primary', label: 'Primary Background' },
  { key: 'bg_secondary', label: 'Secondary Background' },
  { key: 'bg_tertiary', label: 'Tertiary Background' },
  { key: 'text_primary', label: 'Primary Text' },
  { key: 'text_secondary', label: 'Secondary Text' },
  { key: 'text_muted', label: 'Muted Text' },
  { key: 'accent_primary', label: 'Primary Accent' },
  { key: 'accent_secondary', label: 'Secondary Accent' },
  { key: 'border_default', label: 'Border Color' },
  { key: 'border_interactive', label: 'Interactive Border' },
];

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function applyThemeToDocument(theme: ThemeSettings) {
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

export default function ThemeManager() {
  const [themes, setThemes] = useState<Record<ThemeName, ThemeSettings | null>>({
    light: null,
    dark: null,
    original: null,
  });
  const [activeTheme, setActiveTheme] = useState<ThemeName>('light');
  const [loading, setLoading] = useState(true);
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('theme_settings')
      .select('*')
      .order('theme_name');

    if (error) {
      showError('Failed to load theme settings');
    } else if (data) {
      const themeMap: Record<ThemeName, ThemeSettings | null> = {
        light: null,
        dark: null,
        original: null,
      };
      data.forEach((theme) => {
        const themeName = theme.theme_name as ThemeName;
        if (themeName === 'light' || themeName === 'dark' || themeName === 'original') {
          themeMap[themeName] = theme as ThemeSettings;
        }
      });
      setThemes(themeMap);
      if (themeMap[activeTheme]) {
        applyThemeToDocument(themeMap[activeTheme]!);
      }
    }
    setLoading(false);
  };

  const handleColorChange = async (field: string, value: string) => {
    const currentTheme = themes[activeTheme];
    if (!currentTheme) return;

    const updatedTheme = { ...currentTheme, [field]: value };

    setThemes({ ...themes, [activeTheme]: updatedTheme });
    applyThemeToDocument(updatedTheme);

    const { error } = await supabase
      .from('theme_settings')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('theme_name', activeTheme);

    if (error) {
      showError('Failed to save color');
      loadThemes();
    } else {
      success('Color updated');
    }
  };

  const handleThemeSwitch = (themeName: ThemeName) => {
    setActiveTheme(themeName);
    if (themes[themeName]) {
      applyThemeToDocument(themes[themeName]!);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--text-secondary)]">Loading theme settings...</div>
        </div>
      </Card>
    );
  }

  const currentTheme = themes[activeTheme];
  if (!currentTheme) return null;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <Palette size={24} className="text-[var(--accent-gold)]" />
        <div>
          <h2 className="text-xl font-medium text-[var(--text-primary)]">Theme Configuration</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Customize colors for each theme. Changes apply immediately.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 pb-6 border-b border-[var(--border-default)]">
        {(['light', 'dark', 'original'] as ThemeName[])
          .filter((themeName) => themes[themeName] !== null)
          .map((themeName) => (
            <button
              key={themeName}
              onClick={() => handleThemeSwitch(themeName)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTheme === themeName
                  ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {themeLabels[themeName]}
            </button>
          ))}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 uppercase tracking-wider">
            Background Colors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {colorFields.slice(0, 3).map((field) => (
              <ColorPicker
                key={field.key}
                label={field.label}
                value={currentTheme[field.key]}
                onChange={(value) => handleColorChange(field.key, value)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 uppercase tracking-wider">
            Text Colors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {colorFields.slice(3, 6).map((field) => (
              <ColorPicker
                key={field.key}
                label={field.label}
                value={currentTheme[field.key]}
                onChange={(value) => handleColorChange(field.key, value)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 uppercase tracking-wider">
            Accent Colors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {colorFields.slice(6, 8).map((field) => (
              <ColorPicker
                key={field.key}
                label={field.label}
                value={currentTheme[field.key]}
                onChange={(value) => handleColorChange(field.key, value)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 uppercase tracking-wider">
            Border Colors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {colorFields.slice(8, 10).map((field) => (
              <ColorPicker
                key={field.key}
                label={field.label}
                value={currentTheme[field.key]}
                onChange={(value) => handleColorChange(field.key, value)}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
