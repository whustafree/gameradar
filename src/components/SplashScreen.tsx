import { useEffect, useState } from 'react';

const SPLASH_DURATION = 800; // antes 1500ms fijos en cada arranque
const FADE_DURATION = 400;
const SEEN_KEY = 'grd_splash_seen';

/** Se salta el splash si ya se vio en esta sesión o si el usuario pide menos movimiento. */
function shouldSkipSplash(): boolean {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch {
    /* almacenamiento o matchMedia no disponibles */
  }
  return false;
}

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => !shouldSkipSplash());
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), FADE_DURATION);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="xbox-boot"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms var(--ease-out)`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
      aria-hidden="true"
    >
      <div className="xbox-boot-dot" />
      <div className="xbox-boot-dot" />
      <div className="xbox-boot-dot" />
      <div className="xbox-boot-dot" />
    </div>
  );
}
