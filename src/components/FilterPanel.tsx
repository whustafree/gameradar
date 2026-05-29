import { Mode, SortMode, Genre, TypeFilter, StoreFilter, Language } from '../types';
import { t } from '../i18n';

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
  language: Language;
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

const genres = (lang: Language): { value: Genre; label: string }[] => [
  { value: 'all', label: `🎮 ${lang === 'es' ? 'Todo' : 'All'}` },
  { value: 'action', label: `⚔️ ${lang === 'es' ? 'Acción' : 'Action'}` },
  { value: 'rpg', label: `🗡️ ${lang === 'es' ? 'RPG' : 'RPG'}` },
  { value: 'indie', label: `💎 ${lang === 'es' ? 'Indie' : 'Indie'}` },
  { value: 'shooter', label: `🔫 ${lang === 'es' ? 'Shooter' : 'Shooter'}` },
  { value: 'strategy', label: `♟️ ${lang === 'es' ? 'Estrategia' : 'Strategy'}` },
  { value: 'puzzle', label: `🧩 ${lang === 'es' ? 'Puzzle' : 'Puzzle'}` },
  { value: 'racing', label: `🏎️ ${lang === 'es' ? 'Carreras' : 'Racing'}` },
  { value: 'sports', label: `⚽ ${lang === 'es' ? 'Deportes' : 'Sports'}` },
];

const stores: { value: StoreFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'steam', label: 'Steam' },
  { value: 'epic', label: 'Epic' },
  { value: 'gog', label: 'GOG' },
  { value: 'itch', label: 'Itch.io' },
];

export default function FilterPanel({
  currentMode, sortMode, activeGenre, activeStore, activeType,
  favoritesCount, hiddenCount, showFavoritesOnly, showHiddenOnly, isOpen, language,
  onModeChange, onSortChange, onGenreChange, onStoreChange, onTypeChange,
  onToggleFavorites, onToggleHidden, onResetFilters, onClose
}: FilterPanelProps) {
  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'default', label: `📅 ${t('sortRecent', language)}` },
    { value: 'price-desc', label: `💰 ${t('sortPrice', language)}` },
    { value: 'ending-soon', label: `⏳ ${t('sortEnding', language)}` },
    { value: 'title', label: `🔤 ${t('sortAZ', language)}` },
    { value: 'popular', label: `🔥 ${t('sortPopular', language)}` },
  ];

  return (
    <>
      <div className={`filter-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`filter-sheet ${isOpen ? 'open' : ''}`}>
        <div className="filter-handle" />
        <div className="filter-head">
          <h3 className="filter-title">{t('filters', language)}</h3>
          <button className="filter-close" onClick={onClose}>✕</button>
        </div>

        <div className="filter-body">
          <div className="filter-group">
            <span className="filter-label">{t('platformFilter', language)}</span>
            <div className="filter-chips">
              {(['pc', 'android', 'console', 'ios'] as Mode[]).map(mode => (
                <button key={mode} className={`filter-chip ${currentMode === mode ? 'active' : ''}`} onClick={() => onModeChange(mode)}>
                  {mode === 'pc' ? `🖥️ ${t('navPC', language)}` :
                   mode === 'android' ? `📱 ${t('navAndroid', language)}` :
                   mode === 'console' ? `🎮 ${t('navConsole', language)}` :
                   `🍎 ${t('navIos', language)}`}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">{t('sortBy', language)}</span>
            <div className="filter-chips">
              {sortOptions.map(opt => (
                <button key={opt.value} className={`filter-chip ${sortMode === opt.value ? 'active' : ''}`} onClick={() => onSortChange(opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">{t('genre', language)}</span>
            <div className="filter-chips">
              {genres(language).map(g => (
                <button key={g.value} className={`filter-chip ${activeGenre === g.value ? 'active' : ''}`} onClick={() => onGenreChange(g.value)}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">{t('type', language)}</span>
            <div className="filter-chips">
              {(['all', 'game', 'dlc'] as TypeFilter[]).map(tv => (
                <button key={tv} className={`filter-chip ${activeType === tv ? 'active' : ''}`} onClick={() => onTypeChange(tv)}>
                  {tv === 'all' ? t('all', language) : tv === 'game' ? `🎮 ${t('games', language)}` : `📦 ${t('dlcs', language)}`}
                </button>
              ))}
            </div>
          </div>

          {currentMode === 'pc' && (
            <div className="filter-group">
              <span className="filter-label">{t('storeFilter', language)}</span>
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
            <span className="filter-label">{t('specials', language)}</span>
            <div className="filter-chips">
              <button className={`filter-chip ${showFavoritesOnly ? 'active' : ''}`} onClick={onToggleFavorites}>
                ❤️ {t('favOnly', language)} ({favoritesCount})
              </button>
              <button className={`filter-chip ${showHiddenOnly ? 'active' : ''}`} onClick={onToggleHidden}>
                🙈 {t('hiddenOnly', language)} ({hiddenCount})
              </button>
            </div>
          </div>

          <div className="filter-actions">
            <button className="filter-btn secondary" onClick={onResetFilters}>{t('reset', language)}</button>
            <button className="filter-btn primary" onClick={onClose}>{t('apply', language)}</button>
          </div>
        </div>
      </div>
    </>
  );
}
