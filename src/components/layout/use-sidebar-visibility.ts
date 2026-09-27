'use client';

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sidebar-hidden';

// El almacenamiento puede lanzar (ventana privada, datos bloqueados) o traer un valor ajeno:
// en ambos casos la barra queda visible y el botón sigue funcionando en esa visita.
function readStoredChoice(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function storeChoice(hidden: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(hidden));
  } catch {
    // Solo se pierde el recuerdo entre visitas.
  }
}

// Lee el almacenamiento al crear el estado, sin efecto: el marco solo se dibuja cuando la
// sesión ya cargó en el navegador, así que no hay HTML del servidor con el que discrepar.
export function useSidebarVisibility() {
  const [hidden, setHidden] = useState(readStoredChoice);

  const toggle = useCallback(() => {
    setHidden(!hidden);
    storeChoice(!hidden);
  }, [hidden]);

  return { hidden, toggle };
}
