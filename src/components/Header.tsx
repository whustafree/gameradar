import { useState, useRef, useEffect, useMemo } from 'react';
import { Language, Game, StoreFilter } from '../types';
import { t } from '../i18n';
import { fuzzyMatch } from '../utils/format';

interface HeaderProps {
  searchTerm: string;
  language: Language;
  games?: Game[];
  visible?: boolean;
  currentTheme?: string;
  totalGames?: number;
  totalSavings?: number;
  favoritesCount?: number;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onToggleLang: () => void;
  onToggleTheme?: () => void;
  onOpenDetail?: (game: Game) => void;
}

interface GroupedSuggestion {
  platform: string;
  icon: string;
  games: Game[];
}

const PLATFORM_ICONS: Record<string, string> = {
  steam: '🟦', epic: '🎯', gog: '🟣', itch: '🎨',
  battlenet: '⚔️', origin: '💠', drm: '🔓',
  ps5: '🎮', ps4: '🎮', 'xbox-series': '🎮', xbox: '🎮',
  nintendo: '🎮', android: '📱', ios: '🍎', pc: '🖥️',
};

export default function Header({
  searchTerm, language, games = [], visible = true, currentTheme = 'dark',
  totalGames = 0, totalSavings = 0, favoritesCount = 0,
  onSearchChange, onClearSearch, onToggleLang, onToggleTheme, onOpenDetail
}: HeaderProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fuzzy search + group by platform
  const groupedSuggestions = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const query = searchTerm.toLowerCase().trim();
    const matched = games.filter(g => {
      const text = `${g.title} ${g.platformName} ${g.description}`.toLowerCase();
      return fuzzyMatch(text, query);
    }).slice(0, 20);

    // Group by platform
    const groups = new Map<string, Game[]>();
    for (const game of matched) {
      const key = game.platform || 'other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(game);
    }

    const result: GroupedSuggestion[] = [];
    for (const [platform, platformGames] of groups) {
      result.push({
        platform,
        icon: PLATFORM_ICONS[platform] || platformGames[0]?.platformIcon || '🎮',
        games: platformGames.slice(0, 5), // max 5 per platform
      });
    }
    return result;
  }, [games, searchTerm]);

  const totalResults = useMemo(() => 
    groupedSuggestions.reduce((acc, g) => acc + g.games.length, 0),
  [groupedSuggestions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className={`app-header ${!visible ? 'header-hidden' : ''}`}>
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-brand-icon">🎮</div>
          <span className="header-brand-text">GameRadar</span>
        </div>

        <div className="header-search">
          <span className="header-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder={t('searchPlaceholder', language)}
            value={searchTerm}
            onChange={e => {
              onSearchChange(e.target.value);
              if (e.target.value.length >= 2) setShowSuggestions(true);
            }}
            onFocus={() => { if (searchTerm.length >= 2) setShowSuggestions(true); }}
            autoComplete="off"
          />
          {searchTerm && (
            <button className="header-search-clear" onClick={() => { onClearSearch(); setShowSuggestions(false); }}>✕</button>
          )}

          {/* Search suggestions with platform groups */}
          {showSuggestions && groupedSuggestions.length > 0 && (
            <div className="search-suggestions" ref={suggestionsRef}>
              <div className="search-suggestions-header">
                {totalResults} {language === 'es' ? 'resultados' : 'results'}
                <span className="search-suggestions-hint">{language === 'es' ? '• Toca para abrir' : '• Tap to open'}</span>
              </div>
              {groupedSuggestions.map(group => (
                <div key={group.platform} className="search-suggestion-group">
                  <div className="search-suggestion-group-label">
                    {group.icon} {group.games[0]?.platformName || group.platform}
                    <span className="search-suggestion-group-count">{group.games.length}</span>
                  </div>
                  {group.games.map(g => (
                    <div
                      key={g.id}
                      className="search-suggestion-item"
                      onClick={() => {
                        onSearchChange(g.title);
                        setShowSuggestions(false);
                        if (onOpenDetail) {
                          onOpenDetail(g);
                        } else {
                          const card = document.querySelector(`[data-id="${g.id}"]`);
                          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                    >
                      <img src={g.image} alt="" className="search-suggestion-icon"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="search-suggestion-text">{g.title}</span>
                      {g.worth && g.worth !== 'N/A' && (
                        <span className="search-suggestion-worth">💲{g.worth}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats widget */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          fontSize: '0.55rem', color: 'var(--text-muted)',
          marginLeft: '0.25rem', flexShrink: 0,
        }}>
          <span title={language === 'es' ? 'Juegos totales' : 'Total games'}>
            🎮
            <span style={{ fontWeight: 700, marginLeft: '0.08rem' }}>{totalGames}</span>
          </span>
          <span style={{ width: '1px', height: '10px', background: 'var(--card-border)', display: 'inline-block' }} />
          <span title={language === 'es' ? 'Valor total' : 'Total value'}>
            💰
            <span style={{ fontWeight: 700, marginLeft: '0.08rem' }}>
              {totalSavings >= 1000 ? `$${(totalSavings / 1000).toFixed(1)}k` : `$${totalSavings.toFixed(0)}`}
            </span>
          </span>
          {favoritesCount > 0 && (
            <>
              <span style={{ width: '1px', height: '10px', background: 'var(--card-border)', display: 'inline-block' }} />
              <span title={language === 'es' ? 'Favoritos' : 'Favorites'}>
                ❤️
                <span style={{ fontWeight: 700, marginLeft: '0.08rem' }}>{favoritesCount}</span>
              </span>
            </>
          )}
        </div>

        <div className="header-actions">
          {onToggleTheme && (
            <button className="theme-toggle-btn" onClick={onToggleTheme} title={currentTheme === 'light' ? (language === 'es' ? 'Modo oscuro' : 'Dark mode') : (language === 'es' ? 'Cambiar tema' : 'Switch theme')}>
              {currentTheme === 'light' ? '🌙' : currentTheme === 'amoled' ? '🕶️' : '🌗'}
            </button>
          )}
          <button className="header-action lang-btn" onClick={onToggleLang} title={language === 'es' ? 'English' : 'Español'}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </div>
    </header>
  );
}
