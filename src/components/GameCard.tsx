import { useRef, useCallback } from 'react';
import { Game, ViewMode, Language, Vote } from '../types';
import { getTimeInfo, parsePrice } from '../utils/format';
import { t } from '../i18n';

interface GameCardProps {
  game: Game;
  index: number;
  isFavorite: boolean;
  isViewed: boolean;
  isNew: boolean;
  votes: Record<string, Vote>;
  viewMode: ViewMode;
  language: Language;
  multiSelectActive?: boolean;
  isMultiSelected?: boolean;
  onToggleFavorite: (id: string) => void;
  onMarkAsViewed: (id: string) => void;
  onOpenDetail: (game: Game) => void;
  onToggleMultiSelectGame?: (id: string) => void;
}

export default function GameCard({
  game, index, isFavorite, isViewed, isNew, votes, viewMode, language,
  multiSelectActive, isMultiSelected,
  onToggleFavorite, onMarkAsViewed, onOpenDetail,
  onToggleMultiSelectGame
}: GameCardProps) {
  const timeInfo = getTimeInfo(game.endDate, game.type);
  const gameVotes = votes[game.id];
  const isListView = viewMode === 'list';

  const cardRef = useRef<HTMLDivElement>(null);

  const worth = game.worth && game.worth !== 'N/A' && game.worth !== 'Pago'
    ? <span className="card-img-badge worth">{parsePrice(game.worth) >= 60 ? '🔥 ' : ''}{game.worth}</span>
    : null;

  const worthValue = game.worth && game.worth !== 'N/A' && game.worth !== 'Pago'
    ? parsePrice(game.worth)
    : 0;

  const handleClick = useCallback(() => {
    if (multiSelectActive) {
      if (onToggleMultiSelectGame) onToggleMultiSelectGame(game.id);
      return;
    }
    onOpenDetail(game);
    onMarkAsViewed(game.id);
  }, [multiSelectActive, onToggleMultiSelectGame, game, onOpenDetail, onMarkAsViewed]);

  return (
    <article
      ref={cardRef}
      className={[
        'game-card',
        isViewed ? 'viewed' : '',
        isNew ? 'new-game' : '',
        isListView ? 'list-view' : '',
        isMultiSelected ? 'multi-selected' : '',
      ].filter(Boolean).join(' ')}
      data-id={game.id}
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="card-img">
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src =
              `https://placehold.co/300x150/11111b/ef4444?text=${encodeURIComponent(game.title.slice(0, 20))}`;
          }}
        />
        {!isListView && (
          <div className="card-img-badges">
            {isNew && <span className="card-img-badge new-badge">{t('newBadge', language)}</span>}
            {worth}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="card-body">
        <h3 className="card-title">{game.title}</h3>

        {/* In list view, show platform name as subtitle */}
        {isListView && (
          <span style={{ fontSize: '.58rem', color: 'var(--text-muted)', lineHeight: 1 }}>
            {game.platformName || game.platform}
          </span>
        )}          <div className="card-meta">
            <div className="card-meta-left">
              <span className={`card-time ${timeInfo.className}`}>{timeInfo.text}</span>
              {worthValue > 0 && (
                <span className="card-savings-label">
                  💰{t('reclaim', language)} {game.worth}
                </span>
              )}
            </div>
            <div className="card-actions">
              <button
                className={`card-action${isFavorite ? ' fav' : ''}`}
                onClick={e => { e.stopPropagation(); onToggleFavorite(game.id); }}
                title={isFavorite ? t('removeFav', language) : t('addFav', language)}
              >
                {isFavorite ? '❤️' : '🤍'}
              </button>
              <a
                href={game.url}
                target="_blank"
                rel="noopener noreferrer"
                className="claim-btn"
                onClick={e => { e.stopPropagation(); }}
              >
                🎮 {t('reclaim', language)}
              </a>
            </div>
          </div>
      </div>
    </article>
  );
}
