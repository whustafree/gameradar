interface HeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenQR: () => void;
}

export default function Header({
  searchTerm, onSearchChange, onClearSearch, onOpenQR
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-brand-icon">🎮</div>
          <span className="header-brand-text">FreeGameHub</span>
        </div>

        <div className="header-search">
          <span className="header-search-icon">🔍</span>
          <input
            type="text"
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
          <button className="header-action" onClick={onOpenQR} title="Compartir">
            📱
          </button>
        </div>
      </div>
    </header>
  );
}
