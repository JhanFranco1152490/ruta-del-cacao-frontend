import { MapPinned } from 'lucide-react';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Coordinates } from '@/types/geo';

export function MapPanel({
  children,
  error,
  isLoading = false,
  location,
  onRetry,
}: {
  children?: ReactNode;
  error?: string;
  isLoading?: boolean;
  location: Coordinates | null;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return (
      <section aria-label="Mapa de ubicación" className="space-y-3">
        <Skeleton className="h-80 w-full rounded-[var(--radius-card)]" />
        <p className="text-sm font-bold text-muted-foreground">
          Cargando mapa…
        </p>
      </section>
    );
  }

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <section
      aria-label="Mapa de ubicación"
      className="relative min-h-80 overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted"
    >
      {children}
      <div className="absolute right-3 bottom-3 rounded-md bg-card px-3 py-2 shadow-card">
        <p className="section-label text-[10px]">Punto de la finca</p>
        <p className="mt-1 flex items-center gap-2 text-sm font-extrabold text-foreground">
          <MapPinned aria-hidden="true" className="size-4 text-selva" />
          {location
            ? `${location.latitude}, ${location.longitude}`
            : 'Sin ubicación'}
        </p>
      </div>
    </section>
  );
}
