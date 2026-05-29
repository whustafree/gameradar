import { useEffect, useCallback } from 'react';
import { Theme, AccentColor } from '../types';
import { loadTheme, saveTheme, loadAccentColor, saveAccentColor } from '../utils/storage';

export function useTheme() {
  useEffect(() => {
    const savedTheme = loadTheme();
    const savedAccent = loadAccentColor();
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-accent', savedAccent);
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    document.documentElement.setAttribute('data-accent', color);
    saveAccentColor(color);
  }, []);

  return { theme: loadTheme() as Theme, accentColor: loadAccentColor() as AccentColor, setTheme, setAccentColor };
}
