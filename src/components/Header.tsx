interface HeaderProps {
  searchTerm: string;
  gamesCount: number;
  totalSavings: string;
  lastUpdated: string;
  favoritesCount: number;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenQR: () => void;
}

export default function Header({
  searchTerm, gamesCount, totalSavings, lastUpdated, favoritesCount,
  onSearchChange, onClearSearch, onOpenQR
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-logo">
          <div className="header-logo-icon">🎮</div>
          <span className="header-logo-text">FreeGameHub</span>
        </div>

        <div className="header-search">
          <span className="header-search-icon">🔍</span>
          <input
            type="text"
            className="header-search-input"
            placeholder="Buscar juegos..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            autoComplete="off"
          />
          {searchTerm && (
            <button className="header-search-clear" onClick={onClearSearch}>✕</button>
          )}
        </div>

        <div className="header-actions">
          <button className="header-btn" onClick={onOpenQR} title="Compartir">
            <span>📱</span>
          </button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-pill">
          <span>🎮</span>
          <span className="stat-pill-value">{gamesCount}</span>
          <span>juegos</span>
        </div>
        <div className="stat-pill">
          <span>💰</span>
          <span className="stat-pill-value">{totalSavings}</span>
          <span>ahorro</span>
        </div>
        <div className="stat-pill">
          <span>❤️</span>
          <span className="stat-pill-value">{favoritesCount}</span>
          <span>favoritos</span>
        </div>
        <div className="stat-pill">
          <span>⏰</span>
          <span className="stat-pill-value">{lastUpdated}</span>
        </div>
      </div>
    </header>
  );
}
