'use client';

import { type ReactNode, useEffect, useRef } from 'react';

import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';

// Cuánto viene de lado el contenido al aparecer el periodo nuevo.
const SLIDE_IN_DISTANCE = 32;
const SLIDE_IN_MS = 220;

function slideIn(element: HTMLElement | null, direction: 'next' | 'previous') {
  if (!element || typeof element.animate !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const from = direction === 'next' ? SLIDE_IN_DISTANCE : -SLIDE_IN_DISTANCE;
  element.animate(
    [
      { transform: `translateX(${from}px)`, opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    { duration: SLIDE_IN_MS, easing: 'ease-out' },
  );
}

// Lo que cambia con el periodo (el mes o la semana del calendario): sigue al dedo mientras se
// desliza de lado, se devuelve si el gesto no se completa, sale hacia un lado si se completa y el
// periodo nuevo entra desde el lado contrario, con cualquier forma de cambiar de periodo (dedo,
// botones o teclado). `scope` es lo que se mira (la vista): cambiar de vista no anima. La entrada
// espera a `ready`, a que el periodo nuevo tenga qué mostrar.
export function ActivityPeriodSlider({
  scope,
  periodKey,
  ready,
  enabled,
  onPrevious,
  onNext,
  children,
}: {
  scope: string;
  // Identifica el periodo, de forma que uno posterior se ordene después: `2026-10`, `2026-10-26`.
  periodKey: string;
  ready: boolean;
  enabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  const { handlers, offset, phase } = useSwipeNavigation({
    enabled,
    onPrevious,
    onNext,
  });
  const content = useRef<HTMLDivElement>(null);
  const seen = useRef({ scope, periodKey });
  const arriving = useRef<'next' | 'previous' | null>(null);

  useEffect(() => {
    const before = seen.current;
    if (before.scope !== scope) arriving.current = null;
    else if (before.periodKey !== periodKey) {
      arriving.current = periodKey > before.periodKey ? 'next' : 'previous';
    }
    seen.current = { scope, periodKey };
  }, [scope, periodKey]);

  useEffect(() => {
    if (!ready || !arriving.current) return;
    slideIn(content.current, arriving.current);
    arriving.current = null;
  }, [ready, scope, periodKey]);

  return (
    <div className="overflow-x-clip" {...handlers}>
      <div
        className={`${phase === 'dragging' ? '' : 'transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none'} space-y-3`}
        ref={content}
        style={{
          transform: offset === 0 ? undefined : `translateX(${offset}px)`,
          opacity: phase === 'leaving' ? 0 : undefined,
          touchAction: enabled ? 'pan-y' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
