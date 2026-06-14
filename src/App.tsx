import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Mode, SortMode, Genre, TypeFilter, StoreFilter, ViewMode, Language, Game } from './types';
import { getRelativeTime, formatCurrency, parsePrice } from './utils/format';
import { loadViewMode, saveViewMode, loadLanguage, saveLanguage, loadLastVisit, saveLastVisit, loadNewGameIds, saveNewGameIds } from './utils/storage';

import { useGames } from './hooks/useGames';
import { useFilters } from './hooks/useFilters';
import Header from './components/Header';

import GameGrid from './components/GameGrid';
import SkeletonGrid from './components/SkeletonGrid';
import EmptyState from './components/EmptyState';
import Footer from './components/Footer';
import ToastContainer, { showToast } from './components/Toast';
import BottomNav from './components/BottomNav';
import GameCard from './components/GameCard';
import GameDetail from './components/GameDetail';
import StatsPanel from './components/StatsPanel';
import Onboarding from './components/Onboarding';
import SettingsPanel from './components/SettingsPanel';
import TrendingSection from './components/TrendingSection';
import { t } from './i18n';

const ITEMS_PER_PAGE = 30;

// Confetti characters
function createConfetti() {
  const emojis = ['🎉', '🎊', '✨', '⭐', '💫', '🏆', '🎮', '🔥', '🎁', '💎'];
  const container = document.createElement('div');
  container.className = 'confetti-overlay';
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'hidden';

  for (let i = 0; i < 30; i++) {
    const el = document.createElement('span');
    el.textContent = emojis[i % emojis.length];
    el.style.position = 'absolute';
    el.style.left = Math.random() * 100 + '%';
    el.style.top = '-5%';
    el.style.fontSize = (12 + Math.random() * 20) + 'px';
    el.style.animation = `confettiFall ${1.5 + Math.random() * 2}s ease-in forwards`;
    el.style.animationDelay = Math.random() * 0.5 + 's';
    el.style.opacity = '0.8 + ' + (Math.random() * 0.2);
    container.appendChild(el);
  }

  // Inject keyframes
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg) scale(0.3); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(container);
  setTimeout(() => container.remove(), 4000);
}

