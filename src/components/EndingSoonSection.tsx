import { Game, Language } from '../types';
import { t } from '../i18n';

interface EndingSoonSectionProps {
  games: Game[];
  language: Language;
  onOpen: (game: Game) => void;
}

/** Tiempo restante en formato "3d 4h" / "5h". */
function formatRemaining(endDate: string | null | undefined): string {
  if (!endDate) return '';
  const diff = new Date(endDate).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return '';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

export default function EndingSoonSection({ games, language, onOpen }: EndingSoonSectionProps) {
  if (games.length === 0) return null;

  return (
    <section className="timeline-section">
      <div className="timeline-header">
        <div className="recommended-icon">⏳</div>
        <h2 className="timeline-title">{t('endingTimeline', language)}</h2>
      </div>
      <div className="timeline-scroll">
        {games.map(game => (
          <div key={game.id} className="timeline-item" onClick={() => onOpen(game)}>
            <img
              src={game.image}
              alt={game.title}
              className="timeline-item-img"
              loading="lazy"
              decoding="async"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  `https://placehold.co/200x100/11111b/ef4444?text=${encodeURIComponent(game.title.slice(0, 15))}`;
              }}
            />
            <div className="timeline-item-body">
              <div className="timeline-item-title">{game.title}</div>
              <div className="timeline-item-time">{formatRemaining(game.endDate)}</div>
              <div className="timeline-item-bar" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
