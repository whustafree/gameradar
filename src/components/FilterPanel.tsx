import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language, Genre, StoreFilter, TypeFilter, SortMode, LicenseFilter } from '../types';
import { t, TranslationKeys } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface FilterPanelProps {
  language: Language;
  isOpen: boolean;
  searchTerm: string;
  activeGenre: Genre;
  activeStore: StoreFilter;
  activeType: TypeFilter;
  activeLicense: LicenseFilter;
  sortMode: SortMode;
  activeYear: string;
  onYearChange: (year: string) => void;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onGenreChange: (genre: Genre) => void;
  onStoreChange: (store: StoreFilter) => void;
  onTypeChange: (type: TypeFilter) => void;
  onLicenseChange: (license: LicenseFilter) => void;
  onSortChange: (mode: SortMode) => void;
  onReset: () => void;
}

interface GenreOption { value: Genre; icon: string; }
interface StoreOption { value: StoreFilter; icon: string; label: string; }
interface TypeOption { value: TypeFilter; icon: string; labelKey: TranslationKeys; }
interface SortOption { value: SortMode; icon: string; labelKey: TranslationKeys; }

/** Estado de filtros mientras el panel está abierto (borrador). */
interface FilterDraft {
  sortMode: SortMode;
  activeGenre: Genre;
  activeStore: StoreFilter;
  activeType: TypeFilter;
  activeLicense: LicenseFilter;
  activeYear: string;
}

const GENRES: GenreOption[] = [
  { value: 'all', icon: '🎮' },
  { value: 'action', icon: '⚔️' },
  { value: 'rpg', icon: '🗡️' },
  { value: 'shooter', icon: '🔫' },
  { value: 'strategy', icon: '🧠' },
  { value: 'puzzle', icon: '🧩' },
  { value: 'racing', icon: '🏎️' },
  { value: 'sports', icon: '⚽' },
  { value: 'indie', icon: '🎨' },
];

const STORES: StoreOption[] = [
  { value: 'all', icon: '📋', label: 'storeAll' },
  { value: 'steam', icon: '🟦', label: 'Steam' },
  { value: 'epic', icon: '🎯', label: 'Epic Games' },
  { value: 'gog', icon: '🟣', label: 'GOG' },
  { value: 'itch', icon: '🎨', label: 'Itch.io' },
  { value: 'battlenet', icon: '⚔️', label: 'Battle.net' },
  { value: 'origin', icon: '💠', label: 'Origin' },
  { value: 'drm', icon: '🔓', label: 'DRM-Free' },
];

const TYPES: TypeOption[] = [
  { value: 'all', icon: '📋', labelKey: 'all' },
  { value: 'game', icon: '🎮', labelKey: 'games' },
  { value: 'app', icon: '📱', labelKey: 'apps' },
];

const SORT_OPTIONS: SortOption[] = [
  { value: 'default', icon: '📅', labelKey: 'sortRecent' },
  { value: 'recent', icon: '🆕', labelKey: 'sortNewest' },
  { value: 'price-desc', icon: '💰', labelKey: 'sortPrice' },
  { value: 'ending-soon', icon: '⏰', labelKey: 'sortEnding' },
  { value: 'title', icon: '🔤', labelKey: 'sortAZ' },
  { value: 'popular', icon: '🔥', labelKey: 'sortPopular' },
];

const YEARS: { value: string; labelKey?: TranslationKeys; label?: string }[] = [
  { value: 'all', labelKey: 'all' },
  { value: '2026' },
  { value: '2025' },
  { value: '2024' },
  { value: '2023' },
  { value: '2022' },
  { value: '2021' },
  { value: 'older', labelKey: 'yearOlder' },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
} as const;

const sheetVariants = {
  hidden: { y: '100%', transition: { type: 'tween', duration: 0.3, ease: 'easeOut' } },
  visible: { y: 0, transition: { type: 'tween', duration: 0.3, ease: 'easeOut' } },
} as const;

