import { Theme, ViewMode, Language, Vote, WishlistStatus, UserStats, AccentColor, EmojiReaction, GameReactions, UserCollection, ActivityEntry, Achievement, AchievementId, OnboardingStep } from '../types';

const KEYS = {
  FAVORITES: 'fgh_favorites_v3',
  VIEWED: 'fgh_viewedGames_v3',
  WISHLIST: 'fgh_wishlist_v1',
  VOTES: 'fgh_votes_v1',
  REACTIONS: 'fgh_reactions_v1',
  THEME: 'fgh_theme_v1',
  ACCENT: 'fgh_accent_v1',
  VIEW_MODE: 'fgh_viewMode_v1',
  LANGUAGE: 'fgh_language_v1',
  LAST_VISIT: 'fgh_lastVisit_v1',
  NEW_IDS: 'fgh_newGameIds_v1',
  STATS: 'fgh_userStats_v1',
  COLLECTIONS: 'fgh_collections_v1',
  ACTIVITY: 'fgh_activity_v1',
  ACHIEVEMENTS: 'fgh_achievements_v1',
  ONBOARDING: 'fgh_onboarding_v1',
  MULTISELECT: 'fgh_multiSelect_v1',
};

// --- Generic ---
export function loadArray(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
export function saveArray(key: string, arr: string[]): void {
  localStorage.setItem(key, JSON.stringify(arr));
}
export function loadObject<T>(key: string): Record<string, T> {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { return {} as Record<string, T>; }
}
export function saveObject<T>(key: string, obj: Record<string, T>): void {
  localStorage.setItem(key, JSON.stringify(obj));
}

// --- Favorites ---
export function loadFavorites(): string[] { return loadArray(KEYS.FAVORITES); }
export function saveFavorites(games: string[]): void { saveArray(KEYS.FAVORITES, games); }

// --- Viewed ---
export function loadViewedGames(): string[] { return loadArray(KEYS.VIEWED); }
export function saveViewedGames(games: string[]): void { saveArray(KEYS.VIEWED, games); }

// --- Wishlist ---
export function loadWishlist(): Record<string, WishlistStatus> { return loadObject<WishlistStatus>(KEYS.WISHLIST); }
export function saveWishlist(wl: Record<string, WishlistStatus>): void { saveObject(KEYS.WISHLIST, wl); }

// --- Votes ---
export function loadVotes(): Record<string, Vote> { return loadObject<Vote>(KEYS.VOTES); }
export function saveVotes(votes: Record<string, Vote>): void { saveObject(KEYS.VOTES, votes); }

// --- Reactions ---
export function loadReactions(): Record<string, GameReactions> { return loadObject<GameReactions>(KEYS.REACTIONS); }
export function saveReactions(r: Record<string, GameReactions>): void { saveObject(KEYS.REACTIONS, r); }

// --- Theme ---
export function loadTheme(): Theme {
  return (localStorage.getItem(KEYS.THEME) as Theme) || 'dark';
}
export function saveTheme(theme: Theme): void { localStorage.setItem(KEYS.THEME, theme); }

// --- Accent Color ---
export function loadAccentColor(): AccentColor {
  return (localStorage.getItem(KEYS.ACCENT) as AccentColor) || 'red';
}
export function saveAccentColor(c: AccentColor): void { localStorage.setItem(KEYS.ACCENT, c); }

// --- View Mode ---
export function loadViewMode(): ViewMode {
  return (localStorage.getItem(KEYS.VIEW_MODE) as ViewMode) || 'grid';
}
export function saveViewMode(mode: ViewMode): void { localStorage.setItem(KEYS.VIEW_MODE, mode); }

// --- Language ---
export function loadLanguage(): Language {
  const stored = localStorage.getItem(KEYS.LANGUAGE) as Language | null;
  if (stored) return stored;
  const browserLang = navigator.language?.startsWith('es') ? 'es' : 'en';
  localStorage.setItem(KEYS.LANGUAGE, browserLang);
  return browserLang;
}
export function saveLanguage(lang: Language): void { localStorage.setItem(KEYS.LANGUAGE, lang); }

// --- Last Visit ---
export function loadLastVisit(): string | null { return localStorage.getItem(KEYS.LAST_VISIT); }
export function saveLastVisit(ts: string): void { localStorage.setItem(KEYS.LAST_VISIT, ts); }

// --- New Game IDs ---
export function loadNewGameIds(): string[] { return loadArray(KEYS.NEW_IDS); }
export function saveNewGameIds(ids: string[]): void { saveArray(KEYS.NEW_IDS, ids); }

// --- User Stats ---
export function loadUserStats(): UserStats {
  const defaults: UserStats = {
    totalClaimed: 0, totalSavings: 0, totalGamesSeen: 0,
    favoriteCount: 0, votesMade: 0, reactionsMade: 0,
    gamesPerPlatform: {},
    sessionStart: new Date().toISOString(),
  };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEYS.STATS) || '{}') }; }
  catch { return defaults; }
}
export function saveUserStats(stats: UserStats): void { localStorage.setItem(KEYS.STATS, JSON.stringify(stats)); }

