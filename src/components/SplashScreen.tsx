import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show boot animation for 1.5s, then start fade
    const timer = setTimeout(() => {
      setFading(true);
      // After fade animation completes, hide completely
      setTimeout(() => setVisible(false), 400);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="xbox-boot"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s var(--ease-out)',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div className="xbox-boot-dot" />
      <div className="xbox-boot-dot" />
      <div className="xbox-boot-dot" />
      <div className="xbox-boot-dot" />
    </div>
  );
}
