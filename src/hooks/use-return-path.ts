import { useSearchParams } from 'next/navigation';

import { readOrigin } from '@/lib/navigation/origin';

// A dónde vuelve un editor al guardar o cancelar: la pantalla desde la que se abrió, con sus
// filtros y su página, o el destino de siempre de esa pantalla si no vino de ninguna (un enlace
// directo) o lo recordado no es una ruta de la app.
export function useReturnPath(fallback: string): string {
  return readOrigin(useSearchParams()) ?? fallback;
}

// El enlace de «volver» de un panel de guardado: a la pantalla de origen con el texto genérico
// «Volver», o al destino de siempre con el texto propio de esa pantalla («Volver a la finca»).
export function useBackLink(fallback: { href: string; label: string }) {
  const origin = readOrigin(useSearchParams());
  return origin ? { href: origin, label: 'Volver' } : fallback;
}
