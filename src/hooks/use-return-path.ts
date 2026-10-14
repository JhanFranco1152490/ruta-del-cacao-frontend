import { useSearchParams } from 'next/navigation';

import { readOrigin } from '@/lib/navigation/origin';

// A dónde vuelve un editor al guardar o cancelar: la pantalla desde la que se abrió, con sus
// filtros y su página, o el destino de siempre de esa pantalla si no vino de ninguna (un enlace
// directo) o lo recordado no es una ruta de la app.
export function useReturnPath(fallback: string): string {
  return readOrigin(useSearchParams()) ?? fallback;
}
