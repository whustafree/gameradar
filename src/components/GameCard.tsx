import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Game, ViewMode, Language } from '../types';
import { getTimeInfo, parsePrice } from '../utils/format';
import { t } from '../i18n';

interface GameCardProps {
  game: Game;
  index: number;
  isFavorite: boolean;
  isViewed: boolean;
  isNew: boolean;
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
  game, index, isFavorite, isViewed, isNew, viewMode, language,
  multiSelectActive, isMultiSelected,
  onToggleFavorite, onMarkAsViewed, onOpenDetail,
  onToggleMultiSelectGame
}: GameCardProps) {
  const timeInfo = getTimeInfo(game.endDate, game.type);
  const [favoritePulse, setFavoritePulse] = useState(false);
  const favTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListView = viewMode === 'list';

  const cardRef = useRef<HTMLDivElement>(null);

  const showPlayStoreMeta = game.rating && game.installs;
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

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(game.id);
    setFavoritePulse(true);
    if (favTimeoutRef.current) clearTimeout(favTimeoutRef.current);
    favTimeoutRef.current = setTimeout(() => setFavoritePulse(false), 400);
  }, [game.id, onToggleFavorite]);

  return (
    <motion.article
      ref={cardRef}
      className={[
        'game-card',
        isViewed ? 'viewed' : '',
        isNew ? 'new-game' : '',
        isListView ? 'list-view' : '',
        isMultiSelected ? 'multi-selected' : '',
        isFavorite ? 'is-favorite' : '',
      ].filter(Boolean).join(' ')}
      data-id={game.id}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={game.title}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
        delay: index * 0.035,
      }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.96 }}
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
          <>
            {/* Floating platform tag */}
            <span className="card-platform-tag">
              {game.platformIcon || '🎮'} {game.platformName || game.platform}
            </span>
            <div className="card-img-badges">
              {isNew && <span className="card-img-badge new-badge">{t('newBadge', language)}</span>}
              {/* Badge: Siempre gratis vs Pasa a gratis */}
              {!game.endDate && game.source === 'fdroid' && (
                <span className="card-img-badge" style={{ background: 'rgba(76,175,80,0.9)', color: 'white', fontSize: '0.45rem' }}>
                  {t('alwaysFreeBadge', language)}
                </span>
              )}
              {game.worth && game.worth !== 'N/A' && game.worth !== 'Pago' && game.endDate && (
                <span className="card-img-badge" style={{ background: 'rgba(255,152,0,0.9)', color: 'white', fontSize: '0.45rem' }}>
                  ⏳ {t('paidToFreeBadge', language)}
                </span>
              )}
              {game.license && (
                <span className="card-img-badge" style={{ background: 'rgba(76,175,80,0.15)', color: 'var(--green)', fontSize: '0.4rem', border: '1px solid rgba(76,175,80,0.2)' }}>
                  📜 {game.license?.split('-')[0] || 'OS'}
                </span>
              )}
              {worth}
            </div>
          </>
        )}
      </div>

      {/* Glow overlay on hover */}
      <div className="card-glow-overlay" />

      {/* Body */}
      <div className="card-body">
        <h3 className="card-title">{game.title}</h3>

        {/* In list view, show platform name as subtitle */}
        {isListView && (
          <>
            <span style={{ fontSize: '.58rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              {game.platformName || game.platform}
            </span>
            {game.license && (
              <span style={{ fontSize: '.48rem', color: 'var(--green)', lineHeight: 1, marginTop: '0.1rem' }}>
                📜 {game.license}
              </span>
            )}
          </>
        )}
        {showPlayStoreMeta && (
          <div className="card-ps-meta">
            <span className="card-rating" title={`${game.rating?.toFixed(1)} ⭐`}>
              {'⭐'.repeat(Math.round(game.rating || 0))}
              <small>{game.rating?.toFixed(1)}</small>
            </span>
            {game.installs && (
              <span className="card-installs">{game.installs}</span>
            )}
            {game.publisher && (
              <span className="card-publisher">{game.publisher}</span>
            )}
          </div>
        )}
        <div className="card-meta">
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
              className={`card-action ${isFavorite ? 'fav' : ''} ${favoritePulse ? 'fav-pulse' : ''}`}
              onClick={handleFavoriteClick}
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
    </motion.article>
  );
}
