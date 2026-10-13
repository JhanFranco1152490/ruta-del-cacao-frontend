'use client';

import { type TouchEvent, useRef } from 'react';

import { type Point, swipeDirection } from '@/lib/swipe';

// Cambiar de periodo con un deslizamiento del dedo, además del teclado y los botones: izquierda
// va al siguiente y derecha al anterior. Solo cuenta un gesto amplio y horizontal. Un gesto que
// empieza sobre algo que se desplaza solo (`data-no-swipe`, una tabla ancha) o con dos dedos no
// se toma. Devuelve los manejadores para ponerlos en el contenedor.
export function useSwipeNavigation({
  onPrevious,
  onNext,
  enabled = true,
}: {
  onPrevious: () => void;
  onNext: () => void;
  enabled?: boolean;
}) {
  const start = useRef<Point | null>(null);

  return {
    onTouchStart: (event: TouchEvent) => {
      const target = event.target as Element;
      const touch = event.touches[0];
      start.current =
        enabled &&
        event.touches.length === 1 &&
        !target.closest('[data-no-swipe]')
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    },
    onTouchEnd: (event: TouchEvent) => {
      const from = start.current;
      start.current = null;
      const touch = event.changedTouches[0];
      if (!from || !touch) return;
      const direction = swipeDirection(from, {
        x: touch.clientX,
        y: touch.clientY,
      });
      if (direction === 'left') onNext();
      else if (direction === 'right') onPrevious();
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}
