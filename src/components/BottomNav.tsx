import { useState, useRef, useEffect } from 'react';
import { Mode, ViewMode, Language } from '../types';
import { t } from '../i18n';
import { vibrate } from '../utils/format';

interface BottomNavProps {
  currentMode: Mode;
  viewMode: ViewMode;
  showRecentOnly?: boolean;
  recentCount?: number;
  language: Language;
  multiSelectActive?: boolean;
  visible?: boolean;
  onModeChange: (mode: Mode) => void;
  onToggleRecent?: () => void;
  onResetFilters: () => void;
  onToggleViewMode: () => void;
  onOpenSettings?: () => void;
  onToggleMultiSelect?: () => void;
  onToggleFilter?: () => void;
}

const MODES: { mode: Mode; icon: string; labelKey: 'navPC' | 'navAndroid' }[] = [
  { mode: 'pc', icon: '🖥️', labelKey: 'navPC' },
  { mode: 'android', icon: '📱', labelKey: 'navAndroid' },
];

export default function BottomNav({
  currentMode, viewMode, showRecentOnly, recentCount = 0, language,
  multiSelectActive, visible = true,
  onModeChange, onToggleRecent, onResetFilters, onToggleViewMode,
  onOpenSettings, onToggleMultiSelect, onToggleFilter
}: BottomNavProps) {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

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

  const handleOverflowAction = (action: () => void) => {
    setShowOverflow(false);
    action();
  };

  /**
   * Cambiar de pestaña ya no abre el selector de tienda: el filtro vive en
   * una franja discreta bajo la cabecera (StoreFilterBar).
   */
  const handleMode = (mode: Mode) => {
    onModeChange(mode);
    vibrate(8);
  };

  return (
    <nav className={`bottom-nav ${!visible ? 'hidden' : ''}`}>
      {MODES.map(({ mode, icon, labelKey }) => (
        <button
          key={mode}
          type="button"
          className={`nav-btn ${currentMode === mode ? 'active' : ''}`}
          onClick={() => handleMode(mode)}
          title={t(labelKey, language)}
          aria-current={currentMode === mode ? 'page' : undefined}
        >
          <span className="nav-btn-icon">{icon}</span>
          <span className="nav-btn-label">{t(labelKey, language)}</span>
        </button>
      ))}

      <button
        type="button"
        className={`nav-btn ${showRecentOnly ? 'active' : ''}`}
        onClick={() => { if (onToggleRecent) onToggleRecent(); vibrate(6); }}
        title={t('navRecent', language)}
      >
        <span className="nav-btn-icon">🆕</span>
        <span className="nav-btn-label">{t('navRecent', language)}</span>
        {recentCount > 0 && (
          <span className="nav-badge">{recentCount > 99 ? '99+' : recentCount}</span>
        )}
      </button>

      <button
        type="button"
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
          type="button"
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
              type="button"
              className={`nav-overflow-item ${multiSelectActive ? 'active' : ''}`}
              onClick={() => handleOverflowAction(() => { if (onToggleMultiSelect) onToggleMultiSelect(); })}
            >
              <span>{multiSelectActive ? '✅' : '☑️'}</span>
              {t('multiSelect', language)}
            </button>

            <button
              type="button"
              className="nav-overflow-item"
              onClick={() => handleOverflowAction(() => { if (onToggleFilter) onToggleFilter(); })}
            >
              <span>🔍</span>
              {t('filters', language)}
            </button>

            <button
              type="button"
              className="nav-overflow-item"
              onClick={() => handleOverflowAction(() => { if (onOpenSettings) onOpenSettings(); })}
            >
              <span>⚙️</span>
              {t('theme', language)}
            </button>

            <div className="nav-overflow-divider" />

            <button
              type="button"
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
