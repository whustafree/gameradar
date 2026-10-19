import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import App from './App';
import './App.css';

// Capacitor native platform setup
if (Capacitor.isNativePlatform()) {
  // Configurar StatusBar
  StatusBar.setStyle({ style: Style.Dark });
  StatusBar.setBackgroundColor({ color: '#1a1a2e' });
  
  // Haptic feedback on touch
  document.addEventListener('touchstart', () => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }, { passive: true, once: true });
}

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('[SW] Error registrando Service Worker:', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* reducedMotion="user" hace que framer-motion respete
        prefers-reduced-motion; el CSS ya lo hacía, pero las animaciones de
        tarjetas, hojas y listas son de framer y se ignoraban. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>
);