// --- Collections ---
export function loadCollections(): UserCollection[] {
  try { return JSON.parse(localStorage.getItem(KEYS.COLLECTIONS) || '[]'); }
  catch { return []; }
}
export function saveCollections(col: UserCollection[]): void {
  localStorage.setItem(KEYS.COLLECTIONS, JSON.stringify(col));
}

// --- Activity Log ---
export function loadActivityLog(): ActivityEntry[] {
  try { return JSON.parse(localStorage.getItem(KEYS.ACTIVITY) || '[]'); }
  catch { return []; }
}
export function saveActivityLog(log: ActivityEntry[]): void {
  localStorage.setItem(KEYS.ACTIVITY, JSON.stringify(log));
}

// --- Achievements ---
export function loadAchievements(): Achievement[] {
  try { return JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS) || '[]'); }
  catch { return []; }
}
export function saveAchievements(a: Achievement[]): void {
  localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(a));
}

// --- Onboarding ---
export function loadOnboardingStep(): OnboardingStep {
  return (localStorage.getItem(KEYS.ONBOARDING) as OnboardingStep) || 'welcome';
}
export function saveOnboardingStep(s: OnboardingStep): void {
  localStorage.setItem(KEYS.ONBOARDING, s);
}

// --- Multi Select ---
export function loadMultiSelectIds(): string[] { return loadArray(KEYS.MULTISELECT); }
export function saveMultiSelectIds(ids: string[]): void { saveArray(KEYS.MULTISELECT, ids); }

// --- Perfiles de usuario / Leaderboard ---
const PROFILES_KEY = 'fgh_profiles_v1';
const WEEKLY_LEADERBOARD_KEY = 'fgh_weekly_leaderboard_v1';

interface UserProfile {
  username: string;
  avatar: string;
  totalSavings: number;
  totalClaimed: number;
  gamesSeen: number;
  joinedAt: string;
  weeklyScore: number;
  weekStart: string;
}

export function loadProfiles(): Record<string, UserProfile> {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}'); }
  catch { return {}; }
}

export function saveProfiles(profiles: Record<string, UserProfile>): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getLeaderboard(): { username: string; avatar: string; score: number }[] {
  const profiles = loadProfiles();
  return Object.values(profiles)
    .filter(p => {
      // Solo perfiles con actividad esta semana
      const weekStart = new Date(p.weekStart || p.joinedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - weekStart.getTime()) / 86400000);
      return diffDays < 7;
    })
    .sort((a, b) => b.weeklyScore - a.weeklyScore)
    .slice(0, 20)
    .map(p => ({ username: p.username, avatar: p.avatar, score: p.weeklyScore }));
}

export function updateProfile(username: string, savings: number, claimed: number, gamesSeen: number): void {
  const profiles = loadProfiles();
  const existing = profiles[username];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString();

  if (existing) {
    // Si es una nueva semana, reiniciar score semanal
    const isNewWeek = existing.weekStart !== weekStartStr;
    const newClaims = Math.max(0, claimed - existing.totalClaimed);
    profiles[username] = {
      ...existing,
      totalSavings: Math.max(existing.totalSavings, savings),
      totalClaimed: Math.max(existing.totalClaimed, claimed),
      gamesSeen: Math.max(existing.gamesSeen, gamesSeen),
      weeklyScore: isNewWeek ? newClaims : existing.weeklyScore + newClaims,
      weekStart: weekStartStr,
    };
  } else {
    const avatars = ['🎮', '🕹️', '👾', '🎯', '🎲', '🏆', '💎', '🔥', '⭐', '🚀'];
    profiles[username] = {
      username,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      totalSavings: savings,
      totalClaimed: claimed,
      gamesSeen,
      joinedAt: now.toISOString(),
      weeklyScore: claimed,
      weekStart: weekStartStr,
    };
  }
  saveProfiles(profiles);
}

// --- Games Cache (offline) ---
const CACHE_KEY = 'fgh_games_cache_v1';
const CACHE_META_KEY = 'fgh_games_cache_meta_v1';

interface GamesCache {
  games: import('../types').Game[];
  timestamp: string;
}

export function saveGamesCache(games: import('../types').Game[]): void {
  const cache: GamesCache = { games, timestamp: new Date().toISOString() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function loadGamesCache(): GamesCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GamesCache;
  } catch { return null; }
}

export function clearGamesCache(): void {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_META_KEY);
}
