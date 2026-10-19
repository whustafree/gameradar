import { Language, StoreFilter } from '../types';

interface StoreOption {
  value: StoreFilter;
  icon: string;
  label: string;
}

const STORES: StoreOption[] = [
  { value: 'all', icon: '✦', label: 'Todas' },
  { value: 'steam', icon: '🟦', label: 'Steam' },
  { value: 'epic', icon: '🎯', label: 'Epic' },
  { value: 'gog', icon: '🟣', label: 'GOG' },
  { value: 'itch', icon: '🎨', label: 'Itch' },
  { value: 'battlenet', icon: '⚔️', label: 'Battle.net' },
  { value: 'origin', icon: '💠', label: 'Origin' },
  { value: 'drm', icon: '🔓', label: 'DRM-Free' },
];

interface StoreFilterBarProps {
  language: Language;
  activeStore: StoreFilter;
  onChange: (store: StoreFilter) => void;
}

/**
 * Franja de filtros por tienda, discreta, justo bajo la cabecera y sólo en
 * modo PC. Sustituye al desplegable que se abría al pulsar la pestaña PC.
 */
export default function StoreFilterBar({ language, activeStore, onChange }: StoreFilterBarProps) {
  return (
    <div className="store-filter-bar" role="group" aria-label={language === 'es' ? 'Filtrar por tienda' : 'Filter by store'}>
      <div className="store-filter-scroll">
        {STORES.map(store => {
          const active = activeStore === store.value;
          return (
            <button
              key={store.value}
              type="button"
              className={`store-filter-chip ${active ? 'active' : ''}`}
              onClick={() => onChange(store.value)}
              aria-pressed={active}
            >
              <span aria-hidden="true">{store.icon}</span>
              {store.label === 'Todas' && language !== 'es' ? 'All' : store.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
