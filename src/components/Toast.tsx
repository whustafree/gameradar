import { useEffect, useState, useRef, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
const listeners: Array<(t: Toast) => void> = [];

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast: Toast = { id: ++toastId, message, type };
  listeners.forEach(fn => fn(toast));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<(Toast & { removing?: boolean })[]>([]);
  const toastRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const swipeStartX = useRef<number>(0);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, removing: true } : t));
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, 250);
      }, 5000);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  // Swipe to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent, id: number) => {
    swipeStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent, id: number) => {
    const diff = e.touches[0].clientX - swipeStartX.current;
    if (diff > 0) {
      const el = toastRefs.current.get(id);
      if (el) {
        el.style.transform = `translateX(${diff}px)`;
        el.style.opacity = `${1 - diff / 200}`;
        el.style.transition = 'none';
      }
    }
  }, []);

  const handleTouchEnd = useCallback((id: number) => {
    const el = toastRefs.current.get(id);
    if (el) {
      const transform = el.style.transform;
      const match = transform.match(/translateX\(([\d.]+)px\)/);
      if (match && parseFloat(match[1]) > 80) {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 250);
      }
      el.style.transform = '';
      el.style.opacity = '';
      el.style.transition = '';
    }
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  return (
    // role="status" + aria-live: los toasts son el único feedback de acciones
    // como votar, copiar o reclamar, y hasta ahora no se anunciaban.
    <div id="toast-container" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <div
          key={t.id}
          ref={el => { if (el) toastRefs.current.set(t.id, el); }}
          className={`toast ${t.type} ${t.removing ? 'removing' : ''}`}
          role="alert"
          onClick={() => dismissToast(t.id)}
          onTouchStart={(e) => handleTouchStart(e, t.id)}
          onTouchMove={(e) => handleTouchMove(e, t.id)}
          onTouchEnd={() => handleTouchEnd(t.id)}
        >
          <span aria-hidden="true">{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
