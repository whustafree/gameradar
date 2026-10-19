import { useEffect, useRef, RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Accesibilidad básica para hojas/diálogos modales:
 *  - Escape cierra
 *  - foco atrapado dentro del diálogo (Tab / Shift+Tab)
 *  - foco inicial en el primer elemento interactivo
 *  - devuelve el foco al disparador al cerrar
 *  - bloquea el scroll del body mientras está abierto
 *
 * Antes no había nada de esto: los overlays eran divs con onClick y el foco
 * se quedaba detrás del diálogo (5 atributos ARIA en toda la UI).
 */
export function useDialogA11y<T extends HTMLElement = HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
  externalRef?: RefObject<T>
) {
  const internalRef = useRef<T>(null);
  const containerRef = externalRef ?? internalRef;
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;

    const getFocusable = (): HTMLElement[] => {
      const node = containerRef.current;
      if (!node) return [];
      return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );
    };

    // Foco inicial: primer interactivo (o el contenedor si no hay ninguno)
    const initial = getFocusable()[0];
    if (initial) initial.focus();
    else containerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !containerRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Devolver el foco a quien abrió el diálogo
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose, containerRef]);

  return containerRef;
}
