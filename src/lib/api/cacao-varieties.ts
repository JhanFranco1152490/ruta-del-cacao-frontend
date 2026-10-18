import { useQuery } from '@tanstack/react-query';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components, operations } from './schema';

type Schemas = components['schemas'];
export type CacaoVariety = Schemas['CacaoVariety'];
type CacaoVarietyQuery = NonNullable<
  operations['cacao_varieties_list']['parameters']['query']
>;

// El catálogo no se pagina: tiene decenas de filas y quien lo usa las necesita todas.
export async function fetchCacaoVarieties(
  query: CacaoVarietyQuery = {},
  signal?: AbortSignal,
): Promise<CacaoVariety[]> {
  const params = new URLSearchParams();
  if (query.is_active !== undefined)
    params.set('is_active', String(query.is_active));
  if (query.search) params.set('search', query.search);
  const suffix = params.size ? `?${params}` : '';
  const { results } = await apiFetch<Schemas['CacaoVarietyList']>(
    `/api/cacao-varieties${suffix}`,
    { signal },
  );
  return results;
}

// El catálogo completo, activas e inactivas: para administrarlo y para filtrar registros que
// pueden ser de una variedad ya inactiva. Solo con conexión, sin copia en el dispositivo. Vive
// aquí y no en el dominio de siembras porque lo piden otros dominios.
export const useCacaoVarietyCatalog = () =>
  useQuery({
    queryKey: queryKeys.cacaoVarieties.list(),
    queryFn: ({ signal }) => fetchCacaoVarieties({}, signal),
  });
