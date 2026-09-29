import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];
export type Municipality = Schemas['Municipality'];

export const fetchMunicipalities = (signal?: AbortSignal) =>
  apiFetch<Schemas['MunicipalityList']>('/api/catalogs/municipalities', {
    signal,
  }).then((response) => response.results);

// El catálogo casi nunca cambia: se pide una vez y se comparte entre pantallas.
export const useMunicipalities = () =>
  useQuery({
    queryKey: queryKeys.municipalities(),
    queryFn: ({ signal }) => fetchMunicipalities(signal),
    staleTime: Infinity,
  });

export function useMunicipalityName() {
  const { data } = useMunicipalities();
  return (code: string) =>
    data?.find((municipality) => municipality.code === code)?.name ?? '—';
}
