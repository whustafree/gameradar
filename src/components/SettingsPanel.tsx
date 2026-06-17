import { useState } from 'react';
import { Language, UserCollection, UserStats, ActivityEntry, Achievement, Theme, AccentColor } from '../types';
import { t } from '../i18n';
import { urlBase64ToUint8Array } from '../utils/format';
import { showToast } from './Toast';

interface SettingsPanelProps {
  language: Language;
  collections: UserCollection[];
  activityLog: ActivityEntry[];
  achievements: Achievement[];
  userStats: UserStats;
  games: Record<string, string>;
  currentTheme: Theme;
  accentColor: AccentColor;
  onClose: () => void;
  onCreateCollection: (name: string, desc: string, emoji: string) => void;
  onDeleteCollection: (id: string) => void;
  onOpenCollectionGames: (collection: UserCollection) => void;
  onChangeTheme?: (theme: Theme) => void;
  onChangeAccent?: (color: AccentColor) => void;
}

type Tab = 'collections' | 'activity' | 'achievements';

const EMOJIS = ['📁', '🎮', '🕹️', '⭐', '💎', '🔥', '🎯', '👾', '🎲', '🏆', '💿', '🎪'];

const ACTIVITY_ICONS: Record<string, string> = {
  view: '👁️', favorite: '❤️', hide: '🙈', claim: '🎁', wishlist: '📋', vote: '👍', reaction: '🔥',
};

function getActivityText(entry: ActivityEntry, lang: Language): string {
  const prefixes: Record<string, string> = {
    view: t('activityView', lang),
    favorite: t('activityFavorite', lang),
    hide: t('activityHide', lang),
    claim: t('activityClaim', lang),
    wishlist: t('activityWishlist', lang),
    vote: t('activityVote', lang),
    reaction: t('activityReaction', lang),
  };
  const prefix = prefixes[entry.type] || entry.type;
  return `${prefix} "${entry.gameTitle}"`;
}

function groupActivityByDate(log: ActivityEntry[], lang: Language): { label: string; items: ActivityEntry[] }[] {
  if (!log.length) return [];
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const thisWeek = new Date(now.getTime() - 7 * 86400000).toDateString();

  const groups: { label: string; items: ActivityEntry[] }[] = [];

  const todayItems = log.filter(e => new Date(e.timestamp).toDateString() === today);
  const yesterdayItems = log.filter(e => new Date(e.timestamp).toDateString() === yesterday);
  const weekItems = log.filter(e => {
    const d = new Date(e.timestamp).toDateString();
    return d !== today && d !== yesterday && d >= thisWeek;
  });
  const olderItems = log.filter(e => new Date(e.timestamp).toDateString() < thisWeek);

  if (todayItems.length) groups.push({ label: t('activityToday', lang), items: todayItems });
  if (yesterdayItems.length) groups.push({ label: t('activityYesterday', lang), items: yesterdayItems });
  if (weekItems.length) groups.push({ label: t('activityThisWeek', lang), items: weekItems });
  if (olderItems.length) groups.push({ label: t('activityEarlier', lang), items: olderItems });

  return groups;
}

const THEMES: { value: Theme; icon: string; labelKey: string }[] = [
  { value: 'dark', icon: '🌙', labelKey: 'themeDark' },
  { value: 'amoled', icon: '🕶️', labelKey: 'themeAmoled' },
  { value: 'light', icon: '☀️', labelKey: 'themeLight' },
];

const ACCENTS: { value: AccentColor; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'amber', label: 'Amber' },
  { value: 'cyan', label: 'Cyan' },
];

