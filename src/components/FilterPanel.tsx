import { Mode, SortMode, Genre, TypeFilter, StoreFilter } from '../types';

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
  onClose: () => void;
}

export default function FilterPanel({
  currentMode, sortMode, activeGenre, activeStore, activeType,
  favoritesCount, hiddenCount, showFavoritesOnly, showHiddenOnly, isOpen,
  onModeChange, onSortChange, onGenreChange, onStoreChange, onTypeChange,
  onToggleFavorites, onToggleHidden, onResetFilters, onClose
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
    { value: 'steam', label: 'Steam' },
    { value: 'epic', label: 'Epic' },
    { value: 'gog', label: 'GOG' },
    { value: 'itch', label: 'Itch.io' },
  ];

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'default', label: '📅 Más recientes' },
    { value: 'price-desc', label: '💰 Mayor precio' },
    { value: 'ending-soon', label: '⏳ Termina pronto' },
    { value: 'title', label: '🔤 Alfabético' },
  ];

  return (
    <>
      <div className={`filter-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`filter-sheet ${isOpen ? 'open' : ''}`}>
        <div className="filter-sheet-handle" />
        <div className="filter-sheet-header">
          <h3 className="filter-sheet-title">Filtros</h3>
          <button className="filter-sheet-close" onClick={onClose}>✕</button>
        </div>

        <div className="filter-sheet-body">
          {/* Mode */}
          <div className="filter-group">
            <span className="filter-group-label">Plataforma</span>
            <div className="filter-chips">
              {(['pc', 'android'] as Mode[]).map(mode => (
                <button
                  key={mode}
                  className={`filter-chip ${currentMode === mode ? 'active' : ''}`}
                  onClick={() => onModeChange(mode)}
                >
                  {mode === 'pc' ? '🖥️ PC' : '📱 Android'}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="filter-group">
            <span className="filter-group-label">Ordenar por</span>
            <div className="filter-chips">
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`filter-chip ${sortMode === opt.value ? 'active' : ''}`}
                  onClick={() => onSortChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Genre */}
          <div className="filter-group">
            <span className="filter-group-label">Género</span>
            <div className="filter-chips">
              {genres.map(g => (
                <button
                  key={g.value}
                  className={`filter-chip ${activeGenre === g.value ? 'active' : ''}`}
                  onClick={() => onGenreChange(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="filter-group">
            <span className="filter-group-label">Tipo</span>
            <div className="filter-chips">
              {(['all', 'game', 'dlc'] as TypeFilter[]).map(t => (
                <button
                  key={t}
                  className={`filter-chip ${activeType === t ? 'active' : ''}`}
                  onClick={() => onTypeChange(t)}
                >
                  {t === 'all' ? 'Todo' : t === 'game' ? '🎮 Juegos' : '📦 DLCs'}
                </button>
              ))}
            </div>
          </div>

          {/* Store (PC only) */}
          {currentMode === 'pc' && (
            <div className="filter-group">
              <span className="filter-group-label">Tienda</span>
              <div className="filter-chips">
                {stores.map(s => (
                  <button
                    key={s.value}
                    className={`filter-chip ${activeStore === s.value ? 'active' : ''}`}
                    onClick={() => onStoreChange(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special filters */}
          <div className="filter-group">
            <span className="filter-group-label">Especiales</span>
            <div className="filter-chips">
              <button
                className={`filter-chip ${showFavoritesOnly ? 'active danger' : ''}`}
                onClick={onToggleFavorites}
              >
                ❤️ Favoritos {favoritesCount > 0 && `(${favoritesCount})`}
              </button>
              <button
                className={`filter-chip ${showHiddenOnly ? 'active' : ''}`}
                onClick={onToggleHidden}
              >
                🙈 Ocultos ({hiddenCount})
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="filter-actions">
            <button className="filter-action-btn secondary" onClick={onResetFilters}>
              Restablecer
            </button>
            <button className="filter-action-btn primary" onClick={onClose}>
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
