import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadArray, saveArray, loadFavorites, saveFavorites, loadViewedGames, saveViewedGames, loadViewMode, saveViewMode, loadLanguage, saveLanguage } from '../storage';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
});

// Mock navigator.language
Object.defineProperty(navigator, 'language', { value: 'es-CL', configurable: true });

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
});

describe('loadArray / saveArray', () => {
  it('returns empty array for missing key', () => {
    expect(loadArray('nonexistent')).toEqual([]);
  });

  it('saves and loads an array', () => {
    saveArray('test', ['a', 'b', 'c']);
    expect(loadArray('test')).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for corrupted JSON', () => {
    store['corrupt'] = 'not-json';
    expect(loadArray('corrupt')).toEqual([]);
  });
});

describe('favorites', () => {
  it('loads empty favorites', () => {
    expect(loadFavorites()).toEqual([]);
  });

  it('saves and loads favorites', () => {
    saveFavorites(['id1', 'id2']);
    expect(loadFavorites()).toEqual(['id1', 'id2']);
  });
});

describe('viewed games', () => {
  it('loads empty viewed games', () => {
    expect(loadViewedGames()).toEqual([]);
  });

  it('saves and loads viewed games', () => {
    saveViewedGames(['viewed1']);
    expect(loadViewedGames()).toEqual(['viewed1']);
  });
});

describe('view mode', () => {
  it('defaults to grid', () => {
    expect(loadViewMode()).toBe('grid');
  });

  it('saves and loads view mode', () => {
    saveViewMode('list');
    expect(loadViewMode()).toBe('list');
    saveViewMode('grid');
    expect(loadViewMode()).toBe('grid');
  });
});

describe('language', () => {
  it('detects browser language on first load', () => {
    expect(loadLanguage()).toBe('es');
  });

  it('saves and loads language', () => {
    saveLanguage('en');
    expect(loadLanguage()).toBe('en');
    saveLanguage('es');
    expect(loadLanguage()).toBe('es');
  });
});
