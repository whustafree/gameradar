import { useState, useCallback, useEffect } from 'react';
import { Mode, SortMode, Genre, TypeFilter, StoreFilter } from './types';
import { getRelativeTime, formatCurrency, parsePrice } from './utils/format';
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
import Modal from './components/Modal';
import BottomNav from './components/BottomNav';

export default function App() {
  useTheme();
  const {
    games, favorites, hiddenGames, viewedGames, lastUpdated, isLoading, error,
    loadGames, toggleFavorite, hideGame, markAsViewed
  } = useGames();

  const [currentMode, setCurrentMode] = useState<Mode>('pc');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [activeGenre, setActiveGenre] = useState<Genre>('all');
  const [activeStore, setActiveStore] = useState<StoreFilter>('all');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredGames = useFilters({
    games, hiddenGames, favorites, showFavoritesOnly, showHiddenOnly,
    currentMode, searchTerm: debouncedSearch, sortMode,
    activeGenre, activeStore, activeType
  });

  const visibleGamesCount = games.filter(g => !hiddenGames.includes(g.id)).length;
  const savings = games.filter(g => !hiddenGames.includes(g.id)).reduce((acc, g) => acc + parsePrice(g.worth), 0);

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
    setShowFavoritesOnly(p => { if (!p) showToast('Mostrando favoritos ❤️', 'info'); return !p; });
    setShowHiddenOnly(false);
    closeFilters();
  }, [closeFilters]);

  const handleToggleHidden = useCallback(() => {
    setShowHiddenOnly(p => { if (!p) showToast('Mostrando ocultos 🙈', 'info'); return !p; });
    setShowFavoritesOnly(false);
    closeFilters();
  }, [closeFilters]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setSortMode('default');
    setActiveGenre('all');
    setActiveStore('all');
    setActiveType('all');
    setShowFavoritesOnly(false);
    setShowHiddenOnly(false);
    closeFilters();
    showToast('Filtros restablecidos ✅', 'info');
  }, [closeFilters]);

  const handleOpenQR = useCallback(() => setQrOpen(true), []);
  const handleMarkAsViewed = useCallback((id: string) => markAsViewed(id), [markAsViewed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const input = document.querySelector('.header-search input') as HTMLInputElement;
        if (input && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      }
      if (e.key === 'Escape') { setQrOpen(false); closeFilters(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeFilters]);

  const isLoaded = !isLoading && !error;
  const formatTime = getRelativeTime(lastUpdated);
  const totalSavings = formatCurrency(savings);

  return (
    <>
      <div className="bg-glow" />

      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSearch={handleClearSearch}
        onOpenQR={handleOpenQR}
      />

      {/* Unified Top Bar: stats + sort */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <div className="top-stat">
            🎮 <strong>{visibleGamesCount}</strong> juegos
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
            Recientes
          </button>
          <button className={`sort-chip ${sortMode === 'price-desc' ? 'active' : ''}`} onClick={() => setSortMode('price-desc')}>
            Precio
          </button>
          <button className={`sort-chip ${sortMode === 'ending-soon' ? 'active' : ''}`} onClick={() => setSortMode('ending-soon')}>
            Por terminar
          </button>
          <button className={`sort-chip ${sortMode === 'title' ? 'active' : ''}`} onClick={() => setSortMode('title')}>
            A-Z
          </button>
          <button className={`sort-chip ${activeGenre !== 'all' ? 'active' : ''}`} onClick={toggleFilters}>
            🏷️ Género
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

      <main>
        {isLoading && (
          <>
            <div className="loading-state">
              <div className="spinner" />
              <p>Cargando juegos gratuitos...</p>
            </div>
            <SkeletonGrid />
          </>
        )}

        {error && (
          <div className="empty-state">
            <div className="empty-icon">😕</div>
            <h3>Algo salió mal</h3>
            <p>{error}. Intenta recargar.</p>
            <button className="btn-primary" onClick={loadGames}>🔄 Reintentar</button>
          </div>
        )}

        {isLoaded && filteredGames.length > 0 && (
          <GameGrid
            games={filteredGames}
            favorites={favorites}
            viewedGames={viewedGames}
            onToggleFavorite={toggleFavorite}
            onHideGame={hideGame}
            onMarkAsViewed={handleMarkAsViewed}
          />
        )}

        {isLoaded && filteredGames.length === 0 && (
          <EmptyState onReset={handleResetFilters} />
        )}
      </main>

      <Footer />
      <ToastContainer />

      <BottomNav
        currentMode={currentMode}
        favoritesCount={favorites.length}
        isFilterOpen={isFilterOpen}
        showFavoritesOnly={showFavoritesOnly}
        onModeChange={handleModeChange}
        onToggleFilters={toggleFilters}
        onToggleFavorites={handleToggleFavorites}
        onResetFilters={handleResetFilters}
      />

      <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title="📱 Compartir">
        <p>Escanea para abrir en tu móvil</p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
          alt="QR"
          width={150}
          height={150}
        />
      </Modal>
    </>
  );
}
