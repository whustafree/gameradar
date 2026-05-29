import { useState } from 'react';
import { Language, Theme, AccentColor, UserCollection, UserStats, ActivityEntry, Achievement } from '../types';
import { t } from '../i18n';
import { showToast } from './Toast';

interface SettingsPanelProps {
  language: Language;
  theme: Theme;
  accentColor: AccentColor;
  collections: UserCollection[];
  activityLog: ActivityEntry[];
  achievements: Achievement[];
  userStats: UserStats;
  games: Record<string, string>; // gameId -> title
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
  onAccentChange: (color: AccentColor) => void;
  onCreateCollection: (name: string, desc: string, emoji: string) => void;
  onDeleteCollection: (id: string) => void;
  onOpenCollectionGames: (collection: UserCollection) => void;
}

const ACCENTS: { value: AccentColor; icon: string }[] = [
  { value: 'red', icon: '🔴' },
  { value: 'blue', icon: '🔵' },
  { value: 'green', icon: '🟢' },
  { value: 'purple', icon: '🟣' },
  { value: 'amber', icon: '🟡' },
  { value: 'cyan', icon: '🩵' },
];

const THEMES: { value: Theme; icon: string; labelKey: string }[] = [
  { value: 'dark', icon: '🌙', labelKey: 'themeDark' },
  { value: 'light', icon: '☀️', labelKey: 'themeLight' },
  { value: 'amoled', icon: '⬛', labelKey: 'themeAmoled' },
];

type Tab = 'theme' | 'collections' | 'activity' | 'achievements';

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

export default function SettingsPanel({
  language, theme, accentColor, collections, activityLog, achievements, userStats,
  games, onClose, onThemeChange, onAccentChange,
  onCreateCollection, onDeleteCollection, onOpenCollectionGames,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('theme');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColEmoji, setNewColEmoji] = useState('📁');

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
        <div className="filter-handle" />
        <div className="filter-head">
          <h3 className="filter-title">
            {tab === 'theme' ? '⚙️' : tab === 'collections' ? '📁' : tab === 'activity' ? '📋' : '🏆'} {t('myStats', language)}
          </h3>
          <button className="filter-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="filter-chips" style={{ padding: '0 1.25rem 0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', borderBottom: '1px solid var(--card-border)' }}>
          <button className={`filter-chip ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>🎨 {t('theme', language)}</button>
          <button className={`filter-chip ${tab === 'collections' ? 'active' : ''}`} onClick={() => setTab('collections')}>📁 {t('collections', language)}</button>
          <button className={`filter-chip ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>📋 {t('activityLog', language)}</button>
          <button className={`filter-chip ${tab === 'achievements' ? 'active' : ''}`} onClick={() => setTab('achievements')}>🏆 {t('achievements', language)} ({unlockedCount}/{totalCount})</button>
        </div>

        <div className="filter-body">
          {/* THEME TAB */}
          {tab === 'theme' && (
            <>
              <div className="filter-group">
                <span className="filter-label">{t('theme', language)}</span>
                <div className="filter-chips">
                  {THEMES.map(th => (
                    <button
                      key={th.value}
                      className={`filter-chip ${theme === th.value ? 'active' : ''}`}
                      onClick={() => onThemeChange(th.value)}
                    >
                      {th.icon} {t(th.labelKey as any, language)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">{t('accentColor', language)}</span>
                <div className="filter-chips">
                  {ACCENTS.map(ac => (
                    <button
                      key={ac.value}
                      className={`filter-chip ${accentColor === ac.value ? 'active' : ''}`}
                      onClick={() => onAccentChange(ac.value)}
                    >
                      {ac.icon} {t(('accent' + ac.value.charAt(0).toUpperCase() + ac.value.slice(1)) as any, language)}
                    </button>
                  ))}
                </div>
              </div>

              {/* User stats summary */}
              <div className="stats-grid" style={{ marginTop: '0.5rem' }}>
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
            </>
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

        <div className="filter-actions" style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--card-border)' }}>
          <button className="filter-btn primary" onClick={onClose}>{t('close', language)}</button>
        </div>
      </div>
    </div>
  );
}
