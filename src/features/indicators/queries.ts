import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import { type IndicatorFilters, queryKeys } from '@/lib/api/query-keys';

import type { AssociationIndicators, ProducerIndicators } from './api';

// Los paneles se calculan al consultar y no tienen copia en el dispositivo: sin conexión no se
// abren. Cada vez que se entra se piden de nuevo (una cosecha o una venta recién registradas tienen
// que verse), y al cambiar el periodo o la finca se sigue mostrando lo anterior hasta que llega lo
// nuevo.
const FRESH = {
  staleTime: 0,
  refetchOnMount: 'always',
} as const;

// El panel de la unidad productiva. `enabled` es falso mientras la cuenta técnica no elige
// productor: sin él, el servidor mezclaría las fincas de todos.
export const useProducerIndicators = (
  filters: IndicatorFilters,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.indicators.producer(filters),
    queryFn: ({ signal }) =>
      apiFetch<ProducerIndicators>(
        apiPath('/api/indicators/producer', {
          from: filters.from,
          to: filters.to,
          farm: filters.farm,
          producer: filters.producer,
        }),
        { signal },
      ),
    enabled,
    // Lo anterior solo sirve de relleno si es del mismo productor: las cifras de otro, aunque sea
    // un instante, se leerían como las de este.
    placeholderData: (previous, previousQuery) =>
      (previousQuery?.queryKey[2] as IndicatorFilters | undefined)?.producer ===
      filters.producer
        ? previous
        : undefined,
    ...FRESH,
  });

export const useAssociationIndicators = (
  filters: Pick<IndicatorFilters, 'from' | 'to'>,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.indicators.association(filters),
    queryFn: ({ signal }) =>
      apiFetch<AssociationIndicators>(
        apiPath('/api/indicators/association', {
          from: filters.from,
          to: filters.to,
        }),
        { signal },
      ),
    enabled,
    placeholderData: keepPreviousData,
    ...FRESH,
  });
