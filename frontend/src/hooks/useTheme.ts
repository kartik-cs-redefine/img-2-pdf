import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const storageKey = 'theme';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialTheme(): Theme {
  let savedTheme: string | null = null;
  try { savedTheme = window.localStorage.getItem(storageKey); } catch { /* Storage can be unavailable in private contexts. */ }
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { window.localStorage.setItem(storageKey, theme); } catch { /* Keep the selected theme for this session. */ }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((current) => current === 'light' ? 'dark' : 'light'), []);

  return { theme, toggleTheme };
}
