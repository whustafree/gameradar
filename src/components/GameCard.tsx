import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Game, ViewMode, Language } from '../types';
import { getTimeInfo, parsePrice, vibrate, playSound, getRelativeDate, getRelativeDateEn } from '../utils/format';
import { t } from '../i18n';
import { useSwipeGesture, createRipple } from '../hooks/useSwipeGesture';
import { showToast } from './Toast';

// --- Web Share API ---
async function shareGame(game: Game, language: Language) {
  const shareData = {
    title: game.title,
    text: language === 'es'
      ? `🎮 ¡${game.title} gratis! Ahorra $${game.worth || '??'} en ${game.platformName || game.platform}`
      : `🎮 ${game.title} is free! Save $${game.worth || '??'} on ${game.platformName || game.platform}`,
    url: game.url,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${game.url}`
      );
      showToast(language === 'es' ? '📋 Enlace copiado al portapapeles' : '📋 Link copied to clipboard', 'success');
    }
  } catch { /* user cancelled */ }
  vibrate(10);
}

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
  const isListView = viewMode === 'list';

  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  // 3D Tilt effect on desktop ONLY (disabled on touch devices for performance)
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const tiltRAF = useRef<number | null>(null);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isTouchDevice) return;
    const card = cardRef.current;
    if (!card) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (tiltRAF.current) cancelAnimationFrame(tiltRAF.current);
    tiltRAF.current = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-3px)`;
      tiltRAF.current = null;
    });
  }, [isTouchDevice]);
  
  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice) return;
    const card = cardRef.current;
    if (!card) return;
    if (tiltRAF.current) {
      cancelAnimationFrame(tiltRAF.current);
      tiltRAF.current = null;
    }
    card.style.transform = '';
  }, [isTouchDevice]);

  const showPlayStoreMeta = game.rating && game.installs;
  const worth = game.worth && game.worth !== 'N/A' && game.worth !== 'Pago'
    ? <span className="card-img-badge worth">{parsePrice(game.worth) >= 60 ? '🔥 ' : ''}{game.worth}</span>
    : null;

  const worthValue = game.worth && game.worth !== 'N/A' && game.worth !== 'Pago'
    ? parsePrice(game.worth)
    : 0;

  // Swipe & Long press gestures
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  const handleSwipeLeft = useCallback(() => {
    // Swipe left = share game
    shareGame(game, language);
    playSound('swipe');
    vibrate(10);
  }, [game, language]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = open store to claim
    playSound('swipe');
    showToast(`🎮 ${t('reclaim', language)}`, 'info');
    window.open(game.url, '_blank');
  }, [game.url, language]);

  const handleLongPress = useCallback(() => {
    if (!multiSelectActive) {
      setContextMenu({ x: 0, y: 0 });
      vibrate(20);
      playSound('click');
    }
  }, [multiSelectActive]);

  const handleDoubleTap = useCallback(() => {
    // Double tap = share game
    shareGame(game, language);
    vibrate(10);
  }, [game, language]);

  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onLongPress: handleLongPress,
    onDoubleTap: handleDoubleTap,
  }, { elementRef: cardRef });

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (multiSelectActive) {
      if (onToggleMultiSelectGame) onToggleMultiSelectGame(game.id);
      return;
    }
    createRipple(e);
    onOpenDetail(game);
    onMarkAsViewed(game.id);
  }, [multiSelectActive, onToggleMultiSelectGame, game, onOpenDetail, onMarkAsViewed]);

  // Close context menu
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  // Removed handleFavoriteClick — favorites removed from UI

  return (
    <motion.article
      ref={cardRef}
      className={[
        'game-card',
        isViewed ? 'viewed' : '',
        isNew ? 'new-game' : '',
        isListView ? 'list-view' : '',
        isMultiSelected ? 'multi-selected' : '',
      ].filter(Boolean).join(' ')}
      data-id={game.id}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={swipeHandlers.onTouchEnd}
      tabIndex={0}
      role="button"
      aria-label={game.title}
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 250,
        damping: 24,
        mass: 0.6,
        delay: Math.min(index * 0.025, 0.3),
      }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
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
              {isNew && (() => {
                const dateStr = game.startDate ? (language === 'es' ? getRelativeDate(game.startDate) : getRelativeDateEn(game.startDate)) : '';
                return <motion.span className="card-img-badge new-badge" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>{t('newBadge', language)}{dateStr ? ` • ${dateStr}` : ''}</motion.span>;
              })()}
              {!isNew && game.startDate && (() => {
                const daysOld = Math.floor((Date.now() - new Date(game.startDate).getTime()) / 86400000);
                if (daysOld <= 7) {
                  return <motion.span className="card-img-badge new-badge" style={{ fontSize: '0.4rem' }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.15 }}>🆕 {language === 'es' ? getRelativeDate(game.startDate) : getRelativeDateEn(game.startDate)}</motion.span>;
                }
                return <motion.span className="card-img-badge" style={{ background: 'rgba(100,100,100,0.5)', color: 'var(--text-muted)', fontSize: '0.38rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }}>{t('addedLabel', language)} {language === 'es' ? getRelativeDate(game.startDate) : getRelativeDateEn(game.startDate)}</motion.span>;
              })()}
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
      <div className="card-glow-overlay" />            {/* Context menu (long press) */}
      {contextMenu && (
        <div className="safe-dropdown" style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 999, background: 'var(--glass-bg)', backdropFilter: 'blur(30px)',
          border: '0.5px solid var(--glass-border)', borderRadius: 'var(--radius-lg)',
          padding: '0.5rem', boxShadow: 'var(--shadow-xl)',
          minWidth: '160px', maxWidth: 'calc(100vw - 2rem)', animation: 'overflowIn 0.2s var(--ease-spring)',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <button className="nav-overflow-item" onClick={e => { e.stopPropagation(); window.open(game.url, '_blank'); setContextMenu(null); }}>
              🎮 {t('reclaim', language)}
            </button>
            <button className="nav-overflow-item" onClick={e => { e.stopPropagation(); shareGame(game, language); setContextMenu(null); }}>
              📤 {t('shareTitle', language)}
            </button>
            <button className="nav-overflow-item" onClick={e => { e.stopPropagation(); setContextMenu(null); if (onToggleMultiSelectGame) onToggleMultiSelectGame(game.id); }}>
              ☑️ {t('multiSelect', language)}
            </button>
            <div className="nav-overflow-divider" />
            <button className="nav-overflow-item" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', cursor: 'default' }}>
              👆 {language === 'es' ? 'Desliza izq: compartir • Der: reclamar' : 'Swipe L: share • R: claim'}
            </button>
          </div>
        </div>
      )}

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
              className="card-action"
              onClick={e => { e.stopPropagation(); shareGame(game, language); }}
              title={t('shareTitle', language)}
            >
              📤
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
