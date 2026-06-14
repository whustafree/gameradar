import { useMemo } from 'react';
import { Language, UserStats, Game, Vote, GameReactions, WishlistStatus, UserCollection, ActivityEntry, Achievement } from '../types';
import { t } from '../i18n';
import { parsePrice } from '../utils/format';
import { showToast } from './Toast';

interface StatsPanelProps {
  userStats: UserStats;
  games: Game[];
  favorites: string[];
  viewedGames: string[];
  votes: Record<string, Vote>;
  reactions: Record<string, GameReactions>;
  wishlist: Record<string, WishlistStatus>;
  collections: UserCollection[];
  activityLog: ActivityEntry[];
  achievements: Achievement[];
  language: Language;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function StatsPanel({
  userStats, games, favorites, viewedGames,
  votes, reactions, wishlist, collections, activityLog, achievements,
  language, onClose, onOpenSettings
}: StatsPanelProps) {
  // Compute global stats
  const globalStats = useMemo(() => {
    const totalValue = games.reduce((acc, g) => acc + parsePrice(g.worth), 0);
    const platformCount: Record<string, number> = {};
    games.forEach(g => {
      const p = g.platformName || g.platform || 'other';
      platformCount[p] = (platformCount[p] || 0) + 1;
    });
    const topPlatform = Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0];
    const endingSoon = games.filter(g => g.endDate && new Date(g.endDate).getTime() > Date.now()).length;
    const highestValue = games.reduce((max, g) => parsePrice(g.worth) > parsePrice(max.worth) ? g : max, games[0] || null);
    return { totalValue, totalGames: games.length, topPlatform, endingSoon, highestValue, platformCount };
  }, [games]);

