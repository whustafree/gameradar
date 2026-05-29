import { useMemo } from 'react';
import { Game, ViewMode, Language, Vote } from '../types';
import GameCard from './GameCard';

interface GameGridProps {
  games: Game[];
  favorites: string[];
  viewedGames: string[];
  newGameIds: string[];
  votes: Record<string, Vote>;
  viewMode: ViewMode;
  language: Language;
  onToggleFavorite: (id: string) => void;
  onHideGame: (id: string) => void;
  onMarkAsViewed: (id: string) => void;
  onOpenDetail: (game: Game) => void;
}

// Platform display info
const PLATFORM_DISPLAY: Record<string, { icon: string; label: string }> = {
  steam:     { icon: '🖥️', label: 'Steam' },
  epic:      { icon: '🎯', label: 'Epic Games' },
  gog:       { icon: '🟣', label: 'GOG' },
  itch:      { icon: '🎨', label: 'Itch.io' },
  battlenet: { icon: '⚔️', label: 'Battle.net' },
  origin:    { icon: '💠', label: 'Origin' },
  drm:       { icon: '🔓', label: 'DRM-Free' },
  ps4:       { icon: '🎮', label: 'PlayStation 4' },
  ps5:       { icon: '🎮', label: 'PlayStation 5' },
  xbox:      { icon: '🎮', label: 'Xbox One' },
  'xbox-series': { icon: '🎮', label: 'Xbox Series X|S' },
  'xbox-360':    { icon: '🎮', label: 'Xbox 360' },
  nintendo:  { icon: '🎮', label: 'Nintendo Switch' },
  android:   { icon: '📱', label: 'Play Store' },
  ios:       { icon: '🍎', label: 'App Store' },
  vr:        { icon: '🥽', label: 'VR' },
  pc:        { icon: '🖥️', label: 'PC' },
};

// Priority order for platforms
const PLATFORM_ORDER = [
  'steam', 'epic', 'gog', 'itch', 'battlenet', 'origin', 'drm', 'pc',
  'ps5', 'ps4', 'xbox-series', 'xbox', 'xbox-360', 'nintendo',
  'android', 'ios', 'vr'
];

interface GroupedGames {
  platform: string;
  games: Game[];
  icon: string;
  label: string;
}

function groupByPlatform(games: Game[]): GroupedGames[] {
  const groups = new Map<string, Game[]>();

  for (const game of games) {
    const key = game.platform;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(game);
  }

  return Array.from(groups.entries())
    .map(([platform, gameList]) => {
      const display = PLATFORM_DISPLAY[platform] || { icon: gameList[0]?.platformIcon || '🎮', label: gameList[0]?.platformName || platform };
      return { platform, games: gameList, icon: display.icon, label: display.label };
    })
    .sort((a, b) => {
      const aIdx = PLATFORM_ORDER.indexOf(a.platform);
      const bIdx = PLATFORM_ORDER.indexOf(b.platform);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });
}

export default function GameGrid({
  games, favorites, viewedGames, newGameIds, votes, viewMode, language,
  onToggleFavorite, onHideGame, onMarkAsViewed, onOpenDetail
}: GameGridProps) {
  const groupedGames = useMemo(() => groupByPlatform(games), [games]);

  if (games.length === 0) return null;

  return (
    <div id="games-container">
      {groupedGames.map(group => (
        <section key={group.platform} className="platform-group">
          <div className="platform-header">
            <span className="platform-header-icon">{group.icon}</span>
            <h3 className="platform-header-name">{group.label}</h3>
            <span className="platform-header-count">{group.games.length}</span>
          </div>
          <div className={`games-${viewMode}`}>
            {group.games.map((game, index) => (
              <GameCard
                key={game.id}
                game={game}
                index={index}
                isFavorite={favorites.includes(game.id)}
                isViewed={viewedGames.includes(game.id)}
                isNew={newGameIds.includes(game.id)}
                votes={votes}
                viewMode={viewMode}
                language={language}
                onToggleFavorite={onToggleFavorite}
                onHideGame={onHideGame}
                onMarkAsViewed={onMarkAsViewed}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
