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
export type Theme = 'dark' | 'light' | 'amoled';
export type AccentColor = 'red' | 'blue' | 'green' | 'purple' | 'amber' | 'cyan';
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

// --- Reactions (beyond votes) ---
export type EmojiReaction = 'fire' | 'heart' | 'star' | 'laugh' | 'cool' | 'sad';

export interface GameReactions {
  counts: Record<EmojiReaction, number>;
  userReaction: EmojiReaction | null;
}

// --- Wishlist ---
export type WishlistStatus = 'wishlist' | 'claimed';

// --- Collections ---
export interface UserCollection {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gameIds: string[];
  createdAt: string;
}

// --- Achievements / Gamification ---
export type AchievementId =
  | 'first_claim'
  | 'five_claims'
  | 'ten_claims'
  | 'twenty_five_claims'
  | 'first_fav'
  | 'ten_fav'
  | 'first_vote'
  | 'ten_votes'
  | 'first_collection'
  | 'first_view'
  | 'hundred_views'
  | 'all_platforms'
  | 'savings_100'
  | 'savings_500'
  | 'savings_1000';

export interface Achievement {
  id: AchievementId;
  icon: string;
  labelKey: string;
  unlockedAt: string | null;
}

// --- Activity History ---
export interface ActivityEntry {
  type: 'view' | 'favorite' | 'hide' | 'claim' | 'wishlist' | 'vote' | 'reaction';
  gameId: string;
  gameTitle: string;
  timestamp: string;
}

// --- i18n ---
export type Language = 'es' | 'en';

// --- Onboarding ---
export type OnboardingStep =
  | 'welcome'
  | 'swipe'
  | 'filters'
  | 'detail'
  | 'wishlist'
  | 'done';

export interface AppState {
  games: Game[];
  favorites: string[];
  hiddenGames: string[];
  viewedGames: string[];
  wishlist: Record<string, WishlistStatus>;
  votes: Record<string, Vote>;
  reactions: Record<string, GameReactions>;
  collections: UserCollection[];
  activityLog: ActivityEntry[];
  achievements: Achievement[];
  currentMode: Mode;
  currentTheme: Theme;
  accentColor: AccentColor;
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
  lastVisitTimestamp: string | null;
  onboardingStep: OnboardingStep;
  multiSelectActive: boolean;
  multiSelectedIds: string[];
}

// --- User Stats ---
export interface UserStats {
  totalClaimed: number;
  totalSavings: number;
  totalGamesSeen: number;
  favoriteCount: number;
  votesMade: number;
  reactionsMade: number;
  gamesPerPlatform: Record<string, number>;
  sessionStart: string;
}

// --- Surprise Me ---
export interface SurpriseMe {
  game: Game;
  reason: string;
}

// --- Global Stats (derived from games list, not backend) ---
export interface GlobalStats {
  totalFreeGames: number;
  totalValue: number;
  gamesByPlatform: Record<string, number>;
  gamesByType: Record<string, number>;
  highestValueGame: Game | null;
  newestGames: number;
  endingSoon: number;
}
