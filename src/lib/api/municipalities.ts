import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

export type Municipality = components['schemas']['Municipality'];

export const fetchMunicipalities = (signal?: AbortSignal) =>
  apiFetch<components['schemas']['MunicipalityList']>(
    '/api/catalogs/municipalities',
    { signal },
  ).then((response) => response.results);

// El catálogo casi nunca cambia: se pide una vez y se comparte entre pantallas.
export const useMunicipalities = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.municipalities(),
    queryFn: ({ signal }) => fetchMunicipalities(signal),
    staleTime: Infinity,
    enabled,
  });

export function useMunicipalityName(enabled = true) {
  const { data } = useMunicipalities(enabled);
  return (code: string) =>
    data?.find((municipality) => municipality.code === code)?.name ?? '—';
}
