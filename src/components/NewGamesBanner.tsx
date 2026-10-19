import { motion } from 'framer-motion';
import { Language } from '../types';

interface NewGamesBannerProps {
  count: number;
  language: Language;
  onDismiss: () => void;
}

/**
 * Aviso de "hay N juegos nuevos". Extraído de App.tsx, que tenía todo el
 * markup y los estilos inline del banner mezclados con el resto de la vista.
 */
export default function NewGamesBanner({ count, language, onDismiss }: NewGamesBannerProps) {
  if (count <= 0) return null;

  return (
    <motion.div
      className="notification-banner new-games-banner"
      onClick={onDismiss}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      role="status"
    >
      <span className="new-games-icon" aria-hidden="true">🆕</span>
      <div className="new-games-text">
        <div className="new-games-title">
          {count} {language === 'es' ? 'nuevos juegos' : 'new games'}!
        </div>
        <div className="new-games-sub">
          {language === 'es' ? 'Toca para verlos' : 'Tap to view them'}
        </div>
      </div>
      <div className="new-games-count" aria-hidden="true">{count}</div>
      <button
        type="button"
        className="notification-banner-close"
        onClick={e => { e.stopPropagation(); onDismiss(); }}
        aria-label={language === 'es' ? 'Ocultar aviso' : 'Dismiss'}
      >✕</button>
    </motion.div>
  );
}
