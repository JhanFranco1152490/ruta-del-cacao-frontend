import { cn } from 'cn';

import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';

export function MapSkeleton({ className }: { className: string }) {
  return (
    <section aria-label="Mapa" className="space-y-3">
      <Skeleton
        className={cn('w-full rounded-[var(--radius-card)]', className)}
      />
      <p className="text-sm font-bold text-muted-foreground" role="status">
        Cargando mapa…
      </p>
    </section>
  );
}

// Lo que ocupa el lugar del mapa mientras el proveedor carga o si no cargó (con por qué y el
// reintento); null cuando ya se puede dibujar el mapa.
export function mapPlaceholder(
  map: { isLoading: boolean; Provider?: unknown; retry: () => void },
  {
    className,
    failureMessage,
    onRetry,
  }: { className: string; failureMessage: string; onRetry?: () => void },
) {
  if (map.isLoading) return <MapSkeleton className={className} />;
  if (map.Provider) return null;
  return (
    <ErrorState
      message={failureMessage}
      onRetry={() => {
        map.retry();
        onRetry?.();
      }}
    />
  );
}
