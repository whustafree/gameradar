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
  { value: 'default', label: '📅 Recientes' },
  { value: 'price-desc', label: '💰 Precio' },
  { value: 'ending-soon', label: '⏳ Termina pronto' },
  { value: 'title', label: '🔤 A-Z' },
];

export default function FilterPanel({
  currentMode, sortMode, activeGenre, activeStore, activeType,
  favoritesCount, hiddenCount, showFavoritesOnly, showHiddenOnly, isOpen,
  onModeChange, onSortChange, onGenreChange, onStoreChange, onTypeChange,
  onToggleFavorites, onToggleHidden, onResetFilters, onClose
}: FilterPanelProps) {
  return (
    <>
      <div className={`filter-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`filter-sheet ${isOpen ? 'open' : ''}`}>
        <div className="filter-handle" />
        <div className="filter-head">
          <h3 className="filter-title">Filtros</h3>
          <button className="filter-close" onClick={onClose}>✕</button>
        </div>

        <div className="filter-body">
          <div className="filter-group">
            <span className="filter-label">Plataforma</span>
            <div className="filter-chips">
              {(['pc', 'android'] as Mode[]).map(mode => (
                <button key={mode} className={`filter-chip ${currentMode === mode ? 'active' : ''}`} onClick={() => onModeChange(mode)}>
                  {mode === 'pc' ? '🖥️ PC' : '📱 Android'}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Ordenar</span>
            <div className="filter-chips">
              {sortOptions.map(opt => (
                <button key={opt.value} className={`filter-chip ${sortMode === opt.value ? 'active' : ''}`} onClick={() => onSortChange(opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Género</span>
            <div className="filter-chips">
              {genres.map(g => (
                <button key={g.value} className={`filter-chip ${activeGenre === g.value ? 'active' : ''}`} onClick={() => onGenreChange(g.value)}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Tipo</span>
            <div className="filter-chips">
              {(['all', 'game', 'dlc'] as TypeFilter[]).map(t => (
                <button key={t} className={`filter-chip ${activeType === t ? 'active' : ''}`} onClick={() => onTypeChange(t)}>
                  {t === 'all' ? 'Todo' : t === 'game' ? '🎮 Juegos' : '📦 DLCs'}
                </button>
              ))}
            </div>
          </div>

          {currentMode === 'pc' && (
            <div className="filter-group">
              <span className="filter-label">Tienda</span>
              <div className="filter-chips">
                {stores.map(s => (
                  <button key={s.value} className={`filter-chip ${activeStore === s.value ? 'active' : ''}`} onClick={() => onStoreChange(s.value)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-group">
            <span className="filter-label">Especiales</span>
            <div className="filter-chips">
              <button className={`filter-chip ${showFavoritesOnly ? 'active' : ''}`} onClick={onToggleFavorites}>
                ❤️ Favoritos ({favoritesCount})
              </button>
              <button className={`filter-chip ${showHiddenOnly ? 'active' : ''}`} onClick={onToggleHidden}>
                🙈 Ocultos ({hiddenCount})
              </button>
            </div>
          </div>

          <div className="filter-actions">
            <button className="filter-btn secondary" onClick={onResetFilters}>Restablecer</button>
            <button className="filter-btn primary" onClick={onClose}>Aplicar</button>
          </div>
        </div>
      </div>
    </>
  );
}
