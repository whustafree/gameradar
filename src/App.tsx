import { useState, useCallback, useEffect } from 'react';
import { Mode, SortMode, Genre, TypeFilter, StoreFilter, Game } from './types';
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

export default function App() {
  const { theme, cycleTheme } = useTheme();
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
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredGames = useFilters({
    games,
    hiddenGames,
    favorites,
    showFavoritesOnly,
    showHiddenOnly,
    currentMode,
    searchTerm: debouncedSearch,
    sortMode,
    activeGenre,
    activeStore,
    activeType
  });

  const visibleGamesCount = games.filter(g => !hiddenGames.includes(g.id)).length;
  const savings = games
    .filter(g => !hiddenGames.includes(g.id))
    .reduce((acc, g) => acc + parsePrice(g.worth), 0);

  const toggleFilters = useCallback(() => {
    setIsFilterOpen(prev => !prev);
  }, []);

  const closeFilters = useCallback(() => {
    setIsFilterOpen(false);
  }, []);

  const handleModeChange = useCallback((mode: Mode) => {
    setCurrentMode(mode);
    setActiveType('all');
    setActiveStore('all');
    setShowFavoritesOnly(false);
    setShowHiddenOnly(false);
    closeFilters();
  }, [closeFilters]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleToggleFavorites = useCallback(() => {
    setShowFavoritesOnly(prev => !prev);
    setShowHiddenOnly(false);
    if (!showFavoritesOnly) {
      showToast('Mostrando favoritos ❤️', 'info');
    }
    closeFilters();
  }, [showFavoritesOnly, closeFilters]);

  const handleToggleHidden = useCallback(() => {
    setShowHiddenOnly(prev => !prev);
    setShowFavoritesOnly(false);
    if (!showHiddenOnly) {
      showToast('Mostrando juegos ocultos 🙈', 'info');
    }
    closeFilters();
  }, [showHiddenOnly, closeFilters]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setSortMode('default');
    setActiveGenre('all');
    setActiveStore('all');
    setActiveType('all');
    setShowFavoritesOnly(false);
    setShowHiddenOnly(false);
    closeFilters();
  }, [closeFilters]);

  const handleOpenQR = useCallback(() => {
    setQrOpen(true);
  }, []);

  const handleMarkAsViewed = useCallback((id: string) => {
    markAsViewed(id);
  }, [markAsViewed]);

  const handleRequestNotification = useCallback(() => {
    if (!('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones', 'error');
      return;
    }
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showToast('Notificaciones activadas 🔔', 'success');
        new Notification('FreeGameHub', {
          body: '¡Recibirás alertas de nuevos juegos gratuitos!',
          icon: '/manifest.json'
        });
      } else {
        showToast('Notificaciones desactivadas', 'info');
      }
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const input = document.getElementById('search-input');
        if (input && document.activeElement !== input) {
          e.preventDefault();
          input.focus();
        }
      }
      if (e.key === 'Escape') {
        setQrOpen(false);
        closeFilters();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeFilters]);

  // Close filters on outside click (mobile)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (window.innerWidth <= 768 && isFilterOpen) {
        const panel = document.getElementById('filter-panel');
        const toggle = document.querySelector('.filter-toggle');
        if (panel && toggle) {
          if (!panel.contains(e.target as Node) && !toggle.contains(e.target as Node)) {
            closeFilters();
          }
        }
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isFilterOpen, closeFilters]);

  const isLoaded = !isLoading && !error;

  return (
    <>
      <div className="background-overlay" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      <Header
        currentMode={currentMode}
        currentTheme={theme}
        gamesCount={visibleGamesCount}
        totalSavings={formatCurrency(savings)}
        lastUpdated={getRelativeTime(lastUpdated)}
        searchTerm={searchTerm}
        isFilterOpen={isFilterOpen}
        onSearchChange={setSearchTerm}
        onClearSearch={handleClearSearch}
        onToggleFilters={toggleFilters}
        onCycleTheme={cycleTheme}
        onOpenQR={handleOpenQR}
        onRequestNotification={handleRequestNotification}
      />

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
            <p>{error}. Intenta recargar la página.</p>
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

      <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title="📱 Compartir">
        <p>Escanea para abrir en tu móvil</p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
          alt="QR Code"
        />
        <button className="close-btn" onClick={() => setQrOpen(false)}>Cerrar</button>
      </Modal>
    </>
  );
}
