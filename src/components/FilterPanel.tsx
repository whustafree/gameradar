import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language, Genre, StoreFilter, TypeFilter, SortMode, LicenseFilter } from '../types';
import { t, TranslationKeys } from '../i18n';

interface FilterPanelProps {
  language: Language;
  isOpen: boolean;
  searchTerm: string;
  activeGenre: Genre;
  activeStore: StoreFilter;
  activeType: TypeFilter;
  activeLicense: LicenseFilter;
  sortMode: SortMode;
  showFavoritesOnly: boolean;
  activeYear: string;
  onYearChange: (year: string) => void;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onGenreChange: (genre: Genre) => void;
  onStoreChange: (store: StoreFilter) => void;
  onTypeChange: (type: TypeFilter) => void;
  onLicenseChange: (license: LicenseFilter) => void;
  onSortChange: (mode: SortMode) => void;
  onToggleFavorites: () => void;
  onReset: () => void;
}

interface GenreOption { value: Genre; icon: string; }
interface StoreOption { value: StoreFilter; icon: string; label: string; }
interface TypeOption { value: TypeFilter; icon: string; labelKey: TranslationKeys; }
interface SortOption { value: SortMode; icon: string; labelKey: TranslationKeys; }

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
  { value: 'epic', icon: '🎯', label: 'Epic' },
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
  { value: 'price-desc', icon: '💰', labelKey: 'sortPrice' },
  { value: 'ending-soon', icon: '⏰', labelKey: 'sortEnding' },
  { value: 'title', icon: '🔤', labelKey: 'sortAZ' },
  { value: 'popular', icon: '🔥', labelKey: 'sortPopular' },
];

const YEARS = [
  { value: 'all', label: 'Todos' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: 'older', label: '2020 o antes' },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
} as const;

const sheetVariants = {
  hidden: { y: '100%', transition: { type: 'spring', stiffness: 400, damping: 40 } },
  visible: { y: 0, transition: { type: 'spring', stiffness: 400, damping: 40 } },
} as const;

export default function FilterPanel({
  language, isOpen, searchTerm,
  activeGenre, activeStore, activeType, activeLicense, sortMode, showFavoritesOnly,
  onClose, onSearchChange,
  onGenreChange, onStoreChange, onTypeChange, onLicenseChange, onSortChange,
  onToggleFavorites, onReset,
  activeYear, onYearChange,
}: FilterPanelProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);

  useEffect(() => { setLocalSearch(searchTerm); }, [searchTerm, isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

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
            className="filter-sheet open"
            key="filter-sheet"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            role="dialog"
            aria-label={t('filters', language)}
          >
            <div className="filter-handle" />
            <div className="filter-head">
              <h2 className="filter-title">🔍 {t('filters', language)}</h2>
              <button className="filter-close" onClick={onClose}>✕</button>
            </div>
            <div className="filter-body">
              <div className="filter-group">
                <span className="filter-label">{t('searchPlaceholder', language)}</span>
                <div className="filter-search-wrapper">
                  <span className="filter-search-icon">🔍</span>
                  <input type="text" className="filter-search-input" placeholder={t('searchPlaceholder', language)}
                    value={localSearch}
                    onChange={e => { setLocalSearch(e.target.value); onSearchChange(e.target.value); }}
                    autoComplete="off" />
                  {localSearch && <button className="filter-search-clear" onClick={() => { setLocalSearch(''); onSearchChange(''); }}>✕</button>}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">{t('sortBy', language)}</span>
                <div className="filter-chips">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} className={`filter-chip ${sortMode === opt.value ? 'active' : ''}`} onClick={() => onSortChange(opt.value)}>
                      {opt.icon} {t(opt.labelKey, language)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">{t('genre', language)}</span>
                <div className="filter-chips">
                  {GENRES.map(g => (
                    <button key={g.value} className={`filter-chip ${activeGenre === g.value ? 'active' : ''}`} onClick={() => onGenreChange(g.value)}>
                      {g.icon} {g.value === 'all' ? t('all', language) : g.value.charAt(0).toUpperCase() + g.value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">{t('storeFilter', language)}</span>
                <div className="filter-chips">
                  {STORES.map(s => (
                    <button key={s.value} className={`filter-chip ${activeStore === s.value ? 'active' : ''}`} onClick={() => onStoreChange(s.value)}>
                      {s.icon} {s.label === 'storeAll' ? t('storeAll', language) : s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">{t('type', language)}</span>
                <div className="filter-chips">
                  {TYPES.map(tp => (
                    <button key={tp.value} className={`filter-chip ${activeType === tp.value ? 'active' : ''}`} onClick={() => onTypeChange(tp.value)}>
                      {tp.icon} {t(tp.labelKey, language)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Año</span>
                <div className="filter-chips">
                  {YEARS.map(y => (
                    <button key={y.value} className={`filter-chip ${activeYear === y.value ? 'active' : ''}`} onClick={() => onYearChange(y.value)}>{y.label}</button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">{t('licenseFilter', language)}</span>
                <div className="filter-chips">
                  <button className={`filter-chip ${activeLicense === 'all' ? 'active' : ''}`} onClick={() => onLicenseChange('all')}>📋 {t('all', language)}</button>
                  <button className={`filter-chip ${activeLicense === 'open-source' ? 'active' : ''}`} onClick={() => onLicenseChange('open-source')}>🔓 {t('openSource', language)}</button>
                  <button className={`filter-chip ${activeLicense === 'proprietary' ? 'active' : ''}`} onClick={() => onLicenseChange('proprietary')}>🔒 {t('proprietary', language)}</button>
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">{t('specials', language)}</span>
                <div className="filter-chips">
                  <button className={`filter-chip ${showFavoritesOnly ? 'active' : ''}`} onClick={onToggleFavorites}>❤️ {t('favOnly', language)}</button>
                </div>
              </div>
              <div className="filter-actions">
                <button className="filter-btn secondary" onClick={onReset}>🔄 {t('reset', language)}</button>
                <button className="filter-btn primary" onClick={onClose}>{t('apply', language)}</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
