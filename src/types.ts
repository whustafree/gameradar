export interface Game {
  id: string;
  title: string;
  description: string;
  worth: string;
  image: string;
  url: string;
  platform: string;
  platformName: string;
  endDate?: string;
  type: string;
  category: string;
  source: string;
  status?: string;
  instructions?: string;
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

export type Mode = 'pc' | 'android';
export type Theme = 'dark';
export type SortMode = 'default' | 'price-desc' | 'ending-soon' | 'title';
export type Genre = 'all' | 'action' | 'rpg' | 'indie' | 'shooter' | 'strategy' | 'puzzle' | 'racing' | 'sports';
export type TypeFilter = 'all' | 'game' | 'dlc' | 'app';
export type StoreFilter = 'all' | 'steam' | 'epic' | 'gog' | 'itch';

export interface AppState {
  games: Game[];
  favorites: string[];
  hiddenGames: string[];
  viewedGames: string[];
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
}
