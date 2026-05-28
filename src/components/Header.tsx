import { Mode, Theme } from '../types';
import { getThemeIcon } from '../utils/format';

interface HeaderProps {
  currentMode: Mode;
  currentTheme: Theme;
  gamesCount: number;
  totalSavings: string;
  lastUpdated: string;
  searchTerm: string;
  isFilterOpen: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onToggleFilters: () => void;
  onCycleTheme: () => void;
  onOpenQR: () => void;
  onRequestNotification: () => void;
}

export default function Header({
  currentMode, currentTheme, gamesCount, totalSavings, lastUpdated,
  searchTerm, isFilterOpen,
  onSearchChange, onClearSearch, onToggleFilters, onCycleTheme,
  onOpenQR, onRequestNotification
}: HeaderProps) {
  return (
    <header>
      <div className="header-content">
        <div className="top-bar">
          <div className="logo">
            <div className="logo-icon">🎮</div>
            <h1>FreeGameHub</h1>
            <span className="version">v2.1</span>
          </div>
          <div className="top-actions">
            <button className="icon-header-btn" onClick={onCycleTheme} title="Cambiar Tema">
              <span>{getThemeIcon(currentTheme)}</span>
            </button>
            <button className="icon-header-btn" onClick={onOpenQR} title="Compartir">
              <span>📱</span>
            </button>
            <button className="icon-header-btn" onClick={onRequestNotification} title="Notificaciones">
              <span id="notif-icon">🔔</span>
            </button>
          </div>
        </div>

        <div className="stats-banner">
          <div className="stat-item">
            <span className="stat-label">💰 Ahorro</span>
            <span className="stat-value">{totalSavings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">🎮 Juegos</span>
            <span className="stat-value">{gamesCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">⏰ Actualizado</span>
            <span className="stat-value">{lastUpdated}</span>
          </div>
        </div>

        <div className="search-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="search-input"
              placeholder="Buscar juegos..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              autoComplete="off"
            />
            {searchTerm && (
              <button className="clear-search" onClick={onClearSearch}>✕</button>
            )}
          </div>
          <button
            className={`filter-toggle ${isFilterOpen ? 'active' : ''}`}
            onClick={onToggleFilters}
          >
            <span>⚙️</span>
            <span>Filtros</span>
          </button>
        </div>
      </div>
    </header>
  );
}
