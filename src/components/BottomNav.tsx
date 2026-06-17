import { useState, useRef, useEffect, useCallback } from 'react';
import { Mode, ViewMode, Language, StoreFilter } from '../types';
import { t } from '../i18n';
import { vibrate } from '../utils/format';

interface BottomNavProps {
  currentMode: Mode;
  viewMode: ViewMode;
  favoritesCount: number;
  showFavoritesOnly: boolean;
  language: Language;
  multiSelectActive?: boolean;
  visible?: boolean;
  activeStore?: StoreFilter;
  onModeChange: (mode: Mode) => void;
  onStoreChange?: (store: StoreFilter) => void;
  onToggleFavorites: () => void;
  onResetFilters: () => void;
  onToggleViewMode: () => void;
  onOpenStats: () => void;
  onOpenSettings?: () => void;
  onToggleMultiSelect?: () => void;
  onToggleFilter?: () => void;
}

const MODES: { mode: Mode; icon: string; labelKey: 'navPC' | 'navAndroid' }[] = [
  { mode: 'pc', icon: '🖥️', labelKey: 'navPC' },
  { mode: 'android', icon: '📱', labelKey: 'navAndroid' },
];

const PLATFORM_OPTIONS: { store: StoreFilter; icon: string; label: string }[] = [
  { store: 'all', icon: '📋', label: 'Todas' },
  { store: 'steam', icon: '🟦', label: 'Steam' },
  { store: 'epic', icon: '🎯', label: 'Epic Games' },
  { store: 'gog', icon: '🟣', label: 'GOG' },
  { store: 'itch', icon: '🎨', label: 'Itch.io' },
  { store: 'battlenet', icon: '⚔️', label: 'Battle.net' },
  { store: 'origin', icon: '💠', label: 'Origin' },
  { store: 'drm', icon: '🔓', label: 'DRM-Free' },
  { store: 'pc', icon: '🖥️', label: 'PC' },
];

export default function BottomNav({
  currentMode, viewMode, favoritesCount, showFavoritesOnly, language,
  multiSelectActive, visible = true, activeStore = 'all',
  onModeChange, onStoreChange, onToggleFavorites, onResetFilters, onToggleViewMode, onOpenStats,
  onOpenSettings, onToggleMultiSelect, onToggleFilter
}: BottomNavProps) {
  const [showOverflow, setShowOverflow] = useState(false);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);

  // Close overflow on outside click
  useEffect(() => {
    if (!showOverflow) return;
    const handleClick = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showOverflow]);

  // Close platform picker on outside click
  useEffect(() => {
    if (!showPlatformPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) {
        setShowPlatformPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPlatformPicker]);

  const handleOverflowAction = (action: () => void) => {
    setShowOverflow(false);
    action();
  };

  const handleModeWithPlatform = (mode: Mode) => {
    onModeChange(mode);
    if (mode === 'pc') {
      setShowPlatformPicker(true);
    }
    vibrate(8);
  };

  const handlePlatformSelect = (store: StoreFilter) => {
    if (onStoreChange) onStoreChange(store);
    setShowPlatformPicker(false);
    vibrate(6);
  };

  const currentPlatform = PLATFORM_OPTIONS.find(p => p.store === activeStore);

  return (
    <nav className={`bottom-nav ${!visible ? 'hidden' : ''}`}>
      {MODES.map(({ mode, icon, labelKey }) => (
        <div key={mode} className="nav-btn-wrapper" ref={mode === 'pc' ? platformRef : undefined}>
          <button
            className={`nav-btn ${currentMode === mode ? 'active' : ''}`}
            onClick={() => handleModeWithPlatform(mode)}
            title={t(labelKey, language)}
          >
            <span className="nav-btn-icon">{icon}</span>
            <span className="nav-btn-label">
              {mode === 'pc' && currentPlatform && currentPlatform.store !== 'all'
                ? currentPlatform.icon
                : t(labelKey, language)}
            </span>
            {mode === 'pc' && currentPlatform && currentPlatform.store !== 'all' && (
              <span className="nav-btn-sub-label">{currentPlatform.label}</span>
            )}
          </button>

          {/* Platform dropdown when PC is selected */}
          {mode === 'pc' && showPlatformPicker && currentMode === 'pc' && (
            <div className="platform-dropdown">
              <div className="platform-dropdown-header">
                {language === 'es' ? 'Seleccionar tienda' : 'Select store'}
              </div>
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.store}
                  className={`platform-dropdown-item ${activeStore === p.store ? 'active' : ''}`}
                  onClick={() => handlePlatformSelect(p.store)}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                  {activeStore === p.store && <span className="platform-dropdown-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        className={`nav-btn ${showFavoritesOnly ? 'active' : ''}`}
        onClick={() => { onToggleFavorites(); vibrate(6); }}
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
        onClick={() => { onToggleViewMode(); vibrate(6); }}
        title={viewMode === 'grid' ? t('navList', language) : t('navGrid', language)}
      >
        <span className="nav-btn-icon">{viewMode === 'grid' ? '📋' : '🔲'}</span>
        <span className="nav-btn-label">{viewMode === 'grid' ? t('navList', language) : t('navGrid', language)}</span>
      </button>

      {/* Overflow Menu (•••) */}
      <div className="nav-overflow-wrapper" ref={overflowRef}>
        <button
          className={`nav-btn ${showOverflow ? 'active' : ''}`}
          onClick={() => setShowOverflow(p => !p)}
          title={language === 'es' ? 'Más opciones' : 'More options'}
        >
          <span className="nav-btn-icon">•••</span>
          <span className="nav-btn-label">{language === 'es' ? 'Más' : 'More'}</span>
        </button>

        {showOverflow && (
          <div className="nav-overflow-menu">
            <button
              className={`nav-overflow-item ${multiSelectActive ? 'active' : ''}`}
              onClick={() => handleOverflowAction(() => { if (onToggleMultiSelect) onToggleMultiSelect(); })}
            >
              <span>{multiSelectActive ? '✅' : '☑️'}</span>
              {t('multiSelect', language)}
            </button>

            <button
              className="nav-overflow-item"
              onClick={() => handleOverflowAction(() => { if (onToggleFilter) onToggleFilter(); })}
            >
              <span>🔍</span>
              {t('filters', language)}
            </button>

            <button
              className="nav-overflow-item"
              onClick={() => handleOverflowAction(onOpenStats)}
            >
              <span>📊</span>
              {t('navStats', language)}
            </button>

            <button
              className="nav-overflow-item"
              onClick={() => handleOverflowAction(() => { if (onOpenSettings) onOpenSettings(); })}
            >
              <span>⚙️</span>
              {t('theme', language)}
            </button>

            <div className="nav-overflow-divider" />

            <button
              className="nav-overflow-item danger"
              onClick={() => handleOverflowAction(onResetFilters)}
            >
              <span>🔄</span>
              {t('navReset', language)}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
