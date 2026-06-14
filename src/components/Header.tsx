import { useState, useRef, useEffect } from 'react';
import { Language, Game } from '../types';
import { t } from '../i18n';

interface HeaderProps {
  searchTerm: string;
  language: Language;
  games?: Game[];
  totalSavings?: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onToggleLang: () => void;
  onOpenDetail?: (game: Game) => void;
}

export default function Header({
  searchTerm, language, games = [], totalSavings, onSearchChange, onClearSearch, onToggleLang, onOpenDetail
}: HeaderProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = searchTerm.length >= 2
    ? games
        .filter(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 5)
    : [];

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
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-brand-icon">🎮</div>
          <span className="header-brand-text">FreeGameHub</span>
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

          {/* Search suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions" ref={suggestionsRef}>
              {suggestions.map(g => (
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
                  <span className="search-suggestion-type">{g.platformName || g.platform}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="header-actions">
          {totalSavings && (
            <button
              className="header-savings-badge"
              title={language === 'es' ? 'Valor total en juegos gratis' : 'Total value in free games'}
            >
              💰 {totalSavings}
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
