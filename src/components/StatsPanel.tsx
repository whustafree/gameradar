import { useMemo, useRef, useEffect } from 'react';
import { Language, UserStats, Game, Vote, GameReactions, WishlistStatus, UserCollection, ActivityEntry, Achievement } from '../types';
import { t } from '../i18n';
import { parsePrice } from '../utils/format';
import { showToast } from './Toast';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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
    a.download = `gameradar-stats-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('dataExported', language), 'success');
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleExportText = () => {
    const lines = [
      `GameRadar Stats - ${new Date().toLocaleDateString()}`,
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
    a.download = `gameradar-stats-${new Date().toISOString().slice(0, 10)}.txt`;
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

  // Weekly activity data
  const weeklyActivity = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const label = d.toLocaleDateString(language === 'es' ? 'es' : 'en', { weekday: 'short' });
      const count = activityLog.filter(a => a.timestamp?.startsWith(dayStr)).length;
      days.push({ label, count });
    }
    return days;
  }, [activityLog, language]);

  // Chart.js refs
  const platformChartRef = useRef<HTMLCanvasElement>(null);
  const savingsChartRef = useRef<HTMLCanvasElement>(null);
  const weeklyChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Chart[]>([]);

  // Platform donut chart
  useEffect(() => {
    if (!platformChartRef.current || !globalStats.platformCount) return;
    const ctx = platformChartRef.current.getContext('2d');
    if (!ctx) return;
    
    const entries = Object.entries(globalStats.platformCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    
    const colors = [
      'hsl(120, 70%, 40%)', 'hsl(0, 70%, 50%)', 'hsl(215, 70%, 50%)',
      'hsl(270, 60%, 50%)', 'hsl(40, 90%, 50%)', 'hsl(180, 70%, 40%)',
    ];
    
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: entries.map(([p]) => p),
        datasets: [{
          data: entries.map(([, c]) => c),
          backgroundColor: colors.slice(0, entries.length),
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#8a8a96', font: { size: 10 }, padding: 8 },
          }
        },
        cutout: '65%',
      }
    });
    chartInstances.current.push(chart);
    return () => { chart.destroy(); };
  }, [globalStats.platformCount]);

  // Savings bar chart
  useEffect(() => {
    if (!savingsChartRef.current) return;
    const ctx = savingsChartRef.current.getContext('2d');
    if (!ctx) return;
    
    const milestones = [100, 500, 1000, 2500, 5000];
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: milestones.map(m => `$${m}`),
        datasets: [{
          label: '',
          data: milestones.map(m => Math.min(userStats.totalSavings / m, 1) * 100),
          backgroundColor: milestones.map(m => userStats.totalSavings >= m
            ? 'hsl(40, 90%, 50%)' : 'rgba(255,255,255,0.08)'),
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { display: false, max: 100 },
          x: {
            ticks: { color: '#505060', font: { size: 9 } },
            grid: { display: false },
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const milestone = milestones[ctx.dataIndex];
                return `${userStats.totalSavings >= milestone ? '✅' : '⏳'} $${Math.min(userStats.totalSavings, milestone).toFixed(0)} / $${milestone}`;
              }
            }
          }
        }
      }
    });
    chartInstances.current.push(chart);
    return () => { chart.destroy(); };
  }, [userStats.totalSavings]);

  // Weekly activity line chart
  useEffect(() => {
    if (!weeklyChartRef.current || weeklyActivity.every(d => d.count === 0)) return;
    const ctx = weeklyChartRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 100);
    gradient.addColorStop(0, 'hsla(var(--accent-hsl), 0.3)');
    gradient.addColorStop(1, 'hsla(var(--accent-hsl), 0.0)');

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyActivity.map(d => d.label),
        datasets: [{
          label: language === 'es' ? 'Actividad' : 'Activity',
          data: weeklyActivity.map(d => d.count),
          borderColor: 'hsl(var(--accent-hsl))',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'hsl(var(--accent-hsl))',
          pointBorderColor: 'var(--bg-surface)',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#505060', font: { size: 9 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          x: {
            ticks: { color: '#505060', font: { size: 9 } },
            grid: { display: false },
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'var(--glass-bg)',
            titleColor: 'var(--text)',
            bodyColor: 'var(--text-secondary)',
            borderColor: 'var(--glass-border)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} ${language === 'es' ? 'acciones' : 'actions'}`,
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index' as const,
        }
      }
    });
    chartInstances.current.push(chart);
    return () => { chart.destroy(); };
  }, [weeklyActivity, language]);

  // Clear charts on unmount
  useEffect(() => {
    return () => {
      chartInstances.current.forEach(c => c.destroy());
      chartInstances.current = [];
    };
  }, []);

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

          {/* 📊 Chart.js - Plataformas (Dona) */}
          {Object.keys(globalStats.platformCount).length > 0 && (
            <>
              <span className="chart-title" style={{ marginTop: '0.5rem' }}>
                📱 {language === 'es' ? 'Juegos por plataforma' : 'Games by platform'}
              </span>
              <div className="chart-js-wrapper">
                <canvas ref={platformChartRef} style={{ maxHeight: '180px' }} />
              </div>
            </>
          )}

          {/* 📊 Chart.js - Metas de ahorro (Barras) */}
          {userStats.totalSavings > 0 && (
            <>
              <span className="chart-title" style={{ marginTop: '0.5rem' }}>
                💰 {language === 'es' ? 'Metas de ahorro' : 'Savings goals'}
              </span>
              <div className="chart-js-wrapper">
                <canvas ref={savingsChartRef} style={{ maxHeight: '140px' }} />
              </div>
            </>
          )}

          {/* 📊 Dashboard de ahorros — Gráfico de barras mejorado */}
          {userStats.totalSavings > 0 && (
            <>
              <span className="chart-title" style={{ marginTop: '0.75rem' }}>
                💰 {t('totalSavingsStats', language)}
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.3rem' }}>
                  {language === 'es' ? 'promedio' : 'avg'} ${(userStats.totalSavings / Math.max(userStats.totalClaimed, 1)).toFixed(0)}/juego
                </span>
              </span>
              
              {/* Savings goal progress */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  <span>${userStats.totalSavings.toFixed(0)} {language === 'es' ? 'ahorrados' : 'saved'}</span>
                  <span>{language === 'es' ? 'Meta' : 'Goal'}: $1,000</span>
                </div>
                <div style={{ height: '10px', background: 'var(--card-border)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((userStats.totalSavings / 1000) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--gold))',
                    borderRadius: '5px',
                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 0 8px var(--accent-glow)',
                  }} />
                </div>
              </div>

              {/* Savings by platform */}
              {Object.keys(userStats.gamesPerPlatform).length > 0 && (
                <>
                  <span className="chart-title" style={{ fontSize: '0.5rem', marginTop: '0.5rem' }}>
                    📱 {language === 'es' ? 'Ahorros por plataforma' : 'Savings by platform'}
                  </span>
                  <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {Object.entries(userStats.gamesPerPlatform)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([platform, count]) => {
                        const maxCount = Math.max(...Object.values(userStats.gamesPerPlatform), 1);
                        const pct = (count / maxCount) * 100;
                        return (
                          <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem' }}>
                            <span style={{ width: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--text-secondary)' }}>
                              {platform}
                            </span>
                            <div style={{
                              flex: '1',
                              height: '12px',
                              background: 'var(--card-border)',
                              borderRadius: '6px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                                borderRadius: '6px',
                                transition: 'width 0.5s var(--ease)',
                              }} />
                            </div>
                            <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.55rem', minWidth: '24px', textAlign: 'right' }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              {/* Simple bar chart for savings (using CSS bars for a chart-like display) */}
              <div className="chart-container" style={{ height: '50px', display: 'flex', alignItems: 'flex-end', gap: '0.3rem', marginTop: '0.35rem' }}>
                {[100, 500, 1000, 2500, 5000].map(milestone => {
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
                      <span style={{ fontSize: '0.5rem', color: achieved ? 'var(--gold)' : 'var(--text-muted)' }}>
                        ${milestone}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 📊 Chart.js - Actividad semanal (Línea) */}
          {weeklyActivity.some(d => d.count > 0) && (
            <>
              <span className="chart-title" style={{ marginTop: '0.5rem' }}>
                📈 {language === 'es' ? 'Actividad semanal' : 'Weekly activity'}
              </span>
              <div className="chart-js-wrapper">
                <canvas ref={weeklyChartRef} style={{ maxHeight: '140px' }} />
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

