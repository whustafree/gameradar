import { useState, useEffect, useCallback } from 'react';
import { Game, GamesResponse } from '../types';
import { loadFavorites, saveFavorites, loadHiddenGames, saveHiddenGames, loadViewedGames, saveViewedGames } from '../utils/storage';

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [hiddenGames, setHiddenGames] = useState<string[]>(() => loadHiddenGames());
  const [viewedGames, setViewedGames] = useState<string[]>(() => loadViewedGames());
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persist to localStorage on change
  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  useEffect(() => { saveHiddenGames(hiddenGames); }, [hiddenGames]);
  useEffect(() => { saveViewedGames(viewedGames); }, [viewedGames]);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/free-games');
      if (!res.ok) throw new Error('Error en la API');
      const data: GamesResponse = await res.json();
      setGames(data.games || []);
      setLastUpdated(data.lastUpdated || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const idx = prev.indexOf(id);
      if (idx > -1) return prev.filter(f => f !== id);
      return [...prev, id];
    });
  }, []);

  const hideGame = useCallback((id: string) => {
    setHiddenGames(prev => [...prev, id]);
  }, []);

  const markAsViewed = useCallback((id: string) => {
    setViewedGames(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  return {
    games,
    favorites,
    hiddenGames,
    viewedGames,
    lastUpdated,
    isLoading,
    error,
    loadGames,
    toggleFavorite,
    hideGame,
    markAsViewed
  };
}
