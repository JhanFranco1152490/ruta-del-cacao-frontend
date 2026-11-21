import { useCallback, useEffect, useRef, useState } from 'react';

import { activeStageIndex } from './active-stage';
import { stageAnchorId } from './history-anchor';

// Las teclas con que la persona desplaza la página. Con foco en un botón, el espacio lo pulsa y no
// la desplaza.
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);

// La etapa que se está leyendo al desplazarse por la línea de tiempo (ver `activeStageIndex`).
//
// `select` fija una etapa a mano, la que se pulsó en el índice, y se queda así hasta que la persona
// vuelva a desplazar la página (rueda, dedo, teclas o barra). El desplazamiento que provoca el
// propio clic no cuenta: a una etapa de las últimas la página no la deja subir hasta la línea de
// lectura, y si cada evento de desplazamiento recalculara, marcaría otra distinta de la pulsada.
export function useActiveStage(count: number) {
  const [active, setActive] = useState(0);
  const pinned = useRef(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (pinned.current) return;
      const tops: number[] = [];
      for (let index = 0; index < count; index += 1) {
        const element = document.getElementById(stageAnchorId(index));
        tops.push(element ? element.getBoundingClientRect().top : Infinity);
      }
      setActive(
        activeStageIndex(tops, {
          viewportHeight: window.innerHeight,
          scrollY: window.scrollY,
          maxScroll: document.documentElement.scrollHeight - window.innerHeight,
        }),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const release = () => {
      pinned.current = false;
    };
    const releaseOnKey = (event: KeyboardEvent) => {
      const onButton = event.target instanceof HTMLButtonElement;
      if (SCROLL_KEYS.has(event.key) && !(event.key === ' ' && onButton)) {
        release();
      }
    };
    const releaseOnScrollbar = (event: PointerEvent) => {
      if (event.target === document.documentElement) release();
    };
    schedule();
    // En captura: el desplazamiento puede ser de un contenedor y no de la ventana.
    window.addEventListener('scroll', schedule, {
      passive: true,
      capture: true,
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchmove', release, { passive: true });
    window.addEventListener('keydown', releaseOnKey);
    window.addEventListener('pointerdown', releaseOnScrollbar);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchmove', release);
      window.removeEventListener('keydown', releaseOnKey);
      window.removeEventListener('pointerdown', releaseOnScrollbar);
    };
  }, [count]);

  const select = useCallback((index: number) => {
    pinned.current = true;
    setActive(index);
  }, []);

  return [active, select] as const;
}
