import { useMemo, useState, useRef, useCallback } from 'react';
import { Game, Vote, Language, WishlistStatus, GameReactions, EmojiReaction } from '../types';
import { t } from '../i18n';
import { getTimeInfo, playSound } from '../utils/format';
import { showToast } from './Toast';

interface GameDetailProps {
  game: Game;
  games?: Game[];
  votes: Record<string, Vote>;
  reactions: Record<string, GameReactions>;
  wishlist: Record<string, WishlistStatus>;
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  onVote: (gameId: string, type: 'up' | 'down') => void;
  onReaction: (gameId: string, reaction: EmojiReaction) => void;
  onToggleWishlist: (gameId: string) => void;
  onMarkClaimed: (gameId: string) => void;
  onOpenGame?: (game: Game) => void;
}

const ALL_REACTIONS: EmojiReaction[] = ['fire', 'heart', 'star', 'laugh', 'cool', 'sad'];
const REACTION_EMOJIS: Record<EmojiReaction, string> = {
  fire: '🔥', heart: '❤️', star: '⭐', laugh: '😂', cool: '😎', sad: '😢',
};

export default function GameDetail({
  game, games = [], votes, reactions, wishlist, language, isOpen,
  onClose, onVote, onReaction, onToggleWishlist, onMarkClaimed, onOpenGame
}: GameDetailProps) {
  // Swipe to close
  const swipeStartX = useRef(0);
  const swipeOffset = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeOffset.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - swipeStartX.current;
    if (diff > 0 && sheetRef.current) {
      swipeOffset.current = diff;
      sheetRef.current.style.transform = `translateX(${diff * 0.3}px)`;
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      sheetRef.current.style.transform = '';
    }
    if (swipeOffset.current > 80) onClose();
    swipeOffset.current = 0;
  }, [onClose]);

  const timeInfo = getTimeInfo(game.endDate, game.type);
  const gameVotes = votes[game.id] || { up: 0, down: 0, userVote: null };
  const gameReactions = reactions[game.id] || { counts: { fire: 0, heart: 0, star: 0, laugh: 0, cool: 0, sad: 0 }, userReaction: null };
  const wishlistStatus = wishlist[game.id];

  const [showDesc, setShowDesc] = useState(false);

  const handleVoteAction = (type: 'up' | 'down') => {
    onVote(game.id, type);
    playSound('click');
    showToast(t('voteRecorded', language), 'success');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleReactionAction = (r: EmojiReaction) => {
    onReaction(game.id, r);
    playSound('click');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleClaim = () => {
    onMarkClaimed(game.id);
    playSound('success');
    showToast(t('gameClaimed', language), 'success');
    if (navigator.vibrate) navigator.vibrate(20);
    window.location.href = game.url;
  };

  const handleWishlist = () => {
    onToggleWishlist(game.id);
    playSound('click');
    showToast(wishlistStatus ? t('gameRemoved', language) : t('gameWishlisted', language), 'info');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: game.title, text: `🎮 ${game.title} - Gratis! $${game.worth}`, url: game.url }); } catch {}
    } else {
      await navigator.clipboard.writeText(game.url);
      showToast(t('copied', language), 'success');
    }
    if (navigator.vibrate) navigator.vibrate(15);
  };

  // Similar games
  const similarGames = useMemo(() => {
    if (!games.length) return [];
    return games
      .filter(g => g.id !== game.id && (
        (game.genre && g.genre === game.genre) ||
        (!game.genre && g.platform === game.platform)
      ))
      .slice(0, 6);
  }, [games, game]);

  return (
    <div
      className={`detail-overlay ${isOpen ? 'open' : ''}`}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={sheetRef} className="detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="detail-handle" />

        {/* Header Image */}
        <div className="detail-img-wrap">
          {game.image ? (
            <img
              src={game.image}
              alt={game.title}
              className="detail-header-img"
              onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/11111b/ef4444?text=GameRadar'; }}
            />
          ) : (
            <div className="detail-header-img-placeholder">🎮</div>
          )}
          {/* Floating close button over image */}
          <button className="detail-img-close" onClick={onClose}>✕</button>
          {/* Floating badge */}
          {game.type && <span className="detail-img-badge">{game.type}</span>}
        </div>

        <div className="detail-body">
          {/* Title + Meta row */}
          <div className="detail-top">
            <div className="detail-top-info">
              <h2 className="detail-title">{game.title}</h2>
              <div className="detail-subtitle">
                <span>{game.platformIcon || '🎮'} {game.platformName || game.platform}</span>
                {game.source && <span>· {game.source}</span>}
              </div>
            </div>
            {game.worth && game.worth !== 'N/A' && (
              <div className="detail-price-tag">${game.worth}</div>
            )}
          </div>

          {/* Time + License pills */}
          <div className="detail-pills">
            <span className={`detail-pill ${timeInfo.className}`}>
              ⏱ {timeInfo.text}
            </span>
            {game.license && (
              <span className="detail-pill" style={{ background: 'rgba(76,175,80,0.12)', color: 'var(--green)' }}>
                📜 {game.license}
              </span>
            )}
          </div>

          {game.endDate && (() => {
            const end = new Date(game.endDate).getTime();
            const now = Date.now();
            const total = end - now;
            if (total <= 0) return null;
            const pct = Math.max(5, Math.min(100, (total / (7 * 86400000)) * 100));
            return (
              <div className="time-progress-bar">
                <div className={`time-progress-fill ${total < 86400000 ? 'urgent' : ''}`} style={{ width: `${100 - pct}%` }} />
              </div>
            );
          })()}

          {/* Description - collapsible */}
          {game.description && (
            <div className="detail-desc">
              <p className={`detail-desc-text ${!showDesc ? 'clamped' : ''}`}>
                {game.description}
              </p>
              {game.description.length > 120 && (
                <button className="detail-desc-toggle" onClick={() => setShowDesc(p => !p)}>
                  {showDesc ? (language === 'es' ? 'Mostrar menos' : 'Show less') : (language === 'es' ? 'Leer más' : 'Read more')}
                </button>
              )}
            </div>
          )}

          {/* Instructions - collapsible */}
          {game.instructions && (
            <div className="detail-desc">
              <p className={`detail-desc-text ${!showDesc ? 'clamped' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                📋 {game.instructions}
              </p>
            </div>
          )}

          {/* Main Actions */}
          <div className="detail-actions-primary">
            <button className="detail-action-btn primary large" onClick={handleClaim}>
              🎮 {t('reclaim', language)}
              {game.worth && game.worth !== 'N/A' && <span className="detail-action-worth">${game.worth}</span>}
            </button>
          </div>

          <div className="detail-actions-secondary">
            <button
              className={`detail-action-btn ${wishlistStatus ? 'active' : ''}`}
              onClick={handleWishlist}
            >
              {wishlistStatus ? '💾' : '💿'} {wishlistStatus ? t('gameWishlisted', language) : t('addWishlist', language)}
            </button>
            <button className="detail-action-btn" onClick={handleShare}>
              📤 {t('shareTitle', language)}
            </button>
            <a
              href={game.url}
              target="_blank"
              rel="noopener"
              className="detail-action-btn"
              onClick={e => e.stopPropagation()}
            >
              🔗 {t('openStore', language)}
            </a>
          </div>

          {/* Vote + Reactions - compact row */}
          <div className="detail-social">
            <div className="detail-social-group">
              <button
                className={`detail-social-btn ${gameVotes.userVote === 'up' ? 'active' : ''}`}
                onClick={() => handleVoteAction('up')}
              >
                👍 {gameVotes.up > 0 ? <span className="detail-social-count">{gameVotes.up}</span> : null}
              </button>
              <button
                className={`detail-social-btn ${gameVotes.userVote === 'down' ? 'active' : ''}`}
                onClick={() => handleVoteAction('down')}
              >
                👎 {gameVotes.down > 0 ? <span className="detail-social-count">{gameVotes.down}</span> : null}
              </button>
            </div>
            <div className="detail-social-group reactions">
              {ALL_REACTIONS.map(r => {
                const count = gameReactions.counts[r] || 0;
                const isActive = gameReactions.userReaction === r;
                return (
                  <button
                    key={r}
                    className={`detail-social-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleReactionAction(r)}
                  >
                    {REACTION_EMOJIS[r]}
                    {count > 0 && <span className="detail-social-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Similar games */}
        {similarGames.length > 0 && (
          <div className="detail-similar">
            <div className="detail-similar-header">{t('similarGames', language)}</div>
            <div className="detail-similar-scroll">
              {similarGames.map(sg => (
                <div
                  key={sg.id}
                  className="detail-similar-card"
                  onClick={() => { if (onOpenGame) onOpenGame(sg); }}
                >
                  <img
                    src={sg.image} alt={sg.title} className="detail-similar-img" loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/200x100/11111b/ef4444?text=${encodeURIComponent(sg.title.slice(0, 15))}`;
                    }}
                  />
                  <div className="detail-similar-body">
                    <div className="detail-similar-title">{sg.title}</div>
                    <div className="detail-similar-platform">{sg.platformName || sg.platform}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
