import { Game, Language } from '../types';
import { t } from '../i18n';

interface GameOfDayCardProps {
  game: Game;
  language: Language;
  onOpen: (game: Game) => void;
}

export default function GameOfDayCard({ game, language, onOpen }: GameOfDayCardProps) {
  return (
    <div className="game-of-day" onClick={() => onOpen(game)}>
      <img
        src={game.image}
        alt=""
        className="game-of-day-bg"
        loading="lazy"
        decoding="async"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="game-of-day-content">
        <span className="game-of-day-label">{t('gameOfDay', language)}</span>
        <h2 className="game-of-day-title">{game.title}</h2>
        <div className="game-of-day-meta">
          <span>{game.platformIcon || '🎮'} {game.platformName || game.platform}</span>
          {game.worth && game.worth !== 'N/A' && (
            <span>💰 ${game.worth}</span>
          )}
        </div>
        <button
          type="button"
          className="game-of-day-btn"
          onClick={e => { e.stopPropagation(); onOpen(game); }}
        >
          {t('gameDetail', language)}
        </button>
      </div>
    </div>
  );
}
