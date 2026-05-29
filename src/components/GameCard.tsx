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
    ? <span className="card-badge worth">{game.worth}</span>
    : null;

  return (
    <article
      className={`game-card ${isViewed ? 'viewed' : ''}`}
      data-id={game.id}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="card-img-wrapper">
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x150?text=Juego+Gratis'; }}
        />
        <div className="card-badges">
          <span className="card-badge platform">{sourceBadge} {game.platformName || game.platform}</span>
          {worth}
        </div>
      </div>

      <div className="card-actions">
        <button className="card-action-btn" onClick={() => {
          if (confirm('¿Ocultar este juego? Puedes verlo en "Ocultos"')) {
            onHideGame(game.id);
          }
        }} title="Ocultar">🙈</button>
        <button
          className={`card-action-btn ${isFavorite ? 'is-fav' : ''}`}
          onClick={() => onToggleFavorite(game.id)}
          title={isFavorite ? 'Quitar favorito' : 'Añadir favorito'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
        <a href={ytLink} target="_blank" rel="noopener" className="card-action-btn" title="Ver gameplay">▶️</a>
      </div>

      <div className="card-info">
        <h3 className="card-title">{game.title}</h3>
        <p className="card-desc">{game.description || 'Juego gratuito disponible'}</p>
        <div className="card-footer">
          <span className={`card-time ${timeInfo.className}`}>{timeInfo.text}</span>
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
