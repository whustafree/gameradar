import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../types';

interface UpdatePromptProps {
  isOpen: boolean;
  language: Language;
  currentVersion: string;
  latestVersion: string;
  notes?: string;
  onUpdate: () => void;
  onLater: () => void;
}

/**
 * Aviso de nueva versión del APK. Se muestra al abrir la app cuando el
 * release de GitHub es más reciente que la versión instalada.
 */
export default function UpdatePrompt({
  isOpen, language, currentVersion, latestVersion, notes, onUpdate, onLater,
}: UpdatePromptProps) {
  const es = language === 'es';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="update-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-title"
        >
          <motion.div
            className="update-card"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="update-icon" aria-hidden="true">🚀</div>

            <h2 id="update-title" className="update-title">
              {es ? 'Nueva versión disponible' : 'New version available'}
            </h2>

            <p className="update-text">
              {es
                ? `GameRadar v${latestVersion} ya está disponible. Tienes la v${currentVersion}.`
                : `GameRadar v${latestVersion} is out. You have v${currentVersion}.`}
            </p>

            {notes ? <p className="update-notes">{notes.split('\n')[0]}</p> : null}

            <p className="update-hint">
              {es
                ? 'Se descargará el APK. Para instalarlo, abre el archivo desde las notificaciones o la carpeta de descargas.'
                : 'The APK will download. To install it, open the file from notifications or your downloads folder.'}
            </p>

            <div className="update-actions">
              <button type="button" className="update-btn secondary" onClick={onLater}>
                {es ? 'Más tarde' : 'Later'}
              </button>
              <button type="button" className="update-btn primary" onClick={onUpdate}>
                {es ? 'Actualizar' : 'Update'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
