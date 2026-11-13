import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from './client';
import { apiPath } from './path';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];

export type LotOption = { id: string; code: string };

export type LotSearch = {
  search: string;
  farm: string | null;
  plot: string | null;
  // Solo la cuenta técnica: las demás buscan entre los suyos.
  producer: string | null;
};

// Cuántos ofrece el buscador a la vez: con más, la persona afina el código que escribe.
export const LOT_SEARCH_SIZE = 20;

export async function fetchLotOptions(
  query: LotSearch,
  signal?: AbortSignal,
): Promise<LotOption[]> {
  const page = await apiFetch<Schemas['PaginatedLotList']>(
    apiPath('/api/lots', {
      search: query.search.trim(),
      farm: query.farm,
      plot: query.plot,
      producer: query.producer,
      page_size: LOT_SEARCH_SIZE,
    }),
    { signal },
  );
  return page.results.map(({ id, code }) => ({ id, code }));
}

// Los lotes que calzan con el código que se escribe, de la finca y la parcela elegidas. Solo con
// conexión: es un filtro de una pantalla que también la necesita. Vive aquí y no en el dominio de
// lotes porque lo piden otros dominios.
export const useLotSearch = (query: LotSearch, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.lots.search(query),
    queryFn: ({ signal }) => fetchLotOptions(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