export default function FilterPanel({
  language, isOpen, searchTerm,
  activeGenre, activeStore, activeType, activeLicense, sortMode,
  onClose, onSearchChange,
  onGenreChange, onStoreChange, onTypeChange, onLicenseChange, onSortChange,
  onReset,
  activeYear, onYearChange,
}: FilterPanelProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Borrador: cambiar chips ya no altera la lista al instante.
  const [draft, setDraft] = useState<FilterDraft>({
    sortMode, activeGenre, activeStore, activeType, activeLicense, activeYear,
  });

  // Al abrir, el borrador parte del estado real (descartando cambios no aplicados)
  useEffect(() => {
    if (!isOpen) return;
    setLocalSearch(searchTerm);
    setDraft({ sortMode, activeGenre, activeStore, activeType, activeLicense, activeYear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sheetRef = useDialogA11y<HTMLDivElement>(isOpen, onClose);

  const commit = useCallback((next: FilterDraft) => {
    onSortChange(next.sortMode);
    onGenreChange(next.activeGenre);
    onStoreChange(next.activeStore);
    onTypeChange(next.activeType);
    onLicenseChange(next.activeLicense);
    onYearChange(next.activeYear);
  }, [onSortChange, onGenreChange, onStoreChange, onTypeChange, onLicenseChange, onYearChange]);

  const handleApply = useCallback(() => {
    commit(draft);
    onClose();
  }, [commit, draft, onClose]);

  const handleReset = useCallback(() => {
    const cleared: FilterDraft = {
      sortMode: 'default',
      activeGenre: 'all',
      activeStore: 'all',
      activeType: 'all',
      activeLicense: 'all',
      activeYear: 'all',
    };
    setDraft(cleared);
    setLocalSearch('');
    onSearchChange('');
    commit(cleared);
    onReset();
  }, [commit, onReset, onSearchChange]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const chip = (active: boolean) => `filter-chip ${active ? 'active' : ''}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="filter-overlay open"
            key="filter-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleOverlayClick}
          />
          <motion.div
            ref={sheetRef}
            className="filter-sheet open"
            key="filter-sheet"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t('filters', language)}
          >
            <div className="filter-handle" aria-hidden="true" />
            <div className="filter-head">
              <h2 className="filter-title">🔍 {t('filters', language)}</h2>
              <button type="button" className="filter-close" onClick={onClose} aria-label={t('close', language)}>✕</button>
            </div>
            <div className="filter-body">
              <div className="filter-group">
                <span className="filter-label">{t('searchPlaceholder', language)}</span>
                <div className="filter-search-wrapper">
                  <span className="filter-search-icon" aria-hidden="true">🔍</span>
                  <input
                    type="search"
                    className="filter-search-input"
                    placeholder={t('searchPlaceholder', language)}
                    aria-label={t('searchPlaceholder', language)}
                    value={localSearch}
                    onChange={e => { setLocalSearch(e.target.value); onSearchChange(e.target.value); }}
                    autoComplete="off"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      className="filter-search-clear"
                      onClick={() => { setLocalSearch(''); onSearchChange(''); }}
                      aria-label={language === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
                    >✕</button>
                  )}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">{t('sortBy', language)}</span>
                <div className="filter-chips">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      className={chip(draft.sortMode === opt.value)}
                      aria-pressed={draft.sortMode === opt.value}
                      onClick={() => setDraft(d => ({ ...d, sortMode: opt.value }))}
                    >
                      {opt.icon} {t(opt.labelKey, language)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">{t('genre', language)}</span>
                <div className="filter-chips">
                  {GENRES.map(g => (
                    <button
                      type="button"
                      key={g.value}
                      className={chip(draft.activeGenre === g.value)}
                      aria-pressed={draft.activeGenre === g.value}
                      onClick={() => setDraft(d => ({ ...d, activeGenre: g.value }))}
                    >
                      {g.icon} {g.value === 'all' ? t('all', language) : g.value.charAt(0).toUpperCase() + g.value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">{t('storeFilter', language)}</span>
                <div className="filter-chips">
                  {STORES.map(s => (
                    <button
                      type="button"
                      key={s.value}
                      className={chip(draft.activeStore === s.value)}
                      aria-pressed={draft.activeStore === s.value}
                      onClick={() => setDraft(d => ({ ...d, activeStore: s.value }))}
                    >
                      {s.icon} {s.label === 'storeAll' ? t('storeAll', language) : s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">{t('type', language)}</span>
                <div className="filter-chips">
                  {TYPES.map(tp => (
                    <button
                      type="button"
                      key={tp.value}
                      className={chip(draft.activeType === tp.value)}
                      aria-pressed={draft.activeType === tp.value}
                      onClick={() => setDraft(d => ({ ...d, activeType: tp.value }))}
                    >
                      {tp.icon} {t(tp.labelKey, language)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">{t('year', language)}</span>
                <div className="filter-chips">
                  {YEARS.map(y => (
                    <button
                      type="button"
                      key={y.value}
                      className={chip(draft.activeYear === y.value)}
                      aria-pressed={draft.activeYear === y.value}
                      onClick={() => setDraft(d => ({ ...d, activeYear: y.value }))}
                    >
                      {y.labelKey ? t(y.labelKey, language) : y.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">{t('licenseFilter', language)}</span>
                <div className="filter-chips">
                  <button type="button" className={chip(draft.activeLicense === 'all')} aria-pressed={draft.activeLicense === 'all'} onClick={() => setDraft(d => ({ ...d, activeLicense: 'all' }))}>📋 {t('all', language)}</button>
                  <button type="button" className={chip(draft.activeLicense === 'open-source')} aria-pressed={draft.activeLicense === 'open-source'} onClick={() => setDraft(d => ({ ...d, activeLicense: 'open-source' }))}>🔓 {t('openSource', language)}</button>
                  <button type="button" className={chip(draft.activeLicense === 'proprietary')} aria-pressed={draft.activeLicense === 'proprietary'} onClick={() => setDraft(d => ({ ...d, activeLicense: 'proprietary' }))}>🔒 {t('proprietary', language)}</button>
                </div>
              </div>

              <div className="filter-actions">
                <button type="button" className="filter-btn secondary" onClick={handleReset}>🔄 {t('reset', language)}</button>
                <button type="button" className="filter-btn primary" onClick={handleApply}>✓ {t('apply', language)}</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
