import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
}

interface SwipeState {
  isSwiping: boolean;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  swipeProgress: number; // 0-1 how far swiped
}

interface UseSwipeGestureReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent | TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent | TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent | TouchEvent) => void;
  };
  state: SwipeState;
  resetSwipe: () => void;
}

const SWIPE_THRESHOLD = 60; // px to trigger action
const LONG_PRESS_DURATION = 500; // ms
const DOUBLE_TAP_DELAY = 300; // ms

export function useSwipeGesture(
  handlers: SwipeHandlers,
  options?: { elementRef?: React.RefObject<HTMLElement | null> }
): UseSwipeGestureReturn {
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const isSwiping = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef(0);
  const swipeDirection = useRef<'left' | 'right' | 'up' | 'down' | null>(null);
  const progress = useRef(0);

  const resetSwipe = useCallback(() => {
    isSwiping.current = false;
    swipeDirection.current = null;
    progress.current = 0;
    startX.current = 0;
    startY.current = 0;
    currentX.current = 0;
    currentY.current = 0;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;
    isSwiping.current = false;

    // Long press timer
    if (handlers.onLongPress) {
      longPressTimer.current = setTimeout(() => {
        handlers.onLongPress!();
        resetSwipe();
      }, LONG_PRESS_DURATION);
    }

    // Double tap detection
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      handlers.onDoubleTap?.();
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  }, [handlers.onLongPress, handlers.onDoubleTap, resetSwipe]);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;

    const diffX = currentX.current - startX.current;
    const diffY = currentY.current - startY.current;

    // Cancel long press on move
    if (longPressTimer.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Determine swipe direction (only if moved enough)
    if (Math.abs(diffX) > 15 || Math.abs(diffY) > 15) {
      isSwiping.current = true;
      if (Math.abs(diffX) > Math.abs(diffY)) {
        swipeDirection.current = diffX > 0 ? 'right' : 'left';
        progress.current = Math.min(Math.abs(diffX) / SWIPE_THRESHOLD, 1);
      } else {
        swipeDirection.current = diffY > 0 ? 'down' : 'up';
        progress.current = Math.min(Math.abs(diffY) / SWIPE_THRESHOLD, 1);
      }
    }

    // Visual feedback - move the element
    if (options?.elementRef?.current) {
      const el = options.elementRef.current;
      if (swipeDirection.current === 'left' || swipeDirection.current === 'right') {
        const translateX = diffX * 0.5; // 50% follow
        el.style.transform = `translateX(${translateX}px) rotate(${diffX * 0.05}deg)`;
        el.style.transition = 'none';
        el.style.opacity = `${1 - Math.min(Math.abs(diffX) / SWIPE_THRESHOLD / 2, 0.4)}`;
      }
    }
  }, [options?.elementRef, resetSwipe]);

  const handleTouchEnd = useCallback((_e: React.TouchEvent | TouchEvent) => {
    // Clear long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const diffX = currentX.current - startX.current;
    const diffY = currentY.current - startY.current;

    // Reset visual position with spring
    if (options?.elementRef?.current) {
      const el = options.elementRef.current;
      el.style.transform = '';
      el.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease';
      el.style.opacity = '';
    }

    // Trigger action based on swipe
    if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) handlers.onSwipeRight?.();
      else handlers.onSwipeLeft?.();
    } else if (Math.abs(diffY) > SWIPE_THRESHOLD && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) handlers.onSwipeDown?.();
      else handlers.onSwipeUp?.();
    }

    resetSwipe();
  }, [handlers, options?.elementRef, resetSwipe]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    state: {
      isSwiping: isSwiping.current,
      swipeDirection: swipeDirection.current,
      swipeProgress: progress.current,
    },
    resetSwipe,
  };
}

// Ripple effect helper - attach to any element
export function createRipple(e: React.MouseEvent | MouseEvent | TouchEvent) {
  let target: HTMLElement;
  let clientX: number, clientY: number;

  if ('touches' in e) {
    // TouchEvent
    const touchEvent = e as TouchEvent;
    target = touchEvent.target as HTMLElement;
    const touch = touchEvent.touches[0];
    if (!touch) return;
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    // MouseEvent
    const mouseEvent = e as React.MouseEvent | MouseEvent;
    target = mouseEvent.currentTarget as HTMLElement;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  const rect = target.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  target.style.setProperty('--ripple-x', `${x}%`);
  target.style.setProperty('--ripple-y', `${y}%`);
  
  // Trigger ripple by removing and re-adding
  target.classList.remove('ripple');
  void target.offsetWidth; // force reflow
  target.classList.add('ripple');
}
