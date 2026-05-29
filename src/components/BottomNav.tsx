import { Mode } from '../types';

interface BottomNavProps {
  currentMode: Mode;
  favoritesCount: number;
  isFilterOpen: boolean;
  showFavoritesOnly: boolean;
  onModeChange: (mode: Mode) => void;
  onToggleFilters: () => void;
  onToggleFavorites: () => void;
  onResetFilters: () => void;
}

export default function BottomNav({
  currentMode, favoritesCount, isFilterOpen, showFavoritesOnly,
  onModeChange, onToggleFilters, onToggleFavorites, onResetFilters
}: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${currentMode === 'pc' ? 'active' : ''}`}
        onClick={() => onModeChange('pc')}
        title="Juegos PC"
      >
        <span className="nav-icon">🖥️</span>
        <span className="nav-label">PC</span>
      </button>

      <button
        className={`nav-item ${currentMode === 'android' ? 'active' : ''}`}
        onClick={() => onModeChange('android')}
        title="Juegos Android"
      >
        <span className="nav-icon">📱</span>
        <span className="nav-label">Android</span>
      </button>

      <button
        className={`nav-item ${isFilterOpen ? 'active' : ''}`}
        onClick={onToggleFilters}
        title="Filtros"
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Filtros</span>
      </button>

      <button
        className={`nav-item ${showFavoritesOnly ? 'active' : ''}`}
        onClick={onToggleFavorites}
        title="Favoritos"
      >
        <span className="nav-icon">❤️</span>
        <span className="nav-label">Fav</span>
        {favoritesCount > 0 && (
          <span className="nav-badge">{favoritesCount > 99 ? '99+' : favoritesCount}</span>
        )}
      </button>

      <button
        className="nav-item"
        onClick={onResetFilters}
        title="Reiniciar"
      >
        <span className="nav-icon">🔄</span>
        <span className="nav-label">Reset</span>
      </button>
    </nav>
  );
}
