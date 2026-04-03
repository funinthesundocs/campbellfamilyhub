import { Sun, Moon, Cloud } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

type ThemeOption = 'light' | 'dark' | 'original';

const themeOptions: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'original', icon: Cloud, label: 'Gray' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const getActiveTheme = (): ThemeOption => {
    if (theme === 'original' || theme === 'light' || theme === 'dark') return theme;
    return 'light';
  };

  const activeTheme = getActiveTheme();

  return (
    <div className="flex items-center gap-1 pl-3 border-l border-[var(--border-default)]">
      {themeOptions.map(({ value, icon: Icon, label }) => {
        const isActive = activeTheme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              group relative flex items-center justify-center w-[25px] h-[25px] rounded-full
              transition-all duration-300 ease-out
              ${isActive
                ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent-gold)]/20 scale-105'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--bg-secondary)] hover:shadow-md hover:scale-105'
              }
            `}
            title={label}
            aria-label={`Switch to ${label} theme`}
          >
            <Icon
              size={11}
              className={`
                transition-transform duration-300
                ${isActive ? 'scale-110' : 'group-hover:scale-110'}
              `}
              strokeWidth={isActive ? 2.5 : 2}
            />

            {isActive && (
              <span className="absolute -inset-0.5 rounded-full border-2 border-[var(--accent-gold)] animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
