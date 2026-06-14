import { Game, ViewMode, Language, Vote } from '../types';
import { t } from '../i18n';
import GameCard from './GameCard';

interface TrendingSectionProps {
  trendingGames: Game[];
  favorites: string[];
  viewedGames: string[];
  newGameIds: string[];
  votes: Record<string, Vote>;
  viewMode: ViewMode;
  language: Language;
  showFavoritesOnly: boolean;
  multiSelectActive: boolean;
  toggleFavorite: (id: string) => void;
  handleMarkAsViewed: (id: string) => void;
  handleOpenDetail: (game: Game) => void;
}

export default function TrendingSection({
  trendingGames,
  favorites,
  viewedGames,
  newGameIds,
  votes,
  viewMode,
  language,
  showFavoritesOnly,
  multiSelectActive,
  toggleFavorite,
  handleMarkAsViewed,
  handleOpenDetail,
}: TrendingSectionProps) {
  if (trendingGames.length === 0 || showFavoritesOnly || multiSelectActive) {
    return null;
  }

  return (
    <section className="trending-section">
      <div className="trending-header">
        <div className="trending-icon">🔥</div>
        <h2 className="trending-title">{t('trendingTitle', language)}</h2>
        <span className="trending-subtitle">{t('trendingSubtitle', language)}</span>
      </div>
      {/*
        Cada tarjeta necesita un wrapper con ancho fijo para que el scroll
        horizontal funcione correctamente — sin él las tarjetas se expanden.
      */}
      <div className="trending-scroll">
        {trendingGames.map((game, index) => (
          <div
            key={game.id}
            style={{
              minWidth: 180,
              maxWidth: 200,
              width: 180,
              scrollSnapAlign: 'start',
              flexShrink: 0,
            }}
          >
            <GameCard
              game={game}
              index={index}
              isFavorite={favorites.includes(game.id)}
              isViewed={viewedGames.includes(game.id)}
              isNew={newGameIds.includes(game.id)}
              votes={votes}
              viewMode={viewMode}
              language={language}
              onToggleFavorite={toggleFavorite}
              onMarkAsViewed={handleMarkAsViewed}
              onOpenDetail={handleOpenDetail}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
