import { useState, useEffect } from 'react';
import { Theme } from '../types';
import { loadTheme, saveTheme } from '../utils/storage';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  const cycleTheme = () => {
    const themes: Theme[] = ['default', 'cyberpunk', 'matrix'];
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  return { theme, setTheme, cycleTheme };
}
