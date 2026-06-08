import { useRef, useState, useCallback } from 'react';
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
  onHideGame: (id: string) => void;
  onMarkAsViewed: (id: string) => void;
  onOpenDetail: (game: Game) => void;
  onToggleMultiSelectGame?: (id: string) => void;
}

export default function GameCard({
  game, index, isFavorite, isViewed, isNew, votes, viewMode, language,
  multiSelectActive, isMultiSelected,
  onToggleFavorite, onHideGame, onMarkAsViewed, onOpenDetail,
  onToggleMultiSelectGame
}: GameCardProps) {
  const timeInfo = getTimeInfo(game.endDate, game.type);
  const gameVotes = votes[game.id];
  const isListView = viewMode === 'list';

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeLeft, setShowSwipeLeft] = useState(false);
  const [showSwipeRight, setShowSwipeRight] = useState(false);
  const touchStartX = useRef(0);
  const swiping = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const worth = game.worth && game.worth !== 'N/A' && game.worth !== 'Pago'
    ? <span className="card-img-badge worth">{parsePrice(game.worth) >= 60 ? '🔥 ' : ''}{game.worth}</span>
    : null;

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swiping.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 10) {
      setSwipeOffset(diff);
      setShowSwipeLeft(diff < -30);
      setShowSwipeRight(diff > 30);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    swiping.current = false;
    if (swipeOffset < -60) {
      onHideGame(game.id);
      if (navigator.vibrate) navigator.vibrate(20);
    } else if (swipeOffset > 60) {
      onToggleFavorite(game.id);
      if (navigator.vibrate) navigator.vibrate(20);
    }
    setSwipeOffset(0);
    setShowSwipeLeft(false);
    setShowSwipeRight(false);
  }, [swipeOffset, game.id, onHideGame, onToggleFavorite]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onHideGame(game.id);
    if (navigator.vibrate) navigator.vibrate(15);
  }, [game.id, onHideGame]);

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
      style={{
        animationDelay: `${index * 0.04}s`,
        transform: swiping.current ? `translateX(${swipeOffset}px)` : undefined,
        transition: swiping.current ? 'none' : undefined,
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {/* Swipe indicators */}
      <div className={`swipe-indicator left ${showSwipeLeft ? 'visible' : ''}`}>🙈</div>
      <div className={`swipe-indicator right ${showSwipeRight ? 'visible' : ''}`}>❤️</div>

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
        )}

        <div className="card-meta">
          <span className={`card-time ${timeInfo.className}`}>{timeInfo.text}</span>
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
              onClick={e => e.stopPropagation()}
            >
              {t('reclaim', language)}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
