'use client';

import { useEffect, useRef, useState } from 'react';

// Si el elemento está más angosto que `maxWidth` px. Mide el elemento y no la pantalla: una tarjeta
// en una columna estrecha (con el menú lateral abierto, por ejemplo) necesita lo mismo que una en
// un celular. Sin `ResizeObserver` (pruebas, navegadores viejos) se asume que cabe todo.
export function useNarrowContainer<T extends HTMLElement>(maxWidth: number) {
  const ref = useRef<T>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    // Al empezar a observar, avisa con el tamaño actual: no hace falta medir aparte.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setNarrow(entry.contentRect.width < maxWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [maxWidth]);

  return [ref, narrow] as const;
}
