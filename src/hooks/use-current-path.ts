import { usePathname, useSearchParams } from 'next/navigation';

// La pantalla en la que está la persona: la ruta con sus filtros y su página. Cambia cuando cambian
// los filtros (que viven en la dirección), así que un enlace que la recuerda siempre apunta a lo
// que se ve ahora. Fuera del enrutador de la app (pruebas de una pieza suelta) ambos valen `null`
// y no hay nada que recordar.
export function useCurrentPath(): string {
  const pathname = usePathname() as string | null;
  const search = (useSearchParams() as URLSearchParams | null)?.toString();
  if (!pathname) return '';
  return search ? `${pathname}?${search}` : pathname;
}
