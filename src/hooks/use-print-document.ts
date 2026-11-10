'use client';

import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

// Imprimir un documento que solo existe para el papel. `printing` dice que hay que dibujarlo: la
// pantalla lo trae oculto en pantalla y visible al imprimir (`hidden print:block`), y solo se dibuja
// mientras se imprime para no repetir en el árbol lo que ya está en la ficha. `print` lo dibuja y
// abre el diálogo del navegador, donde también se elige «Guardar como PDF».
export function usePrintDocument() {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  const print = () => {
    // Dibujado ya: el diálogo de impresión toma lo que hay en pantalla en ese momento.
    flushSync(() => setPrinting(true));
    window.print();
  };

  return { printing, print };
}
