import { Mode, SortMode, Genre, TypeFilter, StoreFilter, Theme } from '../types';

interface FilterPanelProps {
  currentMode: Mode;
  sortMode: SortMode;
  activeGenre: Genre;
  activeStore: StoreFilter;
  activeType: TypeFilter;
  favoritesCount: number;
  hiddenCount: number;
  showFavoritesOnly: boolean;
  showHiddenOnly: boolean;
  isOpen: boolean;
  onModeChange: (mode: Mode) => void;
  onSortChange: (sort: SortMode) => void;
  onGenreChange: (genre: Genre) => void;
  onStoreChange: (store: StoreFilter) => void;
  onTypeChange: (type: TypeFilter) => void;
  onToggleFavorites: () => void;
  onToggleHidden: () => void;
  onResetFilters: () => void;
}

export default function FilterPanel({
  currentMode, sortMode, activeGenre, activeStore, activeType,
  favoritesCount, hiddenCount, showFavoritesOnly, showHiddenOnly, isOpen,
  onModeChange, onSortChange, onGenreChange, onStoreChange, onTypeChange,
  onToggleFavorites, onToggleHidden, onResetFilters
}: FilterPanelProps) {
  const genres: { value: Genre; label: string }[] = [
    { value: 'all', label: '🎮 Todo' },
    { value: 'action', label: '⚔️ Acción' },
    { value: 'rpg', label: '🗡️ RPG' },
    { value: 'indie', label: '💎 Indie' },
    { value: 'shooter', label: '🔫 Shooter' },
    { value: 'strategy', label: '♟️ Estrategia' },
    { value: 'puzzle', label: '🧩 Puzzle' },
    { value: 'racing', label: '🏎️ Carreras' },
    { value: 'sports', label: '⚽ Deportes' },
  ];

  const stores: { value: StoreFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'steam', label: '🎮 Steam' },
    { value: 'epic', label: '🎯 Epic' },
    { value: 'gog', label: '🎲 GOG' },
    { value: 'itch', label: '🕹️ Itch.io' },
  ];

  return (
    <div className={`filter-panel ${isOpen ? 'open' : ''}`}>
      <div className="filter-panel-inner">
        <div className="filter-section">
          <span className="filter-label">Modo:</span>
          <div className="mode-switcher">
            {(['pc', 'android'] as Mode[]).map(mode => (
              <button
                key={mode}
                className={`mode-btn ${currentMode === mode ? 'active' : ''}`}
                onClick={() => onModeChange(mode)}
              >
                <span className="mode-icon">{mode === 'pc' ? '💻' : '📱'}</span>
                <span className="mode-text">{mode === 'pc' ? 'PC' : 'Android'}</span>
              </button>
            ))}
          </div>
          <div className="sort-box sort-box-inline">
            <select value={sortMode} onChange={e => onSortChange(e.target.value as SortMode)}>
              <option value="default">📅 Recientes</option>
              <option value="price-desc">💰 Precio</option>
              <option value="ending-soon">⏳ Por terminar</option>
              <option value="title">🔤 A-Z</option>
            </select>
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-label">Orden:</span>
          <div className="sort-box">
            <select value={sortMode} onChange={e => onSortChange(e.target.value as SortMode)}>
              <option value="default">📅 Más recientes</option>
              <option value="price-desc">💰 Mayor precio</option>
              <option value="ending-soon">⏳ Termina pronto</option>
              <option value="title">🔤 Alfabético</option>
            </select>
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-label">Género:</span>
          <div className="scroll-container">
            {genres.map(g => (
              <button
                key={g.value}
                className={`chip ${activeGenre === g.value ? 'active' : ''}`}
                onClick={() => onGenreChange(g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-label">Tipo:</span>
          <div className={`scroll-container ${currentMode === 'android' ? 'hidden' : ''}`}>
            {(['all', 'game', 'dlc'] as TypeFilter[]).map(t => (
              <button
                key={t}
                className={`type-btn ${activeType === t ? 'active' : ''}`}
                onClick={() => onTypeChange(t)}
              >
                {t === 'all' ? 'Todo' : t === 'game' ? '🎮 Juegos' : '📦 DLCs'}
              </button>
            ))}
          </div>
          <div className={`scroll-container ${currentMode === 'pc' ? 'hidden' : ''}`}>
            {(['all', 'game', 'app'] as TypeFilter[]).map(t => (
              <button
                key={t}
                className={`type-btn ${activeType === t ? 'active' : ''}`}
                onClick={() => onTypeChange(t)}
              >
                {t === 'all' ? 'Todo' : t === 'game' ? '🎮 Juegos' : '📱 Apps'}
              </button>
            ))}
          </div>
        </div>

        <div className={`filter-section ${currentMode === 'android' ? 'hidden' : ''}`}>
          <span className="filter-label">Tienda:</span>
          <div className="scroll-container">
            {stores.map(s => (
              <button
                key={s.value}
                className={`filter-btn ${activeStore === s.value ? 'active' : ''}`}
                onClick={() => onStoreChange(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="favorites-bar">
          <button
            className={`fav-btn ${showFavoritesOnly ? 'active' : ''}`}
            onClick={onToggleFavorites}
          >
            <span>❤️</span>
            <span>Mis Favoritos</span>
            <span className="fav-badge">{favoritesCount}</span>
          </button>
          <button className="hidden-btn" onClick={onToggleHidden}>
            <span>🙈</span>
            <span className="hidden-badge">{hiddenCount}</span>
          </button>
          <button className="hidden-btn" onClick={onResetFilters} title="Limpiar filtros">
            <span>🔄</span>
          </button>
        </div>
      </div>
    </div>
  );
}
