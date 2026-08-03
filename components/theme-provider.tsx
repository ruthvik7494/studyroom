'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'studynook-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Site-wide light/dark theme. Deliberately no external dependency (e.g.
 * next-themes) — a small inline script in app/layout.tsx's <head> applies
 * the `dark` class to <html> before hydration (reading localStorage, or the
 * OS preference on a first visit) so there's no flash of the wrong theme.
 * This provider just mirrors that into React state after mount, so
 * <ThemeToggle> has something to read and update.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Read what the inline script already applied rather than guessing again.
    setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Private browsing / storage disabled — theme just won't persist across visits.
    }
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
