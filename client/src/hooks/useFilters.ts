import { useState, useCallback, useMemo } from 'react';
import { Game, Mode, SortMode, Genre, TypeFilter, StoreFilter } from '../types';
import { GENRE_KEYWORDS } from '../utils/format';

interface UseFiltersProps {
  games: Game[];
  hiddenGames: string[];
  favorites: string[];
  showFavoritesOnly: boolean;
  showHiddenOnly: boolean;
  currentMode: Mode;
  searchTerm: string;
  sortMode: SortMode;
  activeGenre: Genre;
  activeStore: StoreFilter;
  activeType: TypeFilter;
}

export function useFilters({
  games, hiddenGames, favorites, showFavoritesOnly, showHiddenOnly,
  currentMode, searchTerm, sortMode, activeGenre, activeStore, activeType
}: UseFiltersProps) {
  return useMemo(() => {
    let filtered = games.filter(game => {
      if (showFavoritesOnly) return favorites.includes(game.id);
      if (showHiddenOnly) return hiddenGames.includes(game.id);
      if (hiddenGames.includes(game.id)) return false;
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
      if (activeGenre !== 'all') {
        const keywords = GENRE_KEYWORDS[activeGenre] || [];
        const text = `${game.title} ${game.description}`.toLowerCase();
        if (!keywords.some(k => text.includes(k))) return false;
      }
      if (searchTerm) {
        const text = `${game.title} ${game.description} ${game.platformName}`.toLowerCase();
        if (!text.includes(searchTerm.toLowerCase().trim())) return false;
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
  }, [games, hiddenGames, favorites, showFavoritesOnly, showHiddenOnly, currentMode, searchTerm, sortMode, activeGenre, activeStore, activeType]);
}

function parsePrice(price: string | undefined | null): number {
  if (!price || price === 'N/A' || price === 'Pago') return 0;
  const match = price.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}
