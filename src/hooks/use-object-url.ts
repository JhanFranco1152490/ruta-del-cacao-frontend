'use client';

import { useEffect, useMemo } from 'react';

// La dirección con la que una imagen muestra un archivo que está en memoria (una foto recién tomada
// o la copia del dispositivo). Se libera al cambiar de archivo o al desmontar: si no, el navegador
// guarda la foto hasta cerrar la pestaña.
export function useObjectUrl(blob: Blob | undefined) {
  const url = useMemo(
    () => (blob ? URL.createObjectURL(blob) : undefined),
    [blob],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