  const handleExportJSON = () => {
    const data = JSON.stringify({ userStats, globalStats }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freegamehub-stats-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('dataExported', language), 'success');
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleExportText = () => {
    const lines = [
      `FreeGameHub Stats - ${new Date().toLocaleDateString()}`,
      `────────────────────────`,
      `${t('totalClaimed', language)}: ${userStats.totalClaimed}`,
      `${t('totalSavingsStats', language)}: $${userStats.totalSavings.toFixed(2)}`,
      `${t('gamesSeen', language)}: ${userStats.totalGamesSeen}`,
      `${t('favorites', language)}: ${userStats.favoriteCount}`,
      `${t('votesMade', language)}: ${userStats.votesMade}`,
      `${t('reactionsMade', language)}: ${userStats.reactionsMade}`,
      `${t('globalFreeGames', language)}: ${globalStats.totalGames}`,
      `${t('globalValue', language)}: $${globalStats.totalValue.toFixed(2)}`,
      `${t('endingSoonCount', language)}: ${globalStats.endingSoon}`,
      `Session started: ${new Date(userStats.sessionStart).toLocaleString()}`,
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freegamehub-stats-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('dataExported', language), 'success');
    if (navigator.vibrate) navigator.vibrate(15);
  };

  // Top voted games (for a mini chart-like display)
  const topVotedGames = useMemo(() => {
    return Object.entries(votes)
      .map(([id, v]) => ({ id, score: v.up - v.down, up: v.up, down: v.down }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(v => ({ ...v, game: games.find(g => g.id === v.id) }));
  }, [votes, games]);

  const unlockedAchievements = achievements.filter(a => a.unlockedAt).length;
  const totalAchievements = achievements.length;

  return (
    <div className="filter-overlay open" onClick={onClose} style={{ zIndex: 400 }}>
      <div className="filter-sheet open" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
        <div className="filter-handle" />
        <div className="filter-head">
          <h3 className="filter-title">📊 {t('myStats', language)}</h3>
          <button className="filter-close" onClick={onClose}>✕</button>
        </div>

        <div className="stats-modal">
          {/* User Stats */}
          <span className="chart-title">{t('myStats', language)}</span>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{userStats.totalClaimed}</div>
              <div className="stat-label">{t('totalClaimed', language)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${userStats.totalSavings.toFixed(0)}</div>
              <div className="stat-label">{t('totalSavingsStats', language)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.totalGamesSeen}</div>
              <div className="stat-label">{t('gamesSeen', language)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.favoriteCount}</div>
              <div className="stat-label">{t('favorites', language)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.votesMade}</div>
              <div className="stat-label">{t('votesMade', language)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.reactionsMade}</div>
              <div className="stat-label">{t('reactionsMade', language)}</div>
            </div>
          </div>

          {/* Global Stats */}
          <span className="chart-title" style={{ marginTop: '0.75rem' }}>{t('globalStats', language)}</span>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{globalStats.totalGames}</div>
              <div className="stat-label">{t('globalFreeGames', language)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${globalStats.totalValue.toFixed(0)}</div>
              <div className="stat-label">{t('valueStats', language)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{globalStats.endingSoon}</div>
              <div className="stat-label">{t('endingSoonCount', language)}</div>
            </div>
            {globalStats.topPlatform && (
              <div className="stat-card">
                <div className="stat-value">{globalStats.topPlatform[1]}</div>
                <div className="stat-label">{t('mostGamesOn', language)}: {globalStats.topPlatform[0]}</div>
              </div>
            )}
          </div>

          {/* Top voted (bar chart-like visualization) */}
          {topVotedGames.some(v => v.game) && (
            <>
              <span className="chart-title" style={{ marginTop: '0.75rem' }}>🔥 {t('sortPopular', language)}</span>
              <div className="chart-container" style={{ height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {topVotedGames.filter(v => v.game).slice(0, 5).map((v, i) => {
                  const maxScore = Math.max(...topVotedGames.filter(x => x.game).map(x => x.score), 1);
                  const pct = (v.score / maxScore) * 100;
                  return (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem' }}>
                      <span style={{ width: '16px', textAlign: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>#{i + 1}</span>
                      <span style={{ flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {v.game!.title}
                      </span>
                      <div style={{
                        height: '16px',
                        width: `${Math.max(pct * 0.6, 5)}%`,
                        background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                        borderRadius: '4px',
                        minWidth: '4px',
                        transition: 'width 0.5s var(--ease)',
                        flexShrink: 0,
                      }} />
                      <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.62rem' }}>
                        👍{v.up} 👎{v.down}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Simple bar chart for savings (using CSS bars for a chart-like display) */}
          {userStats.totalSavings > 0 && (
            <>
              <span className="chart-title" style={{ marginTop: '0.75rem' }}>
                💰 {t('totalSavingsStats', language)} {userStats.totalClaimed > 0 ? `(${language === 'es' ? 'promedio' : 'avg'}: $${(userStats.totalSavings / userStats.totalClaimed).toFixed(0)}/juego)` : ''}
              </span>
              <div className="chart-container" style={{ height: '50px', display: 'flex', alignItems: 'flex-end', gap: '0.3rem' }}>
                {/* Simple representation of savings milestones */}
                {[100, 500, 1000].map(milestone => {
                  const achieved = userStats.totalSavings >= milestone;
                  const pct = Math.min((userStats.totalSavings / milestone) * 100, 100);
                  return (
                    <div key={milestone} style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <div style={{
                        width: '100%',
                        height: `${pct}%`,
                        minHeight: '4px',
                        background: achieved
                          ? 'linear-gradient(180deg, var(--gold), var(--amber))'
                          : 'var(--card-border)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.5s var(--ease)',
                        boxShadow: achieved ? '0 0 6px var(--accent-glow)' : 'none',
                      }} />
                      <span style={{ fontSize: '0.55rem', color: achieved ? 'var(--gold)' : 'var(--text-muted)' }}>
                        ${milestone}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Achievements progress bar */}
          <span className="chart-title" style={{ marginTop: '0.75rem' }}>🏆 {t('achievements', language)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              flex: '1',
              height: '8px',
              background: 'var(--card-border)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--gold))',
                borderRadius: '4px',
                transition: 'width 0.5s var(--ease)',
              }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
              {unlockedAchievements}/{totalAchievements}
            </span>
          </div>

          {/* Action buttons */}
          <div className="stats-actions">
            <button className="filter-btn secondary" onClick={handleExportJSON}>
              📄 {t('exportJSON', language)}
            </button>
            <button className="filter-btn secondary" onClick={handleExportText}>
              📝 {t('exportText', language)}
            </button>
            <button className="filter-btn secondary" onClick={onOpenSettings}>
              ⚙️ {t('filters', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

