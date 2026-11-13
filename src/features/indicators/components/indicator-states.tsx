import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { IndicatorBars } from '@/components/illustrations/indicator-bars';
import { LoadingBlock } from '@/components/loading-block';

// Lo que va en lugar de un panel mientras no hay qué dibujar: cargando, falló o no hay ni una cifra
// en el periodo; el panel mismo (`children`) cuando las hay.
export function IndicatorPanelStates<T>({
  query,
  hasFigures,
  emptyTitle,
  emptyDescription,
  children,
}: {
  query: UseQueryResult<T>;
  hasFigures: (data: T) => boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return (
      <LoadingBlock
        label="Cargando indicadores"
        shapes={['h-24', 'h-64', 'h-64']}
      />
    );
  }
  if (!query.data) {
    return (
      <ErrorState
        message="No fue posible cargar los indicadores."
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!hasFigures(query.data)) {
    return (
      <section className="rounded-lg bg-card shadow-card">
        <EmptyState
          description={emptyDescription}
          illustration={IndicatorBars}
          title={emptyTitle}
        />
      </section>
    );
  }
  return children(query.data);
}