export default function App() {
  const {
    games, favorites, viewedGames,
    votes, reactions, wishlist, userStats,
    collections, activityLog, achievements, onboardingStep,
    lastUpdated, isLoading, error,
    visibleGamesCount, savings, deepLinkedGame, clearDeepLinked,
    loadGames, toggleFavorite, markAsViewed,
    handleVote, handleReaction,
    handleToggleWishlist, handleMarkClaimed,
    createCollection, deleteCollection, addToCollection, removeFromCollection,
    completeOnboarding, skipOnboarding,
  } = useGames();

  // --- State ---
  const [currentMode, setCurrentMode] = useState<Mode>('pc');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [activeGenre, setActiveGenre] = useState<Genre>('all');
  const [activeStore, setActiveStore] = useState<StoreFilter>('all');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [newGameIds, setNewGameIds] = useState<string[]>(() => loadNewGameIds());
  const [lastVisit, setLastVisit] = useState<string | null>(() => loadLastVisit());

  // Modals
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Surprise me
  const [surpriseResult, setSurpriseResult] = useState<{ game: Game; reason: string } | null>(null);
  const [showSurprise, setShowSurprise] = useState(false);

  // Multi-select
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  // Auto-hide nav on scroll
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimer = useRef<number | null>(null);

  // Infinite scroll
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh
  const [ptrState, setPtrState] = useState<'idle' | 'pulling' | 'loading'>('idle');
  const ptrStartY = useRef(0);
  const ptrCurrentY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  // Achievement toast
  const prevAchievementsRef = useRef(achievements);
  useEffect(() => {
    const prev = prevAchievementsRef.current;
    const newlyUnlocked = achievements.filter(a => a.unlockedAt && !prev.find(p => p.id === a.id)?.unlockedAt);
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(a => {
        showToast(`🏆 ${t(a.id as any, language)}`, 'success');
        createConfetti();
      });
    }
    prevAchievementsRef.current = achievements;
  }, [achievements, language]);

  // Deep link
  useEffect(() => {
    if (deepLinkedGame) {
      setSelectedGame(deepLinkedGame);
      clearDeepLinked();
    }
  }, [deepLinkedGame, clearDeepLinked]);

  // --- New game detection ---
  useEffect(() => {
    if (!isLoading && !error && games.length > 0) {
      const now = new Date().toISOString();
      if (lastVisit) {
        const knownIds = loadNewGameIds();
        const currentIds = games.map(g => g.id);
        const trulyNew = currentIds.filter(id => !knownIds.includes(id));
        if (trulyNew.length > 0) {
          setNewGameIds(prev => [...new Set([...prev, ...trulyNew])]);
          saveNewGameIds([...new Set([...knownIds, ...trulyNew])]);
        }
      } else {
        const ids = games.map(g => g.id);
        setNewGameIds([]);
        saveNewGameIds(ids);
      }
      saveLastVisit(now);
      setLastVisit(now);
    }
  }, [isLoading, error, games, lastVisit]);

  // --- Persist ---
  useEffect(() => { saveViewMode(viewMode); }, [viewMode]);
  useEffect(() => { saveLanguage(language); }, [language]);

  // --- Debounce search ---
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // --- Filtered games ---
  const filteredGames = useFilters({
    games, favorites, showFavoritesOnly,
    currentMode, searchTerm: debouncedSearch, sortMode,
    activeGenre, activeStore, activeType
  });

  // Sort by popularity (votes)
  let sortedFiltered = filteredGames;
  if (sortMode === 'popular') {
    sortedFiltered = [...filteredGames].sort((a, b) => {
      const aVotes = votes[a.id];
      const bVotes = votes[b.id];
      const aScore = aVotes ? aVotes.up - aVotes.down : 0;
      const bScore = bVotes ? bVotes.up - bVotes.down : 0;
      return bScore - aScore;
    });
  }



  // --- Game of the day ---
  const gameOfDay = useMemo(() => {
    const visible = sortedFiltered.filter(g => !showFavoritesOnly);
    if (visible.length === 0) return null;
    const today = new Date();
    const daySeed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const idx = Math.abs(daySeed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % visible.length;
    return visible[idx];
  }, [sortedFiltered, showFavoritesOnly]);

  // --- Trending (most voted this session) ---
  const trendingGames = useMemo(() => {
    const withVotes = sortedFiltered
      .filter(g => {
        const v = votes[g.id];
        return v && (v.up + v.down) > 0;
      })
      .sort((a, b) => {
        const aVotes = votes[a.id];
        const bVotes = votes[b.id];
        const aScore = aVotes ? aVotes.up * 2 - aVotes.down : 0;
        const bScore = bVotes ? bVotes.up * 2 - bVotes.down : 0;
        return bScore - aScore;
      })
      .slice(0, 6);
    return withVotes;
  }, [sortedFiltered, votes]);



  // --- Ending soon (timeline) ---
  const endingSoonGames = useMemo(() => {
    return sortedFiltered
      .filter(g => g.endDate && new Date(g.endDate).getTime() > Date.now())
      .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
      .slice(0, 8);
  }, [sortedFiltered]);

  // --- Surprise me ---
  const handleSurpriseMe = useCallback(() => {
    const visible = sortedFiltered.filter(g => !viewedGames.includes(g.id));
    if (visible.length === 0) {
      showToast(t('surpriseEmpty', language), 'info');
      return;
    }
    const idx = Math.floor(Math.random() * visible.length);
    const game = visible[idx];
    const reasons = [
      `${t('surpriseReason', language)} su precio original es $${parsePrice(game.worth).toFixed(0)}`,
      `${t('surpriseReason', language)} está en ${game.platformName || game.platform}`,
      `${t('surpriseReason', language)} te encantará este género`,
      `${t('surpriseReason', language)} la comunidad lo recomienda`,
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    setSurpriseResult({ game, reason });
    setShowSurprise(true);
    setTimeout(() => {
      document.querySelector('.surprise-result-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [sortedFiltered, viewedGames, language]);

  // Infinite scroll
  const displayedGames = sortedFiltered.slice(0, displayCount);
  const hasMore = displayCount < sortedFiltered.length;

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedFiltered.length));
        }
      },
      { rootMargin: '200px' }
    );
    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => { if (sentinel) observer.unobserve(sentinel); };
  }, [hasMore, sortedFiltered.length]);

  // --- Pull to refresh ---
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (mainRef.current && mainRef.current.scrollTop <= 0) {
      ptrStartY.current = e.touches[0].clientY;
      ptrCurrentY.current = e.touches[0].clientY;
      setPtrState('pulling');
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (ptrState === 'pulling' || ptrState === 'loading') {
      ptrCurrentY.current = e.touches[0].clientY;
    }
  }, [ptrState]);

  const handleTouchEnd = useCallback(() => {
    if (ptrState === 'pulling') {
      const diff = ptrCurrentY.current - ptrStartY.current;
      if (diff > 80) {
        setPtrState('loading');
        loadGames().then(() => {
          setPtrState('idle');
          setDisplayCount(ITEMS_PER_PAGE);
          if (navigator.vibrate) navigator.vibrate(15);
        });
      } else {
        setPtrState('idle');
      }
    }
  }, [ptrState, loadGames]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.addEventListener('touchstart', handleTouchStart, { passive: true });
    main.addEventListener('touchmove', handleTouchMove, { passive: true });
    main.addEventListener('touchend', handleTouchEnd);
    return () => {
      main.removeEventListener('touchstart', handleTouchStart);
      main.removeEventListener('touchmove', handleTouchMove);
      main.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // --- Handlers ---
  const handleClearSearch = useCallback(() => setSearchTerm(''), []);

  // Refs for back gesture handler (avoid re-registering listener)
  const selectedGameRef = useRef(selectedGame);
  const showStatsRef = useRef(showStats);
  const showSettingsRef = useRef(showSettings);
  const multiSelectActiveRef = useRef(multiSelectActive);

  // Sync refs on every render for the back gesture handler
  selectedGameRef.current = selectedGame;
  showStatsRef.current = showStats;
  showSettingsRef.current = showSettings;
  multiSelectActiveRef.current = multiSelectActive;

  const handleModeChange = useCallback((mode: Mode) => {
    setCurrentMode(mode);
    setActiveType('all');
    setActiveStore('all');
    setShowFavoritesOnly(false);
  }, []);

  const handleToggleFavorites = useCallback(() => {
    setShowFavoritesOnly(p => { showToast(p ? t('favoritesOff', language) : t('favoritesOn', language), 'info'); return !p; });
  }, [language]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setSortMode('default');
    setActiveGenre('all');
    setActiveStore('all');
    setActiveType('all');
    setShowFavoritesOnly(false);
    setActiveCollectionFilter(null);
    showToast(t('filtersReset', language), 'info');
  }, [language]);

  const handleMarkAsViewed = useCallback((id: string) => markAsViewed(id), [markAsViewed]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(p => p === 'grid' ? 'list' : 'grid');
  }, []);

  const handleToggleLang = useCallback(() => {
    setLanguage(p => p === 'es' ? 'en' : 'es');
  }, []);

  // Game detail
  const handleOpenDetail = useCallback((game: Game) => {
    setSelectedGame(game);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedGame(null);
  }, []);

  // Multi-select
  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectActive(p => {
      if (p) {
        setMultiSelectedIds([]);
        showToast(t('multiSelectOff', language), 'info');
      } else {
        showToast(t('multiSelectOn', language), 'info');
      }
      return !p;
    });
  }, [language]);

  const handleToggleMultiSelectGame = useCallback((id: string) => {
    setMultiSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  // Long press to trigger multi-select
  const mainLongPressTimer = useRef<number | null>(null);

  const handleMultiSelectAction = useCallback((action: 'fav' | 'collection') => {
    if (action === 'fav') {
      multiSelectedIds.forEach(id => toggleFavorite(id));
    }
    showToast(t('multiSelectAction', language).replace('{n}', String(multiSelectedIds.length)), 'success');
    setMultiSelectedIds([]);
    setMultiSelectActive(false);
  }, [multiSelectedIds, toggleFavorite, language]);

  // Open specific collection in stats
  const [activeCollectionFilter, setActiveCollectionFilter] = useState<string | null>(null);

  const handleOpenCollectionGames = useCallback((collection: import('./types').UserCollection) => {
    setShowSettings(false);
    setShowFavoritesOnly(false);
    setSearchTerm('');
    setActiveCollectionFilter(collection.id);
    // Can't directly filter by collection in the grid, but we'll use search to hint
  }, []);

  // Stats & Settings
  const handleOpenStats = useCallback(() => {
    setShowStats(true);
  }, []);

  const handleCloseStats = useCallback(() => {
    setShowStats(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  // --- Back gesture handler (Android native) - register once with refs ---
  useEffect(() => {
    let listenerHandle: any;
    const setup = async () => {
      listenerHandle = await CapacitorApp.addListener('backButton', () => {
        // Close modals in order of priority (using refs for fresh state)
        if (selectedGameRef.current) {
          handleCloseDetail();
        } else if (showStatsRef.current) {
          handleCloseStats();
        } else if (showSettingsRef.current) {
          handleCloseSettings();
        } else if (multiSelectActiveRef.current) {
          setMultiSelectActive(false);
          setMultiSelectedIds([]);
        } else {
          CapacitorApp.minimizeApp();
        }
      });
    };
    setup();
    return () => {
      // Clean up listener on unmount only
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, []); // Empty deps = register once, never re-register

  // --- Auto-hide nav on scroll (mobile native feel) ---
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    
    const handleScroll = () => {
      const currentY = main.scrollTop;
      if (currentY > 50 && currentY > lastScrollY.current) {
        // Scrolling down -> hide nav
        setNavVisible(false);
      } else if (currentY < lastScrollY.current - 10 || currentY < 50) {
        // Scrolling up or at top -> show nav
        setNavVisible(true);
      }
      lastScrollY.current = currentY;
      
      // Show nav when scrolling up or at top
      if (currentY < 50) {
        setNavVisible(true);
      }
    };
    
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  // --- New games notification ---
  const [showNewGamesBanner, setShowNewGamesBanner] = useState(false);
  
  useEffect(() => {
    if (!isLoading && newGameIds.length > 0 && games.length > 0) {
      // Only show if there are genuinely new games since last visit
      if (lastVisit && newGameIds.length > 0) {
        setShowNewGamesBanner(true);
      }
    }
  }, [isLoading, newGameIds.length, games.length, lastVisit]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const input = document.querySelector('.header-search input') as HTMLInputElement;
        if (input && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      }
      if (e.key === 'Escape') {
        setSelectedGame(null);
        setShowStats(false);
        setShowSettings(false);
        if (multiSelectActive) {
          setMultiSelectActive(false);
          setMultiSelectedIds([]);
        }
      }
      if (e.key === 'g' && e.ctrlKey) { e.preventDefault(); handleToggleViewMode(); }
      if (e.key === 'm' && e.ctrlKey) { e.preventDefault(); handleToggleMultiSelect(); }
      if (e.key === 's' && e.ctrlKey) { e.preventDefault(); setShowSurprise(p => !p); handleSurpriseMe(); }
      // Arrow keys to navigate cards
      const cards = document.querySelectorAll<HTMLElement>('.game-card[data-id]');
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && cards.length > 0 && !selectedGame) {
        const focused = document.activeElement as HTMLElement;
        const currentIdx = Array.from(cards).indexOf(focused.closest('.game-card') as HTMLElement);
        let nextIdx = e.key === 'ArrowRight' ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx < 0) nextIdx = cards.length - 1;
        if (nextIdx >= cards.length) nextIdx = 0;
        (cards[nextIdx] as HTMLElement)?.focus();
        cards[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleToggleViewMode, handleToggleMultiSelect, handleSurpriseMe, multiSelectActive, selectedGame]);

  // --- Derived ---
  const isLoaded = !isLoading && !error;
  const formatTime = getRelativeTime(lastUpdated);
  const totalSavings = formatCurrency(savings);
  const ptrPullDist = Math.max(0, ptrCurrentY.current - ptrStartY.current);
  const isPtrPulled = ptrPullDist > 80;

  // Game ID set for collection filter
  const collectionFilteredGames = useMemo(() => {
    if (!activeCollectionFilter) return displayedGames;
    const col = collections.find(c => c.id === activeCollectionFilter);
    if (!col) return displayedGames;
    return displayedGames.filter(g => col.gameIds.includes(g.id));
  }, [activeCollectionFilter, collections, displayedGames]);

  return (
    <>
      <div className="bg-glow" />

      <Header
        searchTerm={searchTerm}
        language={language}
        totalSavings={totalSavings}
        onSearchChange={setSearchTerm}
        onClearSearch={handleClearSearch}
        onToggleLang={handleToggleLang}
        onOpenDetail={handleOpenDetail}
        games={games}
      />

      {/* Unified Top Bar */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <div className="top-stat">
            🎮 <strong>{visibleGamesCount}</strong> {t('gamesCount', language)}
          </div>
          <div className="top-stat">
            💰 <strong>{totalSavings}</strong>
          </div>
          <div className="top-stat">
            ❤️ <strong>{favorites.length}</strong>
          </div>
          <div className="top-stat">
            ⏰ {formatTime}
          </div>

          <div className="top-divider" />

          <button className={`sort-chip ${sortMode === 'default' ? 'active' : ''}`} onClick={() => setSortMode('default')}>
            {t('sortRecent', language)}
          </button>
          <button className={`sort-chip ${sortMode === 'price-desc' ? 'active' : ''}`} onClick={() => setSortMode('price-desc')}>
            {t('sortPrice', language)}
          </button>
          <button className={`sort-chip ${sortMode === 'ending-soon' ? 'active' : ''}`} onClick={() => setSortMode('ending-soon')}>
            {t('sortEnding', language)}
          </button>
          <button className={`sort-chip ${sortMode === 'title' ? 'active' : ''}`} onClick={() => setSortMode('title')}>
            {t('sortAZ', language)}
          </button>
          <button className={`sort-chip ${sortMode === 'popular' ? 'active' : ''}`} onClick={() => setSortMode('popular')}>
            🔥 {t('sortPopular', language)}
          </button>
        </div>
      </div>

      {/* PC Store Sub-nav - visible solo en modo PC */}
      {currentMode === 'pc' && !showFavoritesOnly && !multiSelectActive && (
        <div className="pc-store-nav">
          <div className="pc-store-nav-inner">
            <button
              className={`store-chip ${activeStore === 'all' && activeType !== 'all' ? '' : activeStore === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveStore('all'); setActiveType('all'); }}
            >
              {t('storeAll', language)}
            </button>
            {[
              { store: 'steam' as StoreFilter, icon: '🟦', label: 'Steam' },
              { store: 'epic' as StoreFilter, icon: '🎯', label: 'Epic' },
              { store: 'gog' as StoreFilter, icon: '🟣', label: 'GOG' },
              { store: 'itch' as StoreFilter, icon: '🎨', label: 'Itch.io' },
              { store: 'battlenet' as StoreFilter, icon: '⚔️', label: 'Battle.net' },
              { store: 'origin' as StoreFilter, icon: '💠', label: 'Origin' },
              { store: 'drm' as StoreFilter, icon: '🔓', label: 'DRM-Free' },
              { store: 'pc' as StoreFilter, icon: '🖥️', label: 'PC' },
            ].map(s => (
              <button
                key={s.store}
                className={`store-chip ${activeStore === s.store ? 'active' : ''}`}
                onClick={() => { setActiveStore(s.store); setActiveType('all'); }}
              >
                {s.icon} {s.label}
              </button>
            ))}
            <div className="store-nav-divider" />
            <button
              className={`store-chip special ${activeType === 'game' ? 'active' : ''}`}
              onClick={() => { setActiveType(activeType === 'game' ? 'all' : 'game'); setActiveStore('steam'); }}
              title={t('storeFreeWeekend', language)}
            >
              🎉 {language === 'es' ? 'Finde gratis' : 'Weekend'}
            </button>
          </div>
        </div>
      )}

      {/* Multi-select bar */}
      {multiSelectActive && multiSelectedIds.length > 0 && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 0.75rem 0' }}>
          <div className="multi-select-bar">
            <span className="multi-select-count">
              {t('multiSelectCount', language).replace('{n}', String(multiSelectedIds.length))}
            </span>
            <button className="multi-select-btn" onClick={() => handleMultiSelectAction('fav')}>
              {t('multiSelectFavorite', language)}
            </button>
            <button className="multi-select-btn clear" onClick={() => setMultiSelectedIds([])}>
              {t('multiSelectClear', language)}
            </button>
          </div>
        </div>
      )}

      <main ref={mainRef}>
        {/* Pull to refresh indicator */}
        <div className={`ptr-indicator ${ptrState !== 'idle' ? 'visible' : ''}`}>
          {ptrState === 'loading' ? (
            <><div className="ptr-spinner" /> {t('loading', language)}</>
          ) : (
            <><span className={`ptr-arrow ${isPtrPulled ? 'pulled' : ''}`}>↓</span> {isPtrPulled ? (language === 'es' ? 'Suelta para recargar' : 'Release to refresh') : (language === 'es' ? 'Tira para recargar' : 'Pull to refresh')}</>
          )}
        </div>

        {isLoading && (
          <>
            <div className="loading-state">
              <div className="spinner" />
              <p>{t('loading', language)}</p>
            </div>
            <SkeletonGrid />
          </>
        )}

        {error && (
          <div className="empty-state">
            <div className="empty-icon">😕</div>
            <h3>{t('errorTitle', language)}</h3>
            <p>{error}. {t('errorDesc', language)}</p>
            <button className="btn-primary" onClick={loadGames}>🔄 {t('retry', language)}</button>
          </div>
        )}

        {isLoaded && (
          <>
            {/* New Games Notification Banner */}
            {showNewGamesBanner && newGameIds.length > 0 && (
              <div className="notification-banner" onClick={() => { setShowNewGamesBanner(false); handleResetFilters(); }}>
                <span>🆕</span>
                <span>{newGameIds.length} {language === 'es' ? 'nuevos juegos disponibles' : 'new games available'}!</span>
                <button className="notification-banner-close" onClick={e => { e.stopPropagation(); setShowNewGamesBanner(false); }}>✕</button>
              </div>
            )}

            {/* Surprise Me Button */}
            {!showFavoritesOnly && !multiSelectActive && (
              <button className="surprise-btn" onClick={handleSurpriseMe}>
                🎲 {t('surpriseMe', language)}
              </button>
            )}

            {/* Surprise Result */}
            {showSurprise && surpriseResult && (
              <div className="surprise-result-card" onClick={() => handleOpenDetail(surpriseResult.game)}>
                <img src={surpriseResult.game.image} alt={surpriseResult.game.title} className="surprise-result-img"
                  onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x140/11111b/ef4444?text=${encodeURIComponent(surpriseResult.game.title.slice(0, 20))}`; }}
                />
                <div className="surprise-result-body">
                  <h3 className="surprise-result-title">{surpriseResult.game.title}</h3>
                  <p className="surprise-result-reason">{surpriseResult.reason}</p>
                  <div className="surprise-result-actions">
                    <button className="surprise-result-btn" onClick={e => { e.stopPropagation(); handleOpenDetail(surpriseResult.game); }}>
                      👁️ {t('viewDetail', language)}
                    </button>
                    <button className="surprise-result-btn" onClick={e => { e.stopPropagation(); handleSurpriseMe(); }}>
                      🎲 {t('surpriseAgain', language)}
                    </button>
                    <button className="surprise-result-btn" onClick={e => { e.stopPropagation(); setShowSurprise(false); }}>
                      ✕ {t('close', language)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game of the Day */}
            {gameOfDay && !showFavoritesOnly && !multiSelectActive && (
              <div className="game-of-day" onClick={() => handleOpenDetail(gameOfDay)}>
                <img src={gameOfDay.image} alt="" className="game-of-day-bg" loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="game-of-day-content">
                  <span className="game-of-day-label">{t('gameOfDay', language)}</span>
                  <h2 className="game-of-day-title">{gameOfDay.title}</h2>
                  <div className="game-of-day-meta">
                    <span>{gameOfDay.platformIcon || '🎮'} {gameOfDay.platformName || gameOfDay.platform}</span>
                    {gameOfDay.worth && gameOfDay.worth !== 'N/A' && (
                      <span>💰 ${gameOfDay.worth}</span>
                    )}
                  </div>
                  <button className="game-of-day-btn" onClick={e => { e.stopPropagation(); handleOpenDetail(gameOfDay); }}>
                    {t('gameDetail', language)}
                  </button>
                </div>
              </div>
            )}

            {/* Ending Soon Timeline */}
            {endingSoonGames.length > 0 && !showFavoritesOnly && !multiSelectActive && (
              <section className="timeline-section">
                <div className="timeline-header">
                  <div className="recommended-icon">⏳</div>
                  <h2 className="timeline-title">{t('endingTimeline', language)}</h2>
                </div>
                <div className="timeline-scroll">
                  {endingSoonGames.map(g => (
                    <div key={g.id} className="timeline-item" onClick={() => handleOpenDetail(g)}>
                      <img src={g.image} alt={g.title} className="timeline-item-img" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/200x100/11111b/ef4444?text=${encodeURIComponent(g.title.slice(0, 15))}`; }}
                      />
                      <div className="timeline-item-body">
                        <div className="timeline-item-title">{g.title}</div>
                        <div className="timeline-item-time">
                          {g.endDate ? (() => {
                            const diff = new Date(g.endDate).getTime() - Date.now();
                            const days = Math.floor(diff / 86400000);
                            const hours = Math.floor((diff % 86400000) / 3600000);
                            return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                          })() : ''}
                        </div>
                        <div className="timeline-item-bar" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trending Section */}
            <TrendingSection
              trendingGames={trendingGames}
              favorites={favorites}
              viewedGames={viewedGames}
              newGameIds={newGameIds}
              votes={votes}
              viewMode={viewMode}
              language={language}
              showFavoritesOnly={showFavoritesOnly}
              multiSelectActive={multiSelectActive}
              toggleFavorite={toggleFavorite}
              handleMarkAsViewed={handleMarkAsViewed}
              handleOpenDetail={handleOpenDetail}
            />



            {/* Main Game Grid */}
            <GameGrid
              games={collectionFilteredGames}
              favorites={favorites}
              viewedGames={viewedGames}
              newGameIds={newGameIds}
              votes={votes}
              viewMode={viewMode}
              language={language}
              multiSelectActive={multiSelectActive}
              multiSelectedIds={multiSelectedIds}
              onToggleFavorite={toggleFavorite}
              onMarkAsViewed={handleMarkAsViewed}
              onOpenDetail={handleOpenDetail}
              onToggleMultiSelectGame={handleToggleMultiSelectGame}
            />

            {/* Empty state when collection has no games */}
            {activeCollectionFilter && collectionFilteredGames.length === 0 && displayedGames.length > 0 && (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-icon">📁</div>
                <h3>{t('noGames', language)}</h3>
                <button className="btn-primary" onClick={() => setActiveCollectionFilter(null)}>
                  {t('clearFilters', language)}
                </button>
              </div>
            )}
          </>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="infinite-sentinel" />}

        {/* Load more button (fallback) */}
        {hasMore && (
          <button
            className="load-more-btn"
            onClick={() => setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedFiltered.length))}
          >
            {language === 'es' ? 'Cargar más' : 'Load more'} ({sortedFiltered.length - displayCount} {language === 'es' ? 'restantes' : 'remaining'})
          </button>
        )}

        {isLoaded && collectionFilteredGames.length === 0 && !activeCollectionFilter && (
          <EmptyState language={language} onReset={handleResetFilters} />
        )}
      </main>

      <Footer language={language} />
      <ToastContainer />

      <BottomNav
        currentMode={currentMode}
        viewMode={viewMode}
        favoritesCount={favorites.length}
        showFavoritesOnly={showFavoritesOnly}
        language={language}
        visible={navVisible}
        onModeChange={handleModeChange}
        onToggleFavorites={handleToggleFavorites}
        onResetFilters={handleResetFilters}
        onToggleViewMode={handleToggleViewMode}
        onOpenStats={handleOpenStats}
        onOpenSettings={handleOpenSettings}
        onToggleMultiSelect={handleToggleMultiSelect}
        multiSelectActive={multiSelectActive}
      />

      {/* Game Detail Sheet */}
      {selectedGame && (
        <GameDetail
          game={selectedGame}
          games={games}
          votes={votes}
          reactions={reactions}
          wishlist={wishlist}
          language={language}
          isOpen={true}
          onClose={handleCloseDetail}
          onVote={handleVote}
          onReaction={handleReaction}
          onToggleWishlist={handleToggleWishlist}
          onMarkClaimed={handleMarkClaimed}
          onOpenGame={handleOpenDetail}
        />
      )}

      {/* Stats Panel */}
      {showStats && (
        <StatsPanel
          userStats={userStats}
          games={games}
          favorites={favorites}
          viewedGames={viewedGames}
          votes={votes}
          reactions={reactions}
          wishlist={wishlist}
          collections={collections}
          activityLog={activityLog}
          achievements={achievements}
          language={language}
          onClose={handleCloseStats}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {/* Settings Panel (Theme, Collections, Activity, Achievements) */}
      {showSettings && (
        <SettingsPanel
          language={language}
          collections={collections}
          activityLog={activityLog}
          achievements={achievements}
          userStats={userStats}
          games={games.reduce((acc, g) => ({ ...acc, [g.id]: g.title }), {} as Record<string, string>)}
          onClose={handleCloseSettings}
          onCreateCollection={createCollection}
          onDeleteCollection={deleteCollection}
          onOpenCollectionGames={handleOpenCollectionGames}
        />
      )}

      {/* Onboarding */}
      {onboardingStep !== 'done' && (
        <Onboarding
          language={language}
          step={onboardingStep}
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}
    </>
  );
}
