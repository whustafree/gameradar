import { Game } from '../types';
import { getTimeInfo } from '../utils/format';

interface GameCardProps {
  game: Game;
  index: number;
  isFavorite: boolean;
  isViewed: boolean;
  onToggleFavorite: (id: string) => void;
  onHideGame: (id: string) => void;
  onMarkAsViewed: (id: string) => void;
}

export default function GameCard({ game, index, isFavorite, isViewed, onToggleFavorite, onHideGame, onMarkAsViewed }: GameCardProps) {
  const timeInfo = getTimeInfo(game.endDate, game.type);
  const ytLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`;
  const sourceBadge = game.source === 'epic' ? '🎯' : game.source === 'gamerpower' ? '🎮' : game.source === 'reddit' ? '📱' : '';

  const worth = game.worth && game.worth !== 'N/A'
    ? <span className="platform-badge worth-badge">{game.worth}</span>
    : null;

  return (
    <article
      className={`game-card ${isViewed ? 'viewed' : ''}`}
      data-id={game.id}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-actions">
        <button className="icon-btn hide-btn" onClick={() => {
          if (confirm('¿Ocultar este juego? Puedes verlo nuevamente en "Ocultos"')) {
            onHideGame(game.id);
          }
        }} title="Ocultar">🙈</button>
        <button
          className={`icon-btn heart-btn ${isFavorite ? 'is-fav' : ''}`}
          onClick={() => onToggleFavorite(game.id)}
          title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
        <a href={ytLink} target="_blank" rel="noopener" className="icon-btn trailer-btn" title="Ver gameplay">▶️</a>
      </div>

      <div className="card-image-wrapper">
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x150?text=Juego+Gratis'; }}
        />
        <div className="badges-container">
          <span className={`platform-badge ${game.platform}`}>{sourceBadge} {game.platformName || game.platform}</span>
          {worth}
        </div>
      </div>

      <div className="game-info">
        <h3>{game.title}</h3>
        <p>{game.description || 'Juego gratuito disponible'}</p>
        <div className="meta-info">
          <span className={`time-tag ${timeInfo.className}`}>{timeInfo.text}</span>
          <a
            href={game.url}
            target="_blank"
            rel="noopener"
            className="claim-btn"
            onClick={() => onMarkAsViewed(game.id)}
          >
            Reclamar →
          </a>
        </div>
      </div>
    </article>
  );
}
