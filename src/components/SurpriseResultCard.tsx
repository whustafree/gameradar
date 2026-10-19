import { Game, Language } from '../types';
import { t } from '../i18n';

interface SurpriseResultCardProps {
  game: Game;
  reason: string;
  language: Language;
  onOpen: (game: Game) => void;
  onAgain: () => void;
  onClose: () => void;
}

export default function SurpriseResultCard({
  game, reason, language, onOpen, onAgain, onClose,
}: SurpriseResultCardProps) {
  return (
    <div className="surprise-result-card" onClick={() => onOpen(game)}>
      <img
        src={game.image}
        alt={game.title}
        className="surprise-result-img"
        loading="lazy"
        decoding="async"
        onError={e => {
          (e.target as HTMLImageElement).src =
            `https://placehold.co/400x140/11111b/ef4444?text=${encodeURIComponent(game.title.slice(0, 20))}`;
        }}
      />
      <div className="surprise-result-body">
        <h3 className="surprise-result-title">{game.title}</h3>
        <p className="surprise-result-reason">{reason}</p>
        <div className="surprise-result-actions">
          <button type="button" className="surprise-result-btn" onClick={e => { e.stopPropagation(); onOpen(game); }}>
            👁️ {t('viewDetail', language)}
          </button>
          <button type="button" className="surprise-result-btn" onClick={e => { e.stopPropagation(); onAgain(); }}>
            🎲 {t('surpriseAgain', language)}
          </button>
          <button type="button" className="surprise-result-btn" onClick={e => { e.stopPropagation(); onClose(); }}>
            ✕ {t('close', language)}
          </button>
        </div>
      </div>
    </div>
  );
}
