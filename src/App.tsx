import { useState, useCallback, useEffect, useRef } from 'react';
import { Mode, SortMode, Genre, TypeFilter, StoreFilter, ViewMode, Language, Game, UserStats, Vote, WishlistStatus } from './types';
import { getRelativeTime, formatCurrency, parsePrice } from './utils/format';
import { loadViewMode, saveViewMode, loadLanguage, saveLanguage, loadLastVisit, saveLastVisit, loadNewGameIds, saveNewGameIds, loadVotes, saveVotes, loadWishlist, saveWishlist, loadUserStats, saveUserStats } from './utils/storage';
import { useTheme } from './hooks/useTheme';
import { useGames } from './hooks/useGames';
import { useFilters } from './hooks/useFilters';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import GameGrid from './components/GameGrid';
import SkeletonGrid from './components/SkeletonGrid';
import EmptyState from './components/EmptyState';
import Footer from './components/Footer';
import ToastContainer, { showToast } from './components/Toast';
import BottomNav from './components/BottomNav';
import GameDetail from './components/GameDetail';
import StatsPanel from './components/StatsPanel';
import { t } from './i18n';

const ITEMS_PER_PAGE = 30;

export default function App() {
  useTheme();

  const {
    games, favorites, hiddenGames, viewedGames, lastUpdated, isLoading, error,
    loadGames, toggleFavorite, hideGame, markAsViewed
  } = useGames();

  // --- State ---
  const [currentMode, setCurrentMode] = useState<Mode>('pc');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [activeGenre, setActiveGenre] = useState<Genre>('all');
  const [activeStore, setActiveStore] = useState<StoreFilter>('all');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // New features state
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [votes, setVotes] = useState<Record<string, Vote>>(() => loadVotes());
  const [wishlist, setWishlist] = useState<Record<string, WishlistStatus>>(() => loadWishlist());
  const [userStats, setUserStats] = useState<UserStats>(() => loadUserStats());
  const [newGameIds, setNewGameIds] = useState<string[]>(() => loadNewGameIds());
  const [lastVisit, setLastVisit] = useState<string | null>(() => loadLastVisit());

  // Detail modal
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Stats modal
  const [showStats, setShowStats] = useState(false);

  // Infinite scroll
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh
  const [ptrState, setPtrState] = useState<'idle' | 'pulling' | 'loading'>('idle');
  const ptrStartY = useRef(0);
  const ptrCurrentY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  // --- Dynamic red accent based on time of day ---
  useEffect(() => {
    const hour = new Date().getHours();
    let red: string, redLight: string, redDark: string;
    if (hour >= 6 && hour < 12) {
      // Morning: warm red
      red = '#f04438'; redLight = '#f97066'; redDark = '#d92d20';
    } else if (hour >= 12 && hour < 18) {
      // Afternoon: bright red
      red = '#ef4444'; redLight = '#f87171'; redDark = '#dc2626';
    } else if (hour >= 18 && hour < 22) {
      // Evening: deeper red
      red = '#e02424'; redLight = '#f05252'; redDark = '#c81e1e';
    } else {
      // Night: dimmer red
      red = '#b91c1c'; redLight = '#dc2626'; redDark = '#991b1b';
    }
    document.documentElement.style.setProperty('--red', red);
    document.documentElement.style.setProperty('--red-light', redLight);
    document.documentElement.style.setProperty('--red-dark', redDark);
    document.documentElement.style.setProperty('--red-glow', `${red}40`);
    document.documentElement.style.setProperty('--red-glow-strong', `${red}66`);

    // Orb colors
    const orb1 = hour >= 6 && hour < 18 ? `${red}0f` : `${red}08`;
    const orb2 = hour >= 6 && hour < 18 ? `${red}0a` : `${red}06`;
    const alpha1 = parseInt(orb1.slice(-2), 16) / 255;
    const alpha2 = parseInt(orb2.slice(-2), 16) / 255;
    document.documentElement.style.setProperty('--accent-orb1', `rgba(239,68,68,${alpha1.toFixed(3)})`);
    document.documentElement.style.setProperty('--accent-orb2', `rgba(220,38,38,${alpha2.toFixed(3)})`);
  }, []);

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
  }, [isLoading, error, games]);

  // --- Persist new features ---
  useEffect(() => { saveViewMode(viewMode); }, [viewMode]);
  useEffect(() => { saveLanguage(language); }, [language]);
  useEffect(() => { saveVotes(votes); }, [votes]);
  useEffect(() => { saveWishlist(wishlist); }, [wishlist]);
  useEffect(() => { saveUserStats(userStats); }, [userStats]);

  // --- Debounce search ---
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // --- Filtered games ---
  const filteredGames = useFilters({
    games, hiddenGames, favorites, showFavoritesOnly, showHiddenOnly,
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

  // Infinite scroll
  const displayedGames = sortedFiltered.slice(0, displayCount);
  const hasMore = displayCount < sortedFiltered.length;

  // Intersection observer for infinite scroll
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
  const toggleFilters = useCallback(() => setIsFilterOpen(p => !p), []);
  const closeFilters = useCallback(() => setIsFilterOpen(false), []);
  const handleClearSearch = useCallback(() => setSearchTerm(''), []);

  const handleModeChange = useCallback((mode: Mode) => {
    setCurrentMode(mode);
    setActiveType('all');
    setActiveStore('all');
    setShowFavoritesOnly(false);
    setShowHiddenOnly(false);
    closeFilters();
  }, [closeFilters]);

  const handleToggleFavorites = useCallback(() => {
    setShowFavoritesOnly(p => { showToast(p ? t('favoritesOff', language) : t('favoritesOn', language), 'info'); return !p; });
    setShowHiddenOnly(false);
    closeFilters();
  }, [closeFilters, language]);

  const handleToggleHidden = useCallback(() => {
    setShowHiddenOnly(p => { if (!p) showToast(t('hiddenOn', language), 'info'); return !p; });
    setShowFavoritesOnly(false);
    closeFilters();
  }, [closeFilters, language]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setSortMode('default');
    setActiveGenre('all');
    setActiveStore('all');
    setActiveType('all');
    setShowFavoritesOnly(false);
    setShowHiddenOnly(false);
    closeFilters();
    showToast(t('filtersReset', language), 'info');
  }, [closeFilters, language]);

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

  // Voting
  const handleVote = useCallback((gameId: string, type: 'up' | 'down') => {
    setVotes(prev => {
      const current = prev[gameId] || { up: 0, down: 0, userVote: null };
      if (current.userVote === type) {
        return { ...prev, [gameId]: { ...current, [type]: Math.max(0, current[type] - 1), userVote: null } };
      }
      const up = type === 'up' ? current.up + 1 : (current.userVote === 'up' ? Math.max(0, current.up - 1) : current.up);
      const down = type === 'down' ? current.down + 1 : (current.userVote === 'down' ? Math.max(0, current.down - 1) : current.down);
      return { ...prev, [gameId]: { up, down, userVote: type } };
    });
    setUserStats(prev => ({ ...prev, votesMade: prev.votesMade + 1 }));
  }, []);

  // Wishlist
  const handleToggleWishlist = useCallback((gameId: string) => {
    setWishlist(prev => {
      if (prev[gameId]) {
        const { [gameId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [gameId]: 'wishlist' };
    });
  }, []);

  const handleMarkClaimed = useCallback((gameId: string) => {
    setWishlist(prev => {
      const game = games.find(g => g.id === gameId);
      const worth = game ? parsePrice(game.worth) : 0;
      setUserStats(s => ({ ...s, totalClaimed: s.totalClaimed + 1, totalSavings: s.totalSavings + worth }));
      return { ...prev, [gameId]: 'claimed' };
    });
  }, [games]);

  // Open stats
  const handleOpenStats = useCallback(() => {
    setShowStats(true);
  }, []);

  const handleCloseStats = useCallback(() => {
    setShowStats(false);
  }, []);

  // --- Stats (computed) ---
  const visibleGamesCount = games.filter(g => !hiddenGames.includes(g.id)).length;
  const savings = games.filter(g => !hiddenGames.includes(g.id)).reduce((acc, g) => acc + parsePrice(g.worth), 0);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const input = document.querySelector('.header-search input') as HTMLInputElement;
        if (input && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      }
      if (e.key === 'Escape') {
        closeFilters();
        setSelectedGame(null);
        setShowStats(false);
      }
      if (e.key === 'g' && e.ctrlKey) { e.preventDefault(); handleToggleViewMode(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeFilters, handleToggleViewMode]);

  // Sync userStats with actual favorites
  useEffect(() => {
    setUserStats(prev => ({ ...prev, favoriteCount: favorites.length }));
  }, [favorites.length]);

  // --- Derived ---
  const isLoaded = !isLoading && !error;
  const formatTime = getRelativeTime(lastUpdated);
  const totalSavings = formatCurrency(savings);
  const ptrPullDist = Math.max(0, ptrCurrentY.current - ptrStartY.current);
  const isPtrPulled = ptrPullDist > 80;

  return (
    <>
      <div className="bg-glow" />

      <Header
        searchTerm={searchTerm}
        language={language}
        onSearchChange={setSearchTerm}
        onClearSearch={handleClearSearch}
        onToggleLang={handleToggleLang}
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
          <button className={`sort-chip ${activeGenre !== 'all' ? 'active' : ''}`} onClick={toggleFilters}>
            🏷️ {t('sortGenre', language)}
          </button>
        </div>
      </div>

      <FilterPanel
        currentMode={currentMode}
        sortMode={sortMode}
        activeGenre={activeGenre}
        activeStore={activeStore}
        activeType={activeType}
        favoritesCount={favorites.length}
        hiddenCount={hiddenGames.length}
        showFavoritesOnly={showFavoritesOnly}
        showHiddenOnly={showHiddenOnly}
        isOpen={isFilterOpen}
        language={language}
        onModeChange={handleModeChange}
        onSortChange={setSortMode}
        onGenreChange={setActiveGenre}
        onStoreChange={setActiveStore}
        onTypeChange={setActiveType}
        onToggleFavorites={handleToggleFavorites}
        onToggleHidden={handleToggleHidden}
        onResetFilters={handleResetFilters}
        onClose={closeFilters}
      />

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

        {isLoaded && displayedGames.length > 0 && (
          <GameGrid
            games={displayedGames}
            favorites={favorites}
            viewedGames={viewedGames}
            newGameIds={newGameIds}
            votes={votes}
            viewMode={viewMode}
            language={language}
            onToggleFavorite={toggleFavorite}
            onHideGame={hideGame}
            onMarkAsViewed={handleMarkAsViewed}
            onOpenDetail={handleOpenDetail}
          />
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="infinite-sentinel" />}

        {/* Load more button (fallback for non-IntersectionObserver) */}
        {hasMore && (
          <button
            className="load-more-btn"
            onClick={() => setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedFiltered.length))}
          >
            {language === 'es' ? 'Cargar más' : 'Load more'} ({sortedFiltered.length - displayCount} {language === 'es' ? 'restantes' : 'remaining'})
          </button>
        )}

        {isLoaded && displayedGames.length === 0 && (
          <EmptyState language={language} onReset={handleResetFilters} />
        )}
      </main>

      <Footer language={language} />
      <ToastContainer />

      <BottomNav
        currentMode={currentMode}
        viewMode={viewMode}
        favoritesCount={favorites.length}
        isFilterOpen={isFilterOpen}
        showFavoritesOnly={showFavoritesOnly}
        language={language}
        onModeChange={handleModeChange}
        onToggleFilters={toggleFilters}
        onToggleFavorites={handleToggleFavorites}
        onResetFilters={handleResetFilters}
        onToggleViewMode={handleToggleViewMode}
        onOpenStats={handleOpenStats}
      />

      {/* Game Detail Sheet */}
      {selectedGame && (
        <GameDetail
          game={selectedGame}
          votes={votes}
          wishlist={wishlist}
          language={language}
          isOpen={true}
          onClose={handleCloseDetail}
          onVote={handleVote}
          onToggleWishlist={handleToggleWishlist}
          onMarkClaimed={handleMarkClaimed}
        />
      )}

      {/* Stats Panel */}
      {showStats && (
        <StatsPanel
          stats={userStats}
          language={language}
          onClose={handleCloseStats}
        />
      )}
    </>
  );
}
