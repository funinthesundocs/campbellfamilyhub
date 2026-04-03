import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useHub } from '../../contexts/HubContext';
import { useTraining } from '../../contexts/TrainingContext';
import { Image, Camera, Music, UtensilsCrossed, Building2, Calendar, BarChart3, UsersRound, Smile, Bell, Shield, Menu, X, LogOut, User, ChevronDown, GraduationCap, Lightbulb, HelpCircle, Sun, Moon, Cloud } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { AnimatedLogo } from './AnimatedLogo';
import { TrainingTooltip } from '../training/TrainingTooltip';
import { TOOLTIPS } from '../training/training-content';

const mediaSubItems = [
  { path: '/media', label: 'Photos & Videos', icon: Camera },
  { path: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { path: '/music', label: 'Music', icon: Music },
  { path: '/jokes', label: 'Jokes & Stories', icon: Smile },
];

const propertySubItems = [
  { path: '/properties', label: 'All Properties', icon: Building2 },
  { path: '/reservations', label: 'My Reservations', icon: Calendar },
  { path: '/crowdfunding', label: 'Projects', icon: UsersRound },
];

const navItems = [
  { path: '/polls', label: 'Polls', icon: BarChart3 },
];

export function Header() {
  const { profile, signOut } = useAuth();
  const { settings } = useHub();
  const { theme, setTheme } = useTheme();
  const { trainingMode, toggleTrainingMode, startTour } = useTraining();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [mobileThemeDropdownOpen, setMobileThemeDropdownOpen] = useState(false);
  const [mobileHelpDropdownOpen, setMobileHelpDropdownOpen] = useState(false);
  const mediaDropdownRef = useRef<HTMLDivElement>(null);
  const propertyDropdownRef = useRef<HTMLDivElement>(null);
  const mobileThemeRef = useRef<HTMLDivElement>(null);
  const mobileHelpRef = useRef<HTMLDivElement>(null);

  const isMediaActive = mediaSubItems.some(item => location.pathname.startsWith(item.path));
  const isPropertyActive = propertySubItems.some(item => location.pathname.startsWith(item.path));

  const familyNames = useMemo(() => {
    if (!settings?.associated_family_names) return [];
    return settings.associated_family_names
      .split(',')
      .map(name => name.trim())
      .filter(Boolean);
  }, [settings?.associated_family_names]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mediaDropdownRef.current && !mediaDropdownRef.current.contains(event.target as Node)) {
        setMediaDropdownOpen(false);
      }
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target as Node)) {
        setPropertyDropdownOpen(false);
      }
      if (mobileThemeRef.current && !mobileThemeRef.current.contains(event.target as Node)) {
        setMobileThemeDropdownOpen(false);
      }
      if (mobileHelpRef.current && !mobileHelpRef.current.contains(event.target as Node)) {
        setMobileHelpDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border-default)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 lg:h-16">
          <div className="flex items-center gap-2 lg:gap-4">
            <TrainingTooltip tipId="logo" content={TOOLTIPS.logo.content} position="bottom">
              <Link to="/" className="flex items-center gap-2" data-training="logo">
                <span className="hidden lg:inline">
                  <AnimatedLogo
                    primaryName={settings?.hub_name || 'Family Hub'}
                    familyNames={familyNames}
                  />
                </span>
                <span className="lg:hidden">
                  <AnimatedLogo
                    primaryName={settings?.hub_name || 'Family Hub'}
                    familyNames={familyNames}
                    size="small"
                  />
                </span>
              </Link>
            </TrainingTooltip>
            <TrainingTooltip tipId="theme" content={TOOLTIPS.theme.content} position="bottom">
              <div data-training="theme-switcher" className="hidden lg:block">
                <ThemeSwitcher />
              </div>
            </TrainingTooltip>

            <div className="hidden lg:block h-6 w-px bg-[var(--border-default)]" />

            <div className="hidden lg:flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">Help</span>
              <button
                onClick={async () => {
                  const wasOff = !trainingMode;
                  await toggleTrainingMode();
                  if (wasOff && location.pathname === '/') {
                    setTimeout(() => startTour(), 300);
                  }
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  trainingMode ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    trainingMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            <div className="relative" ref={mediaDropdownRef}>
              <button
                onClick={() => setMediaDropdownOpen(!mediaDropdownOpen)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isMediaActive
                    ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Image size={16} />
                Media
                <ChevronDown size={14} className={`transition-transform ${mediaDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {mediaDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden">
                  {mediaSubItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMediaDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        location.pathname.startsWith(item.path)
                          ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={propertyDropdownRef}>
              <button
                onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isPropertyActive
                    ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Building2 size={16} />
                Properties
                <ChevronDown size={14} className={`transition-transform ${propertyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {propertyDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden">
                  {propertySubItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setPropertyDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        location.pathname.startsWith(item.path)
                          ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === item.path
                    ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {(profile?.is_admin || profile?.is_super_admin) && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === '/admin'
                    ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Shield size={16} />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block h-6 w-px bg-[var(--border-default)]" />

            <TrainingTooltip tipId="notifications" content={TOOLTIPS.notifications.content} position="bottom">
              <Link to="/notifications" className="hidden lg:flex p-2 min-h-11 min-w-11 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <Bell size={20} />
              </Link>
            </TrainingTooltip>

            <TrainingTooltip tipId="profile" content={TOOLTIPS.profile.content} position="bottom">
              <Link to="/profile" className="hidden lg:flex p-2 min-h-11 min-w-11 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]" data-training="profile-menu">
                <User size={20} />
              </Link>
            </TrainingTooltip>

            <button
              onClick={() => signOut()}
              className="hidden lg:flex p-2 min-h-11 min-w-11 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <LogOut size={20} />
            </button>

            <div className="lg:hidden relative" ref={mobileThemeRef}>
              <button
                onClick={() => {
                  setMobileThemeDropdownOpen(!mobileThemeDropdownOpen);
                  setMobileHelpDropdownOpen(false);
                }}
                className={`flex p-2 min-h-10 min-w-10 items-center justify-center rounded-lg transition-colors ${
                  mobileThemeDropdownOpen
                    ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Lightbulb size={18} />
              </button>
              {mobileThemeDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden p-2">
                  <div className="flex items-center gap-1">
                    {[
                      { value: 'light' as const, icon: Sun, label: 'Light' },
                      { value: 'dark' as const, icon: Moon, label: 'Dark' },
                      { value: 'original' as const, icon: Cloud, label: 'Gray' },
                    ].map(({ value, icon: Icon, label }) => {
                      const isActive = theme === value;
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            setTheme(value);
                            setMobileThemeDropdownOpen(false);
                          }}
                          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                            isActive
                              ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] shadow-md'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent-gold)]'
                          }`}
                          title={label}
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:hidden relative" ref={mobileHelpRef}>
              <button
                onClick={() => {
                  setMobileHelpDropdownOpen(!mobileHelpDropdownOpen);
                  setMobileThemeDropdownOpen(false);
                }}
                className={`flex p-2 min-h-10 min-w-10 items-center justify-center rounded-lg transition-colors ${
                  mobileHelpDropdownOpen || trainingMode
                    ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <HelpCircle size={18} />
              </button>
              {mobileHelpDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden p-3 min-w-[140px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">Help Mode</span>
                    <button
                      onClick={async () => {
                        const wasOff = !trainingMode;
                        await toggleTrainingMode();
                        setMobileHelpDropdownOpen(false);
                        if (wasOff && location.pathname === '/') {
                          setTimeout(() => startTour(), 300);
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        trainingMode ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          trainingMode ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link to="/notifications" className="lg:hidden flex p-2 min-h-10 min-w-10 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <Bell size={18} />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex p-2 min-h-10 min-w-10 items-center justify-center text-[var(--text-secondary)]"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--border-default)] bg-[var(--bg-primary)]">
          <nav className="px-4 py-2 space-y-1">
            <div className="pt-2 pb-1">
              <span className="flex items-center gap-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                <Image size={14} />
                Media
              </span>
            </div>
            {mediaSubItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 pl-6 min-h-11 rounded-lg ${
                  location.pathname.startsWith(item.path)
                    ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}

            <div className="border-t border-[var(--border-default)] my-2" />

            <div className="pt-2 pb-1">
              <span className="flex items-center gap-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                <Building2 size={14} />
                Properties
              </span>
            </div>
            {propertySubItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 pl-6 min-h-11 rounded-lg ${
                  location.pathname.startsWith(item.path)
                    ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}

            <div className="border-t border-[var(--border-default)] my-2" />

            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 min-h-11 rounded-lg ${
                  location.pathname === item.path
                    ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}

            {(profile?.is_admin || profile?.is_super_admin) && (
              <>
                <div className="border-t border-[var(--border-default)] my-2" />
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 min-h-11 rounded-lg ${
                    location.pathname === '/admin'
                      ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <Shield size={20} />
                  Admin
                </Link>
              </>
            )}

            <div className="border-t border-[var(--border-default)] my-2" />

            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 min-h-11 rounded-lg ${
                location.pathname === '/profile'
                  ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <User size={20} />
              Profile
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 px-3 py-3 min-h-11 rounded-lg text-[var(--text-secondary)] w-full text-left"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
