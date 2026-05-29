export interface Game {
  id: string;
  title: string;
  description: string;
  worth: string;
  image: string;
  url: string;
  platform: string;
  platformName: string;
  platformIcon?: string;
  endDate?: string;
  type: string;
  category: string;
  source: string;
  status?: string;
  instructions?: string;
  genre?: string;
}

export interface GamesResponse {
  success: boolean;
  games: Game[];
  count: number;
  lastUpdated: string;
}

export interface StatsResponse {
  success: boolean;
  currentGames: number;
  totalScans: number;
  alertsSent: number;
  uptime: number;
  uptimeFormatted: string;
  bootTime: string;
  lastUpdated?: string;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  errors: string[];
  gamesFoundHistory: number[];
}

// --- Modes & Filters ---
export type Mode = 'pc' | 'android' | 'console' | 'ios';
export type Theme = 'dark';
export type SortMode = 'default' | 'price-desc' | 'ending-soon' | 'title' | 'popular';
export type Genre = 'all' | 'action' | 'rpg' | 'indie' | 'shooter' | 'strategy' | 'puzzle' | 'racing' | 'sports';
export type TypeFilter = 'all' | 'game' | 'dlc' | 'app';
export type StoreFilter = 'all' | 'steam' | 'epic' | 'gog' | 'itch';
export type ViewMode = 'grid' | 'list';

// --- Voting ---
export interface Vote {
  up: number;
  down: number;
  userVote: 'up' | 'down' | null;
}

// --- Wishlist ---
export type WishlistStatus = 'wishlist' | 'claimed';

// --- i18n ---
export type Language = 'es' | 'en';

export interface AppState {
  games: Game[];
  favorites: string[];
  hiddenGames: string[];
  viewedGames: string[];
  wishlist: Record<string, WishlistStatus>;  // gameId -> status
  votes: Record<string, Vote>;              // gameId -> votes
  currentMode: Mode;
  currentTheme: Theme;
  searchTerm: string;
  sortMode: SortMode;
  activeGenre: Genre;
  activeStore: StoreFilter;
  activeType: TypeFilter;
  showFavoritesOnly: boolean;
  showHiddenOnly: boolean;
  isFilterOpen: boolean;
  isLoading: boolean;
  lastUpdated: string | null;
  viewMode: ViewMode;
  language: Language;
  lastVisitTimestamp: string | null;  // for new game detection
}

// --- User Stats ---
export interface UserStats {
  totalClaimed: number;
  totalSavings: number;
  totalGamesSeen: number;
  favoriteCount: number;
  votesMade: number;
  sessionStart: string;
}
