import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Game, GamesResponse, Vote, GameReactions, EmojiReaction, WishlistStatus, UserCollection, ActivityEntry, Achievement, AchievementId, UserStats } from '../types';
import {
  loadFavorites, saveFavorites,
  loadHiddenGames, saveHiddenGames,
  loadViewedGames, saveViewedGames,
  loadVotes, saveVotes,
  loadReactions, saveReactions,
  loadWishlist, saveWishlist,
  loadUserStats, saveUserStats,
  loadCollections, saveCollections,
  loadActivityLog, saveActivityLog,
  loadAchievements, saveAchievements,
  loadOnboardingStep, saveOnboardingStep,
} from '../utils/storage';

const ITEMS_PER_PAGE = 30;

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_claim', icon: '🎁', labelKey: 'achievementFirstClaim', unlockedAt: null },
  { id: 'five_claims', icon: '📦', labelKey: 'achievementFiveClaims', unlockedAt: null },
  { id: 'ten_claims', icon: '🎯', labelKey: 'achievementTenClaims', unlockedAt: null },
  { id: 'twenty_five_claims', icon: '🏆', labelKey: 'achievementTwentyFiveClaims', unlockedAt: null },
  { id: 'first_fav', icon: '❤️', labelKey: 'achievementFirstFav', unlockedAt: null },
  { id: 'ten_fav', icon: '💖', labelKey: 'achievementTenFav', unlockedAt: null },
  { id: 'first_vote', icon: '👍', labelKey: 'achievementFirstVote', unlockedAt: null },
  { id: 'ten_votes', icon: '🗳️', labelKey: 'achievementTenVotes', unlockedAt: null },
  { id: 'first_collection', icon: '📁', labelKey: 'achievementFirstCollection', unlockedAt: null },
  { id: 'first_view', icon: '👁️', labelKey: 'achievementFirstView', unlockedAt: null },
  { id: 'hundred_views', icon: '🧭', labelKey: 'achievementHundredViews', unlockedAt: null },
  { id: 'all_platforms', icon: '🌍', labelKey: 'achievementAllPlatforms', unlockedAt: null },
  { id: 'savings_100', icon: '💰', labelKey: 'achievementSavings100', unlockedAt: null },
  { id: 'savings_500', icon: '💎', labelKey: 'achievementSavings500', unlockedAt: null },
  { id: 'savings_1000', icon: '👑', labelKey: 'achievementSavings1000', unlockedAt: null },
];

