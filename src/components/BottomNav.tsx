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
        className={`nav-btn ${currentMode === 'pc' ? 'active' : ''}`}
        onClick={() => onModeChange('pc')}
        title="PC"
      >
        <span className="nav-btn-icon">🖥️</span>
        <span className="nav-btn-label">PC</span>
      </button>

      <button
        className={`nav-btn ${currentMode === 'android' ? 'active' : ''}`}
        onClick={() => onModeChange('android')}
        title="Android"
      >
        <span className="nav-btn-icon">📱</span>
        <span className="nav-btn-label">Android</span>
      </button>

      <button
        className={`nav-btn ${isFilterOpen ? 'active' : ''}`}
        onClick={onToggleFilters}
        title="Filtros"
      >
        <span className="nav-btn-icon">⚙️</span>
        <span className="nav-btn-label">Filtros</span>
      </button>

      <button
        className={`nav-btn ${showFavoritesOnly ? 'active' : ''}`}
        onClick={onToggleFavorites}
        title="Favoritos"
      >
        <span className="nav-btn-icon">❤️</span>
        <span className="nav-btn-label">Fav</span>
        {favoritesCount > 0 && (
          <span className="nav-badge">{favoritesCount > 99 ? '99+' : favoritesCount}</span>
        )}
      </button>

      <button className="nav-btn" onClick={onResetFilters} title="Limpiar">
        <span className="nav-btn-icon">🔄</span>
        <span className="nav-btn-label">Reset</span>
      </button>
    </nav>
  );
}
