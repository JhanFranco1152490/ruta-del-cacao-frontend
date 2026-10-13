'use client';

import { type TouchEvent, useEffect, useRef, useState } from 'react';

import { type Point, swipeDirection } from '@/lib/swipe';

// Lo que tarda en salir el contenido cuando el gesto se completa, antes de cambiar de periodo.
export const SWIPE_LEAVE_MS = 150;
// Cuánto del recorrido del dedo sigue el contenido: menos de uno da sensación de peso.
const DRAG_RESISTANCE = 0.5;
// Lo más que se aleja el contenido del centro mientras se arrastra, y a donde sale al completarse.
const MAX_OFFSET = 140;
// Lo que se mueve el dedo antes de decidir si el gesto es horizontal (se sigue) o vertical (un
// scroll, que se deja al navegador).
const AXIS_LOCK_DISTANCE = 10;

export type SwipePhase = 'idle' | 'dragging' | 'leaving';

// Cambiar de periodo con un deslizamiento del dedo, además del teclado y los botones: izquierda
// va al siguiente y derecha al anterior. El contenido sigue al dedo mientras se arrastra, se
// devuelve si el gesto no se completa y sale hacia el lado del gesto si se completa; solo cuenta
// un gesto amplio y horizontal. Un gesto que empieza sobre algo que se desplaza solo
// (`data-no-swipe`, una tabla ancha) o con dos dedos no se toma. Devuelve los manejadores para el
// contenedor, cuánto está desplazado (`offset`, en píxeles) y en qué fase va.
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
  const axis = useRef<'x' | 'y' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<SwipePhase>('idle');

  useEffect(() => () => clearTimeout(timer.current), []);

  const reset = () => {
    start.current = null;
    axis.current = null;
    setOffset(0);
    setPhase('idle');
  };

  return {
    offset,
    phase,
    handlers: {
      onTouchStart: (event: TouchEvent) => {
        const target = event.target as Element;
        const touch = event.touches[0];
        axis.current = null;
        start.current =
          enabled &&
          phase !== 'leaving' &&
          event.touches.length === 1 &&
          !target.closest('[data-no-swipe]')
            ? { x: touch.clientX, y: touch.clientY }
            : null;
      },
      onTouchMove: (event: TouchEvent) => {
        const from = start.current;
        const touch = event.touches[0];
        if (!from || !touch) return;
        const dx = touch.clientX - from.x;
        const dy = touch.clientY - from.y;
        if (axis.current === null) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_DISTANCE) return;
          axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
        if (axis.current === 'y') return;
        setPhase('dragging');
        setOffset(
          Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx * DRAG_RESISTANCE)),
        );
      },
      onTouchEnd: (event: TouchEvent) => {
        const from = start.current;
        const touch = event.changedTouches[0];
        const direction =
          from && touch
            ? swipeDirection(from, { x: touch.clientX, y: touch.clientY })
            : null;
        if (!direction) {
          reset();
          return;
        }
        start.current = null;
        axis.current = null;
        setPhase('leaving');
        setOffset(direction === 'left' ? -MAX_OFFSET : MAX_OFFSET);
        timer.current = setTimeout(() => {
          if (direction === 'left') onNext();
          else onPrevious();
          setOffset(0);
          setPhase('idle');
        }, SWIPE_LEAVE_MS);
      },
      onTouchCancel: reset,
    },
  };
}
