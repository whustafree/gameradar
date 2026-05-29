import { Mode, ViewMode, Language } from '../types';
import { t } from '../i18n';

interface BottomNavProps {
  currentMode: Mode;
  viewMode: ViewMode;
  favoritesCount: number;
  isFilterOpen: boolean;
  showFavoritesOnly: boolean;
  language: Language;
  multiSelectActive?: boolean;
  onModeChange: (mode: Mode) => void;
  onToggleFilters: () => void;
  onToggleFavorites: () => void;
  onResetFilters: () => void;
  onToggleViewMode: () => void;
  onOpenStats: () => void;
  onOpenSettings?: () => void;
  onToggleMultiSelect?: () => void;
}

const MODES: { mode: Mode; icon: string; labelKey: 'navPC' | 'navAndroid' | 'navConsole' | 'navIos' }[] = [
  { mode: 'pc', icon: '🖥️', labelKey: 'navPC' },
  { mode: 'android', icon: '📱', labelKey: 'navAndroid' },
  { mode: 'console', icon: '🎮', labelKey: 'navConsole' },
  { mode: 'ios', icon: '🍎', labelKey: 'navIos' },
];

export default function BottomNav({
  currentMode, viewMode, favoritesCount, isFilterOpen, showFavoritesOnly, language,
  multiSelectActive,
  onModeChange, onToggleFilters, onToggleFavorites, onResetFilters, onToggleViewMode, onOpenStats,
  onOpenSettings, onToggleMultiSelect
}: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {MODES.map(({ mode, icon, labelKey }) => (
        <button
          key={mode}
          className={`nav-btn ${currentMode === mode ? 'active' : ''}`}
          onClick={() => onModeChange(mode)}
          title={t(labelKey, language)}
        >
          <span className="nav-btn-icon">{icon}</span>
          <span className="nav-btn-label">{t(labelKey, language)}</span>
        </button>
      ))}

      <button
        className={`nav-btn ${isFilterOpen ? 'active' : ''}`}
        onClick={onToggleFilters}
        title={t('navFilters', language)}
      >
        <span className="nav-btn-icon">⚙️</span>
        <span className="nav-btn-label">{t('navFilters', language)}</span>
      </button>

      <button
        className={`nav-btn ${showFavoritesOnly ? 'active' : ''}`}
        onClick={onToggleFavorites}
        title={t('navFav', language)}
      >
        <span className="nav-btn-icon">❤️</span>
        <span className="nav-btn-label">{t('navFav', language)}</span>
        {favoritesCount > 0 && (
          <span className="nav-badge">{favoritesCount > 99 ? '99+' : favoritesCount}</span>
        )}
      </button>

      <button
        className="nav-btn"
        onClick={onToggleViewMode}
        title={viewMode === 'grid' ? t('navList', language) : t('navGrid', language)}
      >
        <span className="nav-btn-icon">{viewMode === 'grid' ? '📋' : '🔲'}</span>
        <span className="nav-btn-label">{viewMode === 'grid' ? t('navList', language) : t('navGrid', language)}</span>
      </button>

      <button className={`nav-btn ${multiSelectActive ? 'active' : ''}`} onClick={() => { if (onToggleMultiSelect) onToggleMultiSelect(); }} title={t('multiSelect', language)}>
        <span className="nav-btn-icon">{multiSelectActive ? '✅' : '☑️'}</span>
        <span className="nav-btn-label">{t('multiSelect', language)}</span>
      </button>

      <button className="nav-btn" onClick={onOpenStats} title={t('myStats', language)}>
        <span className="nav-btn-icon">📊</span>
        <span className="nav-btn-label">{t('navStats', language)}</span>
      </button>

      <button className="nav-btn" onClick={() => { if (onOpenSettings) onOpenSettings(); }} title={t('theme', language)}>
        <span className="nav-btn-icon">⚙️</span>
        <span className="nav-btn-label">{t('theme', language)}</span>
      </button>

      <button className="nav-btn" onClick={onResetFilters} title={t('navReset', language)}>
        <span className="nav-btn-icon">🔄</span>
        <span className="nav-btn-label">{t('navReset', language)}</span>
      </button>
    </nav>
  );
}
