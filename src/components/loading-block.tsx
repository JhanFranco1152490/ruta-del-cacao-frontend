import { cn } from 'cn';

import { Skeleton } from '@/components/ui/skeleton';

// Lo que ocupa el lugar de una pantalla o una lista mientras carga: la forma aproximada de lo que
// viene (`shapes`, una clase de alto y ancho por bloque) y, para el lector de pantalla, qué carga.
export function LoadingBlock({
  label,
  shapes,
  className,
}: {
  label: string;
  shapes: readonly string[];
  className?: string;
}) {
  return (
    <div
      aria-label={label}
      className={cn('space-y-3', className)}
      role="status"
    >
      {shapes.map((shape, index) => (
        <Skeleton className={shape} key={index} />
      ))}
    </div>
  );
}
