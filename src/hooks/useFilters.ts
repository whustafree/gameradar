import { useMemo } from 'react';
import { Game, Mode, SortMode, Genre, TypeFilter, StoreFilter, LicenseFilter } from '../types';
import { GENRE_KEYWORDS, parsePrice } from '../utils/format';

interface UseFiltersProps {
  games: Game[];
  favorites: string[];
  showFavoritesOnly: boolean;
  currentMode: Mode;
  searchTerm: string;
  sortMode: SortMode;
  activeGenre: Genre;
  activeStore: StoreFilter;
  activeType: TypeFilter;
  activeLicense: LicenseFilter;
  activeYear?: string;
}

export function useFilters({
  games, favorites, showFavoritesOnly,
  currentMode, searchTerm, sortMode, activeGenre, activeStore, activeType, activeLicense, activeYear
}: UseFiltersProps) {
  return useMemo(() => {
    let filtered = games.filter(game => {
      if (showFavoritesOnly) return favorites.includes(game.id);
      if (game.category !== currentMode) return false;
      if (currentMode === 'pc' && activeStore !== 'all') {
        if (!game.platform?.includes(activeStore)) return false;
      }
      if (activeType !== 'all') {
        const type = game.type?.toLowerCase() || '';
        if (activeType === 'game' && !type.includes('game')) return false;
        if (activeType === 'dlc' && !type.includes('dlc')) return false;
        if (activeType === 'app' && !type.includes('app')) return false;
      }
      if (activeLicense === 'open-source' && !game.license) return false;
      if (activeLicense === 'proprietary' && game.license) return false;
      if (activeGenre !== 'all') {
        const keywords = GENRE_KEYWORDS[activeGenre] || [];
        const text = `${game.title} ${game.description}`.toLowerCase();
        if (!keywords.some(k => text.includes(k))) return false;
      }
      if (searchTerm) {
        const text = `${game.title} ${game.description} ${game.platformName}`.toLowerCase();
        if (!text.includes(searchTerm.toLowerCase().trim())) return false;
      }
      if (activeYear && activeYear !== 'all') {
        // Try to filter by endDate year (games that end this year)
        if (game.endDate) {
          const gameYear = new Date(game.endDate).getFullYear().toString();
          if (activeYear === 'older') {
            // 'older' = 2021 or before
            const yearNum = parseInt(gameYear);
            if (yearNum > 2021) return false;
          } else if (gameYear !== activeYear) {
            return false;
          }
        } else if (activeYear !== 'all') {
          // Games without endDate: show only if 'all' or 'older' (no date = old)
          if (activeYear !== 'older') return false;
        }
      }
      return true;
    });

    switch (sortMode) {
      case 'price-desc':
        filtered.sort((a, b) => parsePrice(b.worth) - parsePrice(a.worth));
        break;
      case 'ending-soon':
        filtered.sort((a, b) => {
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        });
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        filtered.sort((a, b) => {
          if (a.endDate && !b.endDate) return -1;
          if (!a.endDate && b.endDate) return 1;
          return 0;
        });
    }

    return filtered;
  }, [games, favorites, showFavoritesOnly, currentMode, searchTerm, sortMode, activeGenre, activeStore, activeType, activeLicense]);
}
