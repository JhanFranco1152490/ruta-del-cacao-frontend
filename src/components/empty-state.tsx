import type { ComponentType, ReactNode } from 'react';

import { CacaoPlant } from '@/components/brand/cacao-plant';

export type Illustration = ComponentType<{ className?: string }>;

export function EmptyState({
  title,
  description,
  action,
  illustration: Art = CacaoPlant,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  // La del módulo de la pantalla; sin ella, la mata de cacao de la marca.
  illustration?: Illustration;
}) {
  return (
    <div className="motion-rise p-10 text-center">
      <Art className="motion-pop mx-auto mb-4 h-28 w-32" />
      <h2 className="text-2xl text-selva">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
