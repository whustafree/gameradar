import { Theme, Mode } from '../types';

const KEYS = {
  HIDDEN: 'fgh_hiddenGames_v2',
  FAVORITES: 'fgh_favorites_v2',
  VIEWED: 'fgh_viewedGames_v2',
  THEME: 'fgh_theme'
};

export function loadArray(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export function saveArray(key: string, arr: string[]): void {
  localStorage.setItem(key, JSON.stringify(arr));
}

export function loadTheme(): Theme {
  return (localStorage.getItem(KEYS.THEME) as Theme) || 'default';
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(KEYS.THEME, theme);
}

export function loadHiddenGames(): string[] {
  return loadArray(KEYS.HIDDEN);
}

export function saveHiddenGames(games: string[]): void {
  saveArray(KEYS.HIDDEN, games);
}

export function loadFavorites(): string[] {
  return loadArray(KEYS.FAVORITES);
}

export function saveFavorites(games: string[]): void {
  saveArray(KEYS.FAVORITES, games);
}

export function loadViewedGames(): string[] {
  return loadArray(KEYS.VIEWED);
}

export function saveViewedGames(games: string[]): void {
  saveArray(KEYS.VIEWED, games);
}
