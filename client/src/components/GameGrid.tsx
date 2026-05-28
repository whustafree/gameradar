import { Game } from '../types';
import GameCard from './GameCard';

interface GameGridProps {
  games: Game[];
  favorites: string[];
  viewedGames: string[];
  onToggleFavorite: (id: string) => void;
  onHideGame: (id: string) => void;
  onMarkAsViewed: (id: string) => void;
}

export default function GameGrid({ games, favorites, viewedGames, onToggleFavorite, onHideGame, onMarkAsViewed }: GameGridProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <div id="games-container" className="games-grid">
      {games.map((game, index) => (
        <GameCard
          key={game.id}
          game={game}
          index={index}
          isFavorite={favorites.includes(game.id)}
          isViewed={viewedGames.includes(game.id)}
          onToggleFavorite={onToggleFavorite}
          onHideGame={onHideGame}
          onMarkAsViewed={onMarkAsViewed}
        />
      ))}
    </div>
  );
}
