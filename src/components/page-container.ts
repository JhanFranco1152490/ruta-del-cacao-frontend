import { cn } from 'cn';

// Dos anchos para todas las pantallas: `wide` para listas, calendarios y lo que lleva mapa o tabla;
// `narrow` para formularios y fichas de una sola columna, centrados. Así el margen de arriba y los
// costados no cambian de una pantalla a otra.
const SIZES = {
  wide: 'max-w-[1440px]',
  narrow: 'max-w-4xl',
} as const;

export function pageContainerClass(
  size: keyof typeof SIZES,
  className?: string,
) {
  return cn('mx-auto w-full px-4 py-6 sm:px-8', SIZES[size], className);
}
