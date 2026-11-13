'use client';

import { useSession } from '@/hooks/use-session';
import { useProducerSummary } from '@/lib/api/producer-options';

import {
  type IndicatorView,
  availableIndicatorViews,
  resolveIndicatorView,
} from './indicator-view';
import { useAssociationIndicators, useProducerIndicators } from './queries';
import { useIndicatorFilters } from './use-indicator-filters';

export type IndicatorsScreenState = ReturnType<typeof useIndicatorsScreen>;

// Todo lo que Indicadores lee y decide antes de dibujarse: qué panel le toca a la cuenta, su
// periodo y solo la consulta de ese panel (la del otro no se pide).
export function useIndicatorsScreen() {
  const { data: user, isPending: sessionPending } = useSession();
  const filters = useIndicatorFilters();
  const views = availableIndicatorViews(user);
  const view: IndicatorView | null = resolveIndicatorView(
    views,
    filters.requestedView,
  );
  const superuser = user?.is_superuser === true;
  // La cuenta técnica elige de qué productor ve el panel; las demás ven el suyo.
  const needsProducer =
    superuser && view === 'producer' && !filters.filters.producer;
  const producerId = superuser ? filters.filters.producer : null;

  const query = {
    ...filters.filters,
    producer: producerId,
  };
  const producer = useProducerIndicators(
    query,
    view === 'producer' && !needsProducer,
  );
  const association = useAssociationIndicators(query, view === 'association');
  const selectedProducer = useProducerSummary(producerId ?? undefined);

  return {
    filters,
    sessionPending,
    views,
    view,
    superuser,
    needsProducer,
    producerId,
    selectedProducer,
    producer,
    association,
  };
}
