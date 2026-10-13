'use client';

import { useSyncExternalStore } from 'react';

// El ancho desde el que el diseño pasa a su forma de escritorio (el `md` de Tailwind).
const DESKTOP_QUERY = '(min-width: 768px)';

const canMeasure = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function subscribe(onChange: () => void) {
  if (!canMeasure()) return () => undefined;
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

// Si la pantalla es de escritorio. Sirve para elegir qué se muestra primero, no para maquetar: el
// diseño se adapta con las clases de ancho. En el servidor, y donde el navegador no sabe el ancho,
// se asume celular.
export const useIsDesktop = () =>
  useSyncExternalStore(
    subscribe,
    () => canMeasure() && window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