function addActivity(log: ActivityEntry[]): ActivityEntry[] {
  const updated = [log[0], ...log.slice(0, 499)]; // keep max 500 entries
  return updated;
}

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [hiddenGames, setHiddenGames] = useState<string[]>(() => loadHiddenGames());
  const [viewedGames, setViewedGames] = useState<string[]>(() => loadViewedGames());
  const [votes, setVotes] = useState<Record<string, Vote>>(() => loadVotes());
  const [reactions, setReactions] = useState<Record<string, GameReactions>>(() => loadReactions());
  const [wishlist, setWishlist] = useState<Record<string, WishlistStatus>>(() => loadWishlist());
  const [userStats, setUserStats] = useState<UserStats>(() => loadUserStats());
  const [collections, setCollections] = useState<UserCollection[]>(() => loadCollections());
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(() => loadActivityLog());
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = loadAchievements();
    if (saved.length === 0) {
      saveAchievements(DEFAULT_ACHIEVEMENTS);
      return DEFAULT_ACHIEVEMENTS;
    }
    return saved;
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(() => loadOnboardingStep());

  // Persist
  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  useEffect(() => { saveHiddenGames(hiddenGames); }, [hiddenGames]);
  useEffect(() => { saveViewedGames(viewedGames); }, [viewedGames]);
  useEffect(() => { saveVotes(votes); }, [votes]);
  useEffect(() => { saveReactions(reactions); }, [reactions]);
  useEffect(() => { saveWishlist(wishlist); }, [wishlist]);
  useEffect(() => { saveUserStats(userStats); }, [userStats]);
  useEffect(() => { saveCollections(collections); }, [collections]);
  useEffect(() => { saveActivityLog(activityLog); }, [activityLog]);
  useEffect(() => { saveAchievements(achievements); }, [achievements]);

  // --- Check achievements ---
  const checkAchievements = useCallback((stats: UserStats, ach: Achievement[], favs: string[]) => {
    const now = new Date().toISOString();
    let changed = false;
    const updated = ach.map(a => {
      if (a.unlockedAt) return a;
      let unlock = false;
      switch (a.id) {
        case 'first_claim': unlock = stats.totalClaimed >= 1; break;
        case 'five_claims': unlock = stats.totalClaimed >= 5; break;
        case 'ten_claims': unlock = stats.totalClaimed >= 10; break;
        case 'twenty_five_claims': unlock = stats.totalClaimed >= 25; break;
        case 'first_fav': unlock = favs.length >= 1; break;
        case 'ten_fav': unlock = favs.length >= 10; break;
        case 'first_vote': unlock = stats.votesMade >= 1; break;
        case 'ten_votes': unlock = stats.votesMade >= 10; break;
        case 'first_collection': unlock = collections.length >= 1; break;
        case 'first_view': unlock = viewedGames.length >= 1; break;
        case 'hundred_views': unlock = viewedGames.length >= 100; break;
        case 'all_platforms': unlock = new Set(games.filter(g => viewedGames.includes(g.id)).map(g => g.platform)).size >= 5; break;
        case 'savings_100': unlock = stats.totalSavings >= 100; break;
        case 'savings_500': unlock = stats.totalSavings >= 500; break;
        case 'savings_1000': unlock = stats.totalSavings >= 1000; break;
      }
      if (unlock) { changed = true; return { ...a, unlockedAt: now }; }
      return a;
    });
    return { achievements: updated, changed, newUnlocks: updated.filter((a, i) => a.unlockedAt && !ach[i]?.unlockedAt) };
  }, [games, viewedGames.length, collections.length]);

  // --- Log activity ---
  const logActivity = useCallback((type: ActivityEntry['type'], gameId: string, gameTitle: string) => {
    const entry: ActivityEntry = { type, gameId, gameTitle, timestamp: new Date().toISOString() };
    setActivityLog(prev => [entry, ...prev.slice(0, 499)]);
  }, []);

  // --- Load games ---
  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isNative = Capacitor.isNativePlatform();
      const apiBase = isNative ? 'https://freegamehub.vercel.app' : '';
      const res = await fetch(`${apiBase}/api/free-games`);
      if (!res.ok) throw new Error('Error en la API');
      const data: GamesResponse = await res.json();
      setGames(data.games || []);
      setLastUpdated(data.lastUpdated || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);

  // --- Game actions ---
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const idx = prev.indexOf(id);
      if (idx > -1) {
        const updated = prev.filter(f => f !== id);
        return updated;
      }
      const game = games.find(g => g.id === id);
      if (game) logActivity('favorite', id, game.title);
      return [...prev, id];
    });
  }, [games, logActivity]);

  const hideGame = useCallback((id: string) => {
    setHiddenGames(prev => [...prev, id]);
    const game = games.find(g => g.id === id);
    if (game) logActivity('hide', id, game.title);
  }, [games, logActivity]);

  const markAsViewed = useCallback((id: string) => {
    setViewedGames(prev => {
      if (prev.includes(id)) return prev;
      const game = games.find(g => g.id === id);
      if (game) {
        logActivity('view', id, game.title);
        setUserStats(s => ({ ...s, totalGamesSeen: s.totalGamesSeen + 1 }));
      }
      return [...prev, id];
    });
  }, [games, logActivity]);

  // Voting
  const handleVote = useCallback((gameId: string, type: 'up' | 'down') => {
    setVotes(prev => {
      const current = prev[gameId] || { up: 0, down: 0, userVote: null };
      let up = current.up, down = current.down, userVote: 'up' | 'down' | null = type;
      if (current.userVote === type) {
        up = type === 'up' ? current.up - 1 : current.up;
        down = type === 'down' ? current.down - 1 : current.down;
        userVote = null;
      } else {
        if (current.userVote === 'up') up--;
        if (current.userVote === 'down') down--;
        up = type === 'up' ? up + 1 : up;
        down = type === 'down' ? down + 1 : down;
      }
      return { ...prev, [gameId]: { up: Math.max(0, up), down: Math.max(0, down), userVote } };
    });
    setUserStats(s => ({ ...s, votesMade: s.votesMade + 1 }));
    const game = games.find(g => g.id === gameId);
    if (game) logActivity('vote', gameId, game.title);
  }, [games, logActivity]);

  // Reactions
  const handleReaction = useCallback((gameId: string, reaction: EmojiReaction) => {
    setReactions(prev => {
      const current = prev[gameId] || { counts: { fire: 0, heart: 0, star: 0, laugh: 0, cool: 0, sad: 0 }, userReaction: null };
      const counts = { ...current.counts };
      if (current.userReaction) {
        counts[current.userReaction] = Math.max(0, counts[current.userReaction] - 1);
      }
      if (current.userReaction === reaction) {
        return { ...prev, [gameId]: { counts, userReaction: null } };
      }
      counts[reaction] = (counts[reaction] || 0) + 1;
      return { ...prev, [gameId]: { counts, userReaction: reaction } };
    });
    setUserStats(s => ({ ...s, reactionsMade: s.reactionsMade + 1 }));
    const game = games.find(g => g.id === gameId);
    if (game) logActivity('reaction', gameId, game.title);
  }, [games, logActivity]);

  // Wishlist
  const handleToggleWishlist = useCallback((gameId: string) => {
    setWishlist(prev => {
      if (prev[gameId]) {
        const { [gameId]: _, ...rest } = prev;
        return rest;
      }
      const game = games.find(g => g.id === gameId);
      if (game) logActivity('wishlist', gameId, game.title);
      return { ...prev, [gameId]: 'wishlist' as WishlistStatus };
    });
  }, [games, logActivity]);

  const handleMarkClaimed = useCallback((gameId: string) => {
    const game = games.find(g => g.id === gameId);
    const worth = game ? parsePrice(game.worth) : 0;
    setWishlist(prev => ({ ...prev, [gameId]: 'claimed' as WishlistStatus }));
    setUserStats(prev => {
      const updated = { ...prev, totalClaimed: prev.totalClaimed + 1, totalSavings: prev.totalSavings + worth };
      // Check achievements in next tick
      setTimeout(() => {
        setAchievements(currentAch => {
          const { achievements: newAch, newUnlocks } = checkAchievements(updated, currentAch, favorites);
          newUnlocks.forEach(u => logActivity('claim', gameId, u.labelKey));
          return newAch;
        });
      }, 100);
      return updated;
    });
    if (game) logActivity('claim', gameId, game.title);
    if (navigator.vibrate) navigator.vibrate(30);
  }, [games, logActivity, checkAchievements, favorites]);

  // Collections
  const createCollection = useCallback((name: string, description: string, emoji: string) => {
    const col: UserCollection = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name, description, emoji,
      gameIds: [],
      createdAt: new Date().toISOString(),
    };
    setCollections(prev => [...prev, col]);
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
  }, []);

  const addToCollection = useCallback((collectionId: string, gameId: string) => {
    setCollections(prev => prev.map(c =>
      c.id === collectionId ? { ...c, gameIds: [...new Set([...c.gameIds, gameId])] } : c
    ));
  }, []);

  const removeFromCollection = useCallback((collectionId: string, gameId: string) => {
    setCollections(prev => prev.map(c =>
      c.id === collectionId ? { ...c, gameIds: c.gameIds.filter(id => id !== gameId) } : c
    ));
  }, []);

  // Onboarding
  const completeOnboarding = useCallback(() => {
    setOnboardingStep('done');
    saveOnboardingStep('done');
  }, []);

  const skipOnboarding = useCallback(() => {
    setOnboardingStep('done');
    saveOnboardingStep('done');
  }, []);

  // Sync userStats with favorites
  useEffect(() => {
    setUserStats(prev => ({ ...prev, favoriteCount: favorites.length }));
  }, [favorites.length]);

  // Check achievements periodically
  useEffect(() => {
    if (viewedGames.length > 0 || favorites.length > 0 || userStats.totalClaimed > 0) {
      setAchievements(current => {
        const { achievements: newAch } = checkAchievements(userStats, current, favorites);
        return newAch;
      });
    }
  }, [userStats.totalClaimed, userStats.totalSavings, userStats.votesMade, favorites.length, viewedGames.length]);

  // Deep link: check URL for ?game=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('game');
    if (gameId && games.length > 0) {
      const game = games.find(g => g.id === gameId);
      if (game) {
        // Store for App to use
        setDeepLinkedGame(game);
      }
    }
  }, [games]);

  // --- Derived ---
  const visibleGamesCount = games.filter(g => !hiddenGames.includes(g.id)).length;
  const savings = games.filter(g => !hiddenGames.includes(g.id)).reduce((acc, g) => acc + parsePrice(g.worth), 0);
  const hasUnlockedAchievement = achievements.some(a => a.unlockedAt);

  // For deep linking - this will be read by App
  const [deepLinkedGame, setDeepLinkedGame] = useState<Game | null>(null);

  return {
    games,
    favorites,
    hiddenGames,
    viewedGames,
    votes,
    reactions,
    wishlist,
    userStats,
    collections,
    activityLog,
    achievements,
    onboardingStep,
    lastUpdated,
    isLoading,
    error,
    visibleGamesCount,
    savings,
    deepLinkedGame,
    clearDeepLinked: () => setDeepLinkedGame(null),
    loadGames,
    toggleFavorite,
    hideGame,
    markAsViewed,
    handleVote,
    handleReaction,
    handleToggleWishlist,
    handleMarkClaimed,
    createCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    completeOnboarding,
    skipOnboarding,
  };
}

function parsePrice(price: string | undefined | null): number {
  if (!price || price === 'N/A' || price === 'Pago') return 0;
  const match = price.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}
