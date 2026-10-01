import { cn } from 'cn';

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
