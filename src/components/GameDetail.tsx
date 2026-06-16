import { useMemo, useState, useRef, useCallback } from 'react';
import { Game, Vote, Language, WishlistStatus, GameReactions, EmojiReaction } from '../types';
import { t } from '../i18n';
import { getTimeInfo } from '../utils/format';
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
const REACTION_KEYS: Record<EmojiReaction, string> = {
  fire: 'reactionFire', heart: 'reactionHeart', star: 'reactionStar',
  laugh: 'reactionLaugh', cool: 'reactionCool', sad: 'reactionSad',
};

export default function GameDetail({
  game, games = [], votes, reactions, wishlist, language, isOpen,
  onClose, onVote, onReaction, onToggleWishlist, onMarkClaimed, onOpenGame
}: GameDetailProps) {
  // Swipe to close gesture
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
    if (swipeOffset.current > 80) {
      onClose();
    }
    swipeOffset.current = 0;
  }, [onClose]);
  const timeInfo = getTimeInfo(game.endDate, game.type);
  const gameVotes = votes[game.id] || { up: 0, down: 0, userVote: null };
  const gameReactions = reactions[game.id] || { counts: { fire: 0, heart: 0, star: 0, laugh: 0, cool: 0, sad: 0 }, userReaction: null };
  const wishlistStatus = wishlist[game.id];
  const iconMap: Record<string, string> = {
    steam: '🟦', epic: '⬛', gog: '🟥', itch: '🤍',
  };

  const [showCompare, setShowCompare] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: game.title,
      text: `🎮 ${game.title} - ¡Gratis! Ahorra ${game.worth}`,
      url: game.url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(game.url);
      showToast(t('copied', language), 'success');
    }
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleDeepLinkShare = async () => {
    const deepLink = `${window.location.origin}?game=${game.id}`;
    await navigator.clipboard.writeText(deepLink);
    showToast(t('deepLinkCopied', language), 'success');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleVoteAction = (type: 'up' | 'down') => {
    onVote(game.id, type);
    showToast(t('voteRecorded', language), 'success');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleReaction = (r: EmojiReaction) => {
    onReaction(game.id, r);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleClaim = () => {
    onMarkClaimed(game.id);
    showToast(t('gameClaimed', language), 'success');
    if (navigator.vibrate) navigator.vibrate(20);
    window.location.href = game.url;
  };

  const handleWishlist = () => {
    onToggleWishlist(game.id);
    showToast(wishlistStatus ? t('gameRemoved', language) : t('gameWishlisted', language), 'info');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Similar games
  const similarGames = useMemo(() => {
    if (!games.length) return [];
    const targetGenre = game.genre || '';
    return games
      .filter(g => g.id !== game.id && (
        (targetGenre && g.genre === targetGenre) ||
        (!targetGenre && g.platform === game.platform)
      ))
      .slice(0, 6);
  }, [games, game]);

  // Available on other platforms (for compare)
  const sameTitleOnOtherPlatforms = useMemo(() => {
    if (!games.length) return [];
    return games.filter(g => g.id !== game.id && g.title.toLowerCase() === game.title.toLowerCase()).slice(0, 4);
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

        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="detail-header-img"
            onError={e => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                const ph = parent.querySelector('.detail-header-img-placeholder') as HTMLElement;
                if (ph) ph.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div className="detail-header-img-placeholder" style={{ display: game.image ? 'none' : 'flex' }}>
          🎮
        </div>

        <div className="detail-body">
          <h2 className="detail-title">{game.title}</h2>

          {/* Info grid */}
          <div className="detail-info-grid">
            {game.worth && game.worth !== 'N/A' && (
              <div className="detail-info-item">
                <span className="detail-info-label">{t('price', language)}</span>
                <span className="detail-info-value" style={{ color: 'var(--gold)' }}>${game.worth}</span>
              </div>
            )}
            <div className="detail-info-item">
              <span className="detail-info-label">{t('platform', language)}</span>
              <span className="detail-info-value">{game.platformName || game.platform}</span>
            </div>
            {game.source && (
              <div className="detail-info-item">
                <span className="detail-info-label">{t('store', language)}</span>
                <span className="detail-info-value">
                  {iconMap[game.source] || '🛒'} {game.source.charAt(0).toUpperCase() + game.source.slice(1)}
                </span>
              </div>
            )}
            <div className="detail-info-item">
              <span className="detail-info-label">{t('ends', language)}</span>
              <span className={`detail-info-value card-time ${timeInfo.className}`} style={{ fontSize: '0.75rem' }}>
                {timeInfo.text}
              </span>
            </div>
          </div>

          {/* Badges: type + F-Droid license */}
          {(game.type || game.license) && (
            <div className="detail-section" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '0.35rem' }}>
              {game.type && (
                <span className="card-img-badge" style={{
                  display: 'inline-block',
                  background: 'rgba(59,130,246,0.15)',
                  color: 'var(--blue)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  fontSize: '0.7rem',
                  padding: '0.25rem 0.6rem',
                }}>
                  {t('limitedOffer', language)}
                </span>
              )}
              {game.license && (
                <span className="card-img-badge" style={{
                  display: 'inline-block',
                  background: 'rgba(76,175,80,0.12)',
                  color: 'var(--green)',
                  border: '1px solid rgba(76,175,80,0.2)',
                  fontSize: '0.65rem',
                  padding: '0.25rem 0.6rem',
                }}>
                  📜 {t('license', language)}: {game.license}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {game.description && (
            <div className="detail-section">
              <span className="detail-section-label">{t('description', language)}</span>
              <p className="detail-section-text">{game.description}</p>
            </div>
          )}

          {/* Instructions */}
          {game.instructions && (
            <div className="detail-section">
              <span className="detail-section-label">{t('instructions', language)}</span>
              <p className="detail-section-text" style={{ whiteSpace: 'pre-wrap' }}>{game.instructions}</p>
            </div>
          )}

          {/* Reactions strip */}
          <div className="detail-section">
            <span className="detail-section-label">{t('addReaction', language)}</span>
            <div className="reactions-strip">
              {ALL_REACTIONS.map(r => {
                const count = gameReactions.counts[r] || 0;
                const isActive = gameReactions.userReaction === r;
                return (
                  <button
                    key={r}
                    className={`reaction-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleReaction(r)}
                  >
                    {REACTION_EMOJIS[r]} {count > 0 && <span className="reaction-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voting */}
          <div className="detail-section">
            <span className="detail-section-label">{t('share', language)}</span>
            <div className="vote-section">
              <button
                className={`vote-btn ${gameVotes.userVote === 'up' ? 'active' : ''}`}
                onClick={() => handleVoteAction('up')}
              >
                👍 {gameVotes.up > 0 ? gameVotes.up : ''}
              </button>
              <span className="vote-count">·</span>
              <button
                className={`vote-btn ${gameVotes.userVote === 'down' ? 'active' : ''}`}
                onClick={() => handleVoteAction('down')}
              >
                👎 {gameVotes.down > 0 ? gameVotes.down : ''}
              </button>
            </div>
          </div>

          {/* Compare platforms */}
          {sameTitleOnOtherPlatforms.length > 0 && (
            <div className="detail-section">
              <span className="detail-section-label">{t('comparePlatforms', language)}</span>
              <div className="compare-platforms">
                {sameTitleOnOtherPlatforms.map(g => (
                  <a
                    key={g.id}
                    href={g.url}
                    target="_blank"
                    rel="noopener"
                    className="compare-chip"
                    onClick={e => e.stopPropagation()}
                  >
                    <span>{g.platformIcon || '🎮'}</span>
                    <span>{g.platformName || g.platform}</span>
                    {g.worth && g.worth !== 'N/A' && <span style={{ color: 'var(--gold)', marginLeft: 'auto' }}>${g.worth}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Store link */}
          <a
            href={game.url}
            target="_blank"
            rel="noopener"
            className="detail-btn primary"
            style={{ textAlign: 'center', textDecoration: 'none', width: '100%', justifyContent: 'center' }}
          >
            🔗 {t('openStore', language)}
          </a>
        </div>

        {/* Similar games */}
        {similarGames.length > 0 && (
          <div className="similar-section" style={{ padding: '0 1.25rem 1rem' }}>
            <div className="similar-header">{t('similarGames', language)}</div>
            <div className="similar-scroll">
              {similarGames.map(sg => (
                <div
                  key={sg.id}
                  className="similar-card"
                  onClick={() => { if (onOpenGame) onOpenGame(sg); }}
                >
                  <img src={sg.image} alt={sg.title} className="similar-card-img" loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/200x100/11111b/ef4444?text=${encodeURIComponent(sg.title.slice(0, 15))}`;
                    }}
                  />
                  <div className="similar-card-body">
                    <div className="similar-card-title">{sg.title}</div>
                    <div className="similar-card-platform">{sg.platformName || sg.platform}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Claim Bar */}
        <div className="detail-claim-bar">
          <button className="detail-claim-btn" onClick={handleClaim}>
            🎮 {t('reclaim', language)}
            {game.worth && game.worth !== 'N/A' ? (
              <span style={{fontSize:'0.65rem', opacity:0.8, marginLeft:'0.15rem'}}>(${game.worth})</span>
            ) : null}
          </button>
          <button
            className={`detail-claim-btn secondary ${wishlistStatus ? 'active' : ''}`}
            onClick={handleWishlist}
            title={wishlistStatus ? t('gameWishlisted', language) : t('addWishlist', language)}
          >
            💾
          </button>
          <button className="detail-claim-btn secondary" onClick={handleShare} title={t('shareTitle', language)}>
            📤
          </button>
        </div>

        <button className="detail-close-btn" onClick={onClose}>
          {t('close', language)} ✕
        </button>
      </div>
    </div>
  );
}
