import { Language, Genre, SortMode, TypeFilter, LicenseFilter } from '../types';
import { FilterPreset } from '../utils/storage';
import { t, TranslationKeys } from '../i18n';

interface DesktopSidebarProps {
  language: Language;

  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;

  activeGenre: Genre;
  onGenreChange: (genre: Genre) => void;

  activeType: TypeFilter;
  onTypeChange: (type: TypeFilter) => void;

  activeLicense: LicenseFilter;
  onLicenseChange: (license: LicenseFilter) => void;

  filterPresets: FilterPreset[];
  onLoadPreset: (preset: FilterPreset) => void;
  onDeletePreset: (id: string) => void;
  onSavePreset: () => void;

  compactMode: boolean;
  onToggleCompact: () => void;
  autoTheme: boolean;
  onToggleAutoTheme: () => void;

  onReset: () => void;
}

type SortOption = readonly [SortMode, string, TranslationKeys];
type GenreOption = readonly [Genre, string];
type TypeOption = readonly [TypeFilter, string, TranslationKeys];
type LicenseOption = readonly [LicenseFilter, string, TranslationKeys];

const SORT_OPTIONS: SortOption[] = [
  ['default', '📅', 'sortRecent'],
  ['recent', '🆕', 'sortNewest'],
  ['price-desc', '💰', 'sortPrice'],
  ['ending-soon', '⏰', 'sortEnding'],
  ['title', '🔤', 'sortAZ'],
  ['popular', '🔥', 'sortPopular'],
];

const GENRES: GenreOption[] = [
  ['all', '🎮'], ['action', '⚔️'], ['rpg', '🗡️'], ['shooter', '🔫'],
  ['strategy', '🧠'], ['puzzle', '🧩'], ['racing', '🏎️'], ['sports', '⚽'], ['indie', '🎨'],
];

const TYPES: TypeOption[] = [
  ['all', '📋', 'all'],
  ['game', '🎮', 'games'],
  ['app', '📱', 'apps'],
];

const LICENSES: LicenseOption[] = [
  ['all', '📋', 'all'],
  ['open-source', '🔓', 'openSource'],
  ['proprietary', '🔒', 'proprietary'],
];

/**
 * Barra lateral de filtros de escritorio (oculta por CSS en móvil).
 * Extraída de App.tsx: eran ~100 líneas de JSX con estilos inline.
 */
export default function DesktopSidebar({
  language,
  sortMode, onSortChange,
  activeGenre, onGenreChange,
  activeType, onTypeChange,
  activeLicense, onLicenseChange,
  filterPresets, onLoadPreset, onDeletePreset, onSavePreset,
  compactMode, onToggleCompact,
  autoTheme, onToggleAutoTheme,
  onReset,
}: DesktopSidebarProps) {
  return (
    <div className="desktop-sidebar">
      <div className="sidebar-title">🔍 {t('filters', language)}</div>

      {filterPresets.length > 0 && (
        <div className="filter-group" style={{ marginBottom: '0.5rem' }}>
          <span className="filter-label">📋 Presets</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
            {filterPresets.map(preset => (
              <div key={preset.id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className="filter-chip"
                  onClick={() => onLoadPreset(preset)}
                  style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', paddingRight: '1.2rem' }}
                >
                  {preset.icon} {preset.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePreset(preset.id)}
                  aria-label={language === 'es' ? `Eliminar preset ${preset.name}` : `Delete preset ${preset.name}`}
                  style={{
                    position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    fontSize: '0.45rem', padding: '2px', lineHeight: 1,
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="filter-btn secondary"
        onClick={onSavePreset}
        style={{ width: '100%', marginBottom: '0.3rem', fontSize: '0.62rem', padding: '0.3rem' }}
      >
        💾 {language === 'es' ? 'Guardar filtros' : 'Save filters'}
        <span style={{ fontSize: '0.45rem', opacity: 0.5, marginLeft: '0.2rem' }}>Alt+1</span>
      </button>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
        <button
          type="button"
          className={`filter-btn ${compactMode ? 'primary' : 'secondary'}`}
          onClick={onToggleCompact}
          aria-pressed={compactMode}
          style={{ flex: 1, fontSize: '0.55rem', padding: '0.2rem' }}
        >
          📦 {language === 'es' ? 'Compacto' : 'Compact'}
        </button>
        <button
          type="button"
          className={`filter-btn ${autoTheme ? 'primary' : 'secondary'}`}
          onClick={onToggleAutoTheme}
          aria-pressed={autoTheme}
          style={{ flex: 1, fontSize: '0.55rem', padding: '0.2rem' }}
        >
          🌗 Auto
        </button>
      </div>

      <div className="filter-group">
        <span className="filter-label">{t('sortBy', language)}</span>
        <div className="filter-chips">
          {SORT_OPTIONS.map(([value, icon, key]) => (
            <button
              type="button"
              key={value}
              className={`filter-chip ${sortMode === value ? 'active' : ''}`}
              aria-pressed={sortMode === value}
              onClick={() => onSortChange(value)}
            >
              {icon} {t(key, language)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">{t('genre', language)}</span>
        <div className="filter-chips">
          {GENRES.map(([value, icon]) => (
            <button
              type="button"
              key={value}
              className={`filter-chip ${activeGenre === value ? 'active' : ''}`}
              aria-pressed={activeGenre === value}
              onClick={() => onGenreChange(value)}
            >
              {icon} {value === 'all' ? t('all', language) : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">{t('type', language)}</span>
        <div className="filter-chips">
          {TYPES.map(([value, icon, key]) => (
            <button
              type="button"
              key={value}
              className={`filter-chip ${activeType === value ? 'active' : ''}`}
              aria-pressed={activeType === value}
              onClick={() => onTypeChange(value)}
            >
              {icon} {t(key, language)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">{t('licenseFilter', language)}</span>
        <div className="filter-chips">
          {LICENSES.map(([value, icon, key]) => (
            <button
              type="button"
              key={value}
              className={`filter-chip ${activeLicense === value ? 'active' : ''}`}
              aria-pressed={activeLicense === value}
              onClick={() => onLicenseChange(value)}
            >
              {icon} {t(key, language)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="filter-btn secondary"
        onClick={onReset}
        style={{ width: '100%', marginTop: '0.35rem' }}
      >
        🔄 {t('reset', language)}
      </button>
    </div>
  );
}
