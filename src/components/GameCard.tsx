import { useRef, useState, useCallback } from 'react';
import { Game, ViewMode, Language, Vote } from '../types';
import { getTimeInfo, formatCurrency, parsePrice } from '../utils/format';
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
  const ytLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`;
  const platformIcon = game.platformIcon || (game.source === 'epic' ? '🎯' : game.source === 'gamerpower' ? '🎮' : game.source === 'reddit' ? '📱' : '🎯');
  const gameVotes = votes[game.id];
  const totalVotes = gameVotes ? gameVotes.up + gameVotes.down : 0;

  const isListView = viewMode === 'list';
  
  const [swiping, setSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeLeft, setShowSwipeLeft] = useState(false);
  const [showSwipeRight, setShowSwipeRight] = useState(false);
  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  const worth = game.worth && game.worth !== 'N/A'
    ? <span className="card-img-badge worth">${parsePrice(game.worth) >= 60 ? '🔥' : ''} {game.worth}</span>
    : null;

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = { title: game.title, text: `🎮 ${game.title} - ¡Gratis!`, url: game.url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(game.url);
    }
    if (navigator.vibrate) navigator.vibrate(15);
  }, [game]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 10) {
      setSwipeOffset(diff);
      setShowSwipeLeft(diff < -30);
      setShowSwipeRight(diff > 30);
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (swipeOffset < -60) {
      // Swipe left -> hide
      onHideGame(game.id);
      if (navigator.vibrate) navigator.vibrate(20);
    } else if (swipeOffset > 60) {
      // Swipe right -> favorite
      onToggleFavorite(game.id);
      if (navigator.vibrate) navigator.vibrate(20);
    }
    setSwipeOffset(0);
    setShowSwipeLeft(false);
    setShowSwipeRight(false);
  };

  // Long press context menu (desktop)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onHideGame(game.id);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleClick = () => {
    if (multiSelectActive) {
      if (onToggleMultiSelectGame) onToggleMultiSelectGame(game.id);
      return;
    }
    onOpenDetail(game);
    onMarkAsViewed(game.id);
  };

  return (
    <article
      ref={cardRef}
      className={`game-card ${isViewed ? 'viewed' : ''} ${isNew ? 'new-game' : ''} ${isListView ? 'list-view' : ''} ${isMultiSelected ? 'multi-selected' : ''}`}
      data-id={game.id}
      style={{
        animationDelay: `${index * 0.04}s`,
        transform: swiping ? `translateX(${swipeOffset}px)` : '',
        transition: swiping ? 'none' : 'transform 0.3s var(--ease)',
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

      <div className="card-img">
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src = `https://placehold.co/300x150/11111b/ef4444?text=${encodeURIComponent(game.title.slice(0, 20))}`;
          }}
        />
        {!isListView && (
          <div className="card-img-badges">
            {isNew && <span className="card-img-badge new-badge">{t('newBadge', language)}</span>}
            {game.type?.toLowerCase().includes('game') && game.source !== 'freetogame' && (
              <span className="card-img-badge free-to-keep" style={{fontSize:'0.5rem', padding:'0.1rem 0.3rem'}}>{t('freeToKeep', language)}</span>
            )}
            {worth}
          </div>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">{game.title}</h3>
        <div className="card-meta">
          <span className={`card-time ${timeInfo.className}`}>{timeInfo.text}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              className={`card-action ${isFavorite ? 'fav' : ''}`}
              onClick={e => { e.stopPropagation(); onToggleFavorite(game.id); }}
              title={isFavorite ? t('removeFav', language) : t('addFav', language)}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
            <a
              href={game.url}
              target="_blank"
              rel="noopener"
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