export default function SettingsPanel({
  language, collections, activityLog, achievements, userStats,
  games, currentTheme, accentColor, onClose,
  onCreateCollection, onDeleteCollection, onOpenCollectionGames,
  onChangeTheme, onChangeAccent,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('collections');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColEmoji, setNewColEmoji] = useState('📁');
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'unsubscribed' | 'subscribed' | 'loading'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'subscribed';
    return 'unsubscribed';
  });

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalCount = achievements.length;

  const handleCreateCollection = () => {
    if (!newColName.trim()) return;
    onCreateCollection(newColName.trim(), newColDesc.trim(), newColEmoji);
    setNewColName('');
    setNewColDesc('');
    setNewColEmoji('📁');
    setShowNewCollection(false);
    showToast(t('collectionCreated', language), 'success');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <div className="filter-overlay open" onClick={onClose} style={{ zIndex: 400 }}>
      <div className="filter-sheet open" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
        <div className="filter-handle" />            <div className="filter-head">
          <h3 className="filter-title">
            {tab === 'collections' ? '📁' : tab === 'activity' ? '📋' : '🏆'} {t('myStats', language)}
          </h3>
          <button className="filter-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="filter-chips" style={{ padding: '0 1.25rem 0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', borderBottom: '1px solid var(--card-border)' }}>
          <button className={`filter-chip ${tab === 'collections' ? 'active' : ''}`} onClick={() => setTab('collections')}>📁 {t('collections', language)}</button>
          <button className={`filter-chip ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>📋 {t('activityLog', language)}</button>
          <button className={`filter-chip ${tab === 'achievements' ? 'active' : ''}`} onClick={() => setTab('achievements')}>🏆 {t('achievements', language)} ({unlockedCount}/{totalCount})</button>
        </div>

        <div className="filter-body">
          {/* 🎨 Theme Selector */}
          <div style={{ padding: '0.35rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius)', border: '0.5px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem' }}>🎨</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{t('theme', language)}</span>
            </div>
            {/* Theme selector */}
            <div className="filter-chips" style={{ marginBottom: '0.35rem' }}>
              {THEMES.map(th => (
                <button
                  key={th.value}
                  className={`filter-chip ${currentTheme === th.value ? 'active' : ''}`}
                  onClick={() => onChangeTheme?.(th.value)}
                >
                  {th.icon} {t(th.labelKey as any, language)}
                </button>
              ))}
            </div>
            {/* Accent color selector */}
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              {t('accentColor', language)}
            </span>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {ACCENTS.map(ac => (
                <button
                  key={ac.value}
                  onClick={() => onChangeAccent?.(ac.value)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: accentColor === ac.value ? '2px solid var(--text)' : '2px solid transparent',
                    background: `hsl(${
                      ac.value === 'green' ? 120 : ac.value === 'red' ? 0 :
                      ac.value === 'blue' ? 215 : ac.value === 'purple' ? 270 :
                      ac.value === 'amber' ? 40 : 180
                    }, 70%, 40%)`,
                    cursor: 'pointer',
                    transition: 'all 0.2s var(--ease)',
                    boxShadow: accentColor === ac.value ? '0 0 8px hsla(0,0%,100%,0.3)' : 'none',
                    outline: 'none',
                  }}
                  title={ac.label}
                  aria-label={ac.label}
                />
              ))}
            </div>
          </div>

          {/* Stats summary visible in all tabs */}
          {tab !== 'achievements' && (
            <div className="stats-grid" style={{ marginBottom: '0.25rem' }}>
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
                <div className="stat-value">{unlockedCount}/{totalCount}</div>
                <div className="stat-label">{t('achievements', language)}</div>
              </div>
            </div>
          )}

          {/* COLLECTIONS TAB */}
          {tab === 'collections' && (
            <>
              <div className="collections-header" style={{ padding: 0, borderBottom: 'none', marginBottom: '0.5rem' }}>
                <button
                  className="collections-new-btn"
                  onClick={() => setShowNewCollection(p => !p)}
                >
                  ➕ {t('newCollection', language)}
                </button>
              </div>

              {showNewCollection && (
                <div className="collection-form" style={{ marginBottom: '0.75rem' }}>
                  <input
                    className="collection-form-input"
                    placeholder={t('collectionName', language)}
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    autoFocus
                  />
                  <input
                    className="collection-form-input"
                    placeholder={t('collectionDesc', language)}
                    value={newColDesc}
                    onChange={e => setNewColDesc(e.target.value)}
                  />
                  <span className="filter-label">{t('collectionEmoji', language)}</span>
                  <div className="collection-form-emoji-picker">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        className={`collection-form-emoji-opt ${newColEmoji === e ? 'selected' : ''}`}
                        onClick={() => setNewColEmoji(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <button className="filter-btn primary" onClick={handleCreateCollection}>
                    {t('createCollection', language)}
                  </button>
                </div>
              )}

              {collections.length === 0 ? (
                <div className="collections-empty">{t('noCollections', language)}</div>
              ) : (
                collections.map(col => (
                  <div key={col.id} className="collection-card">
                    <div className="collection-card-emoji">{col.emoji}</div>
                    <div className="collection-card-info" onClick={() => onOpenCollectionGames(col)}>
                      <div className="collection-card-name">{col.name}</div>
                      <div className="collection-card-meta">
                        {col.description ? `${col.description} · ` : ''}{col.gameIds.length} {t('games', language)}
                      </div>
                    </div>
                    <button
                      className="collection-card-delete"
                      onClick={() => {
                        onDeleteCollection(col.id);
                        showToast(t('collectionDeleted', language), 'info');
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* ACTIVITY TAB */}
          {tab === 'activity' && (
            <div className="activity-body" style={{ padding: 0 }}>
              {activityLog.length === 0 ? (
                <div className="activity-empty">{t('activityEmpty', language)}</div>
              ) : (
                groupActivityByDate(activityLog, language).map(group => (
                  <div key={group.label}>
                    <div className="activity-group-label">{group.label}</div>
                    {group.items.map((entry, i) => (
                      <div key={`${entry.timestamp}-${i}`} className="activity-item">
                        <span className="activity-item-icon">{ACTIVITY_ICONS[entry.type] || '📌'}</span>
                        <span className="activity-item-text">{getActivityText(entry, language)}</span>
                        <span className="activity-item-time">
                          {new Date(entry.timestamp).toLocaleTimeString(language === 'es' ? 'es-CL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ACHIEVEMENTS TAB */}
          {tab === 'achievements' && (
            <div className="achievements-body" style={{ padding: 0 }}>
              <div className="stat-card" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{t('achievementProgress', language)}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-light)', fontWeight: 700 }}>{unlockedCount}/{totalCount}</span>
              </div>
              {achievements.map(ach => (
                <div key={ach.id} className={`achievement-card ${ach.unlockedAt ? 'unlocked' : ''}`}>
                  <div className="achievement-card-icon">{ach.icon}</div>
                  <div className="achievement-card-info">
                    <div className="achievement-card-name">{t((ach.id + 'Name') as any, language) || t((ach.id) as any, language)}</div>
                    <div className="achievement-card-desc">{t((ach.id + 'Desc') as any, language)}</div>
                  </div>
                  <div className="achievement-card-status">
                    {ach.unlockedAt ? '✅' : '🔒'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔔 Notificaciones Push */}
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', border: '0.5px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.9rem' }}>🔔</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {language === 'es' ? 'Notificaciones de juegos nuevos' : 'New game notifications'}
            </span>
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.4rem', lineHeight: 1.4 }}>
            {language === 'es'
              ? 'Recibe una alerta cuando haya nuevos juegos gratis disponibles en tu plataforma favorita.'
              : 'Get alerted when new free games are available on your favorite platform.'}
          </div>
          {pushStatus === 'unsupported' && (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {language === 'es' ? 'Las notificaciones no están disponibles en este navegador.' : 'Notifications not available in this browser.'}
            </div>
          )}              {pushStatus === 'unsubscribed' && (
            <button className="filter-btn primary" onClick={async () => {
              setPushStatus('loading');
              try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                  setPushStatus('subscribed');
                  showToast(language === 'es' ? '🔔 Notificaciones activadas' : '🔔 Notifications enabled', 'success');
                  // Registrar suscripción en el backend
                  try {
                    const sw = await navigator.serviceWorker.ready;
                    const sub = await sw.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: urlBase64ToUint8Array('BEl62iUYgUy0g0N1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0lHy1v0'),
                    });
                    await fetch('/api/subscribe-push', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subscription: sub.toJSON(), platforms: ['pc', 'android'] }),
                    });
                  } catch (e) {
                    // Push subscription failed silently - notification permission still granted
                  }
                } else {
                  setPushStatus('unsubscribed');
                  showToast(language === 'es' ? 'Notificaciones denegadas' : 'Notifications denied', 'info');
                }
              } catch {
                setPushStatus('unsubscribed');
              }
            }} style={{ width: '100%', padding: '0.35rem', fontSize: '0.7rem' }}>
              🔔 {language === 'es' ? 'Activar notificaciones' : 'Enable notifications'}
            </button>
          )}
          {pushStatus === 'subscribed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--green)' }}>
              <span>✅</span>
              <span>{language === 'es' ? 'Notificaciones activadas' : 'Notifications enabled'}</span>
            </div>
          )}
        </div>

        <div className="filter-actions" style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--card-border)' }}>
          <button className="filter-btn primary" onClick={onClose}>{t('close', language)}</button>
        </div>
      </div>
    </div>
  );
}
