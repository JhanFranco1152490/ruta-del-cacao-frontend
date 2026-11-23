import { useQuery } from '@tanstack/react-query';

import { apiFetchPublic } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];
export type PublicTraceability = Schemas['PublicLotTraceability'];
export type PublicStage = Schemas['PublicLotStage'];

export const fetchPublicTraceability = (token: string, signal?: AbortSignal) =>
  apiFetchPublic<PublicTraceability>(
    `/api/public/lots/${encodeURIComponent(token)}`,
    { signal },
  );

// La página la abre quien escaneó el código, sin cuenta: se pide sin sesión. `networkMode: 'always'`
// para que sin conexión falle en el acto y se pueda reintentar, en vez de quedar esperando.
export const usePublicLotTraceability = (token: string) =>
  useQuery({
    queryKey: queryKeys.traceability.detail(token),
    queryFn: ({ signal }) => fetchPublicTraceability(token, signal),
    networkMode: 'always',
  });
